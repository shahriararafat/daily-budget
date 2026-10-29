export const CATEGORIES = [
  "food",
  "transport",
  "shopping",
  "bills",
  "education",
  "entertainment",
  "health",
  "subscriptions",
  "family",
  "other",
  "income",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type TransactionType = "expense" | "income";
export type DataSource = "fixture" | "sheet";

export type Transaction = {
  id: number;
  date: string;
  amount: number;
  currency: string;
  category: Category;
  note: string;
  type: TransactionType;
};

export type DailyBudget = {
  date: string;
  planned: number | null;
};

export type CategoryTotal = {
  category: Category;
  amount: number;
};

export type Summary = {
  source: DataSource;
  generatedAt: string;
  today: {
    date: string;
    spend: number;
    planned: number | null;
    remaining: number | null;
  };
  month: {
    label: string;
    spend: number;
    income: number;
  };
  categories: CategoryTotal[];
  recent: Transaction[];
};
