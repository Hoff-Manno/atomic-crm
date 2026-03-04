import {
  withLifecycleCallbacks,
  type CreateParams,
  type DataProvider,
  type Identifier,
  type ResourceCallbacks,
  type UpdateParams,
} from "ra-core";
import fakeRestDataProvider from "ra-data-fakerest";

import type {
  Company,
  Contact,
  ContactNote,
  Deal,
  DealNote,
  Payment,
  PaymentScheduleItem,
  Sale,
  SalesFormData,
  SignUpData,
  Task,
} from "../../types";
import type { ConfigurationContextValue } from "../../root/ConfigurationContext";
import { getActivityLog } from "../commons/activity";
import { getCompanyAvatar } from "../commons/getCompanyAvatar";
import { getContactAvatar } from "../commons/getContactAvatar";
import { mergeContacts } from "../commons/mergeContacts";
import type { CrmDataProvider } from "../types";
import { generatePaymentSchedule } from "../../deals/generatePaymentSchedule";
import { authProvider, USER_STORAGE_KEY } from "./authProvider";
import generateData from "./dataGenerator";
import { withSupabaseFilterAdapter } from "./internal/supabaseAdapter";

const baseDataProvider = fakeRestDataProvider(generateData(), true, 300);

const TASK_MARKED_AS_DONE = "TASK_MARKED_AS_DONE";
const TASK_MARKED_AS_UNDONE = "TASK_MARKED_AS_UNDONE";
const TASK_DONE_NOT_CHANGED = "TASK_DONE_NOT_CHANGED";
let taskUpdateType = TASK_DONE_NOT_CHANGED;

const processCompanyLogo = async (params: any) => {
  let logo = params.data.logo;

  if (typeof logo !== "object" || logo === null || !logo.src) {
    logo = await getCompanyAvatar(params.data);
  } else if (logo.rawFile instanceof File) {
    const base64Logo = await convertFileToBase64(logo);
    logo = { src: base64Logo, title: logo.title };
  }

  return {
    ...params,
    data: {
      ...params.data,
      logo,
    },
  };
};

async function processContactAvatar(
  params: UpdateParams<Contact>,
): Promise<UpdateParams<Contact>>;

async function processContactAvatar(
  params: CreateParams<Contact>,
): Promise<CreateParams<Contact>>;

async function processContactAvatar(
  params: CreateParams<Contact> | UpdateParams<Contact>,
): Promise<CreateParams<Contact> | UpdateParams<Contact>> {
  const { data } = params;
  if (data.avatar?.src || !data.email_jsonb || !data.email_jsonb.length) {
    return params;
  }
  const avatarUrl = await getContactAvatar(data);

  // Clone the data and modify the clone
  const newData = { ...data, avatar: { src: avatarUrl || undefined } };

  return { ...params, data: newData };
}

async function fetchAndUpdateCompanyData(
  params: UpdateParams<Contact>,
  dataProvider: DataProvider,
): Promise<UpdateParams<Contact>>;

async function fetchAndUpdateCompanyData(
  params: CreateParams<Contact>,
  dataProvider: DataProvider,
): Promise<CreateParams<Contact>>;

async function fetchAndUpdateCompanyData(
  params: CreateParams<Contact> | UpdateParams<Contact>,
  dataProvider: DataProvider,
): Promise<CreateParams<Contact> | UpdateParams<Contact>> {
  const { data } = params;
  const newData = { ...data };

  if (!newData.company_id) {
    return params;
  }

  const { data: company } = await dataProvider.getOne("companies", {
    id: newData.company_id,
  });

  if (!company) {
    return params;
  }

  newData.company_name = company.name;
  return { ...params, data: newData };
}

