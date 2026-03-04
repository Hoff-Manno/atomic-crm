import { describe, it, expect } from "vitest";
import { generatePaymentSchedule } from "./generatePaymentSchedule";

describe("generatePaymentSchedule", () => {
  it("should return empty array when amount is 0", () => {
    const result = generatePaymentSchedule({
      amount: 0,
      deposit_amount: 0,
      payment_frequency: "weekly",
      expected_closing_date: "2026-06-01",
    });
    expect(result).toEqual([]);
  });

  it("should return only deposit when deposit covers full amount", () => {
    const result = generatePaymentSchedule({
      amount: 100,
      deposit_amount: 100,
      payment_frequency: "weekly",
      expected_closing_date: "2026-06-01",
    });
    expect(result).toHaveLength(1);
    expect(result[0].installment_number).toBe(0);
    expect(result[0].amount).toBe(100);
  });

  it("should generate deposit + installments that sum to total", () => {
    const result = generatePaymentSchedule({
      amount: 1000,
      deposit_amount: 100,
      payment_frequency: "weekly",
      expected_closing_date: "2026-06-01",
      start_date: "2026-03-01",
    });

    expect(result.length).toBeGreaterThan(1);
    expect(result[0].installment_number).toBe(0);
    expect(result[0].amount).toBe(100);

    const totalScheduled = result.reduce((sum, e) => sum + e.amount, 0);
    expect(totalScheduled).toBe(1000);
  });

  it("should space installments according to frequency", () => {
    const result = generatePaymentSchedule({
      amount: 500,
      deposit_amount: 50,
      payment_frequency: "fortnightly",
      expected_closing_date: "2026-06-01",
      start_date: "2026-03-01",
    });

    // Installments should be 14 days apart
    for (let i = 2; i < result.length; i++) {
      const prev = new Date(result[i - 1].due_date).getTime();
      const curr = new Date(result[i].due_date).getTime();
      const daysDiff = (curr - prev) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBe(14);
    }
  });

  it("should handle monthly frequency", () => {
    const result = generatePaymentSchedule({
      amount: 600,
      deposit_amount: 60,
      payment_frequency: "monthly",
      expected_closing_date: "2026-09-01",
      start_date: "2026-03-01",
    });

    expect(result.length).toBeGreaterThan(1);
    const totalScheduled = result.reduce((sum, e) => sum + e.amount, 0);
    expect(totalScheduled).toBe(600);
  });

  it("should number installments sequentially starting from 0", () => {
    const result = generatePaymentSchedule({
      amount: 300,
      deposit_amount: 30,
      payment_frequency: "weekly",
      expected_closing_date: "2026-06-01",
      start_date: "2026-03-01",
    });

    result.forEach((entry, index) => {
      expect(entry.installment_number).toBe(index);
    });
  });
});
