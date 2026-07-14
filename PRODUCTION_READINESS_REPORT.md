# تقرير الجاهزية النهائية للإنتاج — POPWAM Tap

تاريخ التدقيق: 14 يوليو 2026  
النطاق: المستودع الأحادي الحالي، تطبيق الويب وواجهات API وPrisma/Neon وRailway/Cloudflare R2 وتطبيق Android.  
القرار العام: **NO-GO**

## الملخص التنفيذي

نجحت بوابات البناء والاختبارات المحلية، وتم تطبيق جميع مهاجرات Prisma الثماني على قاعدة Neon الحالية. `migrate status` أكد أن القاعدة محدثة، و`migrate diff --exit-code` لم يجد اختلافًا، كما نجح `db:repair` مرتين دون إنشاء سجلات مكررة. نجح بناء Next.js، ونجحت 27/27 من اختبارات الويب. نجح Android lint دون أخطاء، ونجح 2/2 من اختبارات الوحدة، وتم إنشاء APK debug.

لم تُثبت ثغرة بمستوى **Critical** في المصدر الحالي. مع ذلك، توجد حواجز إصدار بمستوى **High** تجعل القرار العام NO-GO:

1. النسخة المنشورة لا تطابق المصدر الحالي: استجابة الإنتاج من `/api/auth/providers` تعرض `credentials,google` فقط، بينما المصدر الحالي يعرّف `phone-otp`. تغييرات Phase 3 والتقوية والمهاجرات ما زالت غير ملتزم بها في Git.
2. كل ملفات R2 تُرفع إلى مسار عام وتُخزن لها `publicUrl`. إخفاء الملف يزيله من HTML العام فقط ولا يلغي الوصول لمن يعرف الرابط. لا توجد روابط موقعة أو بوابة تنزيل للملفات الخاصة.
3. مسار الصور المباشر للملف الشخصي/الغلاف لا يسجل حجمًا يمكن احتسابه ضمن حصة التخزين، وقد يترك كائنًا يتيمًا إذا لم يحفظ المستخدم التغيير بعد الرفع. لذلك يمكن تجاوز حصة التخزين عبر هذه المسارات.
4. الطلبات لا تنفذ دورة بيع ذرّية للبطاقة أو المخزون: لا حجز، ولا منع مؤكد لاستخدام البطاقة في أكثر من طلب، ولا انتقال تلقائي إلى SOLD عند التسليم.
5. NFC writing/read-only وHCE لم تُختبر على جهاز Android فعلي ووسوم حقيقية؛ نجاح البناء لا يثبت السلوك المادي.

## التغييرات التقوية المنفذة في هذا التدقيق

- إعادة فحص حالة المستخدم ودوره من قاعدة البيانات في واجهات cookie API بدل الثقة بدور JWT قديم.
- فرض فحص same-origin على عمليات API المعتمدة على cookie للإدارة ورفع الملفات والصور، مع الإبقاء على حماية NextAuth/Server Actions الأصلية.
- رفض مسارات إعادة التوجيه الداخلية المحتوية على backslash أو أشكالها المشفرة، وتنقية `callbackUrl` في تسجيل الدخول.
- جعل المطالبة بالبطاقة وفرض حدود الخطط عمليات Serializable تقفل سجل المستخدم وتعيد فحص الاستحقاق والاستخدام داخل المعاملة، مع إعادة المحاولة عند تعارض PostgreSQL.
- تطبيق القفل نفسه على إنشاء الملفات والروابط والملفات الشخصية والحقول المخصصة لتقليل تجاوز الحدود بالطلبات المتزامنة.
- استخدام `Prisma.Decimal` ومدخلات مالية عشرية نصية دقيقة بدل JavaScript floating point للحسابات الرسمية الجديدة.
- رفض الخصم الأكبر من subtotal، ورفض `paidAmount` الأكبر من إجمالي الشراء، ورفض القيم السالبة أو ذات أكثر من منزلتين.
- تسجيل رصيد افتتاح المخزون كحركة `ADJUSTMENT_IN` مع سجل تدقيق داخل معاملة واحدة.
- إضافة فهرس مستقل لحالة البطاقة عبر هجرة `20260714050000_production_hardening_indexes`.
- إضافة HSTS و`nosniff` ورفض framing وسياسة `no-referrer` وPermissions Policy، وإجبار صفحات dashboard/admin على `private, no-store`.
- إضافة مدقق متغيرات إنتاج يفشل التشغيل/pre-deploy عند غياب الأسرار أو المضيفات أو SMS/R2 المطلوبة.
- منع seed الإنتاجي افتراضيًا؛ يحتاج `ALLOW_PRODUCTION_SEED=true` وكلمات مرور غير افتراضية بطول 16 حرفًا على الأقل.

