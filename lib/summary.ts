import { buildSummary } from "./aggregate";
import { parseDailyBudgets, parseTransactions } from "./parse";
import { readSheetRows } from "./sheets";
import type { Summary } from "./types";

const CACHE_MS = 5_000;

let cached: { at: number; summary: Summary } | null = null;

export async function loadSummary(now = new Date()): Promise<Summary> {
  const rows = await readSheetRows();
  return buildSummary(
    parseTransactions(rows.transactions),
    parseDailyBudgets(rows.dailySpend),
    now,
    rows.source,
  );
}

export async function getCachedSummary(now = new Date()): Promise<Summary> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.summary;
  const summary = await loadSummary(now);
  cached = { at: Date.now(), summary };
  return summary;
}
