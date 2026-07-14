import Link from "next/link";
import { InventoryItemType, prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { createInventoryItem, reconcileInventory } from "@/app/business-actions";
import { calculateInventoryByProduct } from "@/lib/inventory";

export default async function InventoryPage() {
  const [items, movements, counts] = await Promise.all([
    prisma.inventoryItem.findMany({ include: { supplier: true }, orderBy: { nameEn: "asc" } }),
    prisma.inventoryMovement.findMany({ select: { inventoryItemId: true, type: true, quantity: true } }),
    prisma.card.groupBy({ by: ["inventoryStatus"], _count: { _all: true } }),
  ]);
  const ledger = calculateInventoryByProduct(movements.map(row => ({ productId: row.inventoryItemId, type: row.type, quantity: row.quantity })));
  const count = Object.fromEntries(counts.map(row => [row.inventoryStatus, row._count._all]));
  const reconciliationCount = items.filter(item => (ledger.get(item.id) ?? 0) !== item.quantityOnHand).length;
  return <>
    <PageHeading
      eyebrow="Stock ledger"
      title="المخزون الفعلي / Physical inventory"
      description="الكميات محسوبة من حركات الوحدات، والقيمة المالية معروضة بصورة مستقلة."
      action={<div className="flex flex-wrap gap-2"><Link className="btn-secondary" href="/admin/inventory/movements">Movements</Link><Link className="btn-secondary" href="/admin/inventory/low-stock">Low stock</Link></div>}
    />
    <div className="mb-6 grid gap-3 sm:grid-cols-4 xl:grid-cols-7">
      {["AVAILABLE","RESERVED","PROGRAMMED","ASSIGNED","SOLD","DAMAGED","LOST"].map(key => <div className="card p-4" key={key}><p className="text-xs text-slate-500">{key}</p><strong className="text-2xl">{count[key] || 0}</strong></div>)}
    </div>
    <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
      <div><h2 className="font-bold">Inventory reconciliation</h2><p className="text-sm text-slate-400">{reconciliationCount ? `${reconciliationCount} cached balances differ from the movement ledger.` : "Cached balances match the movement ledger."}</p></div>
      <form action={reconcileInventory}><button className="btn-secondary" disabled={!reconciliationCount}>Reconcile from ledger</button></form>
    </section>
    <div className="card overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr>{["SKU","Arabic name","English name","Type","Supplier","Ledger quantity","Cached quantity","Reserved","Available","Unit cost","Inventory value"].map(label => <th className="p-3 text-start" key={label}>{label}</th>)}</tr></thead><tbody>{items.map(item => { const physical = ledger.get(item.id) ?? 0; const available = Math.max(0, physical - item.quantityReserved); return <tr className={`border-t border-white/10 ${available <= item.reorderLevel ? "bg-amber-500/5" : ""}`} key={item.id}><td className="p-3 font-mono" dir="ltr">{item.sku}</td><td className="p-3">{item.nameAr}</td><td className="p-3">{item.nameEn}</td><td className="p-3">{item.type}</td><td className="p-3">{item.supplier?.name || "—"}</td><td className="p-3 font-bold">{physical}</td><td className="p-3">{item.quantityOnHand}</td><td className="p-3">{item.quantityReserved}</td><td className="p-3 font-bold">{available}</td><td className="p-3">{String(item.unitCost)}</td><td className="p-3">{item.unitCost.mul(available).toFixed(2)}</td></tr>; })}</tbody></table></div>
    <section className="card mt-6 p-5"><h2 className="font-bold">إضافة صنف / Add inventory item</h2><form action={createInventoryItem} className="mt-4 grid gap-3 sm:grid-cols-3"><input className="input font-mono" dir="ltr" name="sku" placeholder="SKU" required/><input className="input" name="nameAr" placeholder="الاسم بالعربية" required/><input className="input" name="nameEn" placeholder="English name" required/><select className="input" name="type">{Object.values(InventoryItemType).map(type => <option key={type}>{type}</option>)}</select>{[["quantityOnHand","Opening quantity"],["reorderLevel","Reorder level"],["unitCost","Unit cost"],["sellingPrice","Selling price"]].map(([name,placeholder]) => <input className="input" name={name} type="number" min="0" step={name.includes("Cost") || name.includes("Price") ? "0.01" : "1"} placeholder={placeholder} key={name}/>)}<button className="btn-primary">Save item</button></form></section>
  </>;
}
