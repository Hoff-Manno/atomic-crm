import {
  ClipboardList,
  DollarSign,
  PackageCheck,
  AlertTriangle,
} from "lucide-react";
import { useGetList } from "ra-core";
import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";

import type { Deal } from "../types";

export const LaybyStats = () => {
  const { data: deals, isPending } = useGetList<Deal>("deals", {
    pagination: { page: 1, perPage: 500 },
    sort: { field: "index", order: "ASC" },
    filter: { "archived_at@is": null },
  });

  if (isPending || !deals) return null;

  const activeStages = ["new", "deposit-paid", "in-progress", "paid-in-full"];
  const activeDeals = deals.filter((d) => activeStages.includes(d.stage));

  const totalOutstanding = activeDeals.reduce(
    (sum, d) => sum + (d.amount - (d.total_paid ?? 0)),
    0,
  );

  const readyForCollection = deals.filter(
    (d) => d.stage === "paid-in-full",
  ).length;

  const today = new Date().toISOString().split("T")[0];
  const overdueCount = deals.filter(
    (d) =>
      d.next_payment_date &&
      d.next_payment_date < today &&
      (d.stage === "deposit-paid" || d.stage === "in-progress"),
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Link to="/deals" className="no-underline">
        <StatCard
          icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
          label="Active Laybys"
          value={String(activeDeals.length)}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
        />
      </Link>
      <StatCard
        icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
        label="Outstanding"
        value={totalOutstanding.toLocaleString("en-NZ", {
          style: "currency",
          currency: "NZD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
        bgColor="bg-emerald-50 dark:bg-emerald-950/30"
      />
      <Link to="/deals" className="no-underline">
        <StatCard
          icon={<PackageCheck className="w-5 h-5 text-violet-600" />}
          label="Ready to Collect"
          value={String(readyForCollection)}
          bgColor="bg-violet-50 dark:bg-violet-950/30"
        />
      </Link>
      <StatCard
        icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        label="Overdue"
        value={String(overdueCount)}
        bgColor="bg-red-50 dark:bg-red-950/30"
      />
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}) => (
  <Card className={`${bgColor} border-0 shadow-sm`}>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);
