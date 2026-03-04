import { Draggable } from "@hello-pangea/dnd";
import { useRedirect, RecordContextProvider } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { SelectField } from "@/components/admin/select-field";
import { Card, CardContent } from "@/components/ui/card";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";

export const DealCard = ({ deal, index }: { deal: Deal; index: number }) => {
  if (!deal) return null;

  return (
    <Draggable
      draggableId={String(deal.id)}
      index={index}
      isDragDisabled={deal.source === "legacy"}
    >
      {(provided, snapshot) => (
        <DealCardContent provided={provided} snapshot={snapshot} deal={deal} />
      )}
    </Draggable>
  );
};

export const DealCardContent = ({
  provided,
  snapshot,
  deal,
}: {
  provided?: any;
  snapshot?: any;
  deal: Deal;
}) => {
  const { dealCategories } = useConfigurationContext();
  const redirect = useRedirect();
  const handleClick = () => {
    redirect(`/deals/${deal.id}/show`, undefined, undefined, undefined, {
      _scrollToTop: false,
    });
  };

  return (
    <div
      className="cursor-pointer"
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      ref={provided?.innerRef}
      onClick={handleClick}
    >
      <RecordContextProvider value={deal}>
        <Card
          className={`py-3 transition-all duration-200 ${
            snapshot?.isDragging
              ? "opacity-90 transform rotate-1 shadow-lg"
              : "shadow-sm hover:shadow-md"
          }`}
        >
          <CardContent className="px-3 flex flex-col">
            <div className="flex-1 flex">
              <p className="flex-1 text-sm font-medium mb-2">
                {deal.company_id ? (
                  <>
                    <ReferenceField
                      source="company_id"
                      reference="companies"
                      link={false}
                    />
                    {" - "}
                  </>
                ) : null}
                {deal.name}
              </p>
              {deal.company_id ? (
                <ReferenceField
                  source="company_id"
                  reference="companies"
                  link={false}
                >
                  <CompanyAvatar width={20} height={20} />
                </ReferenceField>
              ) : null}
            </div>
            {deal.item_description && (
              <p className="text-xs text-muted-foreground mb-1 truncate">
                {deal.item_description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {(deal.amount - (deal.total_paid ?? 0)).toLocaleString(
                  "en-NZ",
                  {
                    style: "currency",
                    currency: "NZD",
                    minimumFractionDigits: 0,
                  },
                )}{" "}
                remaining
              </span>
              {deal.category && (
                <>
                  {" · "}
                  <SelectField
                    source="category"
                    choices={dealCategories}
                    optionText="label"
                    optionValue="value"
                  />
                </>
              )}
            </div>
            {deal.source === "legacy" && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Legacy import
              </p>
            )}
            {deal.next_payment_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Next:{" "}
                {new Date(
                  deal.next_payment_date + "T00:00:00",
                ).toLocaleDateString("en-NZ", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </RecordContextProvider>
    </div>
  );
};
