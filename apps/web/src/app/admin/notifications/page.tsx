import { prisma } from "@popwam/db";
import { revalidatePath } from "next/cache";
import { AdminNotificationComposer } from "@/components/admin-notification-composer";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { createAdminNotificationCampaign, parseAdminNotificationInput, sendSavedAdminNotificationCampaign } from "@/lib/admin-notifications";
import { requireAdmin } from "@/lib/session";

async function saveCampaign(data: FormData) {
  "use server";
  const admin = await requireAdmin();
  const input = parseAdminNotificationInput(data);
  await createAdminNotificationCampaign(admin.id, input, data.get("operation") === "send");
  revalidatePath("/admin/notifications");
}

async function sendDraft(data: FormData) {
  "use server";
  const admin = await requireAdmin();
  await sendSavedAdminNotificationCampaign(String(data.get("id") || ""), admin.id);
  revalidatePath("/admin/notifications");
}

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const [users, campaigns] = await Promise.all([
    prisma.user.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 500, select: { id: true, name: true, email: true, locale: true } }),
    prisma.adminNotificationCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { createdBy: { select: { name: true, email: true } } } }),
  ]);
  return <><PageHeading eyebrow="Communications" title="Notifications center" description="Compose locale-aware FCM messages, target authorized audiences, and inspect honest submission outcomes without exposing device tokens."/>
    <AdminNotificationComposer action={saveCampaign} users={users}/>
    <section className="card mt-6 overflow-x-auto"><table className="w-full min-w-[1040px] text-sm"><thead><tr>{["Created","Audience","Category","Copy","Status","Recipients","FCM accepted","Suppressed","Failed","Creator",""].map(value => <th className="p-3 text-start" key={value}>{value}</th>)}</tr></thead><tbody>{campaigns.map(campaign => { const title = campaign.title as { en?: string }; return <tr className="border-t border-white/10" key={campaign.id}><td className="p-3">{campaign.createdAt.toLocaleString()}</td><td className="p-3">{campaign.audienceType}</td><td className="p-3">{campaign.category}</td><td className="max-w-64 truncate p-3">{title.en || "—"}</td><td className="p-3"><Badge value={campaign.status}/></td><td className="p-3">{campaign.recipientCount}</td><td className="p-3 text-emerald-300">{campaign.successCount}</td><td className="p-3 text-amber-300">{campaign.suppressedCount}</td><td className="p-3 text-rose-300">{campaign.failureCount}</td><td className="p-3">{campaign.createdBy.name || campaign.createdBy.email}</td><td className="p-3">{campaign.status === "DRAFT" && <form action={sendDraft}><input type="hidden" name="id" value={campaign.id}/><button className="btn-secondary">Send</button></form>}</td></tr>; })}</tbody></table>{!campaigns.length && <p className="p-6 text-slate-500">No campaigns yet.</p>}</section>
  </>;
}
