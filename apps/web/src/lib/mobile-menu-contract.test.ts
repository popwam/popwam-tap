import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overview = readFileSync(new URL("../app/api/security/overview/route.ts", import.meta.url), "utf8");

describe("mobile Menu account projection", () => {
  it("returns only safe private-account presentation fields", () => {
    for (const field of ["name", "email", "phone", "phoneVerified", "locale", "status"]) {
      expect(overview).toContain(`${field}:`);
    }
    expect(overview).not.toContain("account: { id:");
    expect(overview).not.toContain("firebaseUid");
    expect(overview).not.toContain("refreshToken");
  });
});
