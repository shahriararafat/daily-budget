import { describe, expect, it } from "vitest";
import { createSessionToken, passcodeMatches, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "./auth";

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
