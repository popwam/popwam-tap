import Link from "next/link";
import { LegalDocumentStatus, LegalDocumentType, prisma } from "@popwam/db";
import { getI18n } from "@/lib/i18n";

export async function ManagedLegalPage({ type }: { type: LegalDocumentType }) {
  const { locale } = await getI18n();
  const now = new Date();
  const where = { documentType: type, status: LegalDocumentStatus.PUBLISHED, isActive: true, effectiveAt: { lte: now } } as const;
  const document = await prisma.legalDocument.findFirst({
    where: { ...where, locale },
    orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }],
  }) || (locale !== "en" ? await prisma.legalDocument.findFirst({
    where: { ...where, locale: "en" },
    orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }],
  }) : null);
  return <main className="landing-shell min-h-screen px-5 py-12">
    <article className="card mx-auto max-w-3xl p-7 sm:p-10" dir={document?.locale === "ar" ? "rtl" : "ltr"}>
      <Link href="/" className="text-sm font-black text-brand-400">POP by POPWAM</Link>
      {document ? <>
        <h1 className="mt-5 text-3xl font-black">{document.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{document.version} · {document.effectiveAt.toLocaleDateString(document.locale)}</p>
        <div className="mt-7 whitespace-pre-wrap leading-8 text-slate-300">{document.content}</div>
      </> : <>
        <h1 className="mt-5 text-3xl font-black">{type === LegalDocumentType.TERMS ? "Terms" : "Privacy"}</h1>
        <p className="mt-6 leading-8 text-slate-400">The published document is temporarily unavailable.</p>
      </>}
    </article>
  </main>;
}
