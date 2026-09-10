import { describe, expect, it } from "vitest";
import { parseProfileOpenPolicy, readProfileOpenPolicy } from "./plan-open-policy";

describe("plan profile-open configuration", () => {
  it("represents unlimited explicitly", () => expect(parseProfileOpenPolicy("UNLIMITED", "")).toEqual({ mode: "UNLIMITED" }));
  it("accepts positive daily and monthly limits", () => {
    expect(parseProfileOpenPolicy("DAILY", "250")).toEqual({ mode: "DAILY", limit: 250 });
    expect(parseProfileOpenPolicy("MONTHLY", "10000")).toEqual({ mode: "MONTHLY", limit: 10000 });
  });
  it("rejects negative, zero, fractional, and conflicting values", () => {
    for (const value of ["-1", "0", "1.5", "x"]) expect(parseProfileOpenPolicy("DAILY", value)).toBeNull();
    expect(parseProfileOpenPolicy("WEEKLY", "10")).toBeNull();
  });
  it("fails safely to unlimited when stored configuration is invalid", () => expect(readProfileOpenPolicy({ mode: "DAILY", limit: -2 })).toEqual({ mode: "UNLIMITED" }));
});
