import {afterEach,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {hashMobileRefreshToken,issueMobileSession,verifyMobileAccessToken} from "./mobile-auth";

const previousSecret=process.env.MOBILE_TOKEN_SECRET;
afterEach(()=>{if(previousSecret===undefined)delete process.env.MOBILE_TOKEN_SECRET;else process.env.MOBILE_TOKEN_SECRET=previousSecret});

describe("shared POP mobile session issuance",()=>{
  it("issues normal access semantics and stores only the hashed rotating refresh token",async()=>{
    process.env.MOBILE_TOKEN_SECRET="m".repeat(48);
    const records:Array<Record<string,unknown>>=[];
    const db={
      deviceSession:{upsert:async()=>({id:"device-session-1"})},
      mobileRefreshToken:{create:async(input:{data:Record<string,unknown>})=>{records.push(input.data);return input.data}},
    };
    const session=await issueMobileSession(db as never,{id:"user-1",role:"USER"},"Android");
    const claims=verifyMobileAccessToken(session.accessToken);
    expect(claims).toMatchObject({sub:"user-1",role:"USER",typ:"access",sid:"device-session-1"});
    expect(session.accessExpiresIn).toBe(900);
    expect(session.refreshExpiresIn).toBe(30*24*60*60);
    expect(records).toHaveLength(1);
    expect(records[0].tokenHash).toBe(hashMobileRefreshToken(session.refreshToken));
    expect(records[0]).not.toHaveProperty("refreshToken");
    expect(records[0].familyId).toBeTruthy();
  });
});
