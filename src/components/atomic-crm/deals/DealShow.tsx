import { useMutation } from "@tanstack/react-query";
import { isValid } from "date-fns";
import { Archive, ArchiveRestore } from "lucide-react";
import {
  ShowBase,
  useDataProvider,
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
  useUpdate,
} from "ra-core";
import { DeleteButton } from "@/components/admin/delete-button";
import { EditButton } from "@/components/admin/edit-button";
import { ReferenceArrayField } from "@/components/admin/reference-array-field";
import { ReferenceField } from "@/components/admin/reference-field";
import { ReferenceManyField } from "@/components/admin/reference-many-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { NoteCreate } from "../notes/NoteCreate";
import { NotesIterator } from "../notes/NotesIterator";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";
import { ContactList } from "./ContactList";
import { findDealLabel } from "./deal";
import { formatISODateString } from "./dealUtils";
import { PaymentList } from "./PaymentList";
import { PaymentSchedule } from "./PaymentSchedule";
import { PrintContractButton } from "./PrintContractButton";

export const DealShow = ({ open, id }: { open: boolean; id?: string }) => {
  const redirect = useRedirect();
  const handleClose = () => {
    redirect("list", "deals");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="lg:max-w-4xl p-4 overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        {id ? (
          <ShowBase id={id}>
            <DealShowContent />
          </ShowBase>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const DealShowContent = () => {
  const { dealStages, dealCategories } = useConfigurationContext();
  const record = useRecordContext<Deal>();
  if (!record) return null;

  const isLegacy = record.source === "legacy";

  return (
    <>
      <div className="space-y-2">
        {isLegacy ? <LegacyBadge /> : null}
        {record.archived_at && !isLegacy ? <ArchivedTitle /> : null}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              {record.company_id ? (
                <ReferenceField
                  source="company_id"
                  reference="companies"
                  link="show"
                >
                  <CompanyAvatar />
                </ReferenceField>
              ) : null}
              <h2 className="text-2xl font-semibold">{record.name}</h2>
            </div>
            {!isLegacy && (
              <div className={`flex gap-2 ${record.archived_at ? "" : "pr-12"}`}>
                <PrintContractButton />
                {record.archived_at ? (
                  <>
                    <UnarchiveButton record={record} />
                    <DeleteButton />
                  </>
                ) : (
                  <>
                    <ArchiveButton record={record} />
                    <EditButton />
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 m-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground tracking-wide">
                Stage
              </span>
              <span className="text-sm">
                {findDealLabel(dealStages, record.stage)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground tracking-wide">
                Total Price
              </span>
              <span className="text-sm">
                {record.amount.toLocaleString("en-NZ", {
                  style: "currency",
                  currency: "NZD",
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {(record.total_paid != null && record.total_paid > 0) && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground tracking-wide">
                  Paid
                </span>
                <span className="text-sm">
                  {record.total_paid.toLocaleString("en-NZ", {
                    style: "currency",
                    currency: "NZD",
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            {record.amount > 0 && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground tracking-wide">
                  Remaining
                </span>
                <span className="text-sm font-medium">
                  {(record.amount - (record.total_paid ?? 0)).toLocaleString(
                    "en-NZ",
                    {
                      style: "currency",
                      currency: "NZD",
                      minimumFractionDigits: 2,
                    },
                  )}
                </span>
              </div>
            )}

            {record.deposit_amount != null && record.deposit_amount > 0 && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground tracking-wide">
                  Deposit
                </span>
                <span className="text-sm">
                  {record.deposit_amount.toLocaleString("en-NZ", {
                    style: "currency",
                    currency: "NZD",
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            {record.payment_frequency && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground tracking-wide">
                  Payments
                </span>
                <span className="text-sm capitalize">
                  {record.payment_frequency}
                </span>
              </div>
            )}

            {record.category && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground tracking-wide">
                  Category
                </span>
                <span className="text-sm">
                  {dealCategories.find((c) => c.value === record.category)
                    ?.label ?? record.category}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 m-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground tracking-wide">
                Final payment date
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {isValid(new Date(record.expected_closing_date))
                    ? formatISODateString(record.expected_closing_date)
                    : "Invalid date"}
                </span>
                {new Date(record.expected_closing_date) < new Date() ? (
                  <Badge variant="destructive">Past</Badge>
                ) : null}
              </div>
            </div>

            {record.next_payment_date && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground tracking-wide">
                  Next payment
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {formatISODateString(record.next_payment_date)}
                  </span>
                  {new Date(record.next_payment_date) < new Date() ? (
                    <Badge variant="destructive">Overdue</Badge>
                  ) : null}
                </div>
              </div>
            )}

            {record.contract_end_date && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground tracking-wide">
                  Collection deadline
                </span>
                <span className="text-sm">
                  {formatISODateString(record.contract_end_date)}
                </span>
              </div>
            )}
          </div>

          {record.item_description && (
            <div className="m-4">
              <span className="text-xs text-muted-foreground tracking-wide">
                Item
              </span>
              <p className="text-sm">{record.item_description}</p>
            </div>
          )}

          {record.item_held_location && (
            <div className="m-4">
              <span className="text-xs text-muted-foreground tracking-wide">
                Held at
              </span>
              <p className="text-sm">{record.item_held_location}</p>
            </div>
          )}

          {!!record.contact_ids?.length && (
            <div className="m-4">
              <div className="flex flex-col min-h-12 mr-10">
                <span className="text-xs text-muted-foreground tracking-wide">
                  Customers
                </span>
                <ReferenceArrayField
                  source="contact_ids"
                  reference="contacts_summary"
                >
                  <ContactList />
                </ReferenceArrayField>
              </div>
            </div>
          )}

          {record.description && (
            <div className="m-4 whitespace-pre-line">
              <span className="text-xs text-muted-foreground tracking-wide">
                Description
              </span>
              <p className="text-sm leading-6">{record.description}</p>
            </div>
          )}

          <div className="m-4">
            <Separator className="mb-4" />
            <PaymentSchedule />
          </div>

          <div className="m-4">
            <Separator className="mb-4" />
            <PaymentList />
          </div>

          <div className="m-4">
            <Separator className="mb-4" />
            <ReferenceManyField
              target="deal_id"
              reference="deal_notes"
              sort={{ field: "date", order: "DESC" }}
              empty={<NoteCreate reference={"deals"} />}
            >
              <NotesIterator reference="deals" />
            </ReferenceManyField>
          </div>
        </div>
      </div>
    </>
  );
};

const LegacyBadge = () => (
  <div className="bg-blue-600 px-6 py-3">
    <h3 className="text-sm font-semibold text-white">
      Legacy Import — This contract was imported from finPOWER and is read-only
    </h3>
  </div>
);

const ArchivedTitle = () => (
  <div className="bg-orange-500 px-6 py-4">
    <h3 className="text-lg font-bold text-white">Archived Contract</h3>
  </div>
);

const ArchiveButton = ({ record }: { record: Deal }) => {
  const [update] = useUpdate();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();
  const handleClick = () => {
    update(
      "deals",
      {
        id: record.id,
        data: { archived_at: new Date().toISOString() },
        previousData: record,
      },
      {
        onSuccess: () => {
          redirect("list", "deals");
          notify("Contract archived", { type: "info", undoable: false });
          refresh();
        },
        onError: () => {
          notify("Error: contract not archived", { type: "error" });
        },
      },
    );
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 h-9"
    >
      <Archive className="w-4 h-4" />
      Archive
    </Button>
  );
};

const UnarchiveButton = ({ record }: { record: Deal }) => {
  const dataProvider = useDataProvider();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();

  const { mutate } = useMutation({
    mutationFn: () => dataProvider.unarchiveDeal(record),
    onSuccess: () => {
      redirect("list", "deals");
      notify("Contract unarchived", {
        type: "info",
        undoable: false,
      });
      refresh();
    },
    onError: () => {
      notify("Error: contract not unarchived", { type: "error" });
    },
  });

  const handleClick = () => {
    mutate();
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 h-9"
    >
      <ArchiveRestore className="w-4 h-4" />
      Send back to the board
    </Button>
  );
};
