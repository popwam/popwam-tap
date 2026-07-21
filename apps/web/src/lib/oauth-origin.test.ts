import {readFileSync} from "node:fs";
import {join} from "node:path";
import {getApplicationOrigin,PRODUCTION_APP_URL} from "@popwam/shared";
import {describe,expect,it} from "vitest";

describe("OAuth application origin",()=>{
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
