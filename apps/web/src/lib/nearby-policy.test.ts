import { describe, expect, it } from "vitest";
import {
  cellChangeWindow,
  decodeNearbyCellBounds,
  encodeNearbyCell,
  nearbyCapabilities,
  nearbyCellNeighborhood,
  nearbyFeatureDecision,
  nearbyPreferenceEffectivelyEnabled,
  nearbyPresenceActive,
  nearbyRolloutEligible,
  nearbyStage,
  nextNearbyGeneration,
  parseNearbyFeatureConfig,
  parseNearbyPresenceInput,
  rateLimitWindow,
  stableNearbyOrder,
} from "./nearby-policy";

const rawConfig = {
  version: 1,
  rolloutState: "ENABLED",
  presenceEnabled: true,
  discoveryEnabled: true,
  limitedPercentage: 100,
  cellPrecision: 6,
  neighborRing: 2,
  presenceTtlSeconds: 600,
  heartbeatMinSeconds: 60,
  maxResults: 20,
  minimumCrowdSize: 2,
  presenceUpdatesPerWindow: 12,
  presenceWindowSeconds: 600,
  discoveryRequestsPerWindow: 30,
  discoveryWindowSeconds: 600,
  enableRequestsPerWindow: 6,
  enableWindowSeconds: 3600,
  maxCellChangesPerWindow: 3,
  cellChangeWindowSeconds: 600,
} as const;

