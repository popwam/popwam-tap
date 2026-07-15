import Link from "next/link";
import { prisma } from "@popwam/db";
import { EllipsisVertical } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { unassignCard, updateCardState } from "@/app/business-actions";
import { getI18n } from "@/lib/i18n";

export default async function AdminCardsPage() {
  const [{ locale }, cards] = await Promise.all([
    getI18n(),
    prisma.card.findMany({
      include: { owner: true, organization: true, profile: true, virtualCard: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);
  const ar = locale === "ar";
  return <>
    <PageHeading
      eyebrow={ar ? "إدارة الكروت" : "Card operations"}
      title={ar ? "الكروت الفعلية" : "Physical cards"}
      description={ar ? "عرض مختصر للهوية والمالك والحالة. بقية الإجراءات موجودة داخل قائمة واحدة." : "A compact view of identity, ownership, and status. Secondary operations stay in one actions menu."}
      action={<div className="flex gap-2"><Link className="btn-secondary" href="/admin/cards/batches">{ar ? "دفعات الإنتاج" : "Production batches"}</Link><Link className="btn-primary" href="/admin/cards/batches/new">{ar ? "إنشاء دفعة" : "Generate batch"}</Link></div>}
    />
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="text-xs text-slate-500"><tr>
          {[ar ? "الرقم التسلسلي" : "Serial number", ar ? "الحساب" : "Account", ar ? "المؤسسة" : "Organization", ar ? "الملف الافتراضي" : "Virtual profile/card", ar ? "الحالة" : "Status", ar ? "التفاصيل" : "Details", ar ? "الإجراءات" : "Actions"].map(label => <th className="p-3 text-start" key={label}>{label}</th>)}
        </tr></thead>
        <tbody>{cards.map(card => <tr className="border-t border-white/10 align-middle" key={card.id}>
          <td className="p-3 font-mono font-semibold" dir="ltr">{card.serialNumber}</td>
          <td className="p-3"><p>{card.owner?.name || (ar ? "غير معيّن" : "Unassigned")}</p>{card.owner?.email && <p className="text-xs text-slate-500" dir="ltr">{card.owner.email}</p>}</td>
          <td className="p-3">{card.organization?.name || "—"}</td>
          <td className="p-3">{card.virtualCard?.name || card.profile?.displayName || "—"}</td>
          <td className="p-3"><div className="flex flex-wrap gap-2"><Badge value={card.cardStatus}/><Badge value={card.assignmentStatus}/></div></td>
          <td className="p-3"><Link className="btn-secondary px-3 py-1.5" href={`/admin/cards/${card.id}`}>{ar ? "التفاصيل" : "Details"}</Link></td>
          <td className="p-3">
            <details className="relative w-fit">
              <summary className="btn-secondary cursor-pointer list-none px-2.5 py-2" aria-label={ar ? "قائمة الإجراءات" : "Actions menu"}><EllipsisVertical size={17}/></summary>
              <div className="absolute end-0 z-20 mt-2 grid min-w-52 gap-1 rounded-xl border border-white/10 bg-slate-950 p-2 shadow-2xl">
                <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href={`/admin/cards/${card.id}`}>{ar ? "عرض التفاصيل" : "View details"}</Link>
                <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href={`/admin/cards/${card.id}#assignment`}>{ar ? "تعديل / تعيين" : "Edit / Assign"}</Link>
                <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/admin/transfers">{ar ? "نقل" : "Transfer"}</Link>
                <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href={`/admin/cards/${card.id}#nfc-qr`}>{ar ? "طباعة / QR" : "Print / QR"}</Link>
                <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href={`/admin/cards/${card.id}#activation`}>{ar ? "معلومات التفعيل" : "Activation info"}</Link>
                <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href={`/admin/audit?card=${encodeURIComponent(card.serialNumber)}`}>{ar ? "سجل التدقيق" : "Audit history"}</Link>
                <form action={updateCardState}><input type="hidden" name="cardId" value={card.id}/><input type="hidden" name="cardAction" value="disable"/><ConfirmSubmit className="w-full rounded-lg px-3 py-2 text-start text-amber-200 hover:bg-white/10" message={ar ? "تعطيل هذا الكارت؟" : "Disable this card?"}>{ar ? "تعطيل" : "Disable"}</ConfirmSubmit></form>
                <form action={updateCardState}><input type="hidden" name="cardId" value={card.id}/><input type="hidden" name="cardAction" value="damaged"/><ConfirmSubmit className="w-full rounded-lg px-3 py-2 text-start text-red-300 hover:bg-white/10" message={ar ? "تسجيل هذا الكارت كتالف؟" : "Mark this card as damaged?"}>{ar ? "تسجيل تالف" : "Mark damaged"}</ConfirmSubmit></form>
                {card.ownerId && <form action={unassignCard}><input type="hidden" name="cardId" value={card.id}/><ConfirmSubmit className="w-full rounded-lg px-3 py-2 text-start hover:bg-white/10" message={ar ? "إلغاء تعيين الكارت؟" : "Unassign this card?"}>{ar ? "إلغاء التعيين" : "Unassign"}</ConfirmSubmit></form>}
              </div>
            </details>
          </td>
        </tr>)}</tbody>
      </table>
      {!cards.length && <p className="p-6 text-slate-500">{ar ? "لا توجد كروت." : "No physical cards."}</p>}
    </div>
  </>;
}
