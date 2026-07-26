import { prisma } from "@popwam/db";
import { reviewQuotaRequest } from "@/app/quota-actions";
import { Badge } from "@/components/badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PageHeading } from "@/components/page-heading";
import { formatStorageBytes } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";

export default async function AdminQuotaRequestsPage() {
  await requireAdmin();
  const requests = await prisma.quotaIncreaseRequest.findMany({
    include: { user: { select: { id: true, name: true, email: true } }, reviewedBy: { select: { name: true, email: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return <><PageHeading eyebrow="Commercial controls" title="Quota increase requests" description="Review POP storage and link-limit requests. Approval writes the numeric per-user override; rejection leaves the effective entitlement unchanged."/>
    <div className="space-y-4">{requests.map(request => <article className="card p-5" key={request.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black">{request.user.name || request.user.email}</h2><p className="text-xs text-slate-500">{request.user.email}</p></div><Badge value={request.status}/></div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Resource</dt><dd>{request.resource}</dd></div><div><dt className="text-slate-500">Requested</dt><dd>{request.resource === "MAX_STORAGE_BYTES" ? formatStorageBytes(request.requestedValue) : request.requestedValue.toString()}</dd></div><div><dt className="text-slate-500">Submitted</dt><dd>{request.createdAt.toLocaleString()}</dd></div></dl>
      {request.reason && <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm">{request.reason}</p>}
      {request.status === "PENDING" ? <form action={reviewQuotaRequest} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><input type="hidden" name="requestId" value={request.id}/><input className="input" name="adminNote" maxLength={1000} placeholder="Optional private review note"/><ConfirmSubmit className="btn-primary" name="status" value="APPROVED" message="Approve and apply this user quota override?">Approve</ConfirmSubmit><ConfirmSubmit className="btn-secondary" name="status" value="REJECTED" message="Reject this quota request?">Reject</ConfirmSubmit></form>
        : <p className="mt-4 text-xs text-slate-500">Reviewed by {request.reviewedBy?.name || request.reviewedBy?.email || "administrator"} · {request.reviewedAt?.toLocaleString()}</p>}
    </article>)}{!requests.length && <div className="card p-8 text-center text-slate-500">No quota requests.</div>}</div>
  </>;
}
