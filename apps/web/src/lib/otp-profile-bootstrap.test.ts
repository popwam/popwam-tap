import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
const mock=vi.hoisted(()=>({db:{} as any,legal:vi.fn(),template:vi.fn(),modules:vi.fn(),quota:vi.fn()}));
vi.mock("@popwam/db",async()=>({...await vi.importActual<typeof import("@popwam/db")>("@popwam/db"),prisma:mock.db}));
vi.mock("./legal-consent",()=>({resolvedAccountLegalDocuments:mock.legal,acceptActiveRequiredLegalDocuments:vi.fn()}));
vi.mock("./profile-domain",()=>({validateProfileQuota:mock.quota,initializeDefaultModules:mock.modules}));
vi.mock("./profile-bootstrap-template",()=>({resolveInitialTemplate:mock.template}));
vi.mock("./account-type-policy",()=>({getAccountTypePolicies:vi.fn(async()=>({PERSONAL:{enabled:true},BUSINESS:{enabled:true}}))}));
vi.mock("./plans",()=>({getUserEntitlements:vi.fn()}));
import { completeInitialProfileBootstrap } from "./profile-bootstrap";
const input={userId:"user",locale:"en",displayName:"Actual user choice",profileKind:"PERSONAL" as const,categorySlug:"personal",templateId:"approved"};
beforeEach(()=>{
  const documents=["TERMS","PRIVACY"].map(documentType=>({id:documentType,documentType,required:true,requiresAcceptance:true,isActive:true,status:"PUBLISHED",effectiveAt:new Date(0)}));
  mock.legal.mockResolvedValue(documents);mock.template.mockResolvedValue({id:"approved"});mock.quota.mockResolvedValue({plan:{slug:"free"}});mock.modules.mockReset();
  Object.assign(mock.db,{
    onboardingProgress:{findUnique:vi.fn().mockResolvedValue({data:{phaseCNewAccount:true}}),upsert:vi.fn()},
    userLegalConsent:{findMany:vi.fn().mockResolvedValue(documents.map(d=>({legalDocumentId:d.id})))},
    profile:{findMany:vi.fn().mockResolvedValue([]),create:vi.fn(async({data})=>({id:"profile",...data})),update:vi.fn(async({where,data})=>({id:where.id,...data}))},
    virtualCard:{upsert:vi.fn()},user:{update:vi.fn()},auditLog:{create:vi.fn()},
    $transaction:vi.fn((run:any)=>run(mock.db)),
  });
});
describe("first verified phone account profile setup",()=>{
  it("creates the first draft from submitted identity without placeholder/contact content",async()=>{const profile=await completeInitialProfileBootstrap(input);expect(profile.displayName).toBe(input.displayName);expect(mock.db.profile.create).toHaveBeenCalledTimes(1);const data=mock.db.profile.create.mock.calls[0][0].data;expect(data).toMatchObject({userId:"user",lifecycle:"DRAFT",isPrimary:true});expect(data.email).toBeUndefined();expect(data.bio).toBeUndefined();expect(mock.db.virtualCard.upsert).toHaveBeenCalledTimes(1)});
  it("preserves historical single-placeholder compatibility",async()=>{mock.db.profile.findMany.mockResolvedValue([{id:"existing",displayNameAr:null,displayNameEn:null}]);await completeInitialProfileBootstrap(input);expect(mock.db.profile.create).not.toHaveBeenCalled();expect(mock.db.profile.update.mock.calls[0][0].where.id).toBe("existing")});
  it("rejects missing user name before creating any profile",async()=>{await expect(completeInitialProfileBootstrap({...input,displayName:" "})).rejects.toThrow("PROFILE_NAME_REQUIRED");expect(mock.db.profile.create).not.toHaveBeenCalled()});
  it("requires current legal consent",async()=>{mock.db.userLegalConsent.findMany.mockResolvedValue([]);await expect(completeInitialProfileBootstrap(input)).rejects.toThrow("LEGAL_CONSENT_REQUIRED");expect(mock.db.profile.create).not.toHaveBeenCalled()});
  it("does not rewrite existing multi-profile accounts",async()=>{mock.db.profile.findMany.mockResolvedValue([{id:"a"},{id:"b"}]);await expect(completeInitialProfileBootstrap(input)).rejects.toThrow("PROFILE_BOOTSTRAP_COMPATIBILITY_REQUIRED");expect(mock.db.profile.create).not.toHaveBeenCalled();expect(mock.db.profile.update).not.toHaveBeenCalled()});
  it("permits an existing account with no profile without a retired new-account marker",async()=>{mock.db.onboardingProgress.findUnique.mockResolvedValue({data:{}});expect((await completeInitialProfileBootstrap(input)).id).toBe("profile")});
  it("enforces BUSINESS entitlement before writing a profile",async()=>{mock.quota.mockRejectedValueOnce(new Error("BUSINESS_PLAN_REQUIRED"));await expect(completeInitialProfileBootstrap({...input,profileKind:"BUSINESS"})).rejects.toThrow("BUSINESS_PLAN_REQUIRED");expect(mock.db.profile.create).not.toHaveBeenCalled()});
  it("does not rewrite an existing primary profile",async()=>{mock.db.profile.findMany.mockResolvedValue([{id:"existing",isPrimary:true,lifecycle:"DRAFT"}]);expect((await completeInitialProfileBootstrap(input)).id).toBe("existing");expect(mock.db.profile.update).not.toHaveBeenCalled()});
  it("records the post-creation resume checkpoint",async()=>{await completeInitialProfileBootstrap(input);expect(mock.db.onboardingProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({update:expect.objectContaining({data:expect.objectContaining({pass7Step:"TEMPLATE",accountKind:"PERSONAL"})})}))});
});
