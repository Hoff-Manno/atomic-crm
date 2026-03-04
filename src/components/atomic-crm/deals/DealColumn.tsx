import { Droppable } from "@hello-pangea/dnd";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";
import { findDealLabel } from "./deal";
import { DealCard } from "./DealCard";

export const DealColumn = ({
  stage,
  deals,
}: {
  stage: string;
  deals: Deal[];
}) => {
  const totalRemaining = deals.reduce(
    (sum, deal) => sum + (deal.amount - (deal.total_paid ?? 0)),
    0,
  );

  const { dealStages } = useConfigurationContext();
  const isEmpty = deals.length === 0;
  return (
    <div className={isEmpty ? "w-20 shrink-0 pb-8" : "flex-1 min-w-56 pb-8"}>
      <div className="flex flex-col items-center">
        <h3
          className={`font-medium text-center ${isEmpty ? "text-xs text-muted-foreground" : "text-base"}`}
        >
          {findDealLabel(dealStages, stage)}
        </h3>
        {!isEmpty && (
          <p className="text-sm text-muted-foreground">
            {totalRemaining.toLocaleString("en-NZ", {
              style: "currency",
              currency: "NZD",
              minimumFractionDigits: 0,
            })}{" "}
            remaining
          </p>
        )}
      </div>
      <Droppable droppableId={stage}>
        {(droppableProvided, snapshot) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            className={`flex flex-col rounded-2xl mt-2 gap-2 ${
              snapshot.isDraggingOver ? "bg-muted" : ""
            }`}
          >
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