describe("Phase J Nearby policy", () => {
  it("fails closed for absent partial unknown or unsafe runtime config", () => {
    expect(parseNearbyFeatureConfig(null)).toBeNull();
    expect(parseNearbyFeatureConfig({ version: 1 })).toBeNull();
    expect(parseNearbyFeatureConfig({ ...rawConfig, unexpected: true })).toBeNull();
    expect(parseNearbyFeatureConfig({ ...rawConfig, cellPrecision: 7 })).toBeNull();
    expect(parseNearbyFeatureConfig({ ...rawConfig, presenceTtlSeconds: 60 })).toBeNull();
    expect(parseNearbyFeatureConfig(rawConfig)).toMatchObject({ cellPrecision: 6, maxResults: 20, minimumCrowdSize: 2 });
  });

  it("supports disabled internal limited and enabled server rollout without client control", () => {
    const user = { id: "user-a", role: "USER" };
    const config = parseNearbyFeatureConfig(rawConfig)!;
    expect(nearbyRolloutEligible({ ...config, rolloutState: "DISABLED" }, user)).toBe(false);
    expect(nearbyRolloutEligible({ ...config, rolloutState: "INTERNAL" }, user)).toBe(false);
    expect(nearbyRolloutEligible({ ...config, rolloutState: "INTERNAL" }, { ...user, role: "STAFF" })).toBe(true);
    expect(nearbyRolloutEligible({ ...config, rolloutState: "LIMITED", limitedPercentage: 0 }, user)).toBe(false);
    expect(nearbyRolloutEligible(config, user)).toBe(true);
    expect(nearbyFeatureDecision(null, user)).toEqual({ state: "UNAVAILABLE", available: false, presenceEnabled: false, discoveryEnabled: false });
  });

  it("keeps every existing legacy preference effectively off until all new opt-in fields are valid", () => {
    const active = { enabled: true, discoverable: true, generation: 1, activatedAt: new Date() };
    expect(nearbyPreferenceEffectivelyEnabled(null)).toBe(false);
    expect(nearbyPreferenceEffectivelyEnabled({ ...active, discoverable: false })).toBe(false);
    expect(nearbyPreferenceEffectivelyEnabled({ ...active, generation: 0 })).toBe(false);
    expect(nearbyPreferenceEffectivelyEnabled({ ...active, activatedAt: null })).toBe(false);
    expect(nearbyPreferenceEffectivelyEnabled(active)).toBe(true);
  });

  it("resolves consent profile off resume and active stages in server order", () => {
    const base = { featureAvailable: true, communityAvailable: true, communityAccepted: true, consentAvailable: true, consentAccepted: true, socialProfileEligible: true, preferenceEnabled: true, presenceActive: true };
    expect(nearbyStage({ ...base, featureAvailable: false })).toBe("UNAVAILABLE");
    expect(nearbyStage({ ...base, communityAccepted: false })).toBe("COMMUNITY_REQUIRED");
    expect(nearbyStage({ ...base, consentAccepted: false })).toBe("CONSENT_REQUIRED");
    expect(nearbyStage({ ...base, socialProfileEligible: false })).toBe("PROFILE_REQUIRED");
    expect(nearbyStage({ ...base, preferenceEnabled: false })).toBe("OFF");
    expect(nearbyStage({ ...base, presenceActive: false })).toBe("READY_TO_RESUME");
    expect(nearbyStage(base)).toBe("ACTIVE");
  });

  it("accepts only bounded location writes and rejects client radius resolution and replay fields", () => {
    expect(parseNearbyPresenceInput({ action: "ENABLE", latitude: 30, longitude: 31 })).toEqual({ action: "ENABLE", latitude: 30, longitude: 31 });
    expect(parseNearbyPresenceInput({ action: "ENABLE", latitude: 30, longitude: 31, radius: 5000 })).toBeNull();
    expect(parseNearbyPresenceInput({ action: "ENABLE", latitude: 30, longitude: 31, cellPrecision: 9 })).toBeNull();
    expect(parseNearbyPresenceInput({ action: "ENABLE", latitude: 91, longitude: 31 })).toBeNull();
    const token = "a".repeat(43);
    expect(parseNearbyPresenceInput({ action: "REFRESH", latitude: 30, longitude: 31, generation: 2, sessionToken: token })).toMatchObject({ action: "REFRESH", generation: 2 });
    expect(parseNearbyPresenceInput({ action: "REFRESH", latitude: 30, longitude: 31, generation: 0, sessionToken: token })).toBeNull();
  });

  it("converts coordinates to one server-owned precision-six cell and bounded neighboring bands", () => {
    const cell = encodeNearbyCell(30.0444, 31.2357);
    expect(cell).toHaveLength(6);
    const bounds = decodeNearbyCellBounds(cell);
    expect(bounds.latitude[0]).toBeLessThanOrEqual(30.0444);
    expect(bounds.latitude[1]).toBeGreaterThan(30.0444);
    const ringOne = nearbyCellNeighborhood(cell, 1);
    const ringTwo = nearbyCellNeighborhood(cell, 2);
    expect(ringOne.get(cell)).toBe("SAME_AREA");
    expect([...ringOne.values()]).toContain("NEARBY_AREA");
    expect([...ringTwo.values()]).toContain("AROUND_THIS_AREA");
    expect(ringTwo.size).toBeLessThanOrEqual(25);
  });

  it("requires matching unexpired generation and makes OFF win stale heartbeat races", () => {
    const now = new Date("2026-07-26T10:00:00Z");
    expect(nearbyPresenceActive({ preferenceEnabled: true, presenceGeneration: 4, preferenceGeneration: 4, expiresAt: new Date(now.getTime() + 1), now })).toBe(true);
    expect(nearbyPresenceActive({ preferenceEnabled: false, presenceGeneration: 4, preferenceGeneration: 4, expiresAt: new Date(now.getTime() + 1), now })).toBe(false);
    expect(nearbyPresenceActive({ preferenceEnabled: true, presenceGeneration: 3, preferenceGeneration: 4, expiresAt: new Date(now.getTime() + 1), now })).toBe(false);
    expect(nearbyPresenceActive({ preferenceEnabled: true, presenceGeneration: 4, preferenceGeneration: 4, expiresAt: now, now })).toBe(false);
    expect(nextNearbyGeneration(9)).toBe(10);
    expect(nextNearbyGeneration(2_147_483_646)).toBe(1);
  });

  it("bounds presence discovery and movement windows using server time", () => {
    const now = new Date("2026-07-26T10:00:00Z");
    expect(rateLimitWindow(null, now, 600, 2)).toMatchObject({ allowed: true, count: 1 });
    expect(rateLimitWindow({ windowStart: now, count: 2 }, now, 600, 2)).toMatchObject({ allowed: false, count: 3 });
    expect(cellChangeWindow({ currentCell: "stq4xj", nextCell: "stq4xj", windowStart: now, count: 3, now, windowSeconds: 600, maximum: 3 })).toMatchObject({ allowed: true, count: 3 });
    expect(cellChangeWindow({ currentCell: "stq4xj", nextCell: "stq4xn", windowStart: now, count: 3, now, windowSeconds: 600, maximum: 3 })).toMatchObject({ allowed: false, count: 4 });
  });

  it("projects capability-first Friends actions and no automatic relationship", () => {
    expect(nearbyCapabilities("NONE", false).canSendFriendRequest).toBe(false);
    expect(nearbyCapabilities("NONE", true).canSendFriendRequest).toBe(true);
    expect(nearbyCapabilities("OUTGOING_PENDING", true).canCancelRequest).toBe(true);
    expect(nearbyCapabilities("INCOMING_PENDING", true).canAcceptRequest).toBe(true);
    expect(nearbyCapabilities("FRIENDS", true).canSendFriendRequest).toBe(false);
    expect(nearbyCapabilities("UNAVAILABLE", true)).toMatchObject({ canViewProfile: false, canBlock: false, canReport: false });
  });

  it("uses stable short-window pseudorandom ordering instead of exact distance", () => {
    const first = new Date("2026-07-26T10:01:00Z");
    const sameBucket = new Date("2026-07-26T10:04:59Z");
    const nextBucket = new Date("2026-07-26T10:05:00Z");
    expect(stableNearbyOrder("viewer", "target", first)).toBe(stableNearbyOrder("viewer", "target", sameBucket));
    expect(stableNearbyOrder("viewer", "target", first)).not.toBe(stableNearbyOrder("viewer", "target", nextBucket));
  });
});
