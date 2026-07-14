import { describe, expect, it } from "vitest";
import { activationCodeCanBeConsumed, createProductionRows } from "./production";

describe("production batches", () => {
  it("creates exactly 100 permanent URLs and 100 activation codes", () => {
    const rows = createProductionRows({ quantity: 100, startingSerialNumber: 1, serialPrefix: "PW", publicSlugPrefix: "mamdouh-" });
    expect(rows).toHaveLength(100);
    expect(new Set(rows.map(row => row.permanentUrl)).size).toBe(100);
    expect(new Set(rows.map(row => row.activationCode)).size).toBe(100);
    for (const row of rows) {
      expect(row.permanentUrl).toContain(`/${row.publicSlug}`);
      expect(row.activationCode).toMatch(/^[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/);
      expect(row.activationTokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(row.immutableToken).not.toBe(row.activationCode);
    }
  });

  it("makes activation single-use at the state gate", () => {
    expect(activationCodeCanBeConsumed({ ownerId: null, assignmentStatus: "UNASSIGNED", consumedAt: null })).toBe(true);
    expect(activationCodeCanBeConsumed({ ownerId: "user", assignmentStatus: "SELF_CLAIMED", consumedAt: new Date() })).toBe(false);
  });
});
