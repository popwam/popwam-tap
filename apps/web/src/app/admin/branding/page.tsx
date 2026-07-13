import { PageHeading } from "@/components/page-heading";
import { BrandingManager } from "@/components/branding-manager";
import { getBrandingSettings } from "@/lib/branding";

export const metadata={title:"Branding & app icons"};
export default async function BrandingPage(){const branding=await getBrandingSettings();const assets=[
  {key:"mainLogo",title:"الشعار الرئيسي / Main logo",description:"يُستخدم كهوية افتراضية في التطبيق.",dimensions:"SVG أو PNG/WebP عالي الدقة",url:branding.mainLogoUrl},
  {key:"lightLogo",title:"الشعار الفاتح / Light logo",description:"للخلفيات الداكنة.",dimensions:"خلفية شفافة موصى بها",url:branding.lightLogoUrl},
  {key:"darkLogo",title:"الشعار الداكن / Dark logo",description:"للخلفيات الفاتحة.",dimensions:"خلفية شفافة موصى بها",url:branding.darkLogoUrl},
  {key:"appIcon",title:"أيقونة التطبيق / App icon",description:"المصدر الرئيسي لأيقونة التطبيق.",dimensions:"1024 × 1024",url:branding.appIconUrl,square:true},
  {key:"favicon",title:"أيقونة المتصفح / Favicon",description:"تظهر في تبويب المتصفح والمفضلة.",dimensions:"مصدر 512 × 512",url:branding.faviconUrl,square:true},
  {key:"appleTouchIcon",title:"أيقونة Apple Touch",description:"تظهر عند إضافة التطبيق إلى شاشة iPhone/iPad.",dimensions:"180 × 180",url:branding.appleTouchIconUrl,square:true},
  {key:"pwaIcon192",title:"أيقونة PWA صغيرة",description:"يستخدمها Android والمتصفحات المثبّتة.",dimensions:"192 × 192",url:branding.pwaIcon192Url,square:true},
  {key:"pwaIcon512",title:"أيقونة PWA كبيرة",description:"لشاشة التشغيل والأجهزة عالية الدقة.",dimensions:"512 × 512",url:branding.pwaIcon512Url,square:true},
  {key:"defaultOgImage",title:"صورة المشاركة الافتراضية / Open Graph",description:"تظهر عند مشاركة رابط لا يملك صورة ملف شخصي.",dimensions:"1200 × 630",url:branding.defaultOgImageUrl},
];return <><PageHeading eyebrow="Administration" title="الهوية والأيقونات / Branding" description="كل ملف يُحفظ في Cloudflare R2. إن لم ترفع ملفاً، يستخدم النظام النسخة المضمّنة تلقائياً."/><div className="card mb-6 p-5 text-sm leading-7 text-slate-300"><p>أيقونة التطبيق تخص شاشة الهاتف، وFavicon تخص تبويب المتصفح، وApple Touch تخص أجهزة Apple، وأيقونات PWA تخص تثبيت لوحة التحكم، بينما صورة Open Graph تظهر عند مشاركة الروابط.</p><p className="mt-2 text-xs text-slate-500">Static fallbacks live in <code dir="ltr">apps/web/public/icons/</code>.</p></div><BrandingManager assets={assets}/></>}
