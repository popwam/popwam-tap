import "server-only";
import { createHash } from "node:crypto";

export const passkeyChallengeHash=(challenge:string)=>createHash("sha256").update(challenge).digest("base64url");
export function passkeyConfig(){
  const origin=process.env.PASSKEY_ORIGIN||process.env.NEXTAUTH_URL||"http://localhost:3000";
  const url=new URL(origin);
  return {rpID:process.env.PASSKEY_RP_ID||url.hostname,origin:url.origin,rpName:process.env.PASSKEY_RP_NAME||"POP by POPWAM"};
}
export function responseChallenge(value:unknown){
  try{const response=value as {response?:{clientDataJSON?:string}};const encoded=response.response?.clientDataJSON;if(!encoded)return null;const parsed=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8")) as {challenge?:unknown};return typeof parsed.challenge==="string"?parsed.challenge:null}catch{return null}
}
