import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  isRequestAuthorized,
  passcodeMatches,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "./auth";

describe("session cookie", () => {
  it("accepts a token it just signed until the expiry instant", async () => {
    const start = 1_000_000;
    const token = await createSessionToken("secret", start);
    const lifetime = SESSION_MAX_AGE_SECONDS * 1000;

    await expect(verifySessionToken(token, "secret", start)).resolves.toBe(true);
    await expect(verifySessionToken(token, "other", start)).resolves.toBe(false);
    await expect(verifySessionToken(token, "secret", start + lifetime - 1)).resolves.toBe(true);
    await expect(verifySessionToken(token, "secret", start + lifetime)).resolves.toBe(false);

    const flipped = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    await expect(verifySessionToken(flipped, "secret", start)).resolves.toBe(false);
  });

  it("does not accept a passcode prefix", async () => {
    await expect(passcodeMatches("1234", "1234")).resolves.toBe(true);
    await expect(passcodeMatches("1234", "12345")).resolves.toBe(false);
    await expect(passcodeMatches("", "1234")).resolves.toBe(false);
  });
});

describe("bearer passcode", () => {
  const previous = process.env.APP_PASSCODE;

  it("accepts Authorization: Bearer and still accepts the cookie", async () => {
    process.env.APP_PASSCODE = "demo-pass";
    try {
      await expect(isRequestAuthorized(undefined, "Bearer demo-pass")).resolves.toBe(true);
      await expect(isRequestAuthorized(undefined, "bearer demo-pass")).resolves.toBe(true);
      await expect(isRequestAuthorized(undefined, "Bearer demo-pass-extra")).resolves.toBe(false);
      await expect(isRequestAuthorized(undefined, "Bearer demo")).resolves.toBe(false);
      await expect(isRequestAuthorized(undefined, "Bearer demo-pas")).resolves.toBe(false);
      await expect(isRequestAuthorized(undefined, "Basic demo-pass")).resolves.toBe(false);
      await expect(isRequestAuthorized(undefined, null)).resolves.toBe(false);

      const session = await createSessionToken("demo-pass");
      await expect(isRequestAuthorized(session, null)).resolves.toBe(true);
      await expect(isRequestAuthorized(session, "Bearer wrong")).resolves.toBe(true);
    } finally {
      restorePasscode(previous);
    }
  });

  it("rejects a bearer token when APP_PASSCODE is unset", async () => {
    delete process.env.APP_PASSCODE;
    try {
      await expect(isRequestAuthorized(undefined, "Bearer demo-pass")).resolves.toBe(false);
    } finally {
      restorePasscode(previous);
    }
  });
});

function restorePasscode(previous: string | undefined) {
  if (previous === undefined) delete process.env.APP_PASSCODE;
  else process.env.APP_PASSCODE = previous;
}
