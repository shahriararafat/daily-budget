import { NextResponse } from "next/server";
import { createSessionToken, passcode, passcodeMatches, sessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const secret = passcode();
  if (!secret) {
    return NextResponse.json({ error: "APP_PASSCODE is not set" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }

  const input =
    body && typeof body === "object" && "passcode" in body ? (body as { passcode: unknown }).passcode : undefined;
  if (typeof input !== "string" || !(await passcodeMatches(input, secret))) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const cookie = sessionCookie(await createSessionToken(secret));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
