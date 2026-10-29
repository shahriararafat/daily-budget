import { describe, expect, it } from "vitest";
import { formatShortDate, formatTaka, formatWeekday } from "./format";

describe("format", () => {
  it("prints taka with thousands separators", () => {
    expect(formatTaka(25000)).toBe("৳25,000");
    expect(formatTaka(20)).toBe("৳20");
    expect(formatTaka(20.5)).toBe("৳20.50");
    expect(formatTaka(-5)).toBe("−৳5");
  });

  it("formats a calendar date without shifting the day", () => {
    expect(formatWeekday("2026-10-29")).toBe("Thu 29 Oct");
    expect(formatShortDate("2026-10-28")).toBe("28 Oct");
  });
});
