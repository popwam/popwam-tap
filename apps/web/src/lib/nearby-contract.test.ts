import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

describe("Phase J Nearby server privacy contract", () => {
  const domain = read("./nearby-domain.ts");
  const api = read("./nearby-api.ts");
  const schema = read("../../../../packages/db/prisma/schema.prisma");
  const migration = read("../../../../packages/db/prisma/migrations/20260726210000_nearby_privacy_presence_foundation/migration.sql");
  const cleanup = read("../../../../packages/db/prisma/nearby-presence-cleanup.ts");
  const notifications = read("./friends-notifications.ts");

  it("uses shared POP Web or bearer auth and never Firebase authorization", () => {
    expect(api).toContain("getCurrentPopUser");
    expect(api).toContain("isTrustedPopMutation");
    expect(api).not.toMatch(/Firebase.*(?:authorize|currentUser|idToken)/i);
  });

  it("keeps all migrated users off without a backfill or presence creation", () => {
    expect(migration).toContain('"discoverable" BOOLEAN NOT NULL DEFAULT false');
    expect(migration).toContain('"generation" INTEGER NOT NULL DEFAULT 0');
    expect(migration).not.toMatch(/\bINSERT\b|\bUPDATE\s+"NearbyPreference"/);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+"NearbyPresence"/);
    expect(schema).toMatch(/discoverable\s+Boolean\s+@default\(false\)/);
  });

  it("stores one short-lived coarse presence per user and only a token hash", () => {
    expect(schema).toContain("model NearbyPresence");
    expect(schema).toMatch(/userId\s+String\s+@unique/);
    expect(schema).toContain("coarseCell");
    expect(schema).toContain("sessionHash");
    expect(schema).not.toContain("model UserLocation");
    expect(domain).toContain('securityHash("nearby-presence", sessionToken)');
    expect(domain).not.toMatch(/data:\s*\{[^}]*latitude|data:\s*\{[^}]*longitude/s);
  });

  it("serializes enable disable and refresh so generation and latest explicit action win", () => {
    expect(domain).toContain('FOR UPDATE');
    expect(domain).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(domain).toContain("nextNearbyGeneration");
    expect(domain).toContain("presence?.generation !== input.generation");
    expect(domain).toContain("presence.sessionHash !== sessionHash");
    expect(domain).toContain("presence.expiresAt <= now");
    expect(domain).toContain("nearbyPresence.deleteMany");
  });

  it("checks current feature consent community profile publication and expiry server-side", () => {
    expect(domain).toContain("NEARBY_CONFIG_KEY");
    expect(domain).toContain('"COMMUNITY_GUIDELINES"');
    expect(domain).toContain('"NEARBY_PRIVACY"');
    expect(domain).toContain("revokedAt: null");
    expect(domain).toContain('lifecycle: "PUBLISHED"');
    expect(domain).toContain('access: { in: ["PUBLIC", "UNLISTED"] }');
    expect(domain).toContain("expiresAt: { gt: now }");
  });

  it("filters both block directions before projection and reveals no block direction", () => {
    expect(domain).toContain('{ ownerId: userId, blockedId: { in: candidateIds } }');
    expect(domain).toContain('{ blockedId: userId, ownerId: { in: candidateIds } }');
    expect(domain).toContain("if (blocked.has(candidate.userId)) return []");
    expect(domain).not.toMatch(/blockedBy|blockDirection/);
  });

  it("returns only bounded opaque profile bands and capabilities with sparse suppression", () => {
    expect(domain).toContain("minimumCrowdSize");
    expect(domain).toContain("maxResults");
    expect(domain).toContain("stableNearbyOrder");
    expect(domain).toContain("proximityBand");
    expect(domain).toContain("capabilities: nearbyCapabilities");
    expect(domain).not.toMatch(/distanceMeters|lastSeen/);
    expect(domain).toContain(".map(({ order: _order, ...result }) => result)");
  });

  it("reuses Friends requests Block and Report and introduces no proximity push", () => {
    expect(schema).toContain("NEARBY");
    expect(notifications).not.toMatch(/nearby|proximity/i);
    expect(domain).not.toMatch(/firebase|pushToken|notificationEvent/i);
  });

  it("makes cleanup delayed dry-run-by-default and correctness-independent", () => {
    expect(cleanup).toContain('process.argv.includes("--execute")');
    expect(cleanup).toContain("expiredPresenceCount");
    expect(cleanup).toContain("24 * 60 * 60_000");
    expect(domain).toContain("expiresAt: { gt: now }");
  });
});
