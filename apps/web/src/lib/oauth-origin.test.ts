import {readFileSync} from "node:fs";
import {join} from "node:path";
import {getApplicationOrigin,PRODUCTION_APP_URL} from "@popwam/shared";
import {describe,expect,it} from "vitest";

describe("OAuth application origin",()=>{
  it("honors only the explicitly isolated TEST origin in a production build",()=>{
    const origin="https://popwam-auth-test-test.up.railway.app";
    expect(getApplicationOrigin({NODE_ENV:"production",APP_URL:origin,RAILWAY_ENVIRONMENT_ID:"ff94b952-4772-4675-905d-b36def679071"})).toBe(origin);
    expect(getApplicationOrigin({NODE_ENV:"production",APP_URL:origin})).toBe(PRODUCTION_APP_URL);
    expect(getApplicationOrigin({NODE_ENV:"production",APP_URL:"https://unreviewed.invalid",RAILWAY_ENVIRONMENT_ID:"ff94b952-4772-4675-905d-b36def679071"})).toBe(PRODUCTION_APP_URL);
  });
  it("uses APP_URL as the canonical production origin",()=>{
    expect(getApplicationOrigin({NODE_ENV:"production",APP_URL:PRODUCTION_APP_URL})).toBe(PRODUCTION_APP_URL);
  });

  it("never returns a localhost origin in production",()=>{
    expect(getApplicationOrigin({NODE_ENV:"production",APP_URL:"https://localhost:8080"})).toBe(PRODUCTION_APP_URL);
    expect(getApplicationOrigin({NODE_ENV:"production"})).toBe(PRODUCTION_APP_URL);
  });

  it("keeps the Meta callback and dashboard redirects on the canonical application origin",()=>{
    const callback=readFileSync(join(process.cwd(),"src","app","api","integrations","[provider]","callback","route.ts"),"utf8");
    const providers=readFileSync(join(process.cwd(),"src","lib","connected-accounts.ts"),"utf8");
    expect(providers).toContain("/api/integrations/meta/callback");
    expect(callback).toContain("getApplicationOrigin()");
    expect(callback).toContain("connected=${provider}");
    expect(callback).not.toContain("url.origin");
    expect(callback).not.toContain("localhost");
  });
});
