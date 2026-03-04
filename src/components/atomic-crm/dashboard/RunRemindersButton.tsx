import { useState } from "react";
import { Bell } from "lucide-react";
import { useDataProvider, useNotify, useRefresh } from "ra-core";
import { Button } from "@/components/ui/button";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { CrmDataProvider } from "../providers/types";

export const RunRemindersButton = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const refresh = useRefresh();
  const { reminderSettings } = useConfigurationContext();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    try {
      const result = await dataProvider.processReminders(reminderSettings);
      const data = result?.data ?? result;
      const parts: string[] = [];
      if (data?.reminders_created > 0)
        parts.push(`${data.reminders_created} reminder(s)`);
      if (data?.overdue_marked > 0)
        parts.push(`${data.overdue_marked} marked overdue`);
      if (data?.contracts_defaulted > 0)
        parts.push(`${data.contracts_defaulted} defaulted`);

      notify(
        parts.length > 0
          ? `Reminders processed: ${parts.join(", ")}`
          : "No pending reminders",
        { type: "info" },
      );
      refresh();
    } catch {
      notify("Failed to process reminders", { type: "error" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="h-8 text-xs"
    >
      <Bell className="w-3.5 h-3.5 mr-1" />
      {isPending ? "Processing..." : "Run Reminders"}
    </Button>
  );
};
