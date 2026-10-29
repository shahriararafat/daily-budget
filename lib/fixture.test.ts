import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSummary } from "./aggregate";
import { parseDailyBudgets, parseTransactions } from "./parse";
import { SHEETS_READONLY_SCOPE } from "./sheets";
import { loadSummary } from "./summary";

describe("fixture ledger", () => {
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), "data", "fixture.json"), "utf8")) as {
    transactions: unknown[][];
    dailySpend: unknown[][];
  };
  const transactions = parseTransactions(raw.transactions);

  it("matches the sheet schema, with an id gap and an income row", () => {
    const ids = transactions.map((transaction) => transaction.id);
    const sorted = [...ids].sort((a, b) => a - b);
    expect(sorted.some((id, index) => index > 0 && id - sorted[index - 1] > 1)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(transactions.some((transaction) => transaction.type === "income")).toBe(true);
    expect(transactions.find((transaction) => transaction.id === 15)).toMatchObject({
      date: "2026-10-28",
      amount: 20,
      currency: "BDT",
      category: "food",
      note: "Water (paid via bKash)",
      type: "expense",
    });
  });

  it("totals 29 Oct in Dhaka, and drops that day once Dhaka moves on", () => {
    const onTheDay = buildSummary(
      transactions,
      parseDailyBudgets(raw.dailySpend),
      new Date("2026-10-28T23:00:00Z"),
    );
    expect(onTheDay.today).toEqual({
      date: "2026-10-29",
      spend: 75,
      planned: 100,
      remaining: 25,
    });
    expect(onTheDay.month).toMatchObject({ label: "October 2026", spend: 5464, income: 25000 });
    expect(onTheDay.categories).toEqual([
      { category: "education", amount: 1500 },
      { category: "bills", amount: 1200 },
      { category: "shopping", amount: 650 },
      { category: "subscriptions", amount: 499 },
      { category: "health", amount: 400 },
      { category: "food", amount: 380 },
      { category: "family", amount: 320 },
      { category: "transport", amount: 295 },
      { category: "entertainment", amount: 220 },
    ]);
    expect(onTheDay.recent.map((transaction) => transaction.id).slice(0, 2)).toEqual([21, 20]);

    const nextDay = buildSummary(
      transactions,
      parseDailyBudgets(raw.dailySpend),
      new Date("2026-10-29T18:30:00Z"),
    );
    expect(nextDay.today).toMatchObject({ date: "2026-10-30", spend: 0, planned: null, remaining: null });
    expect(nextDay.month.spend).toBe(5464);
  });

  it("reads the fixture file when the service account is unset", async () => {
    const previous = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    try {
      const summary = await loadSummary(new Date("2026-10-28T23:00:00Z"));
      expect(summary.source).toBe("fixture");
      expect(summary.today.spend).toBe(75);
    } finally {
      if (previous === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      else process.env.GOOGLE_SERVICE_ACCOUNT_JSON = previous;
    }
  });
});

describe("sheet access", () => {
  it("requests the readonly scope and does not call write endpoints", () => {
    expect(SHEETS_READONLY_SCOPE).toBe("https://www.googleapis.com/auth/spreadsheets.readonly");

    const files = sourceFiles(process.cwd());
    const text = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(text).toContain("UNFORMATTED_VALUE");
    expect(text).toContain("SERIAL_NUMBER");
    expect(text).not.toMatch(/auth\/spreadsheets(?!\.readonly)/);
    expect(text).not.toMatch(/values:(append|update|batchUpdate|batchClear|clear)/);
    expect(text).not.toMatch(/spreadsheets\.values\.(update|append|clear)/);
  });
});

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) files.push(full);
  }
  return files;
}
