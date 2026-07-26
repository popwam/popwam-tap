import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync(new URL("./share-center.ts", import.meta.url), "utf8");
const resolver = readFileSync(new URL("../components/public-tag-page.tsx", import.meta.url), "utf8");
const publicLink = readFileSync(new URL("../app/s/[key]/route.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../../../../packages/db/prisma/schema.prisma", import.meta.url), "utf8");

describe("Phase G server contract", () => {
  it("builds share targets exclusively from authorized published projection data", () => {
    expect(service).toContain("managedProfileWhere(userId, profileId)");
    expect(service).toContain("getPublicProfileProjectionById(profileId)");
    expect(service).toContain("projection?.publiclyReadable");
    expect(service).toContain("profile.destinations");
    expect(service).toContain("isSafeDestinationUrl");
  });

  it("uses opaque public keys and avoids internal IDs in public target URLs", () => {
    expect(service).toContain("publicShareKey");
    expect(service).toContain("createOpaqueToken(12)");
    expect(service).toContain("/p/${encodeURIComponent(slug)}");
    expect(service).toContain("/s/${encodeURIComponent(row.publicShareKey)}");
    expect(publicLink).toContain("publicShareKey");
    expect(publicLink).toContain("getPublicProfileProjectionById");
  });

  it("protects activation by four server-side rate scopes and generic failures", () => {
    for (const scope of ["cardId", "actorId", "contextFingerprintHash", "networkFingerprintHash"]) {
      expect(service).toContain(scope);
    }
    expect(service).toContain("ACTIVATION_COOLDOWN");
    expect(service).toContain('error: "ACTIVATION_UNAVAILABLE"');
    expect(service).not.toContain("first 4");
  });

  it("performs one-winner atomic claim with same-owner idempotency", () => {
    expect(service).toContain('FOR UPDATE');
    expect(service).toContain('TransactionIsolationLevel.Serializable');
    expect(service).toContain('current?.ownerId === userId');
    expect(service).toContain('where: { id: initial.id, ownerId: null, assignmentStatus: "UNASSIGNED"');
    expect(service).toContain('activationSecretState: "CONSUMED"');
    expect(service).toContain("activationSecretHash: null");
  });

  it("revalidates profile and target ownership/current publication in the transaction", () => {
    expect(service).toContain("managedProfileWhere(userId, input.profileId)");
    expect(service).toContain("publishedRevision");
    expect(service).toContain("current?.destinations.some");
    expect(service).toContain("profileId: input.profileId");
  });

  it("keeps audit records privacy-safe and never returns or logs a scratch secret", () => {
    expect(service).toContain('"activation.failed"');
    expect(service).toContain('"activation.locked"');
    expect(service).toContain('"activation.completed"');
    expect(service).not.toContain("metadata: { scratch");
    expect(service).not.toContain("console.log");
  });

  it("keeps the stable physical URL while target updates change only resolver state", () => {
    expect(service).toContain("permanentUrl:");
    expect(service).toContain("activeDestinationId: assignment.destinationId");
    expect(service).toContain('data: { profileId: input.profileId, activeDestinationId: assignment.destinationId }');
  });

  it("permits only active/paused target management and exact pause/resume transitions", () => {
    expect(service).toContain('!["ACTIVE", "PAUSED"].includes(card.cardStatus)');
    expect(service).toContain('card.cardStatus === "ACTIVE" && input.status === "PAUSED"');
    expect(service).toContain('card.cardStatus === "PAUSED" && input.status === "ACTIVE"');
    expect(service).toContain("lostAndTransferInProductDetails: true");
  });

  it("blocks disabled cards and non-current public content at resolution", () => {
    expect(resolver).toContain('card.cardStatus==="LOST"||card.cardStatus==="STOLEN"');
    expect(resolver).toContain('card.cardStatus==="DISABLED"||card.cardStatus==="ARCHIVED"||card.cardStatus==="TRANSFER_PENDING"');
    expect(resolver).toContain("getPublicProfileProjectionById");
    expect(resolver).toContain("projection.profile.destinations.some");
    expect(schema).toContain("activationSecretState");
    expect(schema).toContain("activationLockoutUntil");
  });

  it("does not use Firebase as activation or share authorization", () => {
    expect(service).not.toMatch(/firebase|firestore|realtime database/i);
  });
});
