import { getSmsProvider } from "@/lib/sms";
import { getSmsRuntimeSettings } from "@/lib/sms/runtime";
import { configuredChannels, parseCountryRules, SmsOtpProviderAdapter, WhatsAppOtpProvider } from "@/lib/phone-otp";
import { isCountryCode } from "@/lib/phone";

export async function GET(request:Request){
  const country=new URL(request.url).searchParams.get("countryIso2")||"";
  if(!isCountryCode(country))return Response.json({channels:[]},{status:400});
  try{const runtime=await getSmsRuntimeSettings();const sms=runtime.enabled?getSmsProvider(runtime):null;const providers=[...(sms?[new SmsOtpProviderAdapter(sms,parseCountryRules(runtime.countryRules,sms.name))]:[]),new WhatsAppOtpProvider()];return Response.json({channels:configuredChannels(providers,country),primary:process.env.PHONE_OTP_PRIMARY_CHANNEL||"sms"},{headers:{"cache-control":"no-store"}})}catch{return Response.json({channels:[]},{headers:{"cache-control":"no-store"}})}
}
