import {
  useGetList,
  useRecordContext,
} from "ra-core";
import { CalendarCheck, Check, AlertTriangle, Clock, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import type { Deal, PaymentScheduleItem } from "../types";

export const PaymentSchedule = () => {
  const record = useRecordContext<Deal>();

  const { data: items, isPending } = useGetList<PaymentScheduleItem>(
    "payment_schedule",
    {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "installment_number", order: "ASC" },
      filter: { deal_id: record?.id },
    },
  );

  if (!record) return null;
  if (isPending) return null;
  if (!items || items.length === 0) return null;

  const paidCount = items.filter(
    (i) => i.status === "paid" || i.status === "partial",
  ).length;
  const overdueCount = items.filter((i) => i.status === "overdue").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground tracking-wide font-medium">
            Payment Schedule
          </span>
          <span className="text-xs text-muted-foreground">
            ({paidCount}/{items.length} paid)
          </span>
        </div>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {overdueCount} overdue
          </Badge>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                #
              </th>
              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Due date
              </th>
              <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Amount
              </th>
              <th className="text-center px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Paid
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ScheduleRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const statusConfig = {
  paid: {
    icon: Check,
    label: "Paid",
    className: "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950",
  },
  partial: {
    icon: Minus,
    label: "Partial",
    className: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950",
  },
  overdue: {
    icon: AlertTriangle,
    label: "Overdue",
    className: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-muted-foreground bg-muted/30",
  },
};

const ScheduleRow = ({ item }: { item: PaymentScheduleItem }) => {
  const config = statusConfig[item.status];
  const Icon = config.icon;

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-1.5 text-xs text-muted-foreground">
        {item.installment_number === 0 ? "Dep" : item.installment_number}
      </td>
      <td className="px-3 py-1.5 text-xs">
        {new Date(item.due_date + "T00:00:00").toLocaleDateString("en-NZ", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </td>
      <td className="px-3 py-1.5 text-xs text-right font-medium">
        {item.amount.toLocaleString("en-NZ", {
          style: "currency",
          currency: "NZD",
          minimumFractionDigits: 2,
        })}
      </td>
      <td className="px-3 py-1.5 text-center">
        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.className}`}
        >
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      </td>
      <td className="px-3 py-1.5 text-xs text-muted-foreground">
        {item.paid_date
          ? new Date(item.paid_date + "T00:00:00").toLocaleDateString("en-NZ", {
              day: "numeric",
              month: "short",
            })
          : "—"}
      </td>
    </tr>
  );
};
