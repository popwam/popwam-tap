import { describe, expect, it } from "vitest";
import { normalizeDiscoveryQuery } from "./discovery-domain";

describe("discovery query policy", () => {
  it("debounces client-side candidates by rejecting undersized server queries", () => {
    expect(normalizeDiscoveryQuery(" a ")).toBeNull();
    expect(normalizeDiscoveryQuery("  public   service ")).toBe("public service");
  });

  it("bounds query work", () => {
    expect(normalizeDiscoveryQuery("x".repeat(200))?.length).toBe(80);
  });
});
