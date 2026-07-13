import { getI18n } from "@/lib/i18n";
import { PageHeading } from "@/components/page-heading";
import { PlanForm } from "@/components/plan-form";
export default async function NewPlanPage(){const {locale}=await getI18n();return <><PageHeading eyebrow="Plans" title="Create plan" description="Define localized names, numeric limits and feature access."/><PlanForm locale={locale}/></>;}
