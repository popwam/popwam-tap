import Link from "next/link";
import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { getI18n } from "@/lib/i18n";

export default async function ExpensesPage(){
  const [{locale,dictionary:d},expenses]=await Promise.all([getI18n(),prisma.expense.findMany({include:{category:true,creator:true},orderBy:{expenseDate:"desc"},take:1000})]);
  const copy=d.adminPages.expenses;const total=expenses.reduce((sum,x)=>sum+Number(x.amount),0);
  return <><PageHeading eyebrow={copy.eyebrow} title={copy.title} description={`${copy.total}: ${total.toFixed(2)}`} action={<div className="flex gap-2"><Link className="btn-secondary" href="/admin/expense-categories">{copy.categories}</Link><Link className="btn-primary" href="/admin/expenses/new">{copy.new}</Link></div>}/><div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr>{copy.headers.map(x=><th className="p-3 text-start" key={x}>{x}</th>)}</tr></thead><tbody>{expenses.map(x=><tr className="border-t border-white/10" key={x.id}><td className="p-3">{x.expenseDate.toLocaleDateString()}</td><td className="p-3">{locale==="ar"?x.category.nameAr:x.category.nameEn}</td><td className="p-3">{x.title}</td><td className="p-3 font-bold">{String(x.amount)}</td><td className="p-3">{x.paymentMethod||d.adminPages.common.notAvailable}</td><td className="p-3" dir="ltr">{x.referenceNumber||d.adminPages.common.notAvailable}</td><td className="p-3" dir="ltr">{x.creator.email}</td></tr>)}</tbody></table></div></>;
}
