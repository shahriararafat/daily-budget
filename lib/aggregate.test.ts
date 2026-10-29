import { describe, expect, it } from "vitest";
import { buildSummary } from "./aggregate";
import type { Category, Transaction, TransactionType } from "./types";

function tx(partial: {
  id: number;
  date: string;
  amount: number;
  type: TransactionType;
  category?: Category;
  note?: string;
}): Transaction {
  return {
    currency: "BDT",
    category: partial.category ?? (partial.type === "income" ? "income" : "food"),
    note: partial.note ?? "",
    ...partial,
  };
}

const oct28Evening = new Date("2026-10-28T17:59:00Z");
const oct29Morning = new Date("2026-10-28T18:30:00Z");

describe("buildSummary", () => {
  const rows = [
    tx({ id: 1, date: "2026-10-28", amount: 10, type: "expense" }),
    tx({ id: 2, date: "2026-10-29", amount: 20, type: "expense", category: "transport" }),
    tx({ id: 3, date: "2026-09-30", amount: 5, type: "expense" }),
    tx({ id: 4, date: "2026-10-01", amount: 7, type: "income" }),
    tx({ id: 5, date: "2026-10-29", amount: 4, type: "income" }),
  ];
  const budgets = [
    { date: "2026-10-28", planned: 100 },
    { date: "2026-10-29", planned: 80 },
  ];

  it("keeps 28 Oct until Dhaka midnight, then rolls spend, budget, and the month", () => {
    const stillOctober28 = buildSummary(rows, budgets, oct28Evening);
    expect(stillOctober28.today).toEqual({
      date: "2026-10-28",
      spend: 10,
      planned: 100,
      remaining: 90,
    });
    expect(stillOctober28.month).toMatchObject({ label: "October 2026", spend: 30, income: 11 });
    expect(stillOctober28.categories).toEqual([
      { category: "transport", amount: 20 },
      { category: "food", amount: 10 },
    ]);

    const october29 = buildSummary(rows, budgets, oct29Morning);
    expect(october29.today).toEqual({
      date: "2026-10-29",
      spend: 20,
      planned: 80,
      remaining: 60,
    });
    expect(october29.month.income).toBe(11);
  });

  it("starts October and November on the Dhaka date, and leaves income out of spend", () => {
    const stillSeptember = buildSummary(rows, [], new Date("2026-09-30T17:30:00Z"));
    expect(stillSeptember.today.date).toBe("2026-09-30");
    expect(stillSeptember.month).toMatchObject({ label: "September 2026", spend: 5, income: 0 });

    const october = buildSummary(rows, [], new Date("2026-09-30T18:30:00Z"));
    expect(october.today).toMatchObject({ date: "2026-10-01", spend: 0, planned: null, remaining: null });
    expect(october.month).toMatchObject({ label: "October 2026", spend: 30, income: 11 });

    const november = buildSummary(rows, [], new Date("2026-10-31T18:30:00Z"));
    expect(november.today.date).toBe("2026-11-01");
    expect(november.month).toMatchObject({ label: "November 2026", spend: 0, income: 0 });
  });

  it("sorts categories by amount, then name, and ignores a category named income unless it is an expense", () => {
    const summary = buildSummary(
      [
        tx({ id: 1, date: "2026-10-29", amount: 80, type: "expense", category: "transport" }),
        tx({ id: 2, date: "2026-10-29", amount: 80, type: "expense", category: "bills" }),
        tx({ id: 3, date: "2026-10-29", amount: 40, type: "expense", category: "food" }),
        tx({ id: 4, date: "2026-10-29", amount: 500, type: "income", category: "income" }),
        tx({ id: 5, date: "2026-10-29", amount: 10, type: "expense", category: "income" }),
      ],
      [{ date: "2026-10-29", planned: 100 }],
      oct29Morning,
    );

    expect(summary.today.spend).toBe(210);
    expect(summary.month.income).toBe(500);
    expect(summary.today.remaining).toBe(-110);
    expect(summary.categories.map((category) => category.category)).toEqual([
      "bills",
      "transport",
      "food",
      "income",
    ]);
  });

  it("uses the last planned amount for the day, including zero", () => {
    const replaced = buildSummary(
      [tx({ id: 1, date: "2026-10-29", amount: 10, type: "expense" })],
      [
        { date: "2026-10-29", planned: 40 },
        { date: "2026-10-29", planned: 100 },
      ],
      oct29Morning,
    );
    expect(replaced.today.planned).toBe(100);

    const zero = buildSummary(
      [tx({ id: 1, date: "2026-10-29", amount: 10, type: "expense" })],
      [{ date: "2026-10-29", planned: 0 }],
      oct29Morning,
    );
    expect(zero.today).toMatchObject({ planned: 0, remaining: -10 });
  });

  it("rounds fractional taka and lists the latest 20 rows by date, then id", () => {
    const pennies = buildSummary(
      [
        tx({ id: 1, date: "2026-10-29", amount: 0.1, type: "expense" }),
        tx({ id: 2, date: "2026-10-29", amount: 0.2, type: "expense" }),
      ],
      [],
      oct29Morning,
    );
    expect(pennies.today.spend).toBe(0.3);

    const sameDay = buildSummary(
      [
        tx({ id: 2, date: "2026-10-29", amount: 1, type: "expense" }),
        tx({ id: 9, date: "2026-10-29", amount: 1, type: "expense" }),
        tx({ id: 4, date: "2026-10-28", amount: 1, type: "expense" }),
      ],
      [],
      oct29Morning,
    );
    expect(sameDay.recent.map((transaction) => transaction.id)).toEqual([9, 2, 4]);

    const many = Array.from({ length: 25 }, (_, index) =>
      tx({
        id: index + 1,
        date: `2026-01-${String(index + 1).padStart(2, "0")}`,
        amount: 1,
        type: "expense",
      }),
    );
    const recent = buildSummary(many, [], new Date("2026-01-15T06:00:00Z"));
    expect(recent.recent).toHaveLength(20);
    expect(recent.recent[0]?.id).toBe(25);
    expect(recent.recent[19]?.id).toBe(6);
  });
});
