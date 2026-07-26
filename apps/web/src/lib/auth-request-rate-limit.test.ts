import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {authRequestAllowed} from "./auth-request-rate-limit";

describe("mobile auth request throttling",()=>{
  it("limits a privacy-safe request context without using claimed account data",()=>{
    const request=new Request("https://pop.example/api/mobile/auth/passkey/options",{headers:{"x-forwarded-for":"192.0.2.10","user-agent":"android-test"}});
    expect(authRequestAllowed(request,"test-passkey",2,60_000,1_000)).toBe(true);
    expect(authRequestAllowed(request,"test-passkey",2,60_000,1_001)).toBe(true);
    expect(authRequestAllowed(request,"test-passkey",2,60_000,1_002)).toBe(false);
    expect(authRequestAllowed(request,"test-passkey",2,60_000,61_001)).toBe(true);
  });
});
