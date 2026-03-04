import { add } from "date-fns";

interface ScheduleInput {
  amount: number;
  deposit_amount: number;
  payment_frequency: string;
  expected_closing_date: string;
  start_date?: string;
}

interface ScheduleEntry {
  installment_number: number;
  due_date: string;
  amount: number;
}

/**
 * Generate a payment schedule for a layby contract.
 *
 * The first entry is always the deposit (installment 0).
 * Subsequent entries are evenly spaced according to payment_frequency
 * and sized so the total equals the contract amount.
 */
export function generatePaymentSchedule(
  input: ScheduleInput,
): ScheduleEntry[] {
  const {
    amount,
    deposit_amount,
    payment_frequency,
    expected_closing_date,
    start_date,
  } = input;

  if (amount <= 0) return [];

  const deposit = Math.min(deposit_amount, amount);
  const remaining = amount - deposit;
  const startDt = start_date ? new Date(start_date) : new Date();
  const endDt = new Date(expected_closing_date);

  const frequencyDays =
    payment_frequency === "weekly"
      ? 7
      : payment_frequency === "fortnightly"
        ? 14
        : 30;

  const entries: ScheduleEntry[] = [];

  // Installment 0: deposit
  entries.push({
    installment_number: 0,
    due_date: formatDate(startDt),
    amount: deposit,
  });

  if (remaining <= 0) return entries;

  // Calculate how many installments fit between start and end
  const totalDays = Math.max(
    1,
    Math.floor((endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const numInstallments = Math.max(1, Math.floor(totalDays / frequencyDays));

  const baseAmount = Math.floor(remaining / numInstallments);
  let leftover = remaining - baseAmount * numInstallments;

  for (let i = 1; i <= numInstallments; i++) {
    const dueDate = add(startDt, { days: frequencyDays * i });
    // Distribute leftover cents across the first installments
    const extra = leftover > 0 ? 1 : 0;
    leftover -= extra;

    entries.push({
      installment_number: i,
      due_date: formatDate(dueDate),
      amount: baseAmount + extra,
    });
  }

  return entries;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
