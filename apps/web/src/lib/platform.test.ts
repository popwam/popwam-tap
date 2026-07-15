import { describe, expect, it } from "vitest";
import { defaultIconKeys, normalizeShortCode, validateShortCode } from "@popwam/shared";
import { validateFileUpload, validateImageUpload } from "@popwam/storage";
import { decideTagResolution } from "./tag-resolution";
import { countsTowardLinkLimit, mergeEntitlements } from "./plans";
import { buildPlatformUrl, platformOpenTarget } from "./link-platforms";
import { normalizeEmail, isUniqueConstraintError, runAtomicUserCreation } from "./user-validation";
import { resolveProfileFieldUrl, visibleProfileFields } from "./profile-fields";
import { activationTokenMatches, createActivationCode, createOpaqueToken, hashActivationToken, isActivationToken, MAX_BATCH_QUANTITY, normalizeBatchPrefix, openActivationCode, sealActivationCode } from "./card-tokens";
import { normalizePhone } from "./phone";
import { createVCard, escapeVCard, safeVCardFilename } from "./vcard";
import { isSafeDestinationUrl } from "./url";
import { parseMoney } from "./money";
import ar from "../../locales/ar.json";
import en from "../../locales/en.json";

describe("localization and themes", () => {
  it("contains matching Arabic and English dictionaries", () => expect(Object.keys(ar)).toEqual(Object.keys(en)));
  it("provides Arabic/English UI and RTL/LTR values", () => { expect(ar.auth.signIn).toContain("تسجيل"); expect(en.auth.signIn).toBe("Sign in"); expect((["ar","en"] as const).map(locale => locale === "ar" ? "rtl" : "ltr")).toEqual(["rtl","ltr"]); });
  it("contains all six localized themes", () => { for (const key of ["classicDark","classicLight","elegantDark","elegantLight","businessDark","businessLight"] as const) { expect(ar.profile[key]).toBeTruthy(); expect(en.profile[key]).toBeTruthy(); } });
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
  it("excludes the public profile and core contact destinations from the link limit", () => { for (const type of ["PROFILE","PHONE","EMAIL","WEBSITE","WHATSAPP_PRIVATE","VCF"]) expect(countsTowardLinkLimit(type)).toBe(false); expect(countsTowardLinkLimit("INSTAGRAM")).toBe(true); expect(countsTowardLinkLimit("CUSTOM_URL")).toBe(true); });
});

describe("configurable link platforms", () => {
  it("builds username links and accepts the manual full-link fallback", () => { const instagram={slug:"instagram",inputType:"USERNAME_OR_URL",urlTemplate:"https://instagram.com/{value}"};expect(buildPlatformUrl(instagram,"@popwam")).toEqual({valid:true,url:"https://instagram.com/popwam"});expect(buildPlatformUrl(instagram,"https://instagram.com/popwam")).toEqual({valid:true,url:"https://instagram.com/popwam"}); });
  it("normalizes Egyptian and international WhatsApp numbers", () => { const whatsapp={slug:"whatsapp",inputType:"PHONE",urlTemplate:"https://wa.me/{value}"};expect(buildPlatformUrl(whatsapp,"010 1234 5678")).toEqual({valid:true,url:"https://wa.me/201012345678"});expect(buildPlatformUrl(whatsapp,"+373 60 000 000")).toEqual({valid:true,url:"https://wa.me/37360000000"}); });
  it("uses app links only when present and keeps a web fallback", () => { const platform={slug:"x",inputType:"USERNAME",androidAppUrl:"x://profile",webFallback:"https://x.com"};expect(platformOpenTarget(platform,"android")).toBe("x://profile");expect(platformOpenTarget(platform,"ios")).toBe("https://x.com"); });
});

describe("financial integrity", () => {
  it("calculates authoritative money without JavaScript floating point", () => {
    expect(parseMoney("0.10").plus(parseMoney("0.20")).toFixed(2)).toBe("0.30");
    expect(parseMoney("19.99").mul(3).toFixed(2)).toBe("59.97");
  });
  it("rejects negative, over-precision and oversized money", () => {
    for (const value of ["-1", "1.001", "1000000000000.00", "NaN"]) expect(() => parseMoney(value)).toThrow("INVALID_MONEY");
  });
});

