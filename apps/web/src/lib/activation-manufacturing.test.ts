import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const batchRoute = readFileSync(new URL("../app/api/admin/card-batches/route.ts", import.meta.url), "utf8");
const exportRoute = readFileSync(new URL("../app/api/admin/production-batches/[id]/csv/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../../packages/db/prisma/migrations/20260726003000_share_activation_scratch_security/migration.sql", import.meta.url), "utf8");

describe("Phase G manufacturing activation boundary", () => {
  it("generates new products with a scratch hash and disables the legacy bearer path", () => {
    expect(batchRoute).toContain('activationSecretState: "SCRATCH_READY"');
    expect(batchRoute).toContain("activationSecretHash: row.activationSecretHash");
    expect(batchRoute).toContain("scratchSecretExportCiphertext: sealActivationCode(row.scratchSecret)");
    expect(batchRoute).toContain("legacy-disabled:");
  });

  it("serializes one-time exports and clears recoverable ciphertext atomically", () => {
    expect(exportRoute).toContain('FOR UPDATE');
    expect(exportRoute).toContain("TransactionIsolationLevel.Serializable");
    expect(exportRoute).toContain("scratchSecretExportCiphertext: null");
    expect(exportRoute).toContain("consumed.count !== exportable.length");
    expect(exportRoute).toContain('"cache-control": "no-store, private"');
  });

  it("records aggregate export metadata without a secret value", () => {
    expect(exportRoute).toContain('"admin.activation_scratch.exported"');
    expect(exportRoute).toContain("metadata: { count: exportable.length, version: 1 }");
    expect(exportRoute).not.toContain("metadata: { scratch");
    expect(exportRoute).not.toContain("console.log");
  });

  it("uses an additive migration and does not drop or rewrite legacy data", () => {
    expect(migration).toContain('ADD COLUMN "activationSecretHash"');
    expect(migration).toContain("DEFAULT 'LEGACY'");
    expect(migration).not.toMatch(/\bDROP\b|\bDELETE\b|\bTRUNCATE\b/i);
  });
});
