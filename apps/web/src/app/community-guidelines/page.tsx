import Link from "next/link";
import { getI18n } from "@/lib/i18n";

export default async function CommunityGuidelinesPage() {
  const { locale } = await getI18n();
  const ar = locale === "ar";
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
    <article className="card p-7 sm:p-10">
      <p className="text-sm font-bold text-brand-400">POP by POPWAM</p>
      <h1 className="mt-2 text-3xl font-black">{ar ? "إرشادات الأصدقاء والمجتمع" : "Friends & Community Guidelines"}</h1>
      <p className="mt-4 leading-7 text-slate-400">{ar ? "الأصدقاء في POP علاقة متبادلة بالموافقة. استخدم الطلبات باحترام، ولا تنتحل هوية الآخرين أو تزعجهم أو تحاول الاحتيال عليهم." : "Friends on POP is a mutual-consent relationship. Send requests respectfully, and do not impersonate, harass, spam, or attempt to scam other people."}</p>
      <h2 className="mt-8 text-xl font-bold">{ar ? "تحكمك وخصوصيتك" : "Your control and privacy"}</h2>
      <p className="mt-3 leading-7 text-slate-400">{ar ? "يمكنك رفض الطلبات أو إزالة صديق أو كتم إشعاراته أو حظره أو الإبلاغ عنه. الحظر يلغي علاقة الصداقة والطلبات ولا يعيدها إلغاء الحظر تلقائياً." : "You may decline requests, remove a friend, mute their social notifications, block them, or report them. Blocking ends Friends interactions and requests; unblocking does not restore a friendship."}</p>
      <h2 className="mt-8 text-xl font-bold">{ar ? "ما لا يفعله POP" : "What POP does not do"}</h2>
      <p className="mt-3 leading-7 text-slate-400">{ar ? "لا يرفع POP دفتر جهات اتصالك ولا يستخدم الموقع القريب أو المراسلة غير المطلوبة في هذه التجربة." : "POP does not upload your contact book or use Nearby discovery or unsolicited messaging in this experience."}</p>
      <p className="mt-8 text-sm text-slate-500">{ar ? "لا تصبح هذه الصفحة سياسة نشطة إلا عندما ينشر الخادم إصداراً مطلوباً ومراجعاً منها. الخادم هو مصدر الإصدار والموافقة." : "This page becomes an active policy only when the server publishes a reviewed, required version. The server remains the authority for version and acceptance."}</p>
      <Link href="/dashboard/friends" className="btn-primary mt-8">{ar ? "العودة إلى الأصدقاء" : "Back to Friends"}</Link>
    </article>
  </main>;
}

