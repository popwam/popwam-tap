import Link from "next/link";
import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { getI18n } from "@/lib/i18n";

export default async function PurchasesPage(){
  const [{dictionary:d},purchases]=await Promise.all([getI18n(),prisma.purchase.findMany({include:{supplier:true,_count:{select:{items:true}}},orderBy:{purchaseDate:"desc"}})]);
  const copy=d.adminPages.purchases;const total=purchases.reduce((sum,x)=>sum+Number(x.totalCost),0);
  return <><PageHeading eyebrow={copy.eyebrow} title={copy.title} description={`${copy.total}: ${total.toFixed(2)}`} action={<Link className="btn-primary" href="/admin/purchases/new">{copy.new}</Link>}/><div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr>{copy.headers.map(x=><th className="p-3 text-start" key={x}>{x}</th>)}</tr></thead><tbody>{purchases.map(x=><tr className="border-t border-white/10" key={x.id}><td className="p-3">{x.purchaseDate.toLocaleDateString()}</td><td className="p-3">{x.supplier.name}</td><td className="p-3" dir="ltr">{x.invoiceNumber||d.adminPages.common.notAvailable}</td><td className="p-3"><Badge value={x.status}/></td><td className="p-3">{x._count.items}</td><td className="p-3">{String(x.totalCost)}</td><td className="p-3">{String(x.paidAmount)}</td><td className="p-3"><Link className="text-brand-400" href={`/admin/purchases/${x.id}`}>{d.adminPages.common.view}</Link></td></tr>)}</tbody></table></div></>;
}
