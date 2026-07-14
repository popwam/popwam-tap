import Link from "next/link";
import { Prisma, prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { ArrowUpRight, CreditCard, Package, Receipt, ShoppingCart, Users, WalletCards } from "lucide-react";
import { getI18n } from "@/lib/i18n";
import { calculateInventoryByProduct } from "@/lib/inventory";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [{dictionary:d},users,inventory,movements,purchases,expenses,cards,orders]=await Promise.all([
    getI18n(),prisma.user.count(),prisma.inventoryItem.findMany({select:{id:true,quantityOnHand:true,unitCost:true}}),
    prisma.inventoryMovement.findMany({select:{inventoryItemId:true,type:true,quantity:true}}),
    prisma.purchase.aggregate({_sum:{totalCost:true}}),prisma.expense.aggregate({_sum:{amount:true}}),
    prisma.card.findMany({select:{ownerId:true,cardStatus:true,inventoryStatus:true,batch:{select:{expectedSellingPrice:true,unitPurchaseCost:true,unitProgrammingCost:true,unitPackagingCost:true}}}}),
    prisma.order.aggregate({_sum:{paidAmount:true}}),
  ]);
  const zero=new Prisma.Decimal(0);
  const balances=calculateInventoryByProduct(movements.map(x=>({productId:x.inventoryItemId,type:x.type,quantity:x.quantity})));
  const rawAvailable=[...balances.values()].reduce((sum,quantity)=>sum+Math.max(0,quantity),0);
  const rawInventoryValue=inventory.reduce((sum,item)=>sum.plus(item.unitCost.mul(Math.max(0,balances.get(item.id)??0))),zero);
  const availableCards=cards.filter(x=>x.inventoryStatus==="AVAILABLE"||x.inventoryStatus==="PROGRAMMED");
  const producedInventoryValue=availableCards.reduce((sum,card)=>sum.plus(card.batch?card.batch.unitPurchaseCost.plus(card.batch.unitProgrammingCost).plus(card.batch.unitPackagingCost):zero),zero);
  const inventoryValue=rawInventoryValue.plus(producedInventoryValue);
  const totalPurchases=purchases._sum.totalCost||zero;const totalExpenses=expenses._sum.amount||zero;const prepared=cards.filter(x=>["PROGRAMMED","ACTIVE","PAUSED"].includes(x.cardStatus)).length;const assigned=cards.filter(x=>x.inventoryStatus==="ASSIGNED"||Boolean(x.ownerId)).length;const available=availableCards.length;const sold=cards.filter(x=>x.inventoryStatus==="SOLD").length;const damaged=cards.filter(x=>x.inventoryStatus==="DAMAGED").length;const physicalAvailable=rawAvailable+available;const expectedRevenue=availableCards.reduce((sum,x)=>sum.plus(x.batch?.expectedSellingPrice||zero),zero);const realizedRevenue=orders._sum.paidAmount||zero;const grossProfit=realizedRevenue.plus(expectedRevenue).minus(totalPurchases).minus(totalExpenses);
  const labels=d.adminDashboard.stats;
  const inventoryLabels=d.adminDashboard.inventory;
  const stats:[[string,string|number,typeof Users],...Array<[string,string|number,typeof Users]>]=[[labels[0],users,Users],[inventoryLabels.physicalAvailable,physicalAvailable,Package],[inventoryLabels.assigned,assigned,CreditCard],[inventoryLabels.sold,sold,CreditCard],[inventoryLabels.damaged,damaged,CreditCard],[inventoryLabels.value,inventoryValue.toFixed(2),WalletCards],[labels[2],totalPurchases.toFixed(2),ShoppingCart],[labels[3],totalExpenses.toFixed(2),Receipt],[labels[4],prepared,CreditCard],[labels[7],expectedRevenue.toFixed(2),WalletCards],[labels[8],realizedRevenue.toFixed(2),WalletCards],[labels[9],grossProfit.toFixed(2),WalletCards]];
  const actionPaths=["/admin/cards","/admin/inventory","/admin/orders","/admin/purchases","/admin/expenses","/admin/users"];
  return <><PageHeading eyebrow={d.adminDashboard.eyebrow} title={d.adminDashboard.title} description={d.adminDashboard.description}/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{stats.map(([label,value,Icon])=><div className="card p-5" key={label}><Icon size={20} className="text-brand-400"/><p className="mt-5 text-2xl font-black">{value}</p><p className="mt-1 text-sm text-slate-400">{label}</p></div>)}</div><div className="mt-6 grid gap-4 sm:grid-cols-3">{actionPaths.map((href,index)=><Link href={href} className="card flex items-center justify-between p-5 font-bold hover:bg-white/[.07]" key={href}>{d.adminDashboard.actions[index]}<ArrowUpRight className="directional-icon" size={18}/></Link>)}</div></>;
}
