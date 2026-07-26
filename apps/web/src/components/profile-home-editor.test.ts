import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./profile-home-editor.tsx", import.meta.url), "utf8");
const en = JSON.parse(readFileSync(new URL("../../locales/en.json", import.meta.url), "utf8"));
const ar = JSON.parse(readFileSync(new URL("../../locales/ar.json", import.meta.url), "utf8"));

describe("Phase F Web Home editor UX", () => {
  it("loads a profile-first Home and supports safe profile switching", () => {
    expect(source).toContain('fetch(`/api/profiles${suffix}`');
    expect(source).toContain("switchProfile");
    expect(source).toContain("profile.isPrimary");
    expect(source).toContain("profile_switched");
  });

  it("keeps Add Profile clickable while explaining quota and onboarding gating", () => {
    expect(source).toContain("setAddProfileOpen(true)");
    expect(source).toContain("selector.quota.used");
    expect(source).toContain("quotaProgressBlocker");
    expect(source).toContain('href="/dashboard/plans"');
  });

  it("opens focused typed editors and never executes a server editor definition", () => {
    for (const key of ["IDENTITY", "ABOUT", "CONTACT", "LINKS", "SOCIAL", "SERVICES", "BRANCHES", "GALLERY", "PORTFOLIO"]) expect(source).toContain(`"${key}"`);
    expect(source).toContain("activeEditor");
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });

  it("distinguishes saving, saved, failed, retry, and stale conflict", () => {
    expect(source).toContain('"saving"');
    expect(source).toContain('"saved"');
    expect(source).toContain('"failed"');
    expect(source).toContain('"conflict"');
    expect(source).toContain("response.status === 409");
    expect(source).toContain("lastAction");
  });

  it("provides visibility, media, empty states, readiness deep links, and Phase E publish entry", () => {
    expect(source).toContain("VisibilitySelect");
    expect(source).toContain("uploadMedia");
    expect(source).toContain("noLinks");
    expect(source).toContain("noServices");
    expect(source).toContain("noBranches");
    expect(source).toContain("setActiveEditor(issue.module");
    expect(source).toContain("/dashboard/profile/publish?profile=");
  });

  it("uses native dialog semantics, accessible statuses, and complete English/Arabic keys", () => {
    expect(source).toContain("<dialog");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('role="status"');
    expect(Object.keys(en.homeEditor).sort()).toEqual(Object.keys(ar.homeEditor).sort());
    expect(ar.homeEditor.title).not.toBe(en.homeEditor.title);
  });
});