const dataProviderWithCustomMethod: CrmDataProvider = {
  ...baseDataProvider,
  unarchiveDeal: async (deal: Deal) => {
    // get all deals where stage is the same as the deal to unarchive
    const { data: deals } = await baseDataProvider.getList<Deal>("deals", {
      filter: { stage: deal.stage },
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "index", order: "ASC" },
    });

    // set index for each deal starting from 1, if the deal to unarchive is found, set its index to the last one
    const updatedDeals = deals.map((d, index) => ({
      ...d,
      index: d.id === deal.id ? 0 : index + 1,
      archived_at: d.id === deal.id ? null : d.archived_at,
    }));

    return await Promise.all(
      updatedDeals.map((updatedDeal) =>
        dataProvider.update("deals", {
          id: updatedDeal.id,
          data: updatedDeal,
          previousData: deals.find((d) => d.id === updatedDeal.id),
        }),
      ),
    );
  },
  // We simulate a remote endpoint that is in charge of returning activity log
  getActivityLog: async (companyId?: Identifier) => {
    return getActivityLog(dataProvider, companyId);
  },
  signUp: async ({
    email,
    password,
    first_name,
    last_name,
  }: SignUpData): Promise<{ id: string; email: string; password: string }> => {
    const user = await baseDataProvider.create("sales", {
      data: {
        email,
        first_name,
        last_name,
      },
    });

    return {
      ...user.data,
      password,
    };
  },
  salesCreate: async ({ ...data }: SalesFormData): Promise<Sale> => {
    const response = await dataProvider.create("sales", {
      data: {
        ...data,
        password: "new_password",
      },
    });

    return response.data;
  },
  salesUpdate: async (
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ): Promise<Sale> => {
    const { data: previousData } = await dataProvider.getOne<Sale>("sales", {
      id,
    });

    if (!previousData) {
      throw new Error("User not found");
    }

    const { data: sale } = await dataProvider.update<Sale>("sales", {
      id,
      data,
      previousData,
    });
    return { ...sale, user_id: sale.id.toString() };
  },
  isInitialized: async (): Promise<boolean> => {
    const sales = await dataProvider.getList<Sale>("sales", {
      filter: {},
      pagination: { page: 1, perPage: 1 },
      sort: { field: "id", order: "ASC" },
    });
    if (sales.data.length === 0) {
      return false;
    }
    return true;
  },
  updatePassword: async (id: Identifier): Promise<true> => {
    const currentUser = await authProvider.getIdentity?.();
    if (!currentUser) {
      throw new Error("User not found");
    }
    const { data: previousData } = await dataProvider.getOne<Sale>("sales", {
      id: currentUser.id,
    });

    if (!previousData) {
      throw new Error("User not found");
    }

    await dataProvider.update("sales", {
      id,
      data: {
        password: "demo_newPassword",
      },
      previousData,
    });

    return true;
  },
  mergeContacts: async (sourceId: Identifier, targetId: Identifier) => {
    return mergeContacts(sourceId, targetId, baseDataProvider);
  },
  processReminders: async (settings?: {
    daysBeforeDue?: number;
    overdueGraceDays?: number;
    defaultAfterDays?: number;
  }) => {
    const daysBeforeDue = settings?.daysBeforeDue ?? 3;
    const overdueGraceDays = settings?.overdueGraceDays ?? 14;
    const defaultAfterDays = settings?.defaultAfterDays ?? 30;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    let remindersCreated = 0;
    let overdueMarked = 0;
    let defaultedCount = 0;

    // 1. Mark overdue schedule items
    const { data: pendingItems } =
      await dataProvider.getList<PaymentScheduleItem>("payment_schedule", {
        filter: { status: "pending" },
        pagination: { page: 1, perPage: 10000 },
        sort: { field: "id", order: "ASC" },
      });
    for (const item of pendingItems) {
      if (item.due_date < todayStr) {
        await dataProvider.update("payment_schedule", {
          id: item.id,
          data: { status: "overdue" },
          previousData: item,
        });
        overdueMarked++;
      }
    }

    // 2. Create reminder tasks for upcoming payments
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + daysBeforeDue);
    const reminderDateStr = reminderDate.toISOString().split("T")[0];

    const { data: upcomingItems } =
      await dataProvider.getList<PaymentScheduleItem>("payment_schedule", {
        filter: { status: "pending" },
        pagination: { page: 1, perPage: 10000 },
        sort: { field: "id", order: "ASC" },
      });

    for (const item of upcomingItems) {
      if (item.due_date === reminderDateStr) {
        const { data: deal } = await dataProvider.getOne<Deal>("deals", {
          id: item.deal_id,
        });
        if (deal && !deal.archived_at && deal.contact_ids?.[0]) {
          await dataProvider.create("tasks", {
            data: {
              contact_id: deal.contact_ids[0],
              type: "payment-reminder",
              text: `Payment reminder: ${deal.name} - $${(item.amount / 100).toFixed(2)} due ${item.due_date}`,
              due_date: item.due_date,
              sales_id: deal.sales_id,
            },
          });
          remindersCreated++;
        }
      }
    }

    // 3. Auto-default severely overdue contracts
    const { data: overdueItems } =
      await dataProvider.getList<PaymentScheduleItem>("payment_schedule", {
        filter: { status: "overdue" },
        pagination: { page: 1, perPage: 10000 },
        sort: { field: "id", order: "ASC" },
      });

    const defaultThreshold = new Date(today);
    defaultThreshold.setDate(defaultThreshold.getDate() - defaultAfterDays);
    const defaultThresholdStr = defaultThreshold.toISOString().split("T")[0];

    const escalationThreshold = new Date(today);
    escalationThreshold.setDate(
      escalationThreshold.getDate() - overdueGraceDays,
    );
    const escalationStr = escalationThreshold.toISOString().split("T")[0];

    // Collect deal IDs that need action
    const dealsToDefault = new Set<number>();
    const dealsToEscalate = new Set<number>();
    for (const item of overdueItems) {
      if (item.due_date < defaultThresholdStr) {
        dealsToDefault.add(item.deal_id as number);
      } else if (item.due_date < escalationStr) {
        dealsToEscalate.add(item.deal_id as number);
      }
    }

    for (const dealId of dealsToDefault) {
      const { data: deal } = await dataProvider.getOne<Deal>("deals", {
        id: dealId,
      });
      if (
        deal &&
        ["deposit-paid", "in-progress"].includes(deal.stage) &&
        !deal.archived_at
      ) {
        await dataProvider.update("deals", {
          id: dealId,
          data: { stage: "defaulted", updated_at: new Date().toISOString() },
          previousData: deal,
        });
        defaultedCount++;
      }
    }

    return {
      data: {
        reminders_created: remindersCreated,
        overdue_marked: overdueMarked,
        contracts_defaulted: defaultedCount,
        processed_at: new Date().toISOString(),
      },
    };
  },
  getConfiguration: async (): Promise<ConfigurationContextValue> => {
    const { data } = await baseDataProvider.getOne("configuration", { id: 1 });
    return (data?.config as ConfigurationContextValue) ?? {};
  },
  updateConfiguration: async (
    config: ConfigurationContextValue,
  ): Promise<ConfigurationContextValue> => {
    const { data: prev } = await baseDataProvider.getOne("configuration", {
      id: 1,
    });
    await baseDataProvider.update("configuration", {
      id: 1,
      data: { config },
      previousData: prev,
    });
    return config;
  },
};