describe("short links and single destination NFC", () => {
  it("normalizes codes and rejects reserved paths", () => { expect(normalizeShortCode(" My Card ")).toBe("my-card"); expect(validateShortCode("admin")).toMatchObject({ valid:false,reason:"reserved" }); expect(validateShortCode("m1")).toMatchObject({ valid:true,code:"m1" }); });
  it("does not silently fall back to a profile", () => expect(decideTagResolution({ status:"ACTIVE",activeDestination:null })).toEqual({ kind:"unconfigured" }));
  it("opens profile only when selected", () => expect(decideTagResolution({ status:"ACTIVE",activeDestination:{ isActive:true,type:"PROFILE",url:"/p/id/1",profileId:"p1" } })).toEqual({ kind:"profile",profileId:"p1" }));
  it("redirects only to the selected destination", () => expect(decideTagResolution({ status:"ACTIVE",activeDestination:{ isActive:true,type:"WHATSAPP_PRIVATE",url:"https://wa.me/1" } })).toEqual({ kind:"redirect",url:"https://wa.me/1" }));
  it("accepts trusted internal vCard paths but rejects protocol-relative and backslash redirects", () => { expect(isSafeDestinationUrl("/api/profiles/p1/contact.vcf")).toBe(true); expect(isSafeDestinationUrl("//evil.example/path")).toBe(false); expect(isSafeDestinationUrl("/\\evil.example/path")).toBe(false); expect(isSafeDestinationUrl("/%5cevil.example/path")).toBe(false); });
  it("keeps multiple tag decisions independent", () => { const work = decideTagResolution({ status:"ACTIVE",activeDestination:{ isActive:true,type:"WEBSITE",url:"https://work.example" } }); const events = decideTagResolution({ status:"ACTIVE",activeDestination:{ isActive:true,type:"CUSTOM_URL",url:"https://events.example" } }); expect(work).toMatchObject({ url:"https://work.example" }); expect(events).toMatchObject({ url:"https://events.example" }); });
  it("accepts distinct globally-valid short codes for one owner", () => { for (const code of ["mamdouh","mamdouh-work","mamdouh-events"]) expect(validateShortCode(code).valid).toBe(true); expect(new Set(["mamdouh","mamdouh-work","mamdouh-events"]).size).toBe(3); });
  it("handles missing destination/status", () => expect(decideTagResolution({ status:"PAUSED",activeDestination:null })).toEqual({ kind:"status",status:"paused" }));
});

describe("custom fields, uploads and icons", () => {
  it("renders only visible fields in order", () => expect(visibleProfileFields([{ id:"hidden",isVisible:false,sortOrder:0 },{ id:"second",isVisible:true,sortOrder:2 },{ id:"first",isVisible:true,sortOrder:1 }]).map(x => x.id)).toEqual(["first","second"]));
  it("makes actionable fields clickable", () => { expect(resolveProfileFieldUrl({ type:"PHONE",value:"+37360000000",actionUrl:null })).toBe("tel:+37360000000"); expect(resolveProfileFieldUrl({ type:"TEXT",value:"hello",actionUrl:null })).toBeNull(); });
  it("rejects executable and oversized uploads", () => { expect(validateFileUpload({ filename:"bad.exe",contentType:"application/pdf",size:100 }).valid).toBe(false); expect(validateImageUpload({ filename:"large.jpg",contentType:"image/jpeg",size:99*1024*1024 }).valid).toBe(false); });
  it("rejects extension and MIME mismatches", () => { expect(validateFileUpload({ filename:"document.jpg",contentType:"application/pdf",size:100 }).valid).toBe(false); expect(validateImageUpload({ filename:"avatar.pdf",contentType:"image/jpeg",size:100 }).valid).toBe(false); });
  it("has a default icon for every known type", () => { for (const value of Object.values(defaultIconKeys)) expect(value).toMatch(/^[a-z]+$/); expect(defaultIconKeys.FILE).toBe("file"); });
});

describe("physical card activation architecture", () => {
  it("stores only a deterministic SHA-256 hash", () => { const token=createOpaqueToken();const hash=hashActivationToken(token);expect(token).not.toBe(hash);expect(hash).toMatch(/^[a-f0-9]{64}$/);expect(activationTokenMatches(token,hash)).toBe(true);expect(activationTokenMatches(`${token}x`,hash)).toBe(false); });
  it("creates printable activation codes without confusing characters", () => { const code=createActivationCode();expect(code).toMatch(/^[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/);expect(isActivationToken(code)).toBe(true);expect(hashActivationToken(code.toLowerCase())).toBe(hashActivationToken(code)); });
  it("encrypts printable activation codes at rest while retaining HMAC lookup", () => { const code="A7K9-M2Q4",pepper="test-only-pepper";const sealed=sealActivationCode(code,pepper);expect(sealed).not.toContain(code);expect(openActivationCode(sealed,pepper)).toBe(code);expect(hashActivationToken(code,pepper)).toHaveLength(64); });
  it("uses a safe batch maximum and normalized permanent slug prefix", () => { expect(MAX_BATCH_QUANTITY).toBe(1000);expect(normalizeBatchPrefix(" PW Cards ","pw")).toBe("pw-cards"); });
});

describe("phone OTP and dynamic contacts",()=>{
  it("normalizes Egyptian mobiles and international E.164",()=>{expect(normalizePhone("010 1234 5678")).toEqual({valid:true,e164:"+201012345678"});expect(normalizePhone("201012345678")).toEqual({valid:true,e164:"+201012345678"});expect(normalizePhone("+201012345678")).toEqual({valid:true,e164:"+201012345678"});expect(normalizePhone("+37360000000")).toEqual({valid:true,e164:"+37360000000"});expect(normalizePhone("123").valid).toBe(false)});
  it("generates UTF-8-safe vCard text with escaped values",()=>{const value=createVCard({kind:"individual",displayName:"ممدوح، POPWAM",firstName:"ممدوح",phones:["+201000000000"],notes:"line 1\nline 2"});expect(value).toContain("BEGIN:VCARD\r\nVERSION:4.0");expect(value).toContain("FN:ممدوح، POPWAM");expect(value).toContain("NOTE:line 1\\nline 2");expect(escapeVCard("a;b,c")).toBe("a\\;b\\,c");expect(safeVCardFilename("Mamdouh / POPWAM")).toBe("Mamdouh-POPWAM.vcf")});
});
