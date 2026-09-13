import { describe,it,expect,vi,beforeEach,afterEach } from "vitest";
import { createHash,generateKeyPairSync,sign,randomBytes } from "node:crypto";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
vi.mock("server-only",()=>({}));
import { verifyPasskeyAssertion,type PasskeyAssertionLookup } from "./passkey-authentication";
const origin="android:apk-key-hash:abcdefghijklmnopqrstuvwxyz0123456789_-";
const rp="pass7.example";
const hash=(value:Buffer|string)=>createHash("sha256").update(value).digest();
const b64=(value:Buffer)=>value.toString("base64url");
const pair=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
const jwk=pair.publicKey.export({format:"jwk"});
const publicKey=Buffer.concat([Buffer.from([0xa5,1,2,3,0x26,0x20,1,0x21,0x58,32]),Buffer.from(jwk.x!,"base64url"),Buffer.from([0x22,0x58,32]),Buffer.from(jwk.y!,"base64url")]);
const id=randomBytes(32),challenge=b64(randomBytes(32));
function assertion(counter=1,requestOrigin=origin,userHandle=b64(Buffer.from("user"))) {
  const client=Buffer.from(JSON.stringify({type:"webauthn.get",challenge,origin:requestOrigin}));
  const count=Buffer.alloc(4);count.writeUInt32BE(counter);
  const auth=Buffer.concat([hash(rp),Buffer.from([5]),count]);
  return {id:b64(id),rawId:b64(id),type:"public-key" as const,clientExtensionResults:{},response:{clientDataJSON:b64(client),authenticatorData:b64(auth),signature:b64(sign("sha256",Buffer.concat([auth,hash(client)]),pair.privateKey)),userHandle}};
}
function lookup(counter=0n):PasskeyAssertionLookup{return {findChallenge:async()=>({id:"challenge"}),findCredential:async()=>({id:"row",userId:"user",credentialId:b64(id),publicKey,counter,transports:["internal"],user:{status:"ACTIVE"}})}}
beforeEach(()=>{vi.stubEnv("PASSKEY_ANDROID_ORIGINS",origin);vi.stubEnv("PASSKEY_ORIGIN","https://"+rp);vi.stubEnv("PASSKEY_RP_ID",rp)});
afterEach(()=>vi.unstubAllEnvs());
describe("PASS 7 real WebAuthn cryptographic verification",()=>{
  it("verifies a real ES256 platform assertion and counter",async()=>expect(await verifyPasskeyAssertion(assertion(),"MOBILE",undefined,lookup())).toMatchObject({userId:"user",newCounter:1n}));
  it("rejects the wrong account user handle even with a valid signature",async()=>expect(await verifyPasskeyAssertion(assertion(1,origin,b64(Buffer.from("other"))),"MOBILE",undefined,lookup())).toBeNull());
  it("rejects an untrusted origin with a valid signature",async()=>expect(await verifyPasskeyAssertion(assertion(1,"https://attacker.example"),"MOBILE",undefined,lookup())).toBeNull());
  it("rejects a stale sign counter",async()=>expect(await verifyPasskeyAssertion(assertion(1),"MOBILE",undefined,lookup(2n))).toBeNull());
  it("accepts zero counters for synchronized authenticators",async()=>expect(await verifyPasskeyAssertion(assertion(0),"MOBILE",undefined,lookup())).toMatchObject({newCounter:0n}));
  it("rejects a modified signature",async()=>{const value=assertion();value.response.signature=b64(randomBytes(72));expect(await verifyPasskeyAssertion(value,"MOBILE",undefined,lookup())).toBeNull()});
  it("verifies real registration and returns only the public credential",async()=>{
    const auth=Buffer.concat([hash(rp),Buffer.from([0x45]),Buffer.alloc(4),Buffer.alloc(16),Buffer.from([0,id.length]),id,publicKey]);
    const attestation=Buffer.concat([Buffer.from([0xa3,0x63]),Buffer.from("fmt"),Buffer.from([0x64]),Buffer.from("none"),Buffer.from([0x67]),Buffer.from("attStmt"),Buffer.from([0xa0,0x68]),Buffer.from("authData"),Buffer.from([0x58,auth.length]),auth]);
    const result=await verifyRegistrationResponse({response:{id:b64(id),rawId:b64(id),type:"public-key",clientExtensionResults:{},response:{clientDataJSON:b64(Buffer.from(JSON.stringify({type:"webauthn.create",challenge,origin}))),attestationObject:b64(attestation),transports:["internal"]}},expectedChallenge:challenge,expectedOrigin:origin,expectedRPID:rp,requireUserVerification:true});
    expect(result.verified).toBe(true);expect(Buffer.from(result.registrationInfo!.credential.publicKey)).toEqual(publicKey);expect(result.registrationInfo).not.toHaveProperty("privateKey");
  });
});
