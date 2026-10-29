import { describe, expect, it } from "vitest";
import { publicErrorMessage } from "./errors";

describe("publicErrorMessage", () => {
  it("passes through a sheet error and strips key material", () => {
    expect(publicErrorMessage(new Error("Google Sheets read failed (403): The caller does not have permission"))).toBe(
      "Google Sheets read failed (403): The caller does not have permission",
    );
    const leaked = publicErrorMessage(new Error("bad -----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----"));
    expect(leaked).toBe("Could not authenticate to Google Sheets");
    expect(leaked).not.toMatch(/secret|PRIVATE/);
  });
});
