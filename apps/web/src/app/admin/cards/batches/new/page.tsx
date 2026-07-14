import { CardType, prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { MAX_BATCH_QUANTITY } from "@/lib/card-tokens";

export default async function NewBatchPage({ searchParams }: { searchParams: Promise<{ quantity?: string }> }) {
  const [{ quantity }, suppliers, items] = await Promise.all([
    searchParams,
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({ orderBy: { nameEn: "asc" } }),
  ]);
  return <>
    <PageHeading eyebrow="Production" title="إنشاء دفعة إنتاج / Production batch" description="كل قطعة تحصل على رابط NFC دائم ورمز تفعيل مستقل أحادي الاستخدام. تظهر النتائج في جدول طباعة وتصدير محمي للإدارة."/>
    <form action="/api/admin/card-batches" method="post" className="card grid max-w-5xl gap-4 p-6 sm:grid-cols-2">
      <label><span className="label">Name / الاسم</span><input className="input" name="name" required/></label>
      <label><span className="label">Batch code / كود الدفعة</span><input className="input font-mono" dir="ltr" name="batchCode" placeholder="BATCH-2026-001" required/></label>
      <label><span className="label">Quantity / الكمية</span><input className="input" name="quantity" type="number" min="1" max={MAX_BATCH_QUANTITY} defaultValue={quantity || 10} required/></label>
      <label><span className="label">Card type / النوع</span><select className="input" name="cardType">{Object.values(CardType).map(type => <option key={type}>{type}</option>)}</select></label>
      <label><span className="label">Supplier / المورد</span><select className="input" name="supplierId"><option value="">—</option>{suppliers.map(supplier => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></label>
      <label><span className="label">Physical stock product / صنف المخزون الفعلي</span><select className="input" name="inventoryItemId" required><option value="">Select product</option>{items.map(item => <option value={item.id} key={item.id}>{item.sku} · {item.nameEn} ({item.quantityOnHand - item.quantityReserved})</option>)}</select></label>
      <label><span className="label">Serial prefix</span><input className="input font-mono" dir="ltr" name="serialPrefix" defaultValue="PW" required/></label>
      <label><span className="label">Starting serial number</span><input className="input" name="startingSerialNumber" type="number" min="0" defaultValue="1" required/></label>
      <label><span className="label">Permanent URL prefix</span><input className="input font-mono" dir="ltr" name="publicSlugPrefix" defaultValue="pw" required/></label>
      {[ ["unitPurchaseCost","Unit purchase cost"], ["unitProgrammingCost","Unit programming cost"], ["unitPackagingCost","Unit packaging cost"], ["expectedSellingPrice","Expected selling price"] ].map(([name,label]) => <label key={name}><span className="label">{label}</span><input className="input" name={name} type="number" min="0" step="0.01" defaultValue="0"/></label>)}
      <label className="sm:col-span-2"><span className="label">Notes / ملاحظات</span><textarea className="input" name="notes"/></label>
      <button className="btn-primary sm:col-span-2">Create production batch / إنشاء دفعة الإنتاج</button>
    </form>
  </>;
}
