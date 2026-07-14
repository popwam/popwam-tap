import { prisma } from "@popwam/db";
import { getPublicAppUrl } from "@popwam/shared";
import { requireUser } from "@/lib/session";
import { getUserEntitlements } from "@/lib/plans";
import { appleWalletConfigured, generateApplePkpass } from "@/lib/wallet";

export async function GET(_request: Request, { params }: { params: Promise<{ virtualCardId: string }> }) {
  const user = await requireUser();
  const { virtualCardId } = await params;
  const [{ effective }, card] = await Promise.all([
    getUserEntitlements(user.id),
    prisma.virtualCard.findFirst({ where: { id: virtualCardId, userId: user.id, status: "ACTIVE" }, include: { profile: true } }),
  ]);
  if (!card) return Response.json({ ok: false, error: "VIRTUAL_CARD_NOT_FOUND" }, { status: 404 });
  if (!effective.allowWalletPasses) return Response.json({ ok: false, error: "WALLET_PLAN_REQUIRED" }, { status: 403 });
  if (!appleWalletConfigured()) return Response.json({ ok: false, error: "APPLE_WALLET_NOT_CONFIGURED" }, { status: 503 });
  const publicUrl = `${getPublicAppUrl()}${card.profile.slug ? `/p/${card.profile.slug}` : `/p/id/${card.profile.id}`}`;
  const serialNumber = `POPWAM-${card.id}`;
  const buffer = generateApplePkpass({ id: card.id, serialNumber, name: card.name, title: card.profile.jobTitleEn || card.profile.jobTitleAr || card.profile.title, company: card.profile.company, avatarUrl: card.profile.avatarUrl, publicUrl, phone: card.profile.phone, email: card.profile.email, updatedAt: card.updatedAt });
  const now = new Date();
  await prisma.walletPass.upsert({ where: { virtualCardId_platform: { virtualCardId: card.id, platform: "APPLE" } }, update: { status: "ACTIVE", lastGeneratedAt: now, lastUpdatedAt: now }, create: { virtualCardId: card.id, platform: "APPLE", serialNumber, status: "ACTIVE", lastGeneratedAt: now, lastUpdatedAt: now } });
  return new Response(new Uint8Array(buffer), { headers: { "content-type": "application/vnd.apple.pkpass", "content-disposition": `attachment; filename="${card.id}.pkpass"`, "cache-control": "private, no-store" } });
}
