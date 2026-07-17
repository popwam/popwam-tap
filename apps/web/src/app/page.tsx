import Image from "next/image";
import Link from "next/link";
import {headers} from "next/headers";
import {prisma} from "@popwam/db";
import {getI18n} from "@/lib/i18n";
import {rootExperience} from "@/lib/domains";
import {Storefront} from "@/components/storefront";

export const dynamic="force-dynamic";

async function catalog(){
  try{return await prisma.product.findMany({where:{status:"ACTIVE"},orderBy:[{featured:"desc"},{sortOrder:"asc"}],include:{category:true,images:{orderBy:{sortOrder:"asc"}},prices:{where:{isActive:true},orderBy:{createdAt:"desc"}},variants:{where:{isActive:true},include:{inventory:true},orderBy:{sortOrder:"asc"}}}});}
  catch{return [];}
}

export default async function RootPage(){
  const experience=rootExperience((await headers()).get("host")||"");
  const {locale}=await getI18n();
  if(experience==="store"){
    const products=(await catalog()).map(product=>({id:product.id,slug:product.slug,name:locale==="ar"?product.nameAr:product.nameEn,description:(locale==="ar"?product.shortDescriptionAr:product.shortDescriptionEn)||"",image:product.images[0]?.url||"/brand/pop/card-landscape-front.svg",price:Number(product.prices[0]?.saleAmount||product.prices[0]?.amount||0),regularPrice:Number(product.prices[0]?.amount||0),currency:product.prices[0]?.currency||"EGP",stock:product.variants.some(variant=>variant.inventory?.status!=="OUT_OF_STOCK"),featured:product.featured,category:locale==="ar"?product.category.nameAr:product.category.nameEn}));
    return <Storefront products={products} locale={locale}/>;
  }
  const ar=locale==="ar";
  return <main className="min-h-screen bg-[#050505] text-white"><header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5"><Link href="/" className="flex items-center gap-3 font-black"><Image src="/brand/pop/logo-form.svg" alt="POP" width={46} height={46}/><span>POP <small className="font-medium text-[#D4AF37]">by POPWAM</small></span></Link><div className="flex gap-2"><Link className="btn-secondary" href="/login">{ar?"تسجيل الدخول":"Sign in"}</Link><Link className="btn-primary" href="/activate">{ar?"تفعيل منتج":"Activate product"}</Link></div></header><section className="mx-auto grid min-h-[78vh] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2"><div><p className="text-sm font-bold tracking-[.25em] text-[#D4AF37]">POP BY POPWAM</p><h1 className="mt-5 text-5xl font-black leading-tight sm:text-7xl">{ar?"عالمك. بلمسة واحدة.":"Your world. One tap away."}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-[#B8B8B8]">{ar?"أدر كروتك الافتراضية ومنتجات POP وروابطك من مكان واحد.":"Manage virtual cards, POP products and public links in one secure app."}</p><div className="mt-8 flex flex-wrap gap-3"><Link className="btn-primary" href="/dashboard">{ar?"فتح التطبيق":"Open app"}</Link><a className="btn-secondary" href="https://go.popwam.com">{ar?"زيارة المتجر":"Visit store"}</a></div></div><div className="grid gap-4 sm:grid-cols-2"><Image className="w-full rounded-[28px] border border-[#6E5420]" src="/brand/pop/card-portrait-front.svg" alt="POP portrait card front" width={600} height={900}/><Image className="mt-10 w-full rounded-[28px] border border-[#6E5420]" src="/brand/pop/card-portrait-back.svg" alt="POP portrait card back" width={600} height={900}/></div></section></main>;
}
