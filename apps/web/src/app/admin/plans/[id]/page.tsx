import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { getI18n } from "@/lib/i18n";
import { PageHeading } from "@/components/page-heading";
import { PlanForm } from "@/components/plan-form";
export default async function EditPlanPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const [plan,{locale}]=await Promise.all([prisma.plan.findUnique({where:{id}}),getI18n()]);if(!plan)notFound();return <><PageHeading eyebrow="Plans" title={`Edit ${plan.nameEn||plan.name}`} description="Changes affect entitlement checks on the next request."/><PlanForm plan={{...plan,maxStorageBytes:plan.maxStorageBytes.toString()}} locale={locale}/></>;}
