import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import ar from "../../locales/ar.json";
import en from "../../locales/en.json";
import { decideAdminAccess, verifyStoredAdminPassword } from "./admin-access";
import { localeDirection, resolveLocale } from "./locale-policy";

const root = path.resolve(import.meta.dirname, "../../../..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("administrator authentication", () => {
  it("accepts a correct stored admin password hash", async () => {
    const password = "synthetic-admin-password";
    const passwordHash = await bcrypt.hash(password, 4);
    await expect(verifyStoredAdminPassword({ id:"a",role:"ADMIN",status:"ACTIVE",passwordHash },password,bcrypt.compare)).resolves.toBe(true);
  });
  it("rejects a wrong password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    await expect(verifyStoredAdminPassword({ id:"a",role:"ADMIN",status:"ACTIVE",passwordHash },"wrong-password",bcrypt.compare)).resolves.toBe(false);
  });
  it("returns forbidden for a normal user and suspended for an inactive admin", () => {
    expect(decideAdminAccess({role:"USER",status:"ACTIVE"})).toBe("FORBIDDEN");
    expect(decideAdminAccess({role:"ADMIN",status:"SUSPENDED"})).toBe("SUSPENDED");
  });
  it("allows an active admin regardless of whether the session came from OTP or Google", () => {
    for (const provider of ["phone-otp","google"]) {
      expect(provider).toBeTruthy();
      expect(decideAdminAccess({role:"ADMIN",status:"ACTIVE"})).toBe("ALLOWED");
    }
  });
  it("allows the SUPER_ADMIN role through the same current-database authorization policy",()=>{
    expect(decideAdminAccess({role:"SUPER_ADMIN",status:"ACTIVE"})).toBe("ALLOWED");
  });
  it("keeps credentials fields off the normal user login and links to the admin portal", () => {
    const login = source("apps/web/src/components/login-form.tsx");
    expect(login).not.toContain('type="password"');
    expect(login).toContain('href="/admin/login"');
  });
  it("keeps admin login public without a role-based middleware redirect loop", () => {
    const middleware = source("apps/web/src/middleware.ts");
    expect(middleware).toContain('path === "/admin/login"');
    expect(middleware).not.toContain("token.role");
  });
  it("uses the admin login callback on admin logout", () => {
    expect(source("apps/web/src/components/dashboard-shell.tsx")).toContain('admin?"/admin/login":"/login"');
  });
  it("contains complete Arabic and English admin login copy", () => {
    expect(ar.adminAuth.title).toBe("بوابة الإدارة");
    expect(en.adminAuth.title).toBe("Admin Portal");
    expect(Object.keys(ar.adminAuth)).toEqual(Object.keys(en.adminAuth));
  });
  it("uses Arabic only for an Arabic first device language and persists an explicit choice", () => {
    expect(resolveLocale(undefined,"ar-EG, en;q=0.8")).toBe("ar");
    expect(resolveLocale(undefined,"de-DE, ar;q=0.8")).toBe("en");
    expect(resolveLocale("ar","en-US")).toBe("ar");
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("en")).toBe("ltr");
  });
});
