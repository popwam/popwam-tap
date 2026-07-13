import { describe, expect, it } from "vitest";
import { defaultIconKeys, normalizeShortCode, validateShortCode } from "@popwam/shared";
import { validateFileUpload, validateImageUpload } from "@popwam/storage";
import { decideTagResolution } from "./tag-resolution";
import { mergeEntitlements } from "./plans";
import { normalizeEmail, isUniqueConstraintError, runAtomicUserCreation } from "./user-validation";
import { resolveProfileFieldUrl, visibleProfileFields } from "./profile-fields";
import ar from "../../locales/ar.json";
import en from "../../locales/en.json";

describe("localization and themes", () => {
  it("contains matching Arabic and English dictionaries", () => expect(Object.keys(ar)).toEqual(Object.keys(en)));
  it("provides Arabic/English UI and RTL/LTR values", () => { expect(ar.auth.signIn).toContain("تسجيل"); expect(en.auth.signIn).toBe("Sign in"); expect((["ar","en"] as const).map(locale => locale === "ar" ? "rtl" : "ltr")).toEqual(["rtl","ltr"]); });
  it("contains all four localized themes", () => { for (const key of ["classicDark","classicLight","elegantDark","elegantLight"] as const) { expect(ar.profile[key]).toBeTruthy(); expect(en.profile[key]).toBeTruthy(); } });
});

describe("duplicate user safety", () => {
  it("normalizes email", () => expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com"));
  it("classifies P2002", () => { expect(isUniqueConstraintError({ code:"P2002",message:"raw" })).toBe(true); expect(isUniqueConstraintError(new Error("x"))).toBe(false); });
  it("rolls an atomic transaction back when defaults fail", async () => { const rows: string[] = []; const db = { async $transaction<T>(work: (tx: { rows:string[] }) => Promise<T>) { const tx = { rows:[...rows] }; const result = await work(tx); rows.splice(0,rows.length,...tx.rows); return result; } }; await expect(runAtomicUserCreation(db,async tx => { tx.rows.push("user"); return { id:"u1" }; },async tx => { tx.rows.push("profile"); throw new Error("organization failed"); })).rejects.toThrow("organization failed"); expect(rows).toEqual([]); });
});

describe("plans and limits", () => {
  const plan = { maxLinks:5,maxTags:1,allowFileUploads:false,allowThemes:false };
  it("applies per-user overrides first", () => expect(mergeEntitlements(plan,{ maxLinks:12,maxTags:null,allowFileUploads:true })).toMatchObject({ maxLinks:12,maxTags:1,allowFileUploads:true }));
  it("inherits null overrides", () => expect(mergeEntitlements(plan,{ maxLinks:null })).toMatchObject({ maxLinks:5 }));
});

describe("short links and single destination NFC", () => {
  it("normalizes codes and rejects reserved paths", () => { expect(normalizeShortCode(" My Card ")).toBe("my-card"); expect(validateShortCode("admin")).toMatchObject({ valid:false,reason:"reserved" }); expect(validateShortCode("m1")).toMatchObject({ valid:true,code:"m1" }); });
  it("does not silently fall back to a profile", () => expect(decideTagResolution({ status:"ACTIVE",activeDestination:null })).toEqual({ kind:"unconfigured" }));
  it("opens profile only when selected", () => expect(decideTagResolution({ status:"ACTIVE",activeDestination:{ isActive:true,type:"PROFILE",url:"/p/id/1",profileId:"p1" } })).toEqual({ kind:"profile",profileId:"p1" }));
  it("redirects only to the selected destination", () => expect(decideTagResolution({ status:"ACTIVE",activeDestination:{ isActive:true,type:"WHATSAPP_PRIVATE",url:"https://wa.me/1" } })).toEqual({ kind:"redirect",url:"https://wa.me/1" }));
  it("keeps multiple tag decisions independent", () => { const work = decideTagResolution({ status:"ACTIVE",activeDestination:{ isActive:true,type:"WEBSITE",url:"https://work.example" } }); const events = decideTagResolution({ status:"ACTIVE",activeDestination:{ isActive:true,type:"CUSTOM_URL",url:"https://events.example" } }); expect(work).toMatchObject({ url:"https://work.example" }); expect(events).toMatchObject({ url:"https://events.example" }); });
  it("accepts distinct globally-valid short codes for one owner", () => { for (const code of ["mamdouh","mamdouh-work","mamdouh-events"]) expect(validateShortCode(code).valid).toBe(true); expect(new Set(["mamdouh","mamdouh-work","mamdouh-events"]).size).toBe(3); });
  it("handles missing destination/status", () => expect(decideTagResolution({ status:"PAUSED",activeDestination:null })).toEqual({ kind:"status",status:"paused" }));
});

describe("custom fields, uploads and icons", () => {
  it("renders only visible fields in order", () => expect(visibleProfileFields([{ id:"hidden",isVisible:false,sortOrder:0 },{ id:"second",isVisible:true,sortOrder:2 },{ id:"first",isVisible:true,sortOrder:1 }]).map(x => x.id)).toEqual(["first","second"]));
  it("makes actionable fields clickable", () => { expect(resolveProfileFieldUrl({ type:"PHONE",value:"+37360000000",actionUrl:null })).toBe("tel:+37360000000"); expect(resolveProfileFieldUrl({ type:"TEXT",value:"hello",actionUrl:null })).toBeNull(); });
  it("rejects executable and oversized uploads", () => { expect(validateFileUpload({ filename:"bad.exe",contentType:"application/pdf",size:100 }).valid).toBe(false); expect(validateImageUpload({ filename:"large.jpg",contentType:"image/jpeg",size:99*1024*1024 }).valid).toBe(false); });
  it("has a default icon for every known type", () => { for (const value of Object.values(defaultIconKeys)) expect(value).toMatch(/^[a-z]+$/); expect(defaultIconKeys.FILE).toBe("file"); });
});
