import { add } from "date-fns";
import { datatype, random } from "faker/locale/en_US";

import type { Payment } from "../../../types";
import type { Db } from "./types";

const paymentMethods = ["cash", "eftpos", "bank-transfer", "credit-card"];

export const generatePayments = (db: Db): Payment[] => {
  let id = 0;
  let receiptSeq = 1;
  const payments: Payment[] = [];

  for (const deal of db.deals) {
    if (!deal.total_paid || deal.total_paid <= 0) continue;

    const depositAmount = deal.deposit_amount ?? Math.round(deal.amount * 0.1);
    let remaining = deal.total_paid;
    const dealCreatedAt = new Date(deal.created_at);

    // First payment is always the deposit
    if (remaining > 0) {
      const depositPaid = Math.min(depositAmount, remaining);
      const receiptNumber = `LD-${dealCreatedAt.getFullYear()}-${String(receiptSeq++).padStart(5, "0")}`;
      payments.push({
        id: id++,
        deal_id: deal.id,
        amount: depositPaid,
        payment_date: add(dealCreatedAt, { days: 1 })
          .toISOString()
          .split("T")[0],
        payment_method: random.arrayElement(paymentMethods),
        receipt_number: receiptNumber,
        notes: "Deposit",
        sales_id: deal.sales_id,
        created_at: add(dealCreatedAt, { days: 1 }).toISOString(),
      });
      remaining -= depositPaid;
    }

    // Generate subsequent payments
    let paymentIndex = 1;
    while (remaining > 0) {
      const frequencyDays =
        deal.payment_frequency === "weekly"
          ? 7
          : deal.payment_frequency === "fortnightly"
            ? 14
            : 30;

      const paymentAmount = Math.min(
        datatype.number({
          min: Math.round(deal.amount * 0.05),
          max: Math.round(deal.amount * 0.2),
        }),
        remaining,
      );

      const paymentDate = add(dealCreatedAt, {
        days: 1 + frequencyDays * paymentIndex,
      });
      const receiptNumber = `LD-${paymentDate.getFullYear()}-${String(receiptSeq++).padStart(5, "0")}`;

      payments.push({
        id: id++,
        deal_id: deal.id,
        amount: paymentAmount,
        payment_date: paymentDate.toISOString().split("T")[0],
        payment_method: random.arrayElement(paymentMethods),
        receipt_number: receiptNumber,
        sales_id: deal.sales_id,
        created_at: paymentDate.toISOString(),
      });

      remaining -= paymentAmount;
      paymentIndex++;

      // Safety limit
      if (paymentIndex > 50) break;
    }
  }

  return payments;
};
