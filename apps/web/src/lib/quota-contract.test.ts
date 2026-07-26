import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseQuotaRequestedValue } from "./quota-requests";

describe("quota request contract", () => {
  it("accepts numeric storage bytes and link counts", () => {
    expect(parseQuotaRequestedValue("MAX_STORAGE_BYTES", String(100 * 1024 * 1024))).toBe(104857600n);
    expect(parseQuotaRequestedValue("MAX_LINKS", "25")).toBe(25n);
  });

  it("rejects non-increases that cannot be represented safely", () => {
    expect(parseQuotaRequestedValue("MAX_LINKS", "0")).toBeNull();
    expect(parseQuotaRequestedValue("MAX_LINKS", "2.5")).toBeNull();
    expect(parseQuotaRequestedValue("MAX_LINKS", "1000001")).toBeNull();
  });
});
