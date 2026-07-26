import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

describe("Phase I Friends server contract", () => {
  const domain = read("./friends-domain.ts");
  const api = read("./friends-api.ts");
  const notifications = read("./friends-notifications.ts");
  const projection = read("./profile-projection.ts");
  const migration = read("../../../../packages/db/prisma/migrations/20260726120000_friends_privacy_abuse_foundation/migration.sql");

  it("uses shared POP auth and preserves same-origin CSRF without Firebase authorization", () => {
    expect(api).toContain("getCurrentPopUser");
    expect(api).toContain("isTrustedPopMutation");
    expect(api).not.toMatch(/Firebase.*(?:authorize|currentUser|token)/i);
  });

  it("serializes pair mutations and enforces one pending request and one mutual friendship", () => {
    expect(domain).toContain("ORDER BY \"id\" FOR UPDATE");
    expect(domain).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(migration).toContain('CREATE UNIQUE INDEX "FriendRequest_one_pending_pair_key"');
    expect(migration).toContain("WHERE \"status\" = 'PENDING'");
    expect(domain).toContain("tx.friendship.upsert");
  });

  it("keeps recipient accept and requester cancel authorization server-owned and retry safe", () => {
    expect(domain).toContain("initial.recipientUserId !== userId");
    expect(domain).toContain("initial.requesterUserId !== userId");
    expect(domain).toContain('request.status === "ACCEPTED" && action === "ACCEPT"');
    expect(domain).toContain('request.status === "CANCELLED"');
  });

  it("applies blocks before friendship and removes all softer pair state", () => {
    expect(domain).toContain("transactionBlockers");
    expect(domain).toContain('status: "CANCELLED"');
    expect(domain).toContain("tx.friendship.deleteMany");
    expect(domain).toContain("tx.friendPreference.deleteMany");
    expect(domain).toContain("tx.friendPrivacyRule.deleteMany");
    expect(domain).toContain('status: "SUPPRESSED"');
  });

  it("keeps FRIENDS content authenticated and ONLY_ME unavailable to friends", () => {
    expect(projection).toContain('relationshipStateForUsers(viewerId, profile.userId) === "FRIENDS"');
    expect(projection).toContain('revisionToProfileForAudience(profile, revision, "FRIEND")');
    expect(projection).toContain('profile.access !== "PRIVATE"');
    expect(projection).toContain('item.visibility === "PUBLIC" || item.visibility === "FRIENDS"');
    expect(projection).not.toContain('item.visibility === "ONLY_ME"');
  });

  it("revalidates mute block preference and request state before generic best-effort FCM", () => {
    expect(notifications).toContain("notificationDeliveryAllowed");
    expect(notifications).toContain('request?.status === "PENDING"');
    expect(notifications).toContain("socialEnabled");
    expect(notifications).toContain("blocked: blocks > 0");
    expect(notifications).toContain('data: { type: event.type, action: "friends" }');
    expect(notifications).not.toMatch(/phone|email|displayName|profileSlug|reportDetails/);
    expect(notifications).toContain('return { status: "FAILED" as const }');
  });
});
