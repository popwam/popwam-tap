import Link from "next/link";
import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { getI18n } from "@/lib/i18n";

export default async function CardBatchesPage(){
  const [{dictionary:d},batches]=await Promise.all([getI18n(),prisma.cardBatch.findMany({include:{supplier:true,_count:{select:{cards:true}}},orderBy:{createdAt:"desc"}})]);
  const copy=d.adminPages.batches;const common=d.adminPages.common;
  return <><PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} action={<Link className="btn-primary" href="/admin/cards/batches/new">{copy.new}</Link>}/><div className="grid gap-4">{batches.map(batch=><Link className="card flex flex-wrap items-center justify-between gap-4 p-5" href={`/admin/cards/batches/${batch.id}`} key={batch.id}><div><h2 className="font-bold">{batch.name}</h2><p className="mt-1 text-sm text-slate-500">{batch.supplier?.name||common.noSupplier} · {batch.createdAt.toLocaleString()}</p></div><div className="flex gap-3"><Badge value={batch.cardType}/><strong>{batch._count.cards} / {batch.quantity}</strong></div></Link>)}</div></>;
}
