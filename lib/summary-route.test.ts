import { afterEach, describe, expect, it } from "vitest";
import { GET } from "../app/api/summary/route";

const previousPasscode = process.env.APP_PASSCODE;
const previousKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

afterEach(() => {
  restore("APP_PASSCODE", previousPasscode);
  restore("GOOGLE_SERVICE_ACCOUNT_JSON", previousKey);
});

describe("GET /api/summary", () => {
  it("returns the summary for a bearer passcode and 401 otherwise", async () => {
    process.env.APP_PASSCODE = "demo-pass";
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    const denied = await GET(new Request("http://localhost/api/summary"));
    expect(denied.status).toBe(401);

    const wrong = await GET(
      new Request("http://localhost/api/summary", { headers: { Authorization: "Bearer nope" } }),
    );
    expect(wrong.status).toBe(401);

    const allowed = await GET(
      new Request("http://localhost/api/summary", { headers: { Authorization: "Bearer demo-pass" } }),
    );
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("*");
    const body = (await allowed.json()) as { source: string; today: { spend: number } };
    expect(body.source).toBe("fixture");
    expect(typeof body.today.spend).toBe("number");
  });
});

function restore(name: "APP_PASSCODE" | "GOOGLE_SERVICE_ACCOUNT_JSON", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
