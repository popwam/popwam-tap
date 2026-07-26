import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import type {AuthenticationResponseJSON} from "@simplewebauthn/server";
import {consumeVerifiedPasskeyAssertion,passkeyChallengeTypeForChannel,verifyPasskeyAssertion,type PasskeyAssertionLookup,type VerifiedPasskeyAssertion} from "./passkey-authentication";
import {passkeyExpectedOrigins} from "./passkeys";

const previousOrigins=process.env.PASSKEY_ANDROID_ORIGINS;
const previousOrigin=process.env.PASSKEY_ORIGIN;
const previousRp=process.env.PASSKEY_RP_ID;
beforeEach(()=>{process.env.PASSKEY_ANDROID_ORIGINS="android:apk-key-hash:abcdefghijklmnopqrstuvwxyz0123456789_-";process.env.PASSKEY_ORIGIN="https://pop.example";process.env.PASSKEY_RP_ID="pop.example"});
afterEach(()=>{if(previousOrigins===undefined)delete process.env.PASSKEY_ANDROID_ORIGINS;else process.env.PASSKEY_ANDROID_ORIGINS=previousOrigins;if(previousOrigin===undefined)delete process.env.PASSKEY_ORIGIN;else process.env.PASSKEY_ORIGIN=previousOrigin;if(previousRp===undefined)delete process.env.PASSKEY_RP_ID;else process.env.PASSKEY_RP_ID=previousRp});

const challenge="challenge-value";
const assertion={id:"credential-public-id",rawId:"credential-public-id",type:"public-key",clientExtensionResults:{},response:{authenticatorData:"AA",clientDataJSON:Buffer.from(JSON.stringify({type:"webauthn.get",challenge,origin:"android:apk-key-hash:abcdefghijklmnopqrstuvwxyz0123456789_-"})).toString("base64url"),signature:"AA"}} as AuthenticationResponseJSON;
const lookup=(overrides:Partial<{challenge:boolean;credential:boolean;status:string}>={}):PasskeyAssertionLookup=>({
  findChallenge:vi.fn(async type=>overrides.challenge===false?null:{id:`challenge-${type}`}),
  findCredential:vi.fn(async()=>overrides.credential===false?null:{id:"credential-row",userId:"user-1",credentialId:"credential-public-id",publicKey:new Uint8Array([1,2,3]),counter:4n,transports:["internal"],user:{status:overrides.status||"ACTIVE"}}),
});
const verifier=vi.fn(async()=>({verified:true,authenticationInfo:{newCounter:5,credentialBackedUp:true}})) as never;

describe("purpose-bound passkey authentication",()=>{
  it("keeps web and mobile challenge purposes distinct",()=>{
    expect(passkeyChallengeTypeForChannel("WEB")).toBe("AUTHENTICATE");
    expect(passkeyChallengeTypeForChannel("MOBILE")).toBe("AUTHENTICATE_MOBILE");
  });
  it("verifies a valid mobile assertion through the shared cryptographic core",async()=>{
    const result=await verifyPasskeyAssertion(assertion,"MOBILE",verifier,lookup());
    expect(result).toMatchObject({challengeType:"AUTHENTICATE_MOBILE",userId:"user-1",expectedCounter:4n,newCounter:5n,credentialBackedUp:true});
    expect(verifier).toHaveBeenCalledWith(expect.objectContaining({expectedOrigin:[expect.stringMatching(/^android:apk-key-hash:/)],expectedRPID:"pop.example",requireUserVerification:true,credential:expect.objectContaining({counter:4})}));
  });
  it("cannot use web purpose for mobile or mobile purpose for web",async()=>{
    const webOnly:PasskeyAssertionLookup={...lookup(),findChallenge:vi.fn(async type=>type==="AUTHENTICATE"?{id:"web"}:null)};
    const mobileOnly:PasskeyAssertionLookup={...lookup(),findChallenge:vi.fn(async type=>type==="AUTHENTICATE_MOBILE"?{id:"mobile"}:null)};
    expect(await verifyPasskeyAssertion(assertion,"MOBILE",verifier,webOnly)).toBeNull();
    expect(await verifyPasskeyAssertion(assertion,"WEB",verifier,mobileOnly)).toBeNull();
  });
  it("rejects expired consumed or missing challenges generically",async()=>expect(await verifyPasskeyAssertion(assertion,"MOBILE",verifier,lookup({challenge:false}))).toBeNull());
  it("rejects revoked or missing credentials and inactive users",async()=>{
    expect(await verifyPasskeyAssertion(assertion,"MOBILE",verifier,lookup({credential:false}))).toBeNull();
    expect(await verifyPasskeyAssertion(assertion,"MOBILE",verifier,lookup({status:"SUSPENDED"}))).toBeNull();
  });
  it("rejects invalid assertion RP or origin verification",async()=>{
    const rejected=vi.fn(async()=>{throw new Error("verification failed")}) as never;
    expect(await verifyPasskeyAssertion(assertion,"MOBILE",rejected,lookup())).toBeNull();
  });
  it("fails closed without an explicitly approved Android origin",()=>{
    delete process.env.PASSKEY_ANDROID_ORIGINS;
    expect(()=>passkeyExpectedOrigins("MOBILE")).toThrow("PASSKEY_ANDROID_ORIGIN_REQUIRED");
  });
  it("consumes a challenge once and preserves the verified counter update",async()=>{
    const proof:VerifiedPasskeyAssertion={challengeId:"challenge",challengeType:"AUTHENTICATE_MOBILE",credentialRowId:"credential",userId:"user-1",expectedCounter:4n,newCounter:5n,credentialBackedUp:true};
    const challengeUpdate=vi.fn(async()=>({count:1}));
    const credentialUpdate=vi.fn(async()=>({count:1}));
    await consumeVerifiedPasskeyAssertion({passkeyChallenge:{updateMany:challengeUpdate},passkeyCredential:{updateMany:credentialUpdate}} as never,proof);
    expect(challengeUpdate).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({type:"AUTHENTICATE_MOBILE",consumedAt:null})}));
    expect(credentialUpdate).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({counter:4n,revokedAt:null}),data:expect.objectContaining({counter:5n})}));
    await expect(consumeVerifiedPasskeyAssertion({passkeyChallenge:{updateMany:async()=>({count:0})}} as never,proof)).rejects.toThrow("PASSKEY_CHALLENGE_REPLAYED");
  });
});
