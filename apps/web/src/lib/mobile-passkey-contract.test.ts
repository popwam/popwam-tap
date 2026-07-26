import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
import {mobilePasskeyAuditMetadata,mobilePasskeySuccessResponse,runMobilePasskeyAuthentication} from "./mobile-passkey-contract";

describe("mobile passkey session contract",()=>{
  it("returns standard mobile tokens and never a browser auth ticket",()=>{
    const response=mobilePasskeySuccessResponse({accessToken:"access",refreshToken:"refresh",accessExpiresIn:900,refreshExpiresIn:2_592_000,tokenType:"Bearer"},{id:"user"});
    expect(response).toMatchObject({ok:true,accessToken:"access",refreshToken:"refresh",tokenType:"Bearer"});
    expect(response).not.toHaveProperty("ticket");
    expect(response).not.toHaveProperty("authTicket");
  });
  it("records only the safe PASSKEY authentication audit dimensions",()=>expect(mobilePasskeyAuditMetadata()).toEqual({platform:"ANDROID",method:"PASSKEY",outcome:"SUCCESS"}));
  it("a valid verified assertion reaches standard mobile session issuance exactly once",async()=>{
    let finalized=0;
    const result=await runMobilePasskeyAuthentication({assertion:"signed"},"Android",{
      verify:async()=>({userId:"user-1",challengeId:"challenge"}),
      finalize:async()=>{finalized++;return {session:{accessToken:"access",refreshToken:"refresh"}}},
    });
    expect(result).toEqual({session:{accessToken:"access",refreshToken:"refresh"}});
    expect(finalized).toBe(1);
  });
  it("an invalid assertion never reaches token issuance",async()=>{
    let finalized=0;
    expect(await runMobilePasskeyAuthentication({},undefined,{verify:async()=>null,finalize:async()=>{finalized++;return {}}})).toBeNull();
    expect(finalized).toBe(0);
  });
  it("does not depend on Firebase or NextAuth in the mobile passkey issuer",()=>{
    const source=readFileSync(join(process.cwd(),"src","lib","mobile-passkey-auth.ts"),"utf8");
    expect(source).not.toMatch(/firebase/i);
    expect(source).not.toMatch(/next-auth|AuthTicket|authTicket/);
    expect(source).toContain("issueMobileSession");
  });
  it("preserves the distinct Web auth-ticket output",()=>{
    const webRoute=readFileSync(join(process.cwd(),"src","app","api","passkeys","authenticate","verify","route.ts"),"utf8");
    const mobileRoute=readFileSync(join(process.cwd(),"src","app","api","mobile","auth","passkey","verify","route.ts"),"utf8");
    expect(webRoute).toContain("authTicket.create");
    expect(webRoute).toContain("ticket");
    expect(mobileRoute).not.toContain("authTicket");
    expect(mobileRoute).not.toMatch(/\bticket\b/);
  });
});
