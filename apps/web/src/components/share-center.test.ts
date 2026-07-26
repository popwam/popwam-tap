import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./share-center.tsx", import.meta.url), "utf8");
const scanner = readFileSync(new URL("./activation-scanner.tsx", import.meta.url), "utf8");
const en = JSON.parse(readFileSync(new URL("../../locales/en.json", import.meta.url), "utf8"));
const ar = JSON.parse(readFileSync(new URL("../../locales/ar.json", import.meta.url), "utf8"));

describe("Phase G Web Share Center", () => {
  it("loads profiles, server-approved targets, and a bounded product projection", () => {
    expect(source).toContain('fetch("/api/profiles"');
    expect(source).toContain("/share-targets?locale=");
    expect(source).toContain('fetch("/api/share/products"');
    expect(source).not.toContain("activationSecretHash");
  });

  it("keeps the user flow ordered as what to share then how to share", () => {
    expect(source.indexOf("copy.whatTitle")).toBeLessThan(source.indexOf("copy.howTitle"));
    expect(source).toContain("setTargetId");
    expect(source).toContain("QRCodeSVG");
  });

  it("offers Web Share with a copy fallback and does not claim QR success", () => {
    expect(source).toContain("navigator.share");
    expect(source).toContain("navigator.clipboard?.writeText");
    expect(source).toContain('document.execCommand("copy")');
    expect(source).toContain("share_qr_opened");
    expect(en.shareCenter.qrReady).not.toMatch(/success|shared successfully/i);
  });

  it("requests the camera only after the scanner action and retains manual fallback", () => {
    expect(scanner).toContain("navigator.mediaDevices.getUserMedia");
    expect(scanner).toContain('onClick={()=>camera()}');
    expect(scanner).toContain('setMode("manual")');
    expect(scanner).toContain('type="file"');
  });

  it("requires the scratch secret plus explicit profile and target for claim", () => {
    expect(source).toContain("scratchSecret: scratch");
    expect(source).toContain("profileId: activationProfileId");
    expect(source).toContain("targetId: activationTargetId");
    expect(source).toContain("/api/share/activation/claim");
    expect(source).toContain('scratch.length !== 6');
  });

  it("supports target changes and pause/resume without changing the permanent URL", () => {
    expect(source).toContain('"TARGET_CHANGE"');
    expect(source).toContain('"STATUS_CHANGE"');
    expect(source).toContain('"PAUSED"');
    expect(source).toContain("product.permanentUrl");
  });

  it("uses native dialog semantics, live feedback, and matching English/Arabic keys", () => {
    expect(source).toContain("<dialog");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('role="img"');
    expect(Object.keys(en.shareCenter).sort()).toEqual(Object.keys(ar.shareCenter).sort());
    expect(ar.shareCenter.title).not.toBe(en.shareCenter.title);
  });
});
