import { describe, expect, it } from "vitest";
import { canAcceptTransfer, transferOwnerAfterAcceptance } from "./tag-transfers";

describe("tag transfer acceptance", () => {
  it("keeps ownership with the sender until the recipient accepts", () => {
    expect(transferOwnerAfterAcceptance("sender", "recipient", false)).toBe("sender");
    expect(transferOwnerAfterAcceptance("sender", "recipient", true)).toBe("recipient");
  });

  it("rejects expired and already consumed requests", () => {
    const now = new Date("2026-07-14T10:00:00Z");
    expect(canAcceptTransfer("PENDING", new Date("2026-07-15T10:00:00Z"), now)).toBe(true);
    expect(canAcceptTransfer("PENDING", new Date("2026-07-13T10:00:00Z"), now)).toBe(false);
    expect(canAcceptTransfer("ACCEPTED", new Date("2026-07-15T10:00:00Z"), now)).toBe(false);
  });
});
