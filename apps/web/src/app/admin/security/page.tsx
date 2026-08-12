import { Prisma, prisma } from "@popwam/db";
import { revalidatePath } from "next/cache";
import { Badge } from "@/components/badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PageHeading } from "@/components/page-heading";
import { requireAdmin } from "@/lib/session";

async function revokeDeviceSession(data: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(data.get("id") || "");
  const target = await prisma.deviceSession.findUnique({ where: { id }, select: { id: true, userId: true, revokedAt: true } });
  if (!target || target.revokedAt) return;
  const now = new Date();
  await prisma.$transaction([
    prisma.deviceSession.update({ where: { id }, data: { revokedAt: now } }),
    prisma.mobileRefreshToken.updateMany({ where: { deviceSessionId: id, revokedAt: null }, data: { revokedAt: now } }),
    prisma.mobileDeviceCredential.updateMany({ where: { deviceSessionId: id, revokedAt: null }, data: { status: "REVOKED", revokedAt: now } }),
    prisma.devicePushToken.updateMany({ where: { deviceSessionId: id, revokedAt: null }, data: { revokedAt: now } }),
    prisma.auditLog.create({ data: { actorId: admin.id, operation: "admin.security.device_session.revoked", targetId: id, metadata: { userId: target.userId } } }),
  ]);
  revalidatePath("/admin/security");
}

export default async function AdminSecurityPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const q = filters.q?.trim().slice(0, 100) || "";
  const where: Prisma.DeviceSessionWhereInput = {
    ...(filters.state === "active" ? { revokedAt: null } : filters.state === "revoked" ? { revokedAt: { not: null } } : {}),
    ...(q ? { OR: [{ deviceName: { contains: q, mode: "insensitive" } }, { userLabel: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [sessions, active, revoked, pushEnabled] = await Promise.all([
    prisma.deviceSession.findMany({ where, orderBy: { lastSeenAt: "desc" }, take: 500, select: { id: true, deviceName: true, userLabel: true, platform: true, appName: true, appVersion: true, authMethod: true, lastSeenAt: true, createdAt: true, revokedAt: true, user: { select: { id: true, name: true, email: true } }, _count: { select: { pushTokens: { where: { revokedAt: null } }, webSessions: { where: { expires: { gt: new Date() } } }, mobileRefreshTokens: { where: { revokedAt: null } } } } } }),
    prisma.deviceSession.count({ where: { revokedAt: null } }),
    prisma.deviceSession.count({ where: { revokedAt: { not: null } } }),
    prisma.devicePushToken.count({ where: { revokedAt: null } }),
  ]);
  return <><PageHeading eyebrow="Security operations" title="Devices & sessions" description="Inspect safe device/session metadata and revoke the complete authoritative device family. Raw credentials and push tokens are never displayed."/>
    <div className="mb-5 grid gap-4 sm:grid-cols-3">{[["Active device sessions",active],["Revoked device sessions",revoked],["Active push registrations",pushEnabled]].map(([label,value]) => <div className="card p-5" key={String(label)}><b className="text-2xl">{value}</b><p className="text-sm text-slate-500">{label}</p></div>)}</div>
    <form className="card mb-5 grid gap-3 p-4 md:grid-cols-4"><input className="input md:col-span-2" name="q" defaultValue={q} placeholder="Owner email or device label"/><select className="input" name="state" defaultValue={filters.state || ""}><option value="">All states</option><option value="active">Active</option><option value="revoked">Revoked</option></select><button className="btn-primary">Filter</button></form>
    <div className="card overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead><tr>{["Device","Owner","Platform / app","Authentication","Last active","Session family","Push","State","Action"].map(label => <th className="p-3 text-start" key={label}>{label}</th>)}</tr></thead><tbody>{sessions.map(session => <tr className="border-t border-white/10" key={session.id}><td className="p-3"><b>{session.userLabel || session.deviceName || "Unnamed device"}</b><p className="text-xs text-slate-500">Created {session.createdAt.toLocaleDateString()}</p></td><td className="p-3">{session.user.name || session.user.email}<p className="text-xs text-slate-500">{session.user.email}</p></td><td className="p-3">{session.platform} · {session.appName || "unknown"}<p className="text-xs text-slate-500">{session.appVersion || "—"}</p></td><td className="p-3"><Badge value={session.authMethod}/></td><td className="p-3">{session.lastSeenAt.toLocaleString()}</td><td className="p-3">{session._count.mobileRefreshTokens} mobile · {session._count.webSessions} web</td><td className="p-3">{session._count.pushTokens ? "Enabled" : "None"}</td><td className="p-3"><Badge value={session.revokedAt ? "REVOKED" : "ACTIVE"}/></td><td className="p-3">{!session.revokedAt && <form action={revokeDeviceSession}><input type="hidden" name="id" value={session.id}/><ConfirmSubmit className="btn-secondary" message="Revoke this device session, refresh tokens, credentials and push registration?">Revoke</ConfirmSubmit></form>}</td></tr>)}</tbody></table>{!sessions.length && <p className="p-6 text-slate-500">No device sessions match these filters.</p>}</div>
  </>;
}