## نتائج تدقيق الأمن

| المجال | النتيجة | الدليل أو الملاحظة |
|---|---|---|
| توليد OTP | سليم في المصدر | `crypto.randomInt`، رمز 6 أرقام، ولا يُسجل الرمز. |
| تخزين OTP | سليم | HMAC-SHA256 باستخدام `OTP_PEPPER`، وليس الرمز الخام. مزود التطوير يعيد الرمز فقط خارج production. |
| انتهاء/استخدام OTP | سليم | 3–5 دقائق، أحادي الاستخدام، حد محاولات، cooldown وحد يومي لكل هاتف. |
| إساءة OTP | Caveat | لا يوجد حد موزع عالمي لحماية تكلفة SMS عبر أرقام هاتف كثيرة؛ يجب فرض حد على مستوى المزود/WAF دون حفظ IP كتحليلات. |
| جلسات الويب | سليم مع Caveat | NextAuth cookies وCSRF، وحالة/دور المستخدم يعادان من DB للعمليات الحساسة. إكمال Google الفعلي لم يُختبر. |
| جلسات الهاتف | سليم في الاختبارات | access token موقّع قصير العمر، refresh token عشوائي مخزن كـ hash، rotation وعائلة وإبطال عند replay، وفحص المستخدم الحالي من DB. |
| Google OAuth/linking | سليم تصميميًا | البريد المتحقق مطلوب، الدمج التلقائي الخطر معطل، والربط الصريح يتطلب جلسة. لم يكتمل اختبار OAuth حي من البداية للنهاية. |
| تنشيط البطاقة | سليم في المصدر | activation hash فقط، claim session hash وexpiry وHttpOnly cookie، مطابقة البطاقة، استهلاك ذري، وحد محاولات. |
| CSRF | تم تشديده | NextAuth وServer Actions بالإضافة إلى فحص Origin/Host على custom cookie mutations. Bearer mobile API غير معتمد على cookies. |
| Open redirects | تم تشديده | رفض scheme غير آمن و`//` وbackslash والنسخ المشفرة، واختبارات وحدة مضافة. |
| Ownership | سليم في المسارات المفحوصة | استعلامات البطاقات/الملفات/الوجهات تستخدم `ownerId` أو `userId`، وبرمجة NFC تتطلب admin/staff. |
| حدود الخطط | تم تشديدها مع Caveat | المعاملات المتزامنة لا تتجاوز حدود cards/profiles/links/files؛ صور avatar/cover لا تدخل بعد في حصة bytes. |
| رفع الملفات | **High** | MIME والامتداد والحجم تُفحص، وتُحظر الصيغ التنفيذية، والأسرار server-side؛ لكن الملفات كلها عامة فعليًا. |
| حذف المستخدم | سليم في المصدر | suspend/restore/delete مع اختيار مصير البطاقات ومعاملة Prisma وعلاقات FK وسجل تدقيق. |
| Audit logs | جيد مع Caveat | العمليات الإدارية والمالية والبطاقات مسجلة دون OTP/activation secrets. لا يوجد نظام SIEM/تنبيه أو سياسة احتفاظ موثقة. |
| الأسرار | سليم في Git الحالي | `.env` غير متتبع، ولا مفاتيح خاصة أو database URL حقيقي في الملفات أو تاريخ المسارات المفحوص، ولا مراجع أسرار server في client components. |
| Seed | تم تشديده | لا يعمل في production دون سماح صريح وكلمات مرور قوية؛ لا تشغله ضمن كل نشر. |

