import Link from "next/link";
import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/badge";
import { getI18n } from "@/lib/i18n";

export default async function OrdersPage(){
  const [{dictionary:d},orders]=await Promise.all([getI18n(),prisma.order.findMany({include:{customer:true,_count:{select:{items:true}}},orderBy:{createdAt:"desc"}})]);
  const copy=d.adminPages.orders;const realized=orders.filter(x=>x.paymentStatus==="PAID").reduce((sum,x)=>sum+Number(x.total),0);
  return <><PageHeading eyebrow={copy.eyebrow} title={copy.title} description={`${copy.revenue}: ${realized.toFixed(2)}`} action={<Link className="btn-primary" href="/admin/orders/new">{copy.new}</Link>}/><div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr>{copy.headers.map(x=><th className="p-3 text-start" key={x}>{x}</th>)}</tr></thead><tbody>{orders.map(x=><tr className="border-t border-white/10" key={x.id}><td className="p-3">{x.createdAt.toLocaleDateString()}</td><td className="p-3">{x.customer.name}</td><td className="p-3"><Badge value={x.status}/></td><td className="p-3"><Badge value={x.paymentStatus}/></td><td className="p-3">{x._count.items}</td><td className="p-3">{String(x.total)}</td><td className="p-3">{String(x.paidAmount)}</td><td className="p-3"><Link className="text-brand-400" href={`/admin/orders/${x.id}`}>{d.adminPages.common.view}</Link></td></tr>)}</tbody></table></div></>;
}
