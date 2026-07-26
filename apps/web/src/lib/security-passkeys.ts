import "server-only";

import { prisma, Prisma } from "@popwam/db";
import type { PopSessionContext } from "@/lib/security-inventory";
import { opaqueSecurityId, normalizeDeviceLabel } from "@/lib/security-session";
import { consumeStepUpGrant } from "@/lib/security-step-up";

export async function listSafePasskeys(userId: string) {
  const rows = await prisma.passkeyCredential.findMany({
    where: { userId, revokedAt: null },
    select: { id: true, name: true, deviceType: true, backedUp: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(row => ({
    id: opaqueSecurityId("passkey", row.id),
    name: row.name || row.deviceType || "Passkey",
    deviceType: row.deviceType,
    backedUp: row.backedUp,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() || null,
  }));
}

export async function removeSafePasskey(context: PopSessionContext, publicId: string, grantToken: string | null) {
  return prisma.$transaction(async tx => {
    await consumeStepUpGrant(tx, context, "REMOVE_PASSKEY", grantToken);
    const [rows, recovery] = await Promise.all([
      tx.passkeyCredential.findMany({ where: { userId: context.user.id, revokedAt: null }, select: { id: true } }),
      tx.user.findUnique({ where: { id: context.user.id }, select: { phoneVerifiedAt: true, phoneE164: true, phone: true } }),
    ]);
    const target = rows.find(row => opaqueSecurityId("passkey", row.id) === publicId);
    if (!target) return { ok: false as const, error: "NOT_FOUND" as const };
    if (rows.length === 1 && (!recovery?.phoneVerifiedAt || !(recovery.phoneE164 || recovery.phone))) {
      return { ok: false as const, error: "RECOVERY_REQUIRED" as const };
    }
    const changed = await tx.passkeyCredential.updateMany({ where: { id: target.id, userId: context.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (changed.count !== 1) return { ok: false as const, error: "NOT_FOUND" as const };
    await tx.auditLog.create({ data: { actorId: context.user.id, operation: "security.passkey.removed", targetId: target.id, metadata: { recoveryAvailable: true } } });
    return { ok: true as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function renameSafePasskey(context: PopSessionContext, publicId: string, label: string) {
  const rows = await prisma.passkeyCredential.findMany({ where: { userId: context.user.id, revokedAt: null }, select: { id: true } });
  const target = rows.find(row => opaqueSecurityId("passkey", row.id) === publicId);
  if (!target) return false;
  const value = normalizeDeviceLabel(label, "");
  if (value.length < 2) throw new Error("PASSKEY_LABEL_INVALID");
  await prisma.$transaction([
    prisma.passkeyCredential.update({ where: { id: target.id }, data: { name: value } }),
    prisma.auditLog.create({ data: { actorId: context.user.id, operation: "security.passkey.renamed", targetId: target.id, metadata: { outcome: "SUCCESS" } } }),
  ]);
  return true;
}
