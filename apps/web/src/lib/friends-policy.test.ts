import { describe, expect, it } from "vitest";
import {
  canReadModuleForAudience,
  canonicalFriendPair,
  normalizeFriendSearch,
  notificationDeliveryAllowed,
  parseFriendPreferencePatch,
  parseFriendsSettingsPatch,
  parseReportInput,
  profileAccessForFriend,
  publicRelationshipState,
  relationshipState,
} from "./friends-policy";

describe("Phase I Friends policy", () => {
  it("canonicalizes pairs and resolves request direction from one authoritative state", () => {
    expect(canonicalFriendPair("z-user", "a-user")).toEqual({ userAId: "a-user", userBId: "z-user", pairKey: "a-user:z-user" });
    expect(relationshipState({ viewerId: "a", otherId: "b", accepted: false })).toBe("NONE");
    expect(relationshipState({ viewerId: "a", otherId: "b", accepted: false, pendingRequesterId: "a" })).toBe("OUTGOING_PENDING");
    expect(relationshipState({ viewerId: "a", otherId: "b", accepted: false, pendingRequesterId: "b" })).toBe("INCOMING_PENDING");
    expect(relationshipState({ viewerId: "a", otherId: "b", accepted: true })).toBe("FRIENDS");
  });

  it("evaluates blocking first and never discloses who blocked the viewer", () => {
    expect(relationshipState({ viewerId: "a", otherId: "b", accepted: true, pendingRequesterId: "a", blockerIds: ["a"] })).toBe("BLOCKED_BY_ME");
    const blockedMe = relationshipState({ viewerId: "a", otherId: "b", accepted: true, blockerIds: ["b"] });
    expect(blockedMe).toBe("BLOCKED_ME");
    expect(publicRelationshipState(blockedMe)).toBe("UNAVAILABLE");
  });

  it("supports normalized Arabic and English bounded search", () => {
    expect(normalizeFriendSearch("  أحمد   علي ")).toBe("أحمد علي");
    expect(normalizeFriendSearch("ＡＬＩＣＥ")).toBe("alice");
    expect(normalizeFriendSearch("a")).toBeNull();
    expect(normalizeFriendSearch("x".repeat(65))).toBeNull();
  });

  it("accepts only typed setup, preference, and report inputs", () => {
    expect(parseFriendsSettingsPatch({ socialProfileSlug: "Public-Profile", locale: "ar" })).toEqual({ socialProfileSlug: "public-profile" });
    expect(parseFriendsSettingsPatch({ allowFriendRequests: true, discoverableByProfileSearch: false, locale: "en" })).toEqual({ allowFriendRequests: true, discoverableByProfileSearch: false });
    expect(parseFriendsSettingsPatch({ discoverableByPhone: true })).toBeNull();
    expect(parseFriendPreferencePatch({ favorite: true })).toEqual({ favorite: true });
    expect(parseFriendPreferencePatch({ muted: false })).toEqual({ muted: false });
    expect(parseFriendPreferencePatch({ publicFavorite: true })).toBeNull();
    expect(parseReportInput("SCAM", "Bounded plain text")).toEqual({ category: "SCAM", details: "Bounded plain text" });
    expect(parseReportInput("UNKNOWN", "")).toBeNull();
    expect(parseReportInput("OTHER", "<b>html</b>")).toBeNull();
    expect(parseReportInput("OTHER", "x".repeat(501))).toBeNull();
  });

  it("keeps FRIENDS and ONLY_ME visibility separate from the anonymous projection", () => {
    expect(canReadModuleForAudience("PUBLIC", "PUBLIC")).toBe(true);
    expect(canReadModuleForAudience("FRIENDS", "PUBLIC")).toBe(false);
    expect(canReadModuleForAudience("FRIENDS", "FRIEND")).toBe(true);
    expect(canReadModuleForAudience("ONLY_ME", "FRIEND")).toBe(false);
    expect(profileAccessForFriend("PUBLIC", true, false)).toBe(true);
    expect(profileAccessForFriend("UNLISTED", true, false)).toBe(true);
    expect(profileAccessForFriend("PRIVATE", true, false)).toBe(false);
    expect(profileAccessForFriend("PUBLIC", true, true)).toBe(false);
    expect(profileAccessForFriend("PUBLIC", false, false)).toBe(false);
  });

  it("makes social delivery supplementary to preferences mute and block", () => {
    expect(notificationDeliveryAllowed({ socialEnabled: true, muted: false, blocked: false })).toBe(true);
    expect(notificationDeliveryAllowed({ socialEnabled: false, muted: false, blocked: false })).toBe(false);
    expect(notificationDeliveryAllowed({ socialEnabled: true, muted: true, blocked: false })).toBe(false);
    expect(notificationDeliveryAllowed({ socialEnabled: true, muted: false, blocked: true })).toBe(false);
  });
});