نتيجة فحص Git: الملف البيئي المتتبع الوحيد هو `.env.example`. لم تُوجد مسارات `.env` أو keystore/pem في التاريخ المفحوص، ولم تُوجد توقيعات AKIA أو private key أو PostgreSQL credential في الملفات المتتبعة. هذا لا يغني عن secret scanning في GitHub قبل الدفع، خاصة للفروع/الـ forks غير الموجودة محليًا.

## سلوك الخصوصية الناتج

التحليلات المخزنة للبطاقات الجديدة هي فقط:

- `Card.openCount`
- `Card.lastOpenedAt`
- `CardOpenDaily(date, openCount)` اختياريًا

المهاجرة التجارية حذفت `ipAddress` و`userAgent` و`referrer` من أحداث Tag القديمة. لا يخزن مسار فتح البطاقة IP أو user agent أو browser/device أو الدولة/المدينة أو GPS أو fingerprint أو referrer. جرى ضبط `Referrer-Policy: no-referrer`.

يُقرأ `navigator.userAgent` محليًا فقط لاختيار تعليمات تثبيت iOS ولا يُرسل أو يخزن. حقل `MobileRefreshToken.deviceName` هو وصف اختياري لجلسة أمنية وليس تحليل فتح بطاقة؛ يجب إبقاؤه اختياريًا وتحديد مدة احتفاظه في سياسة الخصوصية. قد تحتوي سجلات التشغيل على معرف عملية/مستخدم/بطاقة لأغراض الخطأ، لكنها لا تحتوي OTP أو activation token أو بيانات القياس المحظورة.

## نتائج الأداء

### ما تم إثباته

- حل البطاقة الجديدة يستخدم `findUnique` على `publicSlug`/`publicToken` مع `select` محدود. لا يحمل الملف الشخصي إلا إذا كانت الوجهة المختارة `PROFILE`.
- redirect يتم من الخادم، وتسجيل العداد داخل `after()` ومحاط بمعالجة فشل؛ فشل التحليلات لا يمنع redirect.
- `publicSlug` و`publicToken` و`serialNumber` unique indexes، و`ownerId` و`batchId` و`cardStatus` مفهرسة. هجرة الفهرس طبقت على Neon ولا يوجد drift.
- اختبار QA المعزول السابق أنشأ دفعة 1000 بطاقة في نحو 1.36 ثانية في بيئة الاختبار. هذه ليست نتيجة load test إنتاجية ولا يجوز تعميمها.
- CSV محكوم حاليًا بالحد الأقصى للدفعة 1000؛ يُنشأ في الذاكرة ولا يُstream، وهو مقبول لهذا الحد فقط.
- بناء Next أظهر shared first-load JS نحو 102 kB؛ صفحات التطبيق تراوحت في ناتج البناء المعروض تقريبًا بين 103 و117 kB first-load.

### اختناقات مؤكدة أو مرصودة من الكود

- مسار Tag القديم يحمل active destination وملفًا شخصيًا كاملًا قبل معرفة إن كان سيعيد التوجيه؛ هذا حمل غير ضروري لمسار legacy.
- metadata والصفحة العامة قد تنفذان استعلامين متشابهين للملف الشخصي.
- جداول إدارة كثيرة غير مقسمة إلى صفحات. البطاقات تحمل حتى 1000 مع علاقات كاملة، والحركات 500، والمصروفات 1000، بينما بعض الجداول لا تملك `take` أصلًا. هذا غير مناسب لنمو البيانات.
- صور R2 تُعرض غالبًا عبر `<img>` خام دون responsive variants أو تحويل CDN. صور الويب المقصوصة WebP أفضل، لكن رفع الهاتف لا يضمن التحويل أو المقاسات.
- service worker لا يخزن API/dashboard/admin/login، ويستخدم network-first للتنقل؛ البيانات الخاصة لا تدخل cache العام. `/sw.js` نفسه `no-cache`.
- `/health` يثبت حياة عملية Next فقط؛ لا يفحص Neon أو R2. يلزم مراقبة منفصلة للجاهزية التابعة دون وضع استعلامات ثقيلة في health check الأساسي.

