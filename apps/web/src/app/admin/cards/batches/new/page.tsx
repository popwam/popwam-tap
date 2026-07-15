import { prisma } from "@popwam/db";
import { PageHeading } from "@/components/page-heading";
import { MAX_BATCH_QUANTITY } from "@/lib/card-tokens";

export default async function NewBatchPage({ searchParams }: { searchParams: Promise<{ quantity?: string }> }) {
  const [{ quantity }, items] = await Promise.all([
    searchParams,
    prisma.inventoryItem.findMany({
      where: { type: { in: ["BLANK_CARD", "BLANK_STICKER", "BLANK_WRISTBAND", "QR_PRODUCT"] } },
      orderBy: { nameEn: "asc" },
    }),
  ]);
  return <>
    <PageHeading eyebrow="Production" title="إنشاء دفعة إنتاج / Production batch" description="كل قطعة تحصل على رابط NFC دائم ورمز تفعيل مستقل أحادي الاستخدام. تظهر النتائج في جدول طباعة وتصدير محمي للإدارة."/>
    <form action="/api/admin/card-batches" method="post" className="card grid max-w-3xl gap-4 p-6 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="label">Inventory product / صنف المخزون</span><select className="input" name="inventoryItemId" required><option value="">Select product</option>{items.map(item => <option value={item.id} key={item.id}>{item.sku} · {item.nameEn} / {item.nameAr} · {item.quantityOnHand - item.quantityReserved} available</option>)}</select></label>
      <label><span className="label">Quantity / الكمية</span><input className="input" name="quantity" type="number" min="1" max={MAX_BATCH_QUANTITY} defaultValue={quantity || 10} required/></label>
      <label className="sm:col-span-2"><span className="label">Notes / ملاحظات</span><textarea className="input" name="notes"/></label>
      <button className="btn-primary sm:col-span-2">Generate cards / إنشاء الكروت</button>
    </form>
  </>;
}
