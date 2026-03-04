import { AlertTriangle } from "lucide-react";
import { useGetList, RecordContextProvider } from "ra-core";
import { Link } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { SimpleList } from "../simple-list/SimpleList";
import type { Deal } from "../types";
import { getRelativeTimeString } from "../deals/dealUtils";

const today = new Date().toISOString().split("T")[0];

export const OverdueContracts = () => {
  const { data, total, isPending } = useGetList<Deal>("deals", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "next_payment_date", order: "ASC" },
    filter: {
      "archived_at@is": null,
      "next_payment_date@lt": today,
      "stage@in": "(deposit-paid,in-progress)",
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="mr-3 flex">
          <AlertTriangle className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground">
          Overdue Payments
        </h2>
        {total != null && total > 0 && (
          <Badge variant="destructive" className="ml-2">
            {total}
          </Badge>
        )}
      </div>
      <Card className="py-0">
        <SimpleList<Deal>
          linkType="show"
          data={data}
          total={total}
          isPending={isPending}
          resource="deals"
          className="[&>li:first-child>a]:rounded-t-xl [&>li:last-child>a]:rounded-b-xl"
          primaryText={(deal) => deal.name}
          secondaryText={(deal) => (
            <span className="text-destructive">
              {(deal.amount - (deal.total_paid ?? 0)).toLocaleString("en-NZ", {
                style: "currency",
                currency: "NZD",
                minimumFractionDigits: 0,
              })}{" "}
              remaining
              {deal.next_payment_date &&
                ` · due ${getRelativeTimeString(deal.next_payment_date)}`}
            </span>
          )}
          leftAvatar={(deal) => (
            <RecordContextProvider value={deal}>
              <ReferenceField
                source="company_id"
                reference="companies"
                link={false}
              >
                <CompanyAvatar width={20} height={20} />
              </ReferenceField>
            </RecordContextProvider>
          )}
          empty={
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                No overdue payments. All customers are up to date!
              </p>
            </div>
          }
        />
      </Card>
    </div>
  );
};