قياسات HTTP المنفردة أثناء التدقيق كانت تقريبًا 0.61 ثانية لـ app health، و1.71 ثانية لجذر go، و2.41 ثانية لجذر media في ثلاث طلبات curl منفردة. ليست benchmark ولا load test، وقد تتأثر بالاتصال وCloudflare cold path.

## النزاهة المالية والمخزون

### محقق

- حقول المال `Decimal(14,2)` في Prisma.
- الحسابات الرسمية التي عُدلت تستخدم `Prisma.Decimal` من نص مدخل، مع اختبارات `0.10 + 0.20 = 0.30` و`19.99 × 3`.
- المخزون لا يسمح بخروج يجعل `quantityOnHand < quantityReserved`، وتوليد الدفعة يستخدم تحديثًا شرطيًا ومعاملة.
- استلام الشراء Serializable، لا يستلم CANCELLED، ولا يكرر الاستلام بعد RECEIVED، وينشئ حركة PURCHASE لكل بند.
- الرصيد الافتتاحي الجديد أصبح حركة `ADJUSTMENT_IN` مدققة.
- الخصم لا يتجاوز subtotal، وpaid purchase لا يتجاوز total، والتغييرات تتطلب admin وتكتب AuditLog.

### حواجز/Caveats

- **High:** إنشاء Order لا يحجز/يبيع البطاقة أو InventoryItem ذريًا، ولا يمنع استخدام cardId نفسه في طلبات متعددة، ولا ينشئ حركة SOLD عند التسليم.
- لا يوجد حقل عملة أو إعداد عملة موحد. يجب قفل الإصدار الأول على EGP وتوثيق ذلك، أو إضافة currency قبل دعم أكثر من عملة.
- بعض مجاميع العرض في صفحات القوائم ما زالت تحول Decimal إلى `Number`. هذا ليس مصدر القيمة المخزنة لكنه قد يسبب اختلاف عرض عند أحجام مالية ضخمة.
- قيمة “Estimated gross profit” الحالية تقديرية وليست تقرير محاسبة: تمزج الإيراد المحقق والمتوقع مع إجمالي المشتريات والمصروفات، ولا تحسب COGS لكل Order. يجب عدم استخدامها كرقم محاسبي رسمي.
- لا توجد دورة تعديل/إلغاء مصروف كاملة موثقة؛ الإنشاء مدقق، لكن التصحيح التشغيلي يحتاج إجراءً صريحًا مسجلًا بدل تعديل DB يدوي.

## حالة النشر

### تحقق خارجيًا

- `app.popwam.com/health`: HTTP 200 عبر Cloudflare/Railway وTLS صالح.
- `go.popwam.com/`: HTTP 200، و`Cache-Control` خاص/no-store.
- `media.popwam.com/`: DNS/TLS/Cloudflare يعمل، لكن الجذر يعيد 404. هذا لا يثبت ربط bucket أو صلاحيات كائن حقيقي.
- Google provider ظاهر في الإنتاج، لكن callback الفعلي لم يُختبر.
- الإنتاج المنشور لا يطابق المصدر: providers المنشورة `credentials,google` فقط؛ المصدر الحالي يضيف `phone-otp`.

### إعداد المستودع

