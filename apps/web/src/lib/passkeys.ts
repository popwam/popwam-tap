import "server-only";
import { createHash } from "node:crypto";

export const passkeyChallengeHash=(challenge:string)=>createHash("sha256").update(challenge).digest("base64url");
export function passkeyConfig(){
  const origin=process.env.PASSKEY_ORIGIN||process.env.NEXTAUTH_URL||"http://localhost:3000";
  const url=new URL(origin);
  return {rpID:process.env.PASSKEY_RP_ID||url.hostname,origin:url.origin,rpName:process.env.PASSKEY_RP_NAME||"POP by POPWAM"};
}
export type PasskeyAuthenticationChannel="WEB"|"MOBILE";
export function passkeyExpectedOrigins(channel:PasskeyAuthenticationChannel){
  const config=passkeyConfig();
  if(channel==="WEB")return config.origin;
  const origins=(process.env.PASSKEY_ANDROID_ORIGINS||"").split(",").map(value=>value.trim()).filter(Boolean);
  if(!origins.length||origins.some(value=>!/^android:apk-key-hash:[A-Za-z0-9_-]{20,}$/.test(value)))throw new Error("PASSKEY_ANDROID_ORIGIN_REQUIRED");
  return origins;
}
export function responseChallenge(value:unknown){
  try{const response=value as {response?:{clientDataJSON?:string}};const encoded=response.response?.clientDataJSON;if(!encoded)return null;const parsed=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8")) as {challenge?:unknown};return typeof parsed.challenge==="string"?parsed.challenge:null}catch{return null}
}
