import { readFileSync } from "node:fs";
import path from "node:path";
import { JWT } from "google-auth-library";
import type { DataSource } from "./types";

export const SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const VALUE_RENDER_OPTION = "UNFORMATTED_VALUE";
const DATE_TIME_RENDER_OPTION = "SERIAL_NUMBER";

export type SheetRows = {
  source: DataSource;
  transactions: unknown[][];
  dailySpend: unknown[][];
};

export async function readSheetRows(): Promise<SheetRows> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) return readFixtureRows();
  return readGoogleRows(raw);
}

function readFixtureRows(): SheetRows {
  const file = path.join(process.cwd(), "data", "fixture.json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error("Fixture data could not be read");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Fixture data could not be read");
  }
  const data = parsed as { transactions?: unknown; dailySpend?: unknown };
  return {
    source: "fixture",
    transactions: asRows(data.transactions),
    dailySpend: asRows(data.dailySpend),
  };
}

async function readGoogleRows(raw: string): Promise<SheetRows> {
  const sheetId = process.env.SHEET_ID?.trim();
  if (!sheetId) throw new Error("SHEET_ID is not set");

  const credentials = parseServiceAccount(raw);
  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [SHEETS_READONLY_SCOPE],
  });
  const access = await auth.getAccessToken();
  if (!access.token) throw new Error("Could not authenticate to Google Sheets");

  const params = new URLSearchParams();
  params.append("ranges", "Transactions!A2:G");
  params.append("ranges", "'Daily Spend'!A2:C");
  params.set("valueRenderOption", VALUE_RENDER_OPTION);
  params.set("dateTimeRenderOption", DATE_TIME_RENDER_OPTION);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchGet?${params.toString()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${access.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Google Sheets request failed");
  }
  if (!response.ok) throw new Error(await googleError(response));

  const body = (await response.json()) as {
    valueRanges?: { range?: string; values?: unknown[][] }[];
  };
  const ranges = body.valueRanges ?? [];
  return {
    source: "sheet",
    transactions: rowsFrom(ranges, "Transactions"),
    dailySpend: rowsFrom(ranges, "Daily Spend"),
  };
}

function parseServiceAccount(raw: string): { client_email: string; private_key: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.client_email !== "string" || typeof record.private_key !== "string") {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
  }
  return {
    client_email: record.client_email,
    private_key: record.private_key.replace(/\\n/g, "\n"),
  };
}

function rowsFrom(ranges: { range?: string; values?: unknown[][] }[], name: string): unknown[][] {
  const match = ranges.find((range) => (range.range ?? "").includes(name));
  return match?.values ?? [];
}

function asRows(value: unknown): unknown[][] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is unknown[] => Array.isArray(row));
}

async function googleError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    const message = body.error?.message;
    if (message) return `Google Sheets read failed (${response.status}): ${message.slice(0, 180)}`;
  } catch {
    // The status is enough when the body is not JSON.
  }
  return `Google Sheets read failed (${response.status})`;
}
