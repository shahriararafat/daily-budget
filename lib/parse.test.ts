import { describe, expect, it } from "vitest";
import { parseDailyBudgets, parseTransactions } from "./parse";

describe("parseTransactions", () => {
  it("reads a Google serial date and an ISO string for the same row shape", () => {
    const serial = parseTransactions([
      [15, 46323, 20, "BDT", "food", "Water (paid via bKash)", "expense"],
      [16, 46323.75, 5, "BDT", "food", "Later", "expense"],
    ]);
    const formatted = parseTransactions([
      ["15", "2026-10-28", "20", "BDT", "Food", "Water (paid via bKash)", " Expense "],
      [16, "46323", "৳1,200", "BDT", "bills", "", "expense"],
      [17, "2026-10-28T00:00:00.000Z", 8, "BDT", "food", "Morning", "expense"],
    ]);

    expect(serial.map((transaction) => transaction.date)).toEqual(["2026-10-28", "2026-10-28"]);
    expect(serial[0]).toEqual({
      id: 15,
      date: "2026-10-28",
      amount: 20,
      currency: "BDT",
      category: "food",
      note: "Water (paid via bKash)",
      type: "expense",
    });
    expect(formatted[0]).toMatchObject({ id: 15, amount: 20, category: "food", type: "expense" });
    expect(formatted[1]).toMatchObject({ id: 16, date: "2026-10-28", amount: 1200, note: "" });
    expect(formatted[2]?.date).toBe("2026-10-28");
  });

  it("uses the Sheets epoch, where serial 60 is 1900-02-28", () => {
    const parsed = parseTransactions([[1, 60, 1, "BDT", "other", "", "expense"]]);
    expect(parsed[0]?.date).toBe("1900-02-28");
  });

  it("skips malformed rows and keeps the neighbours, including an id gap", () => {
    const parsed = parseTransactions([
      [1, "2026-10-01", 10, "BDT", "food", "ok", "expense"],
      ["nope", "2026-10-01", 10, "BDT", "food", "bad id", "expense"],
      [2, "not-a-date", 10, "BDT", "food", "bad date", "expense"],
      [3, "2026-02-31", 10, "BDT", "food", "impossible date", "expense"],
      [4, "2026-10-01", "x", "BDT", "food", "bad amount", "expense"],
      [5, "2026-10-01", 10, "", "food", "bad currency", "expense"],
      [6, "2026-10-01", 10, "BDT", "rent", "bad category", "expense"],
      [7, "2026-10-01", 10, "BDT", "food", "bad type", "transfer"],
      [],
      "nope",
      [9, "2026-10-02", 15, "BDT", "transport", undefined, "expense"],
    ]);

    expect(parsed.map((transaction) => transaction.id)).toEqual([1, 9]);
    expect(parsed[1]?.note).toBe("");
  });
});

describe("parseDailyBudgets", () => {
  it("reads the planned amount from column C and keeps a blank plan", () => {
    expect(
      parseDailyBudgets([
        ["2026-10-21", "", ""],
        ["2026-10-22", "ignored", 100],
        ["2026-10-23", "", "100"],
        ["2026-10-28", 100],
        ["nope", "", 50],
        [46323, "", 80],
        ["2026-10-30", "", "nope"],
      ]),
    ).toEqual([
      { date: "2026-10-21", planned: null },
      { date: "2026-10-22", planned: 100 },
      { date: "2026-10-23", planned: 100 },
      { date: "2026-10-28", planned: null },
      { date: "2026-10-28", planned: 80 },
    ]);
  });
});
