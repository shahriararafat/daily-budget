export type Transaction = {
  id: number;
  date: string;
  amount: number;
  currency: string;
  category: string;
  note: string;
  type: "expense" | "income";
};

export type Summary = {
  source: "fixture" | "sheet";
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
  categories: { category: string; amount: number }[];
  recent: Transaction[];
};