- Railway builder: RAILPACK؛ build: `pnpm build`؛ pre-deploy: `pnpm validate:production-env && pnpm db:deploy`؛ start: `pnpm start`؛ health: `/health`.
- `next start` يقرأ `PORT` الذي تزوده Railway؛ لا يوجد منفذ hardcoded.
- المطلوب: `NEXTAUTH_URL=https://app.popwam.com` و`NEXT_PUBLIC_APP_URL=https://go.popwam.com` وGoogle callback `https://app.popwam.com/api/auth/callback/google`.
- `.env.example` placeholders فقط، و`.env` غير متتبع.
- المدقق المحلي المحمل من `.env` فشل بسبب غياب/عدم صلاحية: `MOBILE_TOKEN_SECRET`, `OTP_PEPPER`, `APP_HOST`, `PUBLIC_HOST`, SMS webhook URL/token/sender/provider. هذا يصف الملف المحلي فقط؛ لا يثبت قيم Railway. لا يمكن التحقق من لوحة Railway أو production logs من المستودع.
- لا يمكن التحقق خارجيًا من Cloudflare SSL mode = Full (strict)، أو cache rules، أو R2 custom-domain bucket mapping. يجب فحصها يدويًا في اللوحة.

متغيرات الإنتاج المطلوبة:

`DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXTAUTH_SECRET`, `MOBILE_TOKEN_SECRET`, `OTP_PEPPER`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `APP_HOST`, `PUBLIC_HOST`, `SMS_PROVIDER=webhook`, `SMS_API_URL`, `SMS_API_TOKEN`, `SMS_SENDER_ID`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL`.  
Google اختياري ولكن يجب ضبط `GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET` معًا. لا تضبط `ALLOW_PRODUCTION_SEED=true` في الخدمة الدائمة.

## حالة قاعدة البيانات

- `pnpm db:deploy`: نجح وطبق `20260714050000_production_hardening_indexes`.
- ثماني مهاجرات موجودة ومطبقة.
- `prisma migrate status`: database schema up to date.
- `prisma migrate diff ... --exit-code`: لا اختلاف.
- `pnpm db:repair` مرتين: فحص 3 مستخدمين في كل مرة ولم يكرر السجلات.
- البيانات القديمة لم تُمسح، ولم يُستخدم reset أو db push.
- seed يستخدم upsert/ensure patterns، وأصبح محظورًا افتراضيًا في production. لم يُشغّل seed على Neon في هذا التدقيق حتى لا يعيد ضبط بيانات حسابات تجريبية/إدارية.

المهاجرات الأخيرة غير الموجودة بعد في commit الحالي:

- `20260714030000_android_mobile_security`
- `20260714040000_activation_hash_unique`
- `20260714050000_production_hardening_indexes`

## حالة Android

- الحد الأدنى وإعدادات NFC/HCE موثقة في `apps/android/README.md`.
- `lintDebug`: 0 errors، 31 warnings.
- `testDebugUnitTest`: 2 tests، 0 failures، 0 errors.
- `assembleDebug`: نجح.
- `validateReleaseConfiguration`: نجح؛ توقيع release خارجي عمدًا عبر CI/Play App Signing ولا توجد أسرار توقيع في Git.
- APK: `apps/android/app/build/outputs/apk/debug/app-debug.apk`، الحجم 45,272,400 bytes.
- **غير مثبت:** قراءة/كتابة NDEF على أنواع وسوم مختلفة، فشل السعة، NdefFormatable، اكتشاف read-only، `makeReadOnly()` الدائم، HCE Type 4 أمام أجهزة Android/iOS متعددة، QR camera/gallery، وGoogle/OTP على جهاز حقيقي.

## بوابات الإصدار

| المكوّن | الحالة | السبب المختصر |
|---|---|---|
| Authentication | GO WITH CAVEATS | المصدر سليم؛ النسخة المنشورة قديمة وE2E غير مكتمل. |
| OTP | GO WITH CAVEATS | hash/expiry/rate limits سليمة؛ SMS production وglobal abuse غير مثبتين. |
| Google login | GO WITH CAVEATS | configured ومصمم بأمان؛ callback/linking الحي غير مختبر. |
| Card inventory | GO WITH CAVEATS | النزاهة الأساسية جيدة؛ pagination ودورة البيع ناقصتان. |
| Batch generation | GO | اختبار 1000 والخصم والمعاملة وCSV المحدود نجحت. |
| QR activation | GO WITH CAVEATS | التدفق والذرية سليمان؛ camera/gallery الفعلي غير مختبر. |
| Card assignment | GO WITH CAVEATS | admin/self-claim سليمان؛ الربط بالطلبات ناقص. |
| Profiles | GO WITH CAVEATS | personal/organization موجودان؛ يلزم E2E مرئي أوسع. |
| Bilingual content | GO WITH CAVEATS | fallback/RTL موجودان؛ مراجعة شاملة للنصوص اليدوية لازمة. |
| vCard | GO WITH CAVEATS | ديناميكي وآمن تصميميًا؛ import على iOS/Android والصورة غير مختبرين فعليًا. |
| File upload | **NO-GO** | كل الملفات عامة وحصة الصور قابلة للتجاوز. |
| Redirect performance | GO WITH CAVEATS | query path صحيح؛ لا يوجد production load test وlegacy eager-load. |
| Minimal analytics | GO | لا توجد telemetry المحظورة في التخزين أو مسار الفتح. |
| PWA profile installation | GO WITH CAVEATS | build/routes سليمة؛ install على iOS/Android غير مختبر يدويًا. |
| Expenses | GO WITH CAVEATS | Decimal/audit سليم؛ دورة التصحيح والتقارير الرسمية ناقصة. |
| Purchases | GO WITH CAVEATS | الاستلام والحركة سليمان؛ العملة والتقارير Caveat. |
| Orders | **NO-GO** | لا حجز/SOLD/منع ازدواج البطاقة ولا دورة مدفوعات كاملة. |
| User deletion | GO | معاملة واختيار مصير البطاقات وفحوص ملكية. |
| Android NFC writing | **NO-GO** | لم يختبر على جهاز/وسم فعلي. |
| Android HCE | **NO-GO** | لم يختبر مع قارئات/أجهزة فعلية. |
| Railway deployment | **NO-GO** | الإنتاج لا يطابق المصدر، والمتغيرات/السجلات/لوحة النشر غير متحققة. |
| R2 | **NO-GO** | لا private access حقيقي ولا اختبار كائن عبر custom domain. |
| Database | GO WITH CAVEATS | مطبقة بلا drift؛ المهاجرات/المصدر لم تُلتزم بعد في Git. |

## نتائج أوامر الإصدار

| الأمر | النتيجة |
|---|---|
| `pnpm install --frozen-lockfile` | PASS، lockfile محدث ولا تغييرات تثبيت. |
| `pnpm db:generate` | PASS. |
| `pnpm db:deploy` | PASS، هجرة الفهرس طبقت. |
| `pnpm db:repair` مرتين | PASS، idempotent على 3 مستخدمين. |
| `pnpm lint` | PASS، 5/5 packages. |
| `pnpm test` | PASS، web 27/27. |
| `pnpm build` | PASS، Next production build. |
| `git diff --check` | PASS، لا whitespace errors. |
| Android lint/test/assemble | PASS للبناء الآلي؛ 0 lint errors، 2/2 tests. |
| `git status` | DIRTY؛ تغييرات Phase 3 والتقوية وملفات migrations غير ملتزم بها. |

## الاختبارات اليدوية المتبقية قبل GO

1. نشر release candidate مطابق لـ commit محدد ثم التحقق من Phone OTP الحقيقي، cooldown، limit، failure، refresh rotation وlogout على بيئة staging.
2. إكمال Google login وربط حساب موجود ورفض بريد غير متحقق وحالات إلغاء المستخدم.
3. اختبار activation QR بالكاميرا والصورة والرمز اليدوي، ومحاولات card A + token B، وإعادة استخدام الرمز، وسباق مطالبتين.
4. تطبيق R2 private/signed access، ثم اختبار public/hidden/replace/delete/quota/orphan cleanup بكائنات اختبار حقيقية عبر `media.popwam.com`.
5. load test للـ redirect وOTP ودفعة 1000 وadmin pagination باستخدام بيانات مماثلة للإنتاج، مع قياس p50/p95/p99 من Railway/Neon.
6. اختبار Order lifecycle وحجز/بيع/إرجاع/إلغاء البطاقة والمخزون، والتزامن على آخر قطعة.
7. اختبار حذف مستخدم يملك بطاقات وملفات وعضويات وOAuth/refresh sessions لكل disposition، مع استعادة نسخة staging.
8. NFC: NDEF وNdefFormatable وسعة صغيرة ووسم محمي ووسم تالف والقراءة الخلفية والقفل الدائم على وسوم حقيقية.
9. HCE Type 4 مع عدة هواتف وقارئات، وتبديل الرابط وتعطيل HCE وforeground preferred service.
10. PWA profile install على Chrome Android وSafari iOS والتحقق من manifest/icon/start_url لكل profile.
11. فحص Railway logs والـ variables والـ custom domains، وCloudflare Full (strict)/proxy/cache/R2 mapping والتنبيهات والنسخ الاحتياطي.

## أوامر النشر الدقيقة بعد إزالة NO-GO blockers

على فرع release نظيف ومراجع:

```powershell
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm test
pnpm build
git diff --check
git status
```

قبل النشر، من CI/Railway مع المتغيرات المحقونة لا من ملف `.env`:

```powershell
pnpm validate:production-env
pnpm db:deploy
pnpm db:repair
```

Android CI:

```powershell
cd apps/android
.\gradlew.bat lintDebug testDebugUnitTest assembleDebug validateReleaseConfiguration --no-daemon
```

Railway ينفذ بعد ذلك تلقائيًا `pnpm build`، ثم pre-deploy validation + migrations، ثم `pnpm start`. لا تشغّل `prisma db push` أو reset، ولا تجعل seed جزءًا من كل نشر.

## اعتبارات الرجوع

- أنشئ Neon restore point/branch قبل النشر، وسجل commit وmigration set المنشورين.
- المهاجرات الحالية additive؛ عند rollback للتطبيق، أعد نشر commit سابق متوافق مع الأعمدة الإضافية واترك المخطط forward-compatible. لا تحذف الجداول/الأعمدة تلقائيًا.
- إذا أدت هجرة بيانات إلى فساد، أوقف الكتابة واستعد Neon point-in-time بدل reset أو migration عكسية مرتجلة.
- اجعل تغيير R2 private access متوافقًا مؤقتًا مع الروابط القديمة، ثم دوّر/احذف الروابط العامة بعد التحقق. احتفظ بقائمة كائنات rollback ولا تحذف objects جماعيًا دون backup.
- token/secret rotation يلزم خطة جلسات: تدوير `MOBILE_TOKEN_SECRET` يبطل access tokens؛ تدوير NextAuth secret يبطل الجلسات؛ تدوير OTP pepper يبطل OTPs الجارية فقط. لا تطبع القيم في السجلات.

## نطاق أول إصدار إنتاجي موصى به

لا يُنصح بإطلاق عام الآن. بعد إصلاح R2 ونشر commit مطابق واختبارات OTP/activation المادية، يمكن أن يكون الإصدار الأول محدودًا إلى: تسجيل Phone OTP، الملفات الشخصية العامة الثنائية، vCard، تفعيل/إسناد البطاقات، اختيار الوجهة، redirect والتحليلات الدنيا. أبقِ Orders/financial dashboards كتجريبية داخل الإدارة، وعطّل رفع الملفات الخاصة وNFC read-only وHCE للمستخدمين النهائيين حتى اكتمال بواباتها.
