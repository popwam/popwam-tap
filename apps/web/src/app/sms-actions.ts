"use server";
import { prisma } from "@popwam/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { defaultSmsRuntimeSettings } from "@/lib/sms/runtime";
const text=(data:FormData,key:string)=>String(data.get(key)||"").trim();
export async function saveSmsRuntimeSettings(data:FormData){const admin=await requireAdmin();const providerMode=text(data,"providerMode");if(!["environment","development","webhook","smsmisr"].includes(providerMode))throw new Error("SMS_MODE_INVALID");const settings={...defaultSmsRuntimeSettings,enabled:data.get("enabled")==="on",senderName:text(data,"senderName").slice(0,32)||"POPWAM",providerMode,testMode:data.get("testMode")==="on",defaultLanguage:text(data,"defaultLanguage")==="en"?"en" as const:"ar" as const,templateAr:text(data,"templateAr"),templateEn:text(data,"templateEn"),countryRules:text(data,"countryRules")};if(!settings.templateAr.includes("{code}")||!settings.templateEn.includes("{code}"))throw new Error("SMS_TEMPLATE_CODE_REQUIRED");await prisma.$transaction([prisma.systemSetting.upsert({where:{key:"sms.runtime"},create:{key:"sms.runtime",value:settings},update:{value:settings}}),prisma.auditLog.create({data:{actorId:admin.id,operation:"admin.sms.runtime.update"}})]);revalidatePath("/admin/sms");}
