import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./nearby-center.tsx", import.meta.url), "utf8");
const nextConfig = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");
const en = JSON.parse(readFileSync(new URL("../../locales/en.json", import.meta.url), "utf8"));
const ar = JSON.parse(readFileSync(new URL("../../locales/ar.json", import.meta.url), "utf8"));

describe("Phase J Web Nearby UX contract", () => {
  it("does not request geolocation on open consent or settings load", () => {
    expect(source).toContain("function approximatePosition()");
    expect(source.indexOf("async function enable()")).toBeLessThan(source.indexOf("const coordinate = await approximatePosition()", source.indexOf("async function enable()")));
    const consentOnly = source.slice(source.indexOf("async function acceptConsent()"), source.indexOf("async function enable()"));
    expect(consentOnly).not.toContain("approximatePosition()");
    expect(source).toContain("if (!session) return");
  });

  it("uses approximate-capable one-shot location and no watch background or map", () => {
    expect(source).toContain("navigator.geolocation.getCurrentPosition");
    expect(source).toContain("enableHighAccuracy: false");
    expect(source).toContain('document.visibilityState !== "visible"');
    expect(source).toContain("clearInterval");
    expect(source).not.toContain("watchPosition");
    expect(source).not.toMatch(/google\.maps|mapbox|leaflet|<Map(?:\s|>)/);
  });

  it("keeps the raw session token in component memory and never durable browser storage", () => {
    expect(source).toContain("sessionRef");
    expect(source).toContain("useState<Session | null>");
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });

  it("uses bands and bounded server results without exact distance count or last seen", () => {
    expect(source).toContain("proximityBand");
    expect(source).toContain("copy.sameArea");
    expect(source).not.toMatch(/distanceMeters|coordinates|lastSeenAt|resultCount/);
  });

  it("reuses Nearby-sourced friend block and report actions with immediate local block removal", () => {
    expect(source).toContain('source: "NEARBY"');
    expect(source).toContain('current.filter((result) => result.key !== target.key)');
    expect(source).toContain("/api/friends/requests");
    expect(source).toContain("/api/blocks");
    expect(source).toContain("/api/reports");
  });

  it("allows geolocation only on the trusted Nearby route and localizes matching RTL copy", () => {
    expect(nextConfig).toContain('source: "/dashboard/nearby"');
    expect(nextConfig).toContain("geolocation=(self)");
    expect(nextConfig).toContain("geolocation=()");
    expect(Object.keys(en.nearbyCenter).sort()).toEqual(Object.keys(ar.nearbyCenter).sort());
    expect(ar.nearbyCenter.title).toBe("Nearby");
    expect(ar.nearbyCenter.description).not.toBe(en.nearbyCenter.description);
  });
});
