import type {AuthenticationResponseJSON} from "@simplewebauthn/server";
import {authRequestAllowed} from "@/lib/auth-request-rate-limit";
import {authenticateMobilePasskey} from "@/lib/mobile-passkey-auth";
import {mobilePasskeySuccessResponse} from "@/lib/mobile-passkey-contract";

export async function POST(request:Request){
  if(!authRequestAllowed(request,"mobile-passkey-verify",20))return Response.json({ok:false,error:"AUTH_RATE_LIMITED"},{status:429,headers:{"cache-control":"no-store","retry-after":"60"}});
  const body=await request.json().catch(()=>null) as {assertion?:AuthenticationResponseJSON;deviceName?:unknown;contractVersion?:unknown;challengeId?:unknown}|null;
  const result=await authenticateMobilePasskey(body?.assertion||null,typeof body?.deviceName==="string"?body.deviceName.slice(0,120):undefined,request.headers.get("x-pop-app-version")||undefined,{version:body?.contractVersion===2?2:1,challengeId:typeof body?.challengeId==="string"?body.challengeId.slice(0,80):undefined});
  if(!result)return Response.json({ok:false,error:"PASSKEY_AUTH_FAILED"},{status:400,headers:{"cache-control":"no-store"}});
  return Response.json({...mobilePasskeySuccessResponse(result.session,result.user),...result.authentication},{headers:{"cache-control":"no-store"}});
}
