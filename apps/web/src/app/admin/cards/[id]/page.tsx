import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { QrCard } from "@/components/qr-card";
import { CopyUrl } from "@/components/copy-url";
import { assignCard, unassignCard, updateCardState } from "@/app/business-actions";
import { getPermanentCardUrl } from "@popwam/shared";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { getI18n } from "@/lib/i18n";

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ locale }, card, users] = await Promise.all([
    getI18n(),
    prisma.card.findUnique({ where: { id }, include: { batch: true, owner: true, organization: true, profile: true, virtualCard: true, activeDestination: true, dailyOpens: { orderBy: { date: "desc" }, take: 30 } } }),
    prisma.user.findMany({ where: { status: "ACTIVE" }, orderBy: { email: "asc" }, select: { id: true, email: true, name: true } }),
  ]);
  if (!card) notFound();
  const ar = locale === "ar";
  const url = getPermanentCardUrl(card.publicSlug);
  return <>
    <div className="mb-4"><Link href="/admin/cards" className="btn-secondary"><ArrowLeft size={16} className="directional-icon"/>{ar ? "العودة إلى الكروت" : "Back to physical cards"}</Link></div>
    <PageHeading eyebrow={ar ? "تفاصيل الكارت" : "Card details"} title={card.serialNumber} description={card.batch?.name || (ar ? "كارت قديم منقول" : "Legacy migrated card")} action={<div className="flex gap-2"><Badge value={card.assignmentStatus}/><Badge value={card.cardStatus}/></div>}/>
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <section className="card p-5"><h2 className="font-bold">{ar ? "هوية الكارت" : "Card identity"}</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {[[ar ? "الرابط الدائم" : "Permanent URL", url], [ar ? "الرقم التسلسلي" : "Serial number", card.serialNumber], [ar ? "نوع الكارت" : "Card type", card.cardType], [ar ? "حالة المخزون" : "Inventory status", card.inventoryStatus], [ar ? "عدد الفتحات" : "Open count", card.openCount], [ar ? "آخر فتح" : "Last opened", card.lastOpenedAt?.toLocaleString() || "—"], [ar ? "تاريخ التعيين" : "Assigned", card.assignedAt?.toLocaleString() || "—"]].map(([key, value]) => <div key={String(key)}><dt className="text-xs text-slate-500">{String(key)}</dt><dd className="mt-1 flex items-center gap-2 break-all" dir={key === (ar ? "الرابط الدائم" : "Permanent URL") || key === (ar ? "الرقم التسلسلي" : "Serial number") ? "ltr" : undefined}>{String(value)}{key === (ar ? "الرابط الدائم" : "Permanent URL") && <CopyUrl value={url}/>}</dd></div>)}
        </dl></section>
        <section id="assignment" className="card scroll-mt-5 p-5"><h2 className="font-bold">{ar ? "الحساب والوجهة" : "Assignment and destination"}</h2><div className="mt-3 grid gap-3 rounded-xl bg-white/5 p-4 text-sm sm:grid-cols-2"><p><span className="text-slate-500">{ar ? "الحساب:" : "Account:"}</span> {card.owner?.name || card.owner?.email || (ar ? "غير معيّن" : "Unassigned")}</p><p><span className="text-slate-500">{ar ? "المؤسسة:" : "Organization:"}</span> {card.organization?.name || "—"}</p><p><span className="text-slate-500">{ar ? "الملف الافتراضي:" : "Virtual profile:"}</span> {card.virtualCard?.name || card.profile?.displayName || "—"}</p><p><span className="text-slate-500">{ar ? "الوجهة الحالية:" : "Current destination:"}</span> {card.activeDestination?.title || (ar ? "غير محددة" : "Not selected")}</p></div><form action={assignCard} className="mt-4 flex flex-wrap gap-3"><input type="hidden" name="cardId" value={id}/><select className="input max-w-md" name="ownerId" required><option value="">{ar ? "اختر حساباً" : "Choose account"}</option>{users.map(user => <option value={user.id} key={user.id}>{user.name || user.email} · {user.email}</option>)}</select><button className="btn-primary">{ar ? "تعيين / إعادة تعيين" : "Assign / Reassign"}</button></form>{card.ownerId && <form action={unassignCard} className="mt-3"><input type="hidden" name="cardId" value={id}/><ConfirmSubmit message={ar ? "إلغاء تعيين هذا الكارت؟" : "Unassign this card?"} className="btn-secondary">{ar ? "إلغاء التعيين" : "Unassign"}</ConfirmSubmit></form>}</section>
        <section className="card p-5"><h2 className="font-bold">{ar ? "إجراءات الحالة" : "State actions"}</h2><div className="mt-4 flex flex-wrap gap-2">{[["pause", ar ? "إيقاف مؤقت" : "Pause"], ["restore", ar ? "استعادة" : "Restore"], ["lost", ar ? "تسجيل مفقود" : "Mark lost"], ["damaged", ar ? "تسجيل تالف" : "Mark damaged"], ["disable", ar ? "تعطيل" : "Disable"], ["archive", ar ? "أرشفة" : "Archive"]].map(([action, label]) => <form action={updateCardState} key={action}><input type="hidden" name="cardId" value={id}/><input type="hidden" name="cardAction" value={action}/><ConfirmSubmit className={action === "restore" ? "btn-secondary" : "btn-danger"} message={`${label}?`}>{label}</ConfirmSubmit></form>)}</div></section>
        <section className="card p-5"><h2 className="font-bold">{ar ? "سجل الفتح اليومي" : "Daily opens"}</h2><div className="mt-3 grid gap-2">{card.dailyOpens.map(row => <div className="flex justify-between rounded-xl bg-white/5 p-3 text-sm" key={row.id}><time>{row.date.toLocaleDateString()}</time><strong>{row.openCount}</strong></div>)}{!card.dailyOpens.length && <p className="text-sm text-slate-500">{ar ? "لا توجد فتحات بعد." : "No opens yet."}</p>}</div></section>
      </div>
      <aside className="space-y-5">
        <section id="nfc-qr" className="card scroll-mt-5 p-5"><h2 className="mb-4 font-bold">{ar ? "QR للرابط الدائم" : "Permanent URL QR"}</h2><QrCard value={url} name={card.serialNumber}/><p className="mt-3 text-xs leading-5 text-slate-500">{ar ? "هذا هو الرابط الذي يُكتب على NFC ولا يتغير بعد التفعيل." : "This is the URL written to NFC. It does not change after activation."}</p></section>
        <section id="activation" className="card scroll-mt-5 p-5"><h2 className="font-bold">{ar ? "معلومات التفعيل" : "Activation information"}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{ar ? "رمز التفعيل منفصل وأحادي الاستخدام. لا يعرض النظام الرمز القديم أو أي قيمة داخلية. يمكن تدويره فقط لكارت غير معيّن." : "The activation code is separate and single-use. Old codes and internal values are never displayed. It can only be rotated for an unassigned card."}</p>{!card.ownerId && card.assignmentStatus === "UNASSIGNED" && <form action={`/api/admin/cards/${card.id}/activation-qr`} method="post"><ConfirmSubmit className="btn-secondary mt-4 w-full" message={ar ? "سيُلغى رمز التفعيل السابق. متابعة؟" : "The previous activation code will stop working. Continue?"}>{ar ? "إنشاء QR تفعيل بديل" : "Generate replacement activation QR"}</ConfirmSubmit></form>}</section>
      </aside>
    </div>
  </>;
}
