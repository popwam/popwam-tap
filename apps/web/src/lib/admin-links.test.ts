import { describe, expect, it } from "vitest";
import { readableAuditMessage, safeAuditMetadata } from "./audit";
import { ADMIN_USER_ACCORDIONS_OPEN_BY_DEFAULT, userMatchesAdminLinkSearch } from "./admin-links";

describe("links grouped by user", () => {
  it("keeps every user accordion closed by default", () => expect(ADMIN_USER_ACCORDIONS_OPEN_BY_DEFAULT).toBe(false));
  it("searches user, link, short-code and production batch fields", () => { const user={name:"Mina",email:"mina@example.test",links:["Portfolio"],shortCodes:["mina-01"],batchCodes:["JUL-100"]};expect(userMatchesAdminLinkSearch(user,"portfolio")).toBe(true);expect(userMatchesAdminLinkSearch(user,"JUL-100")).toBe(true);expect(userMatchesAdminLinkSearch(user,"other")).toBe(false); });
});

describe("readable audit logs",()=>{it("formats a user-facing sentence",()=>expect(readableAuditMessage({actor:"Mamdouh",operation:"admin.card.damaged",target:"POP-001"})).toContain("Mamdouh marked as damaged card POP-001"));it("redacts secrets from expanded metadata",()=>expect(safeAuditMetadata({activationTokenHash:"abc",quantity:10})).toEqual({activationTokenHash:"[redacted]",quantity:10}));});
