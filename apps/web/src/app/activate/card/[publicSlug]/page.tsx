import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { CreditCard, QrCode, ShieldCheck } from "lucide-react";
import { getI18n } from "@/lib/i18n";

export default async function CardActivationPage({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const [{ dictionary }, card] = await Promise.all([
    getI18n(),
    prisma.card.findUnique({
      where: { publicSlug: publicSlug.toLowerCase() },
      select: {
        serialNumber: true,
        cardStatus: true,
        assignmentStatus: true,
        ownerId: true,
        publicSlug: true,
        activationSecretState: true,
      },
    }),
  ]);
  if (!card) notFound();
  const copy = (dictionary as typeof dictionary & { shareCenter: Record<string, string> }).shareCenter;
  const claimed = Boolean(card.ownerId) || card.assignmentStatus !== "UNASSIGNED";
  const suspended = ["PAUSED", "LOST", "STOLEN", "DISABLED", "ARCHIVED"].includes(card.cardStatus);
  const scratch = card.activationSecretState !== "LEGACY";
  const reference = `${"•".repeat(Math.max(6, card.serialNumber.length - 3))}${card.serialNumber.slice(-3)}`;
  const title = suspended ? copy.publicUnavailableTitle : claimed ? copy.publicAlreadyTitle : copy.publicReadyTitle;
  const description = suspended
    ? copy.publicUnavailableHelp
    : claimed
      ? copy.publicAlreadyHelp
      : scratch ? copy.publicScratchHelp : copy.legacyActivation;

  return <main className="landing-shell flex min-h-screen items-center justify-center px-5 py-10">
    <div className="card w-full max-w-xl overflow-hidden">
      <div className="smart-card-mock m-5 aspect-[1.7/1] rounded-3xl border border-white/10 p-6">
        <div className="flex items-center justify-between"><strong>POPWAM</strong><CreditCard className="text-brand-400"/></div>
        <p className="mt-20 font-mono text-sm" dir="ltr">{reference}</p>
      </div>
      <div className="p-6 pt-1 text-center">
        <p className="text-xs font-black text-brand-400">POP by POPWAM</p>
        <h1 className="mt-3 text-2xl font-black">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">{description}</p>
        <p className="mt-3 text-xs text-slate-500">{copy.productReference}: <span className="font-mono" dir="ltr">{reference}</span></p>
        {!claimed && !suspended && <Link
          href={scratch ? `/dashboard/share?activate=${encodeURIComponent(card.publicSlug)}` : `/activate/scan?card=${encodeURIComponent(card.publicSlug)}`}
          className="btn-primary mt-6 w-full py-3.5"
        ><QrCode size={18}/>{scratch ? copy.publicStart : copy.continueLegacy}</Link>}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={15}/>
          {scratch ? copy.publicScratchRequired : copy.publicScanNotClaim}
        </div>
      </div>
    </div>
  </main>;
}
