import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";

export default async function InventoryBatchesPage() {
  const batches = await prisma.inventoryBatch.findMany({ include: { product: true }, orderBy: { createdAt: "desc" } });
  return <><PageHeading eyebrow="Inventory" title="Inventory batches / دفعات المخزون" description="Physical quantities are shown independently from unit cost and financial value."/><div className="card overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr>{["Batch","Product","Produced","Available","Assigned","Damaged","Unit cost","Value"].map(label => <th className="p-3 text-start" key={label}>{label}</th>)}</tr></thead><tbody>{batches.map(batch => <tr className="border-t border-white/10" key={batch.id}><td className="p-3 font-mono">{batch.batchCode}</td><td className="p-3">{batch.product.sku} · {batch.product.nameEn}</td><td className="p-3">{batch.producedQuantity}</td><td className="p-3 font-bold text-brand-300">{batch.availableQuantity}</td><td className="p-3">{batch.assignedQuantity}</td><td className="p-3">{batch.damagedQuantity}</td><td className="p-3">{batch.unitCost.toFixed(2)}</td><td className="p-3">{batch.unitCost.mul(batch.availableQuantity).toFixed(2)}</td></tr>)}</tbody></table>{!batches.length && <p className="p-6 text-slate-500">No inventory batches.</p>}</div></>;
}
