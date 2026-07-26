import { describe, expect, it } from "vitest";
import {
  activationClaimGate,
  activationCooldownMs,
  activationIdentifierFrom,
  activationRateLimited,
  approvedPublicShareUrl,
  cardCanResolve,
  shareTargetKind,
} from "./share-center-policy";

describe("share center public URL policy", () => {
  it.each([
    "https://go.popwam.com/pw000001",
    "https://go.popwam.com/p/profile-name",
    "https://go.popwam.com/s/opaque_share_key",
    "https://go.popwam.com/p/profile-name/contact.vcf",
  ])("accepts an approved canonical public URL: %s", value => {
    expect(approvedPublicShareUrl(value)).toBe(true);
  });

  it.each([
    "http://go.popwam.com/pw000001",
    "https://evil.example/p/profile-name",
    "https://go.popwam.com/p/profile-name?token=secret",
    "https://go.popwam.com/activate/card/pw000001",
    "javascript:alert(1)",
    "https://user:pass@go.popwam.com/p/profile-name",
  ])("rejects a non-shareable or secret-bearing URL: %s", value => {
    expect(approvedPublicShareUrl(value)).toBe(false);
  });

  it("extracts only public product identifiers from approved hosts", () => {
    expect(activationIdentifierFrom("https://go.popwam.com/pw000001", ["go.popwam.com"])).toBe("pw000001");
    expect(activationIdentifierFrom("https://go.popwam.com/activate/card/pw000001", ["go.popwam.com"])).toBe("pw000001");
    expect(activationIdentifierFrom("PW000001", ["go.popwam.com"])).toBe("pw000001");
    expect(activationIdentifierFrom("https://evil.example/pw000001", ["go.popwam.com"])).toBeNull();
    expect(activationIdentifierFrom("https://go.popwam.com/pw000001?secret=1", ["go.popwam.com"])).toBeNull();
  });

  it("exposes only currently supported target classes", () => {
    expect(shareTargetKind("VCF")).toBe("CONTACT");
    expect(shareTargetKind("INSTAGRAM")).toBe("SOCIAL");
    expect(shareTargetKind("CUSTOM_URL")).toBe("LINK");
  });

  it("uses an escalating capped cooldown after the product attempt limit", () => {
    expect(activationCooldownMs(4)).toBe(0);
    expect(activationCooldownMs(5)).toBe(15 * 60_000);
    expect(activationCooldownMs(6)).toBe(30 * 60_000);
    expect(activationCooldownMs(99)).toBe(24 * 60 * 60_000);
  });

  it("allows the public resolver only for an active product", () => {
    expect(cardCanResolve("ACTIVE")).toBe(true);
    expect(cardCanResolve("PAUSED")).toBe(false);
    expect(cardCanResolve("STOLEN")).toBe(false);
  });

  it("gates eligible, used, locked, already-owned, and different-owner claims", () => {
    const now = new Date("2026-07-25T12:00:00.000Z");
    const eligible = {
      ownerId: null, userId: "user-a", assignmentStatus: "UNASSIGNED",
      cardStatus: "PROGRAMMED", secretState: "SCRATCH_READY", lockoutUntil: null, now,
    };
    expect(activationClaimGate(eligible)).toBe("VERIFY_SECRET");
    expect(activationClaimGate({ ...eligible, ownerId: "user-a" })).toBe("SAME_OWNER");
    expect(activationClaimGate({ ...eligible, ownerId: "user-b" })).toBe("UNAVAILABLE");
    expect(activationClaimGate({ ...eligible, secretState: "CONSUMED" })).toBe("UNAVAILABLE");
    expect(activationClaimGate({ ...eligible, assignmentStatus: "SELF_CLAIMED" })).toBe("UNAVAILABLE");
    expect(activationClaimGate({ ...eligible, lockoutUntil: new Date(now.getTime() + 60_000) })).toBe("COOLDOWN");
    expect(activationClaimGate({ ...eligible, secretState: "LOCKED", lockoutUntil: new Date(now.getTime() - 1) })).toBe("VERIFY_SECRET");
  });

  it("blocks when any product, account, context, or network scope reaches its limit", () => {
    expect(activationRateLimited({ product: 4, account: 11, context: 7, network: 24 })).toBe(false);
    expect(activationRateLimited({ product: 5, account: 0, context: 0, network: 0 })).toBe(true);
    expect(activationRateLimited({ product: 0, account: 12, context: 0, network: 0 })).toBe(true);
    expect(activationRateLimited({ product: 0, account: 0, context: 8, network: 0 })).toBe(true);
    expect(activationRateLimited({ product: 0, account: 0, context: 0, network: 25 })).toBe(true);
  });
});
