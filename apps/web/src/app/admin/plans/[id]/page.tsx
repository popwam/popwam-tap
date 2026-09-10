import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { getI18n } from "@/lib/i18n";
import { PageHeading } from "@/components/page-heading";
import { PlanForm } from "@/components/plan-form";
import { planOpenPolicyKey, readProfileOpenPolicy } from "@/lib/plan-open-policy";
export default async function EditPlanPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const [plan,{locale},setting]=await Promise.all([prisma.plan.findUnique({where:{id}}),getI18n(),prisma.systemSetting.findUnique({where:{key:planOpenPolicyKey(id)},select:{value:true}})]);if(!plan)notFound();return <><PageHeading eyebrow={locale==="ar"?"الباقات":"Plans"} title={locale==="ar"?`إدارة ${plan.nameAr||plan.name}`:`Manage ${plan.nameEn||plan.name}`} description={locale==="ar"?"تُطبّق التغييرات على حساب الاستحقاقات في الطلب التالي.":"Changes affect entitlement checks on the next request."}/><PlanForm plan={{...plan,maxStorageBytes:plan.maxStorageBytes.toString()}} locale={locale} openPolicy={readProfileOpenPolicy(setting?.value)}/></>;}
