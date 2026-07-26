import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { QRCodeSVG } from "qrcode.react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { PrintButton } from "@/components/print-button";
import { openActivationCode } from "@/lib/card-tokens";

export default async function BatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ layout?: string }>;
}) {
  const [{ id }, { layout }] = await Promise.all([params, searchParams]);
  const batch = await prisma.cardBatch.findUnique({
    where: { id },
    include: {
      supplier: true,
      inventoryItem: true,
      productionBatch: { include: { tags: { include: { card: true }, orderBy: { createdAt: "asc" } } } },
      cards: { orderBy: { serialNumber: "asc" } },
    },
  });
  if (!batch) notFound();

  const produced = (batch.productionBatch?.tags ?? []).map(tag => {
    const scratch = Boolean(tag.activationSecretVersion);
    const legacyCode = scratch || tag.activationCode.startsWith("legacy-disabled:") ? null : openActivationCode(tag.activationCode);
    return {
      ...tag,
      activationPolicy: scratch ? "SCRATCH V1" : "LEGACY",
      activationPresentation: scratch
        ? tag.scratchSecretExportedAt ? "EXPORTED ONCE" : "ONE-TIME CSV EXPORT"
        : legacyCode || "UNAVAILABLE",
      activationUrl: legacyCode
        ? `${process.env.NEXT_PUBLIC_APP_URL || "https://pop.popwam.com"}/activate/scan?code=${encodeURIComponent(legacyCode)}`
        : null,
    };
  });
  const labelLayout = layout === "labels";

  return <div className={labelLayout ? "print-label-page" : ""}>
    <div className="print:hidden">
      <PageHeading
        eyebrow="Production batch"
        title={batch.productionBatch?.batchCode || batch.name}
        description={`${batch.quantity} · ${batch.cardType} · ${batch.createdAt.toLocaleString()}`}
        action={<div className="flex flex-wrap gap-2">
          <form action={`/api/admin/production-batches/${batch.id}/csv`} method="post">
            <button className="btn-secondary" type="submit">One-time production CSV</button>
          </form>
          <Link className="btn-secondary" href={`/admin/cards/batches/${batch.id}?layout=labels`}>Permanent URL labels</Link>
          <PrintButton label="Print / طباعة"/>
        </div>}
      />
      {produced.some(tag => tag.activationSecretVersion && !tag.scratchSecretExportedAt) &&
        <p className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Scratch secrets are available only through the one-time production CSV. Download it only within the controlled packaging workflow; this page and consumer APIs never reveal them.
        </p>}
      <div className="mb-5 grid gap-3 sm:grid-cols-5">
        {[
          ["Batch", batch.productionBatch?.batchCode || batch.name],
          ["Supplier", batch.supplier?.name || "—"],
          ["Stock product", batch.inventoryItem?.sku || "—"],
          ["Produced", batch.quantity],
          ["Status", batch.productionBatch?.status || "LEGACY"],
        ].map(([key, value]) => <div className="card p-4" key={String(key)}><p className="text-xs text-slate-500">{String(key)}</p><strong>{String(value)}</strong></div>)}
      </div>
    </div>

    {produced.length ? (
      labelLayout
        ? <div className="grid grid-cols-2 gap-4 print:grid-cols-3">
          {produced.map(tag => <article className="break-inside-avoid rounded-xl border border-slate-300 bg-white p-4 text-black" key={tag.id}>
            <div className="flex gap-3">
              <QRCodeSVG value={tag.permanentUrl} size={92} bgColor="#ffffff" fgColor="#000000"/>
              <div className="min-w-0">
                <p className="font-bold">{tag.card?.serialNumber}</p>
                <p className="mt-1 break-all text-[10px]">{tag.permanentUrl}</p>
                <p className="mt-3 text-[10px] font-bold">{tag.activationPolicy}</p>
                <p className="text-[9px]">Activation secret is packaged separately.</p>
              </div>
            </div>
          </article>)}
        </div>
        : <div className="card overflow-x-auto">
          <table className="w-full min-w-[1400px] text-sm">
            <thead><tr>
              {["Serial number", "Batch code", "Permanent NFC URL", "Permanent QR", "Activation policy", "Secret handling", "Legacy activation URL", "Assignment status", "Action"].map(label =>
                <th className="p-3 text-start" key={label}>{label}</th>)}
            </tr></thead>
            <tbody>{produced.map(tag => <tr className="border-t border-white/10" key={tag.id}>
              <td className="p-3 font-mono" dir="ltr">{tag.card?.serialNumber || "—"}</td>
              <td className="p-3 font-mono" dir="ltr">{batch.productionBatch?.batchCode}</td>
              <td className="max-w-xs break-all p-3 font-mono text-xs" dir="ltr">{tag.permanentUrl}</td>
              <td className="p-3"><span className="inline-flex bg-white p-1"><QRCodeSVG value={tag.permanentUrl} size={72} bgColor="#ffffff" fgColor="#000000"/></span></td>
              <td className="p-3 font-bold">{tag.activationPolicy}</td>
              <td className="p-3">{tag.activationPresentation}</td>
              <td className="max-w-xs break-all p-3 font-mono text-xs" dir="ltr">{tag.activationUrl || "—"}</td>
              <td className="p-3"><Badge value={tag.status}/></td>
              <td className="p-3">{tag.cardId ? <Link className="text-brand-400" href={`/admin/cards/${tag.cardId}`}>View</Link> : "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
    ) : <div className="card p-8 text-center text-slate-400">
      Legacy batch: printable production secrets were not stored. Run the idempotent backfill to register permanent identifiers; activation codes must be rotated deliberately.
    </div>}
  </div>;
}
