export const SESSION_COOKIE = "budget_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function bytesToBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(signature);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export function passcode(): string | undefined {
  const value = process.env.APP_PASSCODE;
  if (!value?.trim()) return undefined;
  return value;
}

export async function passcodeMatches(input: string, expected: string): Promise<boolean> {
  const [left, right] = await Promise.all([
    hmac(input, "budget-passcode"),
    hmac(expected, "budget-passcode"),
  ]);
  return safeEqual(left, right);
}

export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const payload = `v1.${now + SESSION_MAX_AGE_SECONDS * 1000}`;
  const signature = await hmac(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string, secret: string, now = Date.now()): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresAt, signature] = parts;
  if (version !== "v1" || !/^\d+$/.test(expiresAt)) return false;
  const expected = await hmac(`${version}.${expiresAt}`, secret);
  if (!safeEqual(signature, expected)) return false;
  return Number(expiresAt) > now;
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  const secret = passcode();
  if (!secret || !token) return false;
  return verifySessionToken(token, secret);
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  };
}
