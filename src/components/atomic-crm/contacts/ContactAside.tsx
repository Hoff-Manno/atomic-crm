import { useGetList, useRecordContext, useRedirect } from "ra-core";
import { EditButton } from "@/components/admin/edit-button";
import { DeleteButton } from "@/components/admin";
import { ReferenceManyField } from "@/components/admin/reference-many-field";
import { ShowButton } from "@/components/admin/show-button";

import { AddTask } from "../tasks/AddTask";
import { TasksIterator } from "../tasks/TasksIterator";
import { TagsListEdit } from "./TagsListEdit";
import { ContactPersonalInfo } from "./ContactPersonalInfo";
import { ContactBackgroundInfo } from "./ContactBackgroundInfo";
import { AsideSection } from "../misc/AsideSection";
import type { Contact, Deal } from "../types";
import { ContactMergeButton } from "./ContactMergeButton";
import { ExportVCardButton } from "./ExportVCardButton";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { findDealLabel } from "../deals/deal";

export const ContactAside = ({ link = "edit" }: { link?: "edit" | "show" }) => {
  const record = useRecordContext<Contact>();

  if (!record) return null;
  return (
    <div className="hidden sm:block w-92 min-w-92 text-sm">
      <div className="mb-4 -ml-1">
        {link === "edit" ? (
          <EditButton label="Edit Customer" />
        ) : (
          <ShowButton label="Show Customer" />
        )}
      </div>

      <AsideSection title="Personal info">
        <ContactPersonalInfo />
      </AsideSection>

      <AsideSection title="Background info">
        <ContactBackgroundInfo />
      </AsideSection>

      <AsideSection title="Tags">
        <TagsListEdit />
      </AsideSection>

      {record.legacy_customer_name && (
        <AsideSection title="Layby Contracts">
          <CustomerContracts customerName={record.legacy_customer_name} />
        </AsideSection>
      )}

      <AsideSection title="Tasks">
        <ReferenceManyField
          target="contact_id"
          reference="tasks"
          sort={{ field: "due_date", order: "ASC" }}
        >
          <TasksIterator />
        </ReferenceManyField>
        <AddTask />
      </AsideSection>

      {link !== "edit" && record.source !== "legacy" && (
        <>
          <div className="mt-6 pt-6 border-t hidden sm:flex flex-col gap-2 items-start">
            <ExportVCardButton />
            <ContactMergeButton />
          </div>
          <div className="mt-6 pt-6 border-t hidden sm:flex flex-col gap-2 items-start">
            <DeleteButton
              className="h-6 cursor-pointer hover:bg-destructive/10! text-destructive! border-destructive! focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
              size="sm"
            />
          </div>
        </>
      )}
    </div>
  );
};

const CustomerContracts = ({ customerName }: { customerName: string }) => {
  const { dealStages } = useConfigurationContext();
  const redirect = useRedirect();
  const { data: deals, isPending } = useGetList<Deal>("deals", {
    filter: { "name@eq": customerName },
    pagination: { page: 1, perPage: 50 },
    sort: { field: "created_at", order: "DESC" },
  });

  if (isPending) return <p className="text-muted-foreground">Loading...</p>;
  if (!deals?.length)
    return <p className="text-muted-foreground">No contracts found</p>;

  return (
    <div className="flex flex-col gap-2">
      {deals.map((deal) => (
        <button
          key={deal.id}
          type="button"
          className="text-left p-2 rounded-md border hover:bg-muted transition-colors cursor-pointer"
          onClick={() =>
            redirect(`/deals/${deal.id}/show`, undefined, undefined, undefined, {
              _scrollToTop: false,
            })
          }
        >
          <p className="text-xs font-medium truncate">
            {deal.item_description || deal.description || "Contract"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{findDealLabel(dealStages, deal.stage)}</span>
            <span>·</span>
            <span>
              {(deal.amount - (deal.total_paid ?? 0)).toLocaleString("en-NZ", {
                style: "currency",
                currency: "NZD",
                minimumFractionDigits: 0,
              })}{" "}
              remaining
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
