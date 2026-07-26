import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { lastSeenIntervalMs, normalizeDeviceLabel, opaqueSecurityId, parseWebClient, sessionBindingHash } from "./security-session";

describe("Phase H session privacy and mapping helpers", () => {
  beforeAll(() => { process.env.SECURITY_SESSION_SECRET = "phase-h-test-secret-that-is-long-enough-123456"; });

  it("projects bounded browser/platform labels without persisting a raw user agent", () => {
    expect(parseWebClient("Mozilla/5.0 (Windows NT 10.0) Chrome/126.0.0.0")).toEqual({ platform: "Windows", browser: "Chrome", label: "Chrome on Windows" });
    expect(parseWebClient("Mozilla/5.0 (Linux; Android 15) Firefox/128.0")).toEqual({ platform: "Android", browser: "Firefox", label: "Firefox on Android" });
    expect(normalizeDeviceLabel("\u0000  My   phone \n", "Android")).toBe("My phone");
    expect(normalizeDeviceLabel("x".repeat(100), "Android")).toHaveLength(80);
  });

  it("uses opaque scoped identifiers and a throttled last-seen policy", () => {
    const device = opaqueSecurityId("device", "internal-row-id");
    const session = opaqueSecurityId("session", "internal-row-id");
    expect(device).toMatch(/^dev_[A-Za-z0-9_-]{24}$/);
    expect(session).toMatch(/^ses_[A-Za-z0-9_-]{24}$/);
    expect(device).not.toContain("internal-row-id");
    expect(device).not.toBe(session);
    expect(lastSeenIntervalMs).toBe(15 * 60_000);
  });

  it("binds step-up independently to Web and mobile authority", () => {
    expect(sessionBindingHash("WEB", "same")).not.toBe(sessionBindingHash("MOBILE", "same"));
    expect(sessionBindingHash("WEB", "one")).not.toBe(sessionBindingHash("WEB", "two"));
  });
});
