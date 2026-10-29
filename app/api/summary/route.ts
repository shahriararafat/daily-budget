import { NextResponse } from "next/server";
import { isRequestAuthorized, SESSION_COOKIE } from "@/lib/auth";
import { publicErrorMessage } from "@/lib/errors";
import { getCachedSummary } from "@/lib/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function GET(request: Request) {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (!(await isRequestAuthorized(token, request.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  try {
    const summary = await getCachedSummary();
    return NextResponse.json(summary, {
      headers: { ...CORS, "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: publicErrorMessage(error) }, { status: 500, headers: CORS });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
