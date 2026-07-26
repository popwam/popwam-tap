import Link from "next/link";
import { prisma } from "@popwam/db";
import { Badge } from "@/components/badge";
import { PageHeading } from "@/components/page-heading";
import { listUserReportsForModeration } from "@/lib/friends-moderation";
import { requireAdmin } from "@/lib/session";

export default async function ReportsPage() {
  await requireAdmin();
  const [messageReports, userReports] = await Promise.all([
    prisma.messageReport.findMany({
      include: {
        reporter: { select: { name: true, email: true } },
        message: { select: { createdAt: true, sender: { select: { name: true, username: true } } } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    listUserReportsForModeration(),
  ]);

  return <>
    <PageHeading
      eyebrow="Restricted moderation"
      title="Reports & disputes"
      description="Profile reports and reported-message access are restricted to administrators. No report count triggers automatic enforcement."
    />
    <h2 className="mb-3 text-xl font-black">Profile reports</h2>
    <div className="card mb-7 overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead><tr className="border-b border-white/10 text-slate-500"><th className="p-4">Category</th><th className="p-4">Reported profile</th><th className="p-4">Status</th><th className="p-4">Date</th><th className="p-4"></th></tr></thead>
        <tbody>{userReports.slice(0, 50).map(report => <tr className="border-b border-white/5" key={report.id}>
          <td className="p-4">{report.category || "OTHER"}</td>
          <td className="p-4">{report.targetProfile?.slug || report.subject?.username || "Unavailable"}</td>
          <td className="p-4"><Badge value={report.status}/></td>
          <td className="p-4">{report.createdAt.toLocaleString()}</td>
          <td className="p-4"><Link className="btn-secondary" href={`/admin/reports/users/${report.id}`}>Review</Link></td>
        </tr>)}</tbody>
      </table>
      {!userReports.length && <p className="p-8 text-center text-slate-500">No profile reports.</p>}
    </div>

    <h2 className="mb-3 text-xl font-black">Message reports</h2>
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead><tr className="border-b border-white/10 text-slate-500"><th className="p-4">Reporter</th><th className="p-4">Reported sender</th><th className="p-4">Status</th><th className="p-4">Date</th><th className="p-4"></th></tr></thead>
        <tbody>{messageReports.map(report => <tr className="border-b border-white/5" key={report.id}>
          <td className="p-4">{report.reporter.name || report.reporter.email}</td>
          <td className="p-4">{report.message.sender.name || `@${report.message.sender.username}`}</td>
          <td className="p-4"><Badge value={report.status}/></td>
          <td className="p-4">{report.createdAt.toLocaleString()}</td>
          <td className="p-4"><Link className="btn-secondary" href={`/admin/reports/${report.id}`}>Review</Link></td>
        </tr>)}</tbody>
      </table>
      {!messageReports.length && <p className="p-8 text-center text-slate-500">No message reports.</p>}
    </div>
  </>;
}
