import { notFound } from "next/navigation";
import { updateUserReport } from "@/app/moderation-actions";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { getUserReportForModeration } from "@/lib/friends-moderation";
import { requireAdmin } from "@/lib/session";

export default async function UserReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  await requireAdmin();
  const { reportId } = await params;
  const report = await getUserReportForModeration(reportId);
  if (!report) notFound();
  return <>
    <PageHeading eyebrow="Restricted moderation" title="Profile report" description="Reporter details and optional report text are visible only in this admin-only moderation context."/>
    <section className="card p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <strong>{report.category || "OTHER"}</strong>
          <p className="mt-1 text-sm text-slate-400">Reported profile: {report.targetProfile?.slug || report.subject?.username || "Unavailable"}</p>
          <p className="mt-1 text-sm text-slate-400">Reporter: {report.reporter.name || report.reporter.username || "Account"}</p>
        </div>
        <Badge value={report.status}/>
      </div>
      <p className="mt-5 whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm">{report.details || "No optional details provided."}</p>
    </section>
    <form action={updateUserReport} className="card mt-5 grid gap-3 p-5 sm:grid-cols-2">
      <input type="hidden" name="reportId" value={report.id}/>
      <select className="input" name="status" defaultValue={report.status}>
        <option>OPEN</option><option>REVIEWING</option><option>ACTIONED</option><option>DISMISSED</option><option>RESOLVED</option>
      </select>
      <input className="input" name="resolutionCode" defaultValue={report.resolutionCode || ""} placeholder="Controlled resolution code"/>
      <textarea className="input min-h-24 sm:col-span-2" name="reviewNote" defaultValue={report.reviewNote || ""} maxLength={2000} placeholder="Private moderation note"/>
      <button className="btn-primary sm:col-span-2">Save review</button>
    </form>
  </>;
}
