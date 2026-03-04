import { Printer } from "lucide-react";
import {
  useGetList,
  useGetMany,
  useGetOne,
  useRecordContext,
} from "ra-core";
import { Button } from "@/components/ui/button";

import type { Company, Contact, Deal, PaymentScheduleItem } from "../types";
import { generateContractHtml } from "./generateContractHtml";

export const PrintContractButton = () => {
  const deal = useRecordContext<Deal>();

  const { data: company } = useGetOne<Company>(
    "companies",
    { id: deal?.company_id! },
    { enabled: !!deal?.company_id },
  );

  const { data: contacts } = useGetMany<Contact>(
    "contacts",
    { ids: deal?.contact_ids ?? [] },
    { enabled: !!deal?.contact_ids?.length },
  );

  const { data: schedule } = useGetList<PaymentScheduleItem>(
    "payment_schedule",
    {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "installment_number", order: "ASC" },
      filter: { deal_id: deal?.id },
    },
    { enabled: !!deal?.id },
  );

  if (!deal) return null;

  const handlePrint = () => {
    const html = generateContractHtml({
      deal,
      company,
      contacts: contacts ?? [],
      schedule: schedule ?? [],
    });

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <Button
      onClick={handlePrint}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 h-9"
    >
      <Printer className="w-4 h-4" />
      Print Contract
    </Button>
  );
};