async function updateCompany(
  companyId: Identifier,
  updateFn: (company: Company) => Partial<Company>,
) {
  const { data: company } = await dataProvider.getOne<Company>("companies", {
    id: companyId,
  });

  return await dataProvider.update("companies", {
    id: companyId,
    data: {
      ...updateFn(company),
    },
    previousData: company,
  });
}

const processConfigLogo = async (logo: any): Promise<string> => {
  if (typeof logo === "string") return logo;
  if (logo?.rawFile instanceof File) {
    return (await convertFileToBase64(logo)) as string;
  }
  return logo?.src ?? "";
};

const preserveAttachmentMimeType = <
  NoteType extends { attachments?: Array<{ rawFile?: File; type?: string }> },
>(
  note: NoteType,
): NoteType => ({
  ...note,
  attachments: (note.attachments ?? []).map((attachment) => ({
    ...attachment,
    type: attachment.type ?? attachment.rawFile?.type,
  })),
});

export const dataProvider = withLifecycleCallbacks(
  withSupabaseFilterAdapter(dataProviderWithCustomMethod),
  [
    {
      resource: "configuration",
      beforeUpdate: async (params) => {
        const config = params.data.config;
        if (config) {
          config.lightModeLogo = await processConfigLogo(config.lightModeLogo);
          config.darkModeLogo = await processConfigLogo(config.darkModeLogo);
        }
        return params;
      },
    },
    {
      resource: "sales",
      beforeCreate: async (params) => {
        const { data } = params;
        // If administrator role is not set, we simply set it to false
        if (data.administrator == null) {
          data.administrator = false;
        }
        return params;
      },
      afterSave: async (data) => {
        // Since the current user is stored in localStorage in fakerest authProvider
        // we need to update it to keep information up to date in the UI
        const currentUser = await authProvider.getIdentity?.();
        if (currentUser?.id === data.id) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
        }
        return data;
      },
      beforeDelete: async (params) => {
        if (params.meta?.identity?.id == null) {
          throw new Error("Identity MUST be set in meta");
        }

        const newSaleId = params.meta.identity.id as Identifier;

        const [companies, contacts, contactNotes, deals] = await Promise.all([
          dataProvider.getList("companies", {
            filter: { sales_id: params.id },
            pagination: {
              page: 1,
              perPage: 10_000,
            },
            sort: { field: "id", order: "ASC" },
          }),
          dataProvider.getList("contacts", {
            filter: { sales_id: params.id },
            pagination: {
              page: 1,
              perPage: 10_000,
            },
            sort: { field: "id", order: "ASC" },
          }),
          dataProvider.getList("contact_notes", {
            filter: { sales_id: params.id },
            pagination: {
              page: 1,
              perPage: 10_000,
            },
            sort: { field: "id", order: "ASC" },
          }),
          dataProvider.getList("deals", {
            filter: { sales_id: params.id },
            pagination: {
              page: 1,
              perPage: 10_000,
            },
            sort: { field: "id", order: "ASC" },
          }),
        ]);

        await Promise.all([
          dataProvider.updateMany("companies", {
            ids: companies.data.map((company) => company.id),
            data: {
              sales_id: newSaleId,
            },
          }),
          dataProvider.updateMany("contacts", {
            ids: contacts.data.map((company) => company.id),
            data: {
              sales_id: newSaleId,
            },
          }),
          dataProvider.updateMany("contact_notes", {
            ids: contactNotes.data.map((company) => company.id),
            data: {
              sales_id: newSaleId,
            },
          }),
          dataProvider.updateMany("deals", {
            ids: deals.data.map((company) => company.id),
            data: {
              sales_id: newSaleId,
            },
          }),
        ]);

        return params;
      },
    } satisfies ResourceCallbacks<Sale>,
    {
      resource: "contacts",
      beforeCreate: async (createParams, dataProvider) => {
        const params = {
          ...createParams,
          data: {
            ...createParams.data,
            first_seen:
              createParams.data.first_seen ?? new Date().toISOString(),
            last_seen: createParams.data.last_seen ?? new Date().toISOString(),
          },
        };
        const newParams = await processContactAvatar(params);
        return fetchAndUpdateCompanyData(newParams, dataProvider);
      },
      afterCreate: async (result) => {
        if (result.data.company_id != null) {
          await updateCompany(result.data.company_id, (company) => ({
            nb_contacts: (company.nb_contacts ?? 0) + 1,
          }));
        }

        return result;
      },
      beforeUpdate: async (params) => {
        const newParams = await processContactAvatar(params);
        return fetchAndUpdateCompanyData(newParams, dataProvider);
      },
      afterDelete: async (result) => {
        if (result.data.company_id != null) {
          await updateCompany(result.data.company_id, (company) => ({
            nb_contacts: (company.nb_contacts ?? 1) - 1,
          }));
        }

        return result;
      },
    } satisfies ResourceCallbacks<Contact>,
    {
      resource: "tasks",
      afterCreate: async (result, dataProvider) => {
        // update the task count in the related contact
        const { contact_id } = result.data;
        const { data: contact } = await dataProvider.getOne("contacts", {
          id: contact_id,
        });
        await dataProvider.update("contacts", {
          id: contact_id,
          data: {
            nb_tasks: (contact.nb_tasks ?? 0) + 1,
          },
          previousData: contact,
        });
        return result;
      },
      beforeUpdate: async (params) => {
        const { data, previousData } = params;
        if (previousData.done_date !== data.done_date) {
          taskUpdateType = data.done_date
            ? TASK_MARKED_AS_DONE
            : TASK_MARKED_AS_UNDONE;
        } else {
          taskUpdateType = TASK_DONE_NOT_CHANGED;
        }
        return params;
      },
      afterUpdate: async (result, dataProvider) => {
        // update the contact: if the task is done, decrement the nb tasks, otherwise increment it
        const { contact_id } = result.data;
        const { data: contact } = await dataProvider.getOne("contacts", {
          id: contact_id,
        });
        if (taskUpdateType !== TASK_DONE_NOT_CHANGED) {
          await dataProvider.update("contacts", {
            id: contact_id,
            data: {
              nb_tasks:
                taskUpdateType === TASK_MARKED_AS_DONE
                  ? (contact.nb_tasks ?? 0) - 1
                  : (contact.nb_tasks ?? 0) + 1,
            },
            previousData: contact,
          });
        }
        return result;
      },
      afterDelete: async (result, dataProvider) => {
        // update the task count in the related contact
        const { contact_id } = result.data;
        const { data: contact } = await dataProvider.getOne("contacts", {
          id: contact_id,
        });
        await dataProvider.update("contacts", {
          id: contact_id,
          data: {
            nb_tasks: (contact.nb_tasks ?? 0) - 1,
          },
          previousData: contact,
        });
        return result;
      },
    } satisfies ResourceCallbacks<Task>,
    {
      resource: "companies",
      beforeCreate: async (params) => {
        const createParams = await processCompanyLogo(params);

        return {
          ...createParams,
          data: {
            ...createParams.data,
            created_at: new Date().toISOString(),
          },
        };
      },
      beforeUpdate: async (params) => {
        return await processCompanyLogo(params);
      },
      afterUpdate: async (result, dataProvider) => {
        // get all contacts of the company and for each contact, update the company_name
        const { id, name } = result.data;
        const { data: contacts } = await dataProvider.getList("contacts", {
          filter: { company_id: id },
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "id", order: "ASC" },
        });

        const contactIds = contacts.map((contact) => contact.id);
        await dataProvider.updateMany("contacts", {
          ids: contactIds,
          data: { company_name: name },
        });
        return result;
      },
    } satisfies ResourceCallbacks<Company>,
    {
      resource: "deals",
      beforeCreate: async (params) => {
        return {
          ...params,
          data: {
            ...params.data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source: "new",
          },
        };
      },
      beforeUpdate: async (params) => {
        // Prevent mutation of legacy records
        if (params.previousData?.source === "legacy") {
          throw new Error("Legacy records are read-only");
        }
        return {
          ...params,
          data: {
            ...params.data,
            updated_at: new Date().toISOString(),
          },
        };
      },
      beforeDelete: async (params) => {
        const { data: deal } = await dataProvider.getOne<Deal>("deals", {
          id: params.id,
        });
        if (deal?.source === "legacy") {
          throw new Error("Legacy records cannot be deleted");
        }
        return params;
      },
      afterCreate: async (result, dataProvider) => {
        if (result.data.company_id) {
          await updateCompany(result.data.company_id, (company) => ({
            nb_deals: (company.nb_deals ?? 0) + 1,
          }));
        }

        // Auto-generate payment schedule
        const deal = result.data;
        if (deal.amount > 0 && deal.expected_closing_date) {
          const entries = generatePaymentSchedule({
            amount: deal.amount,
            deposit_amount: deal.deposit_amount ?? 0,
            payment_frequency: deal.payment_frequency ?? "weekly",
            expected_closing_date: deal.expected_closing_date,
          });
          for (const entry of entries) {
            await dataProvider.create("payment_schedule", {
              data: {
                deal_id: deal.id,
                installment_number: entry.installment_number,
                due_date: entry.due_date,
                amount: entry.amount,
                status: "pending",
              },
            });
          }
        }

        return result;
      },
      afterDelete: async (result) => {
        if (result.data.company_id) {
          await updateCompany(result.data.company_id, (company) => ({
            nb_deals: (company.nb_deals ?? 1) - 1,
          }));
        }

        return result;
      },
    } satisfies ResourceCallbacks<Deal>,
    {
      resource: "contact_notes",
      beforeSave: async (params) => preserveAttachmentMimeType(params),
    } satisfies ResourceCallbacks<ContactNote>,
    {
      resource: "deal_notes",
      beforeSave: async (params) => preserveAttachmentMimeType(params),
    } satisfies ResourceCallbacks<DealNote>,
    {
      resource: "payments",
      beforeCreate: async (params) => {
        // Auto-generate receipt number
        const receiptNumber = `LD-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
        return {
          ...params,
          data: {
            ...params.data,
            receipt_number: params.data.receipt_number || receiptNumber,
            created_at: new Date().toISOString(),
          },
        };
      },
      afterCreate: async (result, dataProvider) => {
        await updateDealTotalPaid(result.data.deal_id, dataProvider);
        await linkPaymentToSchedule(result.data, dataProvider);
        return result;
      },
      afterDelete: async (result, dataProvider) => {
        await updateDealTotalPaid(result.data.deal_id, dataProvider);
        return result;
      },
      afterUpdate: async (result, dataProvider) => {
        await updateDealTotalPaid(result.data.deal_id, dataProvider);
        return result;
      },
    } satisfies ResourceCallbacks<Payment>,
  ],
) as CrmDataProvider;

async function updateDealTotalPaid(
  dealId: Identifier,
  dp: DataProvider,
) {
  const { data: payments } = await dp.getList<Payment>("payments", {
    filter: { deal_id: dealId },
    pagination: { page: 1, perPage: 10000 },
    sort: { field: "id", order: "ASC" },
  });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const { data: deal } = await dp.getOne<Deal>("deals", { id: dealId });

  const newStage =
    totalPaid >= deal.amount &&
    ["new", "deposit-paid", "in-progress"].includes(deal.stage)
      ? "paid-in-full"
      : totalPaid > 0 &&
          totalPaid < deal.amount &&
          ["new", "deposit-paid"].includes(deal.stage)
        ? "in-progress"
        : deal.stage;

  await dp.update("deals", {
    id: dealId,
    data: { total_paid: totalPaid, stage: newStage },
    previousData: deal,
  });
}

async function linkPaymentToSchedule(
  payment: Payment,
  dp: DataProvider,
) {
  // Find the next pending/overdue schedule item for this deal
  const { data: scheduleItems } = await dp.getList<PaymentScheduleItem>(
    "payment_schedule",
    {
      filter: { deal_id: payment.deal_id },
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "installment_number", order: "ASC" },
    },
  );

  const nextPending = scheduleItems.find(
    (item) => item.status === "pending" || item.status === "overdue",
  );

  if (nextPending) {
    const newStatus =
      payment.amount >= nextPending.amount ? "paid" : "partial";
    await dp.update("payment_schedule", {
      id: nextPending.id,
      data: {
        status: newStatus,
        paid_date: payment.payment_date,
        payment_id: payment.id,
      },
      previousData: nextPending,
    });
  }
}

/**
 * Convert a `File` object returned by the upload input into a base 64 string.
 * That's not the most optimized way to store images in production, but it's
 * enough to illustrate the idea of dataprovider decoration.
 */
const convertFileToBase64 = (file: { rawFile: Blob }): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    // We know result is a string as we used readAsDataURL
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file.rawFile);
  });
