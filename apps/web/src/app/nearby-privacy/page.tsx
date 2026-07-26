import Link from "next/link";
import { getI18n } from "@/lib/i18n";

export default async function NearbyPrivacyPage() {
  const { locale } = await getI18n();
  const ar = locale === "ar";
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
    <article className="card p-7 sm:p-10">
      <p className="text-sm font-bold text-brand-400">POP by POPWAM</p>
      <h1 className="mt-2 text-3xl font-black">{ar ? "خصوصية Nearby" : "Nearby privacy"}</h1>
      <p className="mt-5 leading-7 text-slate-400">{ar
        ? "Nearby ميزة اختيارية. لا يظهر حسابك إلا بعد موافقتك الصريحة وتشغيل الميزة وأثناء وجود صالح قصير الأجل."
        : "Nearby is optional. Your account is not shown until you explicitly consent, turn the feature on, and have a valid short-lived presence."}</p>
      <h2 className="mt-8 text-xl font-bold">{ar ? "الموقع التقريبي فقط" : "Approximate area only"}</h2>
      <p className="mt-3 leading-7 text-slate-400">{ar
        ? "يحوّل الخادم قراءة الموقع إلى خلية تقريبية ولا يخزن الإحداثيات الخام. لا تعرض النتائج خريطة أو موقعًا دقيقًا أو مسافة دقيقة أو وقت آخر ظهور."
        : "The server converts a location reading into a coarse area cell and does not store raw coordinates. Results never show a map, precise location, exact distance, or last-seen time."}</p>
      <h2 className="mt-8 text-xl font-bold">{ar ? "تحكمك" : "Your control"}</h2>
      <p className="mt-3 leading-7 text-slate-400">{ar
        ? "يمكنك إيقاف Nearby أو سحب الموافقة. ينهي الحظر الظهور المتبادل فورًا. يتوقف تحديث الموقع عند مغادرة الشاشة وينتهي الوجود تلقائيًا."
        : "You can turn Nearby off or revoke consent. Blocking immediately ends mutual visibility. Location refresh stops when you leave the screen and presence expires automatically."}</p>
      <p className="mt-8 text-sm text-slate-500">{ar
        ? "هذه صفحة شرح للمنتج وليست إصدارًا قانونيًا مفعلًا بحد ذاتها. لا يتيح الخادم Nearby إلا بعد نشر مستند مطلوب ومراجع وإثبات موافقتك على إصداره الحالي."
        : "This is a product explanation, not an active legal version by itself. The server enables Nearby only after a reviewed required document is published and your acceptance of its current version is recorded."}</p>
      <Link href="/dashboard/nearby" className="btn-primary mt-8">{ar ? "العودة إلى Nearby" : "Back to Nearby"}</Link>
    </article>
  </main>;
}
