import { loadEnvConfig } from "@next/env";
import { publicErrorMessage } from "../lib/errors";

loadEnvConfig(process.cwd(), false, {
  info() {},
  error() {},
});

async function main() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) {
    console.error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not set. This check reads the real sheet and does not use fixture data.",
    );
    process.exit(1);
  }
  if (!process.env.SHEET_ID?.trim()) {
    console.error("SHEET_ID is not set.");
    process.exit(1);
  }

  const { loadSummary } = await import("../lib/summary");
  const summary = await loadSummary();
  console.log(
    JSON.stringify(
      {
        today: {
          date: summary.today.date,
          spend: summary.today.spend,
          planned: summary.today.planned,
        },
        month: {
          label: summary.month.label,
          spend: summary.month.spend,
          income: summary.month.income,
        },
        categories: summary.categories,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(publicErrorMessage(error));
  process.exit(1);
});
