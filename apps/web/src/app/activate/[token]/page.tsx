import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { hashActivationToken, isActivationToken, normalizeActivationToken } from "@/lib/card-tokens";

export const dynamic = "force-dynamic";

export default async function ActivationQrLanding({ params }: { params: Promise<{ token: string }> }) {
  const token = normalizeActivationToken((await params).token);
  const card = isActivationToken(token)
    ? await prisma.card.findFirst({
        where: { activationTokenHash: hashActivationToken(token), activationTokenConsumedAt: null, assignmentStatus: "UNASSIGNED" },
        select: { serialNumber: true, cardType: true },
      })
    : null;
  if (!card) notFound();
  return <main className="flex min-h-screen items-center justify-center px-4"><div className="card max-w-md p-8 text-center"><h1 className="text-2xl font-black">رمز تفعيل / Activation code</h1><p className="mt-4 leading-7 text-slate-400">المس البطاقة أولًا ثم اضغط «تفعيل هذه البطاقة» وامسح رمز التفعيل من داخل POPWAM Tap.<br/>Tap the tag first, choose “Activate this tag,” then scan the activation code inside POPWAM Tap.</p><p className="mt-5 font-mono" dir="ltr">{card.serialNumber} · {card.cardType}</p></div></main>;
}
