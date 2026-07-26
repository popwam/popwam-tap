import {authRequestAllowed} from "@/lib/auth-request-rate-limit";
import {createPasskeyAuthenticationOptions} from "@/lib/passkey-authentication";

export async function POST(request:Request){
  if(!authRequestAllowed(request,"mobile-passkey-options",30))return Response.json({ok:false,error:"AUTH_RATE_LIMITED"},{status:429,headers:{"cache-control":"no-store","retry-after":"60"}});
  try{
    const options=await createPasskeyAuthenticationOptions("MOBILE");
    return Response.json(options,{headers:{"cache-control":"no-store"}});
  }catch{
    return Response.json({ok:false,error:"PASSKEY_UNAVAILABLE"},{status:503,headers:{"cache-control":"no-store"}});
  }
}
