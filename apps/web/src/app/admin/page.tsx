import Link from "next/link";
import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { ArrowUpRight, CreditCard, Package, Receipt, ShoppingCart, Users, WalletCards } from "lucide-react";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [users,inventory,purchases,expenses,cards,orders]=await Promise.all([
    prisma.user.count(),prisma.inventoryItem.findMany({select:{quantityOnHand:true,unitCost:true}}),
    prisma.purchase.aggregate({_sum:{totalCost:true}}),prisma.expense.aggregate({_sum:{amount:true}}),
    prisma.card.findMany({select:{ownerId:true,cardStatus:true,inventoryStatus:true,batch:{select:{expectedSellingPrice:true}}}}),
    prisma.order.aggregate({_sum:{paidAmount:true}}),
  ]);
  const inventoryValue=inventory.reduce((sum,x)=>sum+x.quantityOnHand*Number(x.unitCost),0);const totalPurchases=Number(purchases._sum.totalCost||0);const totalExpenses=Number(expenses._sum.amount||0);const prepared=cards.filter(x=>["PROGRAMMED","ACTIVE","PAUSED"].includes(x.cardStatus)).length;const assigned=cards.filter(x=>x.ownerId).length;const available=cards.filter(x=>x.inventoryStatus==="AVAILABLE"||x.inventoryStatus==="PROGRAMMED").length;const expectedRevenue=cards.filter(x=>["AVAILABLE","PROGRAMMED"].includes(x.inventoryStatus)).reduce((sum,x)=>sum+Number(x.batch?.expectedSellingPrice||0),0);const realizedRevenue=Number(orders._sum.paidAmount||0);const grossProfit=realizedRevenue+expectedRevenue-totalPurchases-totalExpenses;
  const stats:[[string,string|number,typeof Users],...Array<[string,string|number,typeof Users]>]=[["Users / المستخدمون",users,Users],["Inventory value / قيمة المخزون",inventoryValue.toFixed(2),Package],["Total purchases / المشتريات",totalPurchases.toFixed(2),ShoppingCart],["Total expenses / المصروفات",totalExpenses.toFixed(2),Receipt],["Cards prepared / المجهزة",prepared,CreditCard],["Cards assigned / المعيّنة",assigned,CreditCard],["Cards available / المتاحة",available,CreditCard],["Expected revenue / المتوقع",expectedRevenue.toFixed(2),WalletCards],["Realized revenue / المحقق",realizedRevenue.toFixed(2),WalletCards],["Estimated gross profit / الربح التقديري",grossProfit.toFixed(2),WalletCards]];
  return <><PageHeading eyebrow="System administration" title="الإدارة والأعمال / Admin overview" description="ملخص عملي للمخزون والمبيعات والمصروفات والبطاقات."/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{stats.map(([label,value,Icon])=><div className="card p-5" key={label}><Icon size={20} className="text-brand-400"/><p className="mt-5 text-2xl font-black">{value}</p><p className="mt-1 text-sm text-slate-400">{label}</p></div>)}</div><div className="mt-6 grid gap-4 sm:grid-cols-3">{[["/admin/cards","Manage cards / إدارة البطاقات"],["/admin/inventory","Inventory / المخزون"],["/admin/orders","Orders / الطلبات"],["/admin/purchases","Purchases / المشتريات"],["/admin/expenses","Expenses / المصروفات"],["/admin/users","Users / المستخدمون"]].map(([href,label])=><Link href={href} className="card flex items-center justify-between p-5 font-bold hover:bg-white/[.07]" key={href}>{label}<ArrowUpRight size={18}/></Link>)}</div></>;
}
