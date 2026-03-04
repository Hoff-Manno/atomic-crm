import { PackageCheck } from "lucide-react";
import { useGetList, RecordContextProvider } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { SimpleList } from "../simple-list/SimpleList";
import type { Deal } from "../types";

export const ReadyForCollection = () => {
  const { data, total, isPending } = useGetList<Deal>("deals", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "updated_at", order: "DESC" },
    filter: {
      "archived_at@is": null,
      stage: "paid-in-full",
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="mr-3 flex">
          <PackageCheck className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground">
          Ready for Collection
        </h2>
        {total != null && total > 0 && (
          <Badge className="ml-2 bg-violet-600">{total}</Badge>
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
            <span>
              {deal.item_description && (
                <span className="text-muted-foreground">
                  {deal.item_description}
                  {deal.item_held_location && ` · ${deal.item_held_location}`}
                </span>
              )}
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
                No contracts ready for collection.
              </p>
            </div>
          }
        />
      </Card>
    </div>
  );
};
