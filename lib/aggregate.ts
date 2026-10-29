import { dhakaISODate, dhakaMonthLabel } from "./dates";
import type { CategoryTotal, DailyBudget, DataSource, Summary, Transaction } from "./types";

const RECENT_LIMIT = 20;

export function buildSummary(
  transactions: Transaction[],
  budgets: DailyBudget[],
  now: Date,
  source: DataSource = "sheet",
): Summary {
  const today = dhakaISODate(now);
  const month = today.slice(0, 7);
  let todaySpend = 0;
  let monthSpend = 0;
  let monthIncome = 0;
  const categoryTotals = new Map<Transaction["category"], number>();

  for (const transaction of transactions) {
    const inMonth = transaction.date.slice(0, 7) === month;
    if (transaction.type === "expense") {
      if (transaction.date === today) todaySpend += transaction.amount;
      if (!inMonth) continue;
      monthSpend += transaction.amount;
      categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + transaction.amount);
      continue;
    }
    if (inMonth) monthIncome += transaction.amount;
  }

  let planned: number | null = null;
  for (const budget of budgets) {
    if (budget.date === today) planned = budget.planned;
  }

  const categories: CategoryTotal[] = [...categoryTotals.entries()]
    .map(([category, amount]) => ({ category, amount: roundMoney(amount) }))
    .filter((entry) => entry.amount !== 0)
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));

  const recent = transactions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
    .slice(0, RECENT_LIMIT);

  return {
    source,
    generatedAt: now.toISOString(),
    today: {
      date: today,
      spend: roundMoney(todaySpend),
      planned,
      remaining: planned === null ? null : roundMoney(planned - todaySpend),
    },
    month: {
      label: dhakaMonthLabel(now),
      spend: roundMoney(monthSpend),
      income: roundMoney(monthIncome),
    },
    categories,
    recent,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
