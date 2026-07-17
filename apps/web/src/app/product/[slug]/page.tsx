import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@popwam/db";
import { getI18n } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getI18n();
  const product = await prisma.product.findFirst({
    where: { OR: [{ slug }, { slugs: { some: { slug } } }], status: "ACTIVE" },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      features: { orderBy: { sortOrder: "asc" } },
      prices: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
      variants: { where: { isActive: true }, include: { inventory: true }, orderBy: { sortOrder: "asc" } },
    },
  }).catch(() => null);
  if (!product) notFound();
  const ar = locale === "ar";
  const price = product.prices[0];
  const images = product.images.length ? product.images : [{ id: "fallback", url: "/brand/pop/card-landscape-front.svg", altAr: null, altEn: null }];
  return <main className="min-h-screen bg-[#050505] text-white"><div className="mx-auto max-w-6xl px-5 py-8">
    <Link href="/" className="text-[#D4AF37]">← {ar ? "المتجر" : "Store"}</Link>
    <div className="mt-8 grid gap-10 lg:grid-cols-2"><div className="space-y-4">{images.map(image => <Image key={image.id} src={image.url} alt={(ar ? image.altAr : image.altEn) || product.nameEn} width={1000} height={650} className="w-full rounded-[28px] border border-[#6E5420] object-cover" />)}</div>
      <div><p className="text-sm text-[#D4AF37]">{ar ? product.category.nameAr : product.category.nameEn}</p><h1 className="mt-2 text-4xl font-black">{ar ? product.nameAr : product.nameEn}</h1><p className="mt-5 whitespace-pre-line leading-8 text-[#B8B8B8]">{(ar ? product.descriptionAr : product.descriptionEn) || (ar ? product.shortDescriptionAr : product.shortDescriptionEn)}</p>
        {price && <p className="mt-7 text-2xl font-black" dir="ltr">{Number(price.saleAmount || price.amount).toLocaleString(locale)} {price.currency}</p>}
        <div className="mt-7 space-y-2">{product.variants.map(variant => <div className="flex justify-between rounded-xl border border-white/10 p-3" key={variant.id}><span>{ar ? variant.nameAr : variant.nameEn}</span><span className={variant.inventory?.status === "OUT_OF_STOCK" ? "text-red-400" : "text-emerald-400"}>{variant.inventory?.status === "OUT_OF_STOCK" ? (ar ? "غير متوفر" : "Out of stock") : (ar ? "متوفر" : "Available")}</span></div>)}</div>
        {product.features.length > 0 && <ul className="mt-8 space-y-3">{product.features.map(feature => <li className="rounded-xl bg-white/5 p-4" key={feature.id}><strong>{ar ? feature.titleAr : feature.titleEn}</strong>{(ar ? feature.valueAr : feature.valueEn) && <p className="mt-1 text-sm text-[#B8B8B8]">{ar ? feature.valueAr : feature.valueEn}</p>}</li>)}</ul>}
      </div></div>
  </div></main>;
}
