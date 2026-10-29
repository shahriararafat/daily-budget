import type { Summary } from "./types";

export type FetchResult =
  | { ok: true; summary: Summary }
  | { ok: false; status: number | null; message: string };

export function apiBaseUrl(): string | null {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!value) return null;
  return value.replace(/\/$/, "");
}

export async function fetchSummary(passcode: string): Promise<FetchResult> {
  const base = apiBaseUrl();
  if (!base) {
    return { ok: false, status: null, message: "Set EXPO_PUBLIC_API_URL to the backend address." };
  }

  try {
    const response = await fetch(`${base}/api/summary`, {
      headers: { Authorization: `Bearer ${passcode}` },
    });
    if (response.status === 401) {
      return { ok: false, status: 401, message: "Wrong passcode." };
    }
    if (!response.ok) {
      return { ok: false, status: response.status, message: await errorMessage(response) };
    }
    const summary = (await response.json()) as Summary;
    if (!summary || typeof summary !== "object" || !summary.today || !summary.month) {
      return { ok: false, status: response.status, message: "The server sent an unexpected response." };
    }
    return { ok: true, summary };
  } catch {
    return { ok: false, status: null, message: "Can't reach the server." };
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error) return body.error;
  } catch {
    // Fall through to a generic message.
  }
  return "The server could not load spending.";
}
