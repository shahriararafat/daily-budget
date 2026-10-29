import { CATEGORIES, type Category, type DailyBudget, type Transaction, type TransactionType } from "./types";

const CATEGORY_SET = new Set<string>(CATEGORIES);
const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);

export function parseTransactions(rows: unknown): Transaction[] {
  if (!Array.isArray(rows)) return [];
  const transactions: Transaction[] = [];
  for (const row of rows) {
    const transaction = parseTransaction(row);
    if (transaction) transactions.push(transaction);
  }
  return transactions;
}

export function parseDailyBudgets(rows: unknown): DailyBudget[] {
  if (!Array.isArray(rows)) return [];
  const budgets: DailyBudget[] = [];
  for (const row of rows) {
    const budget = parseDailyBudget(row);
    if (budget) budgets.push(budget);
  }
  return budgets;
}

function parseTransaction(row: unknown): Transaction | null {
  if (!Array.isArray(row)) return null;
  const id = parseId(row[0]);
  const date = parseSheetDate(row[1]);
  const amount = parseAmount(row[2]);
  const currency = parseCurrency(row[3]);
  const category = parseCategory(row[4]);
  const note = parseNote(row[5]);
  const type = parseType(row[6]);
  if (
    id === null ||
    date === null ||
    amount === null ||
    currency === null ||
    category === null ||
    note === null ||
    type === null
  ) {
    return null;
  }
  return { id, date, amount, currency, category, note, type };
}

function parseDailyBudget(row: unknown): DailyBudget | null {
  if (!Array.isArray(row)) return null;
  const date = parseSheetDate(row[0]);
  if (!date) return null;
  const cell = row[2];
  if (cell === undefined || cell === null || cell === "") {
    return { date, planned: null };
  }
  const planned = parseAmount(cell);
  if (planned === null) return null;
  return { date, planned };
}

function parseSheetDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return serialToISO(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const iso = /^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/.exec(trimmed);
  if (iso) return isRealCalendarDate(iso[1]) ? iso[1] : null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return serialToISO(Number(trimmed));
  return null;
}

function serialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 100_000) return null;
  const date = new Date(SHEETS_EPOCH_MS + Math.floor(serial) * 86_400_000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function isRealCalendarDate(iso: string): boolean {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseId(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isInteger(numeric) || numeric < 0) return null;
  return numeric;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[৳$,\s]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function parseCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const currency = value.trim();
  return currency ? currency : null;
}

function parseCategory(value: unknown): Category | null {
  if (typeof value !== "string") return null;
  const category = value.trim().toLowerCase();
  return CATEGORY_SET.has(category) ? (category as Category) : null;
}

function parseNote(value: unknown): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function parseType(value: unknown): TransactionType | null {
  if (typeof value !== "string") return null;
  const type = value.trim().toLowerCase();
  if (type === "expense" || type === "income") return type;
  return null;
}
