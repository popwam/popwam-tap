import { prisma } from "@popwam/db";
import { getPublicAppUrl } from "@popwam/shared";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { getUserEntitlements } from "@/lib/plans";
import { googleWalletConfigured, signGoogleWalletJwt } from "@/lib/wallet";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const { id } = await params;
  const [{ effective }, card] = await Promise.all([
    getUserEntitlements(user.id),
    prisma.virtualCard.findFirst({ where: { id, userId: user.id, status: "ACTIVE" }, include: { profile: true } }),
  ]);
  if (!card) return Response.json({ ok: false, error: "VIRTUAL_CARD_NOT_FOUND" }, { status: 404 });
  if (!effective.allowWalletPasses) return Response.json({ ok: false, error: "WALLET_PLAN_REQUIRED" }, { status: 403 });
  if (!googleWalletConfigured()) return Response.json({ ok: false, error: "GOOGLE_WALLET_NOT_CONFIGURED" }, { status: 503 });
  const publicUrl = `${getPublicAppUrl()}${card.profile.slug ? `/p/${card.profile.slug}` : `/p/id/${card.profile.id}`}`;
  const serialNumber = `POPWAM-${card.id}`;
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const externalObjectId = `${issuerId}.${card.id.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const token = signGoogleWalletJwt({
    id: card.id, serialNumber, name: card.name,
    title: card.profile.jobTitleEn || card.profile.jobTitleAr || card.profile.title,
    company: card.profile.company, avatarUrl: card.profile.avatarUrl, publicUrl,
    phone: card.profile.phone, email: card.profile.email, updatedAt: card.updatedAt,
  }, {
    issuerId,
    classSuffix: process.env.GOOGLE_WALLET_CLASS_SUFFIX!,
    serviceAccountEmail: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL!,
    privateKey: process.env.GOOGLE_WALLET_PRIVATE_KEY!,
    origins: (process.env.GOOGLE_WALLET_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean),
  });
  const now = new Date();
  await prisma.walletPass.upsert({
    where: { virtualCardId_platform: { virtualCardId: card.id, platform: "GOOGLE" } },
    update: { externalObjectId, status: "ACTIVE", lastGeneratedAt: now, lastUpdatedAt: now },
    create: { virtualCardId: card.id, platform: "GOOGLE", externalObjectId, serialNumber, status: "ACTIVE", lastGeneratedAt: now, lastUpdatedAt: now },
  });
  return Response.json({ ok: true, url: `https://pay.google.com/gp/v/save/${token}` });
}
