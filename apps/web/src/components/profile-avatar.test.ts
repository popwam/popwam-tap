import { describe, expect, it } from "vitest";
import { avatarInitials } from "./profile-avatar";

describe("identity avatar fallback", () => {
  it("uses one or two initials in English and Arabic", () => {
    expect(avatarInitials("Mina Saad", null)).toBe("MS");
    expect(avatarInitials("مينا سعد", null)).toBe("مس");
    expect(avatarInitials("Mina", null)).toBe("M");
  });
  it("falls back to email and finally POPWAM", () => { expect(avatarInitials(null, "user@example.test")).toBe("U"); expect(avatarInitials()).toBe("P"); });
});
