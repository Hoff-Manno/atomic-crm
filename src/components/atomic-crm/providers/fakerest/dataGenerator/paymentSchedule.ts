import type { PaymentScheduleItem } from "../../../types";
import { generatePaymentSchedule } from "../../../deals/generatePaymentSchedule";
import type { Db } from "./types";

export const generatePaymentScheduleItems = (db: Db): PaymentScheduleItem[] => {
  let id = 0;
  const items: PaymentScheduleItem[] = [];

  for (const deal of db.deals) {
    if (deal.amount <= 0) continue;
    if (deal.stage === "cancelled" || deal.stage === "defaulted") continue;

    const entries = generatePaymentSchedule({
      amount: deal.amount,
      deposit_amount: deal.deposit_amount ?? Math.round(deal.amount * 0.1),
      payment_frequency: deal.payment_frequency ?? "weekly",
      expected_closing_date: deal.expected_closing_date,
      start_date: deal.created_at.split("T")[0],
    });

    // Match schedule items to actual payments
    const dealPayments = db.payments
      .filter((p) => p.deal_id === deal.id)
      .sort(
        (a, b) =>
          new Date(a.payment_date).getTime() -
          new Date(b.payment_date).getTime(),
      );

    for (const entry of entries) {
      const matchingPayment = dealPayments.shift();
      const today = new Date().toISOString().split("T")[0];

      let status: PaymentScheduleItem["status"] = "pending";
      let paid_date: string | null = null;
      let payment_id: number | null = null;

      if (matchingPayment) {
        if (matchingPayment.amount >= entry.amount) {
          status = "paid";
        } else {
          status = "partial";
        }
        paid_date = matchingPayment.payment_date;
        payment_id = matchingPayment.id as number;
      } else if (entry.due_date < today) {
        status = "overdue";
      }

      items.push({
        id: id++,
        deal_id: deal.id,
        installment_number: entry.installment_number,
        due_date: entry.due_date,
        amount: entry.amount,
        status,
        paid_date,
        payment_id,
      });
    }
  }

  return items;
};
