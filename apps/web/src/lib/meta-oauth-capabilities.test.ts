import {afterEach,describe,expect,it,vi} from "vitest";
import {buildMetaOAuthScopes,enabledMetaOAuthCapabilities} from "./meta-oauth-capabilities";

vi.mock("server-only",()=>({}));

afterEach(()=>vi.unstubAllEnvs());

describe("Meta OAuth capabilities",()=>{
  it("requests only Facebook profile scopes by default",async()=>{
    vi.stubEnv("META_ENABLED","true");
    vi.stubEnv("META_APP_ID","test-app-id");
    vi.stubEnv("META_APP_SECRET","test-app-secret");
    vi.stubEnv("META_REDIRECT_URI","https://pop.popwam.com/api/integrations/meta/callback");
    vi.stubEnv("META_OAUTH_CAPABILITIES","");
    vi.stubEnv("INTEGRATION_TOKEN_ENCRYPTION_KEY","test-encryption-key");
    const {createOAuthRequest}=await import("./connected-accounts");
    const authorizationUrl=new URL(createOAuthRequest("meta","safe-test-state").authorizeUrl);
    expect(authorizationUrl.searchParams.get("scope")).toBe("public_profile,user_link");
    expect([...authorizationUrl.searchParams.keys()]).toContain("state");
    for(const unavailable of ["pages_show_list","instagram_basic","threads_basic","whatsapp_business_management"]){
      expect(authorizationUrl.searchParams.get("scope")).not.toContain(unavailable);
    }
  });

  it("adds optional permissions only for explicitly enabled reviewed capabilities",()=>{
    const env={META_OAUTH_CAPABILITIES:"facebook_pages,instagram,unknown"};
    expect(enabledMetaOAuthCapabilities(env)).toEqual(["facebook_profile","facebook_pages","instagram"]);
    expect(buildMetaOAuthScopes(env)).toEqual(["public_profile","user_link","pages_show_list","instagram_basic"]);
  });
});
