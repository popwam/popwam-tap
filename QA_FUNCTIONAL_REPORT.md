# تقرير التدقيق الوظيفي الشامل — POPWAM Tap

تاريخ التدقيق: 14 يوليو 2026  
نطاق التدقيق: المنصة الحالية بعد المراحل الثلاث (Web/Backend/Database/Android)  
نسخة Git عند بدء التدقيق: `5910e01` مع تغييرات Phase 3 غير ملتزم بها في working tree.

## الحكم التنفيذي

**النتيجة: النظام غير جاهز للإنتاج الكامل بعد.** مسارات البناء، OTP، المطالبة الآمنة، الدفعات، الشراء، التحويل العام، vCard، وAPK تعمل، ولا يوجد عيب Critical مكتشف. لكن توجد عيوب High تمنع اعتماد المنتج تجاريًا كما هو:

1. الملف الموسوم «مخفي» يبقى متاحًا مباشرة عبر رابط R2 العام.
2. ربط بطاقة بطلب لا يعيّنها للعميل ولا يحدّث حالتها أو حركة المخزون.
3. تعديل المصروف وحذفه غير منفذين.
4. migrations وملفات Android/API الجديدة ما زالت غير committed؛ نشر نسخة Git الحالية لن يتضمنها.

الحالات المستخدمة: **PASS** ناجح، **FAIL** عيب مؤكد، **PARTIAL** جزء ناجح وجزء غير مكتمل أو لم يختبر فعليًا، **NOT TESTED** لم ينفذ الاختبار، **BLOCKED** يتطلب موردًا خارجيًا غير متاح.

## بيئة الاختبار وطريقة العمل

- استُخدمت قاعدة PostgreSQL 16 معزولة محليًا في Docker على منفذ غير افتراضي لاختبارات الهجرة والبيانات المتكررة.
- نُفذت الهجرات والإصلاح والبذر مرتين على القاعدة المعزولة؛ بقيت أعداد User/Profile/Organization/Membership ثابتة ولم تتكرر بيانات البذر.
- نُفذ `db:deploy` أيضًا عبر اتصال Neon الحالي ونجح في تطبيق الأربع هجرات المعلقة؛ أظهر `db:repair` فحص 9 مستخدمين دون تكرار السجلات.
- لم تُستخدم `prisma db push`، ولم تُغيّر قيم `.env`، ولم تُرسل أسرار إلى السجل أو التقرير.
- لم تُنفذ عمليات كتابة فعلية إلى R2 لأن إعدادات الجهاز تشير إلى bucket حقيقي ولا توجد bucket QA معزولة.
- لا يوجد جهاز Android متصل (`adb devices` أعاد قائمة فارغة)، لذلك اختبارات NFC/HCE والكاميرا الفعلية مصنفة BLOCKED.

## 1. البيئة والبناء

| البند | الحالة | الدليل/النتيجة |
|---|---|---|
| `pnpm install --frozen-lockfile` | PASS | اكتمل، lockfile مطابق والاعتمادات محدثة. |
| `pnpm db:generate` | PASS | Prisma Client 6.19.1 تولّد بنجاح. ظهر تحذير Low عن إعداد Prisma القديم في `package.json`. |
| `pnpm lint` | PASS | نجحت الحزم الخمس؛ TypeScript و`prisma validate` بلا أخطاء. |
| `pnpm test` | PASS | Vitest: ملف واحد، 25/25 اختبارًا ناجحًا. |
| `pnpm build` | PASS | Next.js 15.5.20: compile/type-check و70 صفحة ناجحة. |
| `git diff --check` | PASS | لا whitespace errors؛ تحذيرات CRLF على Windows فقط. |
| لا أسرار tracked | PASS | الملف البيئي tracked الوحيد هو `.env.example`؛ لا keystore أو `.env` حقيقي. `.env` مؤكد ignored. |
| `.env.example` placeholders فقط | PASS | القيم أسرار إرشادية/فارغة، ولا تطابق قيم البيئة الفعلية. |
| Prisma migrations committed | FAIL | الهجرتان `20260714030000_android_mobile_security` و`20260714040000_activation_hash_unique` تظهران untracked. راجع DEF-04. |
| لا اعتماد إنتاجي على `db push` | PASS | لا command ينفذه؛ README/TESTING يحذران منه فقط. |
| Railway build/start/predeploy | PASS | `railway.json`: build=`pnpm build`، predeploy=`pnpm db:deploy`، start=`pnpm start`، health=`/health`. تشغيل الإنتاج أعاد HTTP 200 من `/health`. |
| Neon migration deploy | PASS | وجدت Prisma سبع migrations وطبقت الأربع المعلقة بنجاح على الاتصال الحالي. |
| R2 عند غياب الإعداد | PASS | `isStorageEnabled=false` و`getR2Client()` أعاد خطأ صريحًا؛ upload routes تعيد 503 `STORAGE_NOT_CONFIGURED`. |
| التحقق من SMS provider | PASS | development محظور في production، وwebhook يتطلب URL/token؛ الفشل يعاد بصورة آمنة. |

## 2. قاعدة البيانات

| البند | الحالة | الدليل/النتيجة |
|---|---|---|
| قاعدة اختبار معزولة | PASS | PostgreSQL 16 في Docker، منفصلة عن Neon. |
| `pnpm db:deploy` | PASS | سبع migrations مطبقة بلا `db push`. |
| `pnpm db:repair` | PASS | أعاد إنشاء العلاقات المفقودة لمستخدم اختبار: Profile وOrganization وMembership وFREE UserPlan، وكل منها مرة واحدة. |
| `pnpm seed` | PASS | أنشأ حسابَي البذر المتوقعين. |
| idempotency | PASS | إعادة deploy/repair/seed لم تضاعف User/Profile/Organization/Membership. |
| حفظ البيانات السابقة | PASS | بيانات قبل إعادة التشغيل ظلت موجودة؛ migrations إضافية وليست destructive. |
| uniqueness لـ activation hash | PASS | أضيف قيد DB فريد واختبر batch من 1000 دون تكرار. |

ملاحظة: `prisma.config.ts` و`package.json#prisma` موجودان معًا، لذلك يظهر تحذير deprecation. لا يوقف النشر حاليًا، لكن يوصى بحذف الإعداد القديم قبل Prisma 7.

## 3. المخزون والمالية

| الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| إنشاء مورد | PASS | أُنشئ مورد من واجهة admin server action. |
| إنشاء شراء | PASS | أُنشئ شراء بعناصر وتكاليف صحيحة. |
| استلام الشراء | PASS | تحولت الحالة إلى RECEIVED وأنشئت حركة PURCHASE. |
| زيادة كمية المخزون | PASS | زادت الكمية 7 وحدات؛ الاستلام الثاني لم يضف كمية أو حركة جديدة. |
| إنشاء دفعة بطاقات | PASS | API admin أنشأ الدفعة والبطاقات والحركة atomically. |
| خفض مخزون blank cards | PASS | 1100 → 100 عند إنشاء 1000 بطاقة. |
| توليد 1000 بطاقة | PASS | HTTP 201 خلال نحو 1.36 ثانية في بيئة QA؛ 1000 صف DB و1000 صف CSV. |
| uniqueness للـ serial | PASS | صفر تكرار. |
| uniqueness للـ publicSlug | PASS | صفر تكرار. |
| uniqueness للـ publicToken | PASS | صفر تكرار. |
| uniqueness للـ activationTokenHash | PASS | صفر تكرار وقيد DB فريد. |
| CSV لمرة واحدة | PASS | الحقول الثمانية المطلوبة صحيحة، وكل token خام فريد وغير مخزن في DB. |
| حركة damaged | PASS | سجلت -5 وخفضت المخزون. |
| حركة lost | PASS | سجلت -3 وخفضت المخزون. |
| منع المخزون السالب | PASS | تصحيح أكبر من المتاح رُفض وبقيت الكمية 109؛ لكن الاستجابة كانت 500 غير ودية (PARTIAL من ناحية UX). |
| إنشاء مصروف | PASS | أُنشئ مصروف 123.45 مع التصنيف وطريقة الدفع. |
| تعديل مصروف | FAIL | لا صفحة أو action للتعديل. راجع DEF-03. |
| حذف مصروف | FAIL | لا action للحذف. راجع DEF-03. |
| مرفق المصروف | PARTIAL | النموذج يسمح باختيار UploadedFile وتوجد العلاقة؛ لم يُختبر upload فعلي بسبب R2 الحقيقي. |
| تقييم المخزون | PARTIAL | الصيغة `quantityOnHand × unitCost` موجودة وعرضت بيانات QA؛ لا اختبار مالي مستقل للتقريب/العملة. |
| الإيراد المتوقع | PARTIAL | يجمع expectedSellingPrice للبطاقات AVAILABLE/PROGRAMMED؛ الصيغة تعمل لكن لا تعالج كميات order غير المرتبطة بالبطاقات. |
| الربح الإجمالي الأساسي | PARTIAL | `realized + expected - purchases - expenses` يعمل كملخص تقديري، وليس gross profit محاسبيًا عند وجود COGS متعدد. |
| إنشاء عميل وطلب | PASS | أنشئ عميل وDRAFT order بقيمة subtotal/discount/shipping صحيحة. |
| تعيين بطاقة للطلب/العميل | FAIL | OrderItem يحمل cardId فقط؛ البطاقة بقيت UNASSIGNED/AVAILABLE. راجع DEF-02. |

## 4. أمان التفعيل

| الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| رابط NFC دائم لبطاقة غير معينة | PASS | صفحة الحالة 200 وتعرض serial/type/status وتعليمات التفعيل. |
| كاميرا QR الحية في الويب | NOT TESTED | المكوّن موجود، لكن لا كاميرا browser فعلية في بيئة CLI. |
| QR من gallery | NOT TESTED | المسار ظاهر في UI؛ يلزم اختبار متصفح/هاتف. |
| إدخال الكود يدويًا | PARTIAL | الحقل ومسار التحقق موجودان، واختبر endpoint بالرمز؛ لم ينفذ تفاعل browser كامل. |
| QR الصحيح للبطاقة الصحيحة | PASS | أنشأ claim session وcookie HttpOnly. |
| QR بطاقة أخرى | PASS | HTTP 400 ولم ينشئ claim. |
| token غير صالح | PASS | HTTP 400 برسالة عامة. |
| token مستهلك | PASS | المحاولة الثانية رُفضت. |
| claim session منتهي | PASS | HTTP 400، وبقي ownerId فارغًا. |
| استمرار التفعيل خلال OTP | PASS | سر التفعيل بقي في signed HttpOnly/server-side session، ثم اكتملت المطالبة بعد OTP دون localStorage. |
| بقاء البطاقة غير معينة عند الفشل | PASS | تحقق على invalid/expired/limit failure. |
| maxCards | PASS | مستخدم FREE رفض البطاقة الإضافية بـ403 `CARD_LIMIT_REACHED`. |
| admin override | PASS | override إلى 2 سمح بالمطالبة التالية. |
| مستخدمان لنفس البطاقة | PASS | سباق متزامن أعطى [200,409] ومُلكية واحدة. |
| بطاقتان متزامنتان فوق الحد | PASS | بعد الإصلاح أعطى [200,403] وبقي owned count=1. |
| تعيين admin يدوي | PARTIAL | action والواجهة والحدود موجودة؛ اختبرت آثار التعيين ضمن مسارات حذف/نقل المستخدم، لا submit مستقل لكل حالة. |
| unassign/reassign | PARTIAL | نجح reassign/unassign ضمن transaction حذف المستخدم؛ action البطاقة المباشر راجع كوديًا ولم يختبر end-to-end مستقلًا. |

## 5. مصادقة OTP وGoogle

| الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| تطبيع هاتف مصري | PASS | `01077700001` → `+201077700001`؛ يغطي الاختبار الوحدوي أيضًا E.164. |
| هاتف جديد ينشئ حسابًا | PASS | بعد verify فقط أُنشئ User وpersonal workspace وMembership وProfile وFREE plan. |
| هاتف موجود يدخل لنفس الحساب | PASS | عاد userId نفسه. |
| انتهاء OTP | PASS | challenge مؤرخ في الماضي رُفض. |
| OTP خاطئ | PASS | HTTP 400 عام دون كشف الحساب. |
| حد المحاولات | PASS | خمس محاولات خاطئة عطلت التحقق اللاحق. |
| resend cooldown | PASS | إعادة الإرسال الفورية أعادت 429. |
| daily limit | PASS | بعد بلوغ السجلات اليومية أعيد 429. |
| single-use | PASS | إعادة استخدام OTP الصحيح أعادت 400. |
| منع enumeration | PASS | send للهاتف الجديد والموجود يعيد نفس بنية الاستجابة العامة. |
| لا OTP خام في DB | PASS | المخزن hash فقط. |
| لا OTP خام في logs | PASS | أصلح dev provider؛ السجل يعرض رقمًا masked وحالة/انتهاء فقط. |
| logout | PASS | refresh بعد logout أعاد 401. |
| refresh rotation/replay | PASS | rotation نجح؛ replay للتوكن القديم أعاد 401 وأبطل العائلة الجديدة. |
| Google login الاختياري | NOT TESTED | لا Google test credentials أو browser OAuth session. |
| ربط Google آمن | PARTIAL | مراجعة الكود: verified email مطلوب، الربط صريح من جلسة authenticated، و`allowDangerousEmailAccountLinking=false`; لم ينفذ OAuth حقيقي. |

## 6. الملفات الشخصية واللغات

| الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| إنشاء PERSONAL | PARTIAL | API/action ينشئ profile وPROFILE/VCF destinations transactionally؛ لا browser E2E مستقل. |
| إنشاء ORGANIZATION | PARTIAL | API/action وقواعد plan موجودة؛ عُرض ملف منظمة فعلي لكن إنشاء UI لم يؤتمت. |
| تخطيطان عامان مختلفان | PASS | `profile-personal` و`profile-organization` ومحتوى الخدمات/الفروع مختلف فعليًا. |
| محتوى عربي فقط | PASS | يعرض العربي دون حقول فارغة. |
| محتوى إنجليزي فقط | PASS | fallback من العربي المفقود إلى الإنجليزي. |
| عربي وإنجليزي | PASS | switcher/cookie يبدلان النصوص المتاحة. |
| لغة الجهاز/المتصفح | PARTIAL | Accept-Language English يعمل، لكن profile.primaryLanguage لا يُستخدم عندما لغة المتصفح غير ar/en. راجع DEF-05. |
| cookie override | PASS | `popwam_locale=ar` غلب Accept-Language الإنجليزي. |
| RTL/LTR | PASS | `<html lang dir>` صحيح، وURL/token/serial لها `dir=ltr`. |
| fallback للترجمة المفقودة | PASS | ar→en وen→ar في الحقول المترجمة. |
| حفظ theme | PASS | تغيير BUSINESS_LIGHT ظهر في public `data-theme` والmanifest colors. |
| preview مطابق للعام | PARTIAL | كلاهما يستخدم theme tokens نفسها؛ لم ينفذ visual/pixel comparison. |
| crop للصورة | NOT TESTED | المكوّن موجود؛ لا browser canvas/image interaction. |
| crop للغلاف | NOT TESTED | السبب نفسه. |
| icon selector | PARTIAL | بحث/تصنيفات/grid/selected state وRTL موجودة؛ لا browser interaction فعلي. |
| custom fields | PASS | visibility/action URL/sort tested بوحدة، والواجهة تحفظها. |
| إعادة الترتيب | PASS | unit test للترتيب + actions للروابط/الحقول/الملفات. |
| visibility | PASS | العناصر المخفية لا تظهر في public profile؛ حماية ملف R2 المباشر عيب منفصل. |
| plan limits | PARTIAL | maxCards واختبار override فعليان، merge limits مختبر وحدة؛ لم تختبر كل قيمة profiles/links/files بحدودها في UI. |
| كل نصوص الواجهة مترجمة | FAIL | توجد نصوص admin/dashboard إنجليزية hardcoded. راجع DEF-07. |

## 7. vCard والملفات

### vCard

| الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| Android Contacts | BLOCKED | لا جهاز Android متصل. |
| صيغة متوافقة مع iOS | PARTIAL | MIME/attachment/CRLF/UTF-8/vCard 4.0 صحيحة؛ لم يتم الاستيراد في iOS Contacts. |
| اسم عربي | PASS | تم تنزيل vCard منظمة عربية وتحقق النص UTF-8. |
| اسم إنجليزي | PASS | generator unit test والمخرج الديناميكي صحيحان. |
| phone/email/organization/job/website/address | PASS | الحقول الحالية تدخل في VCard مع escaping صحيح. |
| صورة اختيارية | PARTIAL | URI للصورة يضاف، لكن لا تحقق من الحجم/التوافق قبل الإدراج. راجع DEF-08. |
| destination من نوع vCard | PASS | أصلح قبول المسار الداخلي؛ card route يعيد 307 إلى `.vcf` وroute يعيد 200/MIME صحيح. |

### الملفات وR2

| الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| CV upload | BLOCKED | لا bucket QA؛ لم تُمس bucket الحقيقية. |
| PDF upload | BLOCKED | السبب نفسه. |
| حظر executable | PASS | `.exe` وامتدادات scripts محظورة في validator. |
| حد الحجم | PASS | الملف الكبير رُفض في unit test؛ quota والخطة متحققان في route. |
| MIME mismatch | PASS | أضيف تحقق متطابق extension↔MIME واختباراه ناجحان. |
| replace | PARTIAL | ownership/quota/transaction/cleanup موجودة؛ لا R2 E2E. |
| delete | PARTIAL | DB/link deletion ثم R2 delete موجود؛ لا R2 E2E. |
| orphan cleanup | PARTIAL | upload/replace ينظفان object الجديد عند فشل DB؛ فشل R2 بعد حذف DB يسجل orphan فقط دون retry queue. |
| public visibility | PASS | public profile يرشح `isVisible`. |
| private file protection | FAIL | الرابط العام يظل مباشرًا حتى عند `isVisible=false`. راجع DEF-01. |
| file كوجهة بطاقة | PASS | destination اختبار فعلي أعاد server-side 307 إلى رابط الملف المختار. |

## 8. أداء التحويل والخصوصية

| الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| تحويل server-side | PASS | HTTP 307، بلا JavaScript client redirect. |
| profile فقط عند اختياره | PASS | الوجهة غير المضبوطة لا تسقط تلقائيًا على profile؛ profile يفتح فقط عند type PROFILE. |
| WhatsApp | PASS | 307 إلى الرابط المختار. |
| phone | PASS | 307 إلى `tel:`. |
| email | PASS | 307 إلى `mailto:`. |
| file | PASS | 307 إلى رابط الملف. |
| vCard | PASS | 307 إلى route الديناميكي بعد إصلاح trusted internal path. |
| paused/lost/disabled | PASS | صفحات حالة 200 ولا تحويل للوجهة. |
| فشل analytics لا يوقف التحويل | PASS | trigger اختباري جعل daily update يفشل؛ ظل الرد 307 وسُجل الخطأ فقط. |
| openCount | PASS | 0 → 7 عبر سبعة فتحات. |
| lastOpenedAt | PASS | حُدث مع الفتح. |
| daily aggregate | PASS | سجل اليوم بلغ 7. |
| لا device/browser/IP/country/city/GPS/location/fingerprint | PASS | لا حقول ولا كتابة لهذه البيانات في analytics. `deviceName` في MobileRefreshToken metadata للجلسة وليس analytics. |

قياس بيئة التطوير بعد warm-up: نحو 141–227 ms للطلب؛ أول compile كان نحو 2297 ms ولا يمثل production. المسار يستخدم `findUnique` على `publicSlug` المفهرس ويختار الحقول اللازمة فقط. لا يحمل profile إلا عندما تكون وجهة PROFILE. تحديث analytics منفذ عبر `after()` ومغلف بفشل مستقل. لا يوجد load test أو قياس Railway من منطقة المستخدم، لذا تصنيف الأداء الإنتاجي **PARTIAL** رغم صحة بنية المسار.

## 9. PWA الخاص بالملف

| الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| لا prompt على direct redirects | PASS | direct route لا يرندر profile install component. |
| لا prompt على activation | PASS | صفحات activation لا تحتوي install button. |
| لا prompt على go root | PASS | PwaClient العام محصور في dashboard وعلى host غير `go.*`. |
| الزر فقط في public profile | PASS | `ProfileInstallButton` موجود في public profile وحده. |
| user-initiated | PASS | prompt/help لا يعملان إلا بعد click. |
| manifest name = profile name | PASS | الاسم من بيانات profile؛ يوجد عيب اختيار اللغة في DEF-06. |
| icon صورة/شعار | PASS | PERSONAL يستخدم avatar وORGANIZATION يستخدم logo. |
| fallback الحرف الأول | PASS | icon route ولد PNG 192/512 بالحرف الأول. |
| start_url | PASS | يشير إلى slug أو `/p/id/{id}` الصحيح. |
| أسماء عربية وإنجليزية | PARTIAL | كلاهما قابل للتخزين، لكن manifest يفضل العربي دائمًا عند وجود الاثنين. راجع DEF-06. |
| تعليمات iOS بعد فعل المستخدم | PASS | `help` لا يظهر إلا بعد الضغط عندما لا يتوفر native prompt. |

## 10. الإدارة

| المجال/الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| Users | PASS | list/detail/role/status/plan/limits/repair/delete ظاهرة. |
| Cards | PASS | الأعمدة والإجراءات المطلوبة ظاهرة؛ التعيين والحالات موجودة. |
| Batches | PASS | list/new/detail وCSV. |
| Inventory | PASS | summary/items/movements/low-stock. |
| Suppliers | PASS | إنشاء وعرض اختبرا فعليًا. |
| Purchases | PASS | إنشاء/تفاصيل/استلام اختبرت فعليًا مع idempotency. |
| Expenses | FAIL | إنشاء وعرض فقط؛ edit/delete مفقودان. DEF-03. |
| Orders | PARTIAL | إنشاء وعرض يعملان؛ assignment/business transition مفقود. DEF-02. |
| Plans | PASS | CRUD/duplicate والقيم الأساسية ظاهرة، overrides لها الأولوية. |
| Limits | PASS | global/effective per-user values ظاهرة وقابلة للحفظ. |
| Profiles | PASS | admin visibility موجودة؛ تحرير العميل في dashboard. |
| Files | PARTIAL | قائمة admin موجودة، لكن private protection ناقصة. DEF-01. |
| Themes | PASS | الستة مع حفظ واستخدام فعلي. |
| Audit logs | PASS | عمليات supplier/purchase/expense/card/user تكتب actor/operation/target. |
| suspend user | PASS | status=SUSPENDED وأصبح mobile `/me` يعيد 401. |
| restore user | PASS | status=ACTIVE وعاد `/me` إلى 200. |
| حذف بلا موارد | PASS | حُذف المستخدم. |
| منع حذف غير آمن | PASS | cardDisposition مفقود أعاد redirect خطأ ولم يحذف المستخدم؛ self-delete ممنوع. |
| unassign ثم حذف | PASS | transaction يفك العلاقات ثم يحذف. |
| reassign ثم حذف | PASS | البطاقة انتقلت للمالك الهدف بالضبط. |
| disable ثم حذف | PASS | البطاقة أصبحت DISABLED/REVOKED وowner=null. |
| duplicate phone | PASS | unique phone وOTP يعيدان نفس الحساب/استجابة عامة. |
| duplicate email عند الإنشاء | PASS | يعاد `EMAIL_IN_USE` محليًا. |
| duplicate email عند التعديل | FAIL | server action يرمي error ينتج 500 عامًا بدل حالة UI محلية. DEF-09. |
| missing relations repair | PASS | أنشأ العلاقات الخمس المفقودة مرة واحدة. |

## 11. Android

| الاختبار | الحالة | النتيجة الفعلية |
|---|---|---|
| Android lint | PASS | `lintDebug`: 0 errors، 31 warnings (اعتمادات أحدث/موارد غير مستخدمة/KTX). |
| unit tests | PASS | 2/2 في `PermanentUrlPolicyTest`. التغطية منخفضة لمساحة التطبيق الكلية. |
| Compose tests | NOT TESTED | لا توجد Compose instrumentation tests في المشروع ولا جهاز/emulator متصل. |
| debug APK | PASS | `assembleDebug` نجح؛ الحجم 45,272,400 bytes. |
| release configuration | PASS | HTTPS check نجح؛ signing خارجي عمدًا ولا secrets committed. |
| OTP على جهاز | BLOCKED | لا جهاز متصل. |
| camera QR | BLOCKED | لا جهاز/كاميرا. |
| gallery QR | BLOCKED | لا جهاز. |
| NFC read | BLOCKED | لا NFC hardware. |
| NFC write | BLOCKED | لا tag/device. |
| read-back verification | BLOCKED | لا tag/device. |
| read-only warning/lock | BLOCKED | لا tag disposable؛ الكود يتحقق من URI ثم `canMakeReadOnly/makeReadOnly`. |
| HCE enable/disable | BLOCKED | لا هاتف HCE/reader. |
| Arabic RTL | PARTIAL | resources عربية و`supportsRtl=true` وCompose direction موجودة؛ لا visual device test. |
| English LTR | PARTIAL | resources واتجاه موجودان؛ لا visual device test. |

APK: `apps/android/app/build/outputs/apk/debug/app-debug.apk`  
Lint report: `apps/android/app/build/reports/lint-results-debug.txt`

## 12. العيوب المؤكدة

### DEF-01 — الملفات المخفية ليست خاصة

- **الحالة/الخطورة:** FAIL — High
- **إعادة الإنتاج:** ارفع ملفًا؛ انسخ `publicUrl`؛ عطّل visibility؛ افتح الرابط المباشر.
- **المتوقع:** الملف غير العام يتطلب authorization أو signed URL قصير العمر ولا يمكن فتحه مباشرة.
- **الفعلي:** `isVisible=false` يخفي الرابط من profile فقط، لكن object مرفوع عبر `uploadPublicFile` وتظل `publicUrl` صالحة.
- **السبب المرجح:** نموذج التخزين يستخدم public bucket URL لكل الملفات ولا توجد download proxy/signed GET strategy.
- **الملفات المتأثرة:** `packages/storage/src/index.ts`، `apps/web/src/app/api/upload/file/route.ts`، `apps/web/src/app/api/mobile/profiles/[id]/files/route.ts`، `apps/web/src/components/file-manager.tsx`.
- **الإصلاح الموصى:** خزّن الملفات الخاصة تحت private prefix بلا public cache؛ قدم download route يتحقق من owner/profile visibility ويولد signed GET؛ عند toggle إلى private انقل/أعد كتابة object أو امنع public origin access.

### DEF-02 — الطلب لا يعيّن البطاقة أو يحرك المخزون

- **الحالة/الخطورة:** FAIL — High
- **إعادة الإنتاج:** أنشئ Customer؛ أنشئ DRAFT Order واختر Prepared card؛ افحص Card وInventoryMovement.
- **المتوقع:** عند transition المناسبة (CONFIRMED/DELIVERED حسب السياسة) تُحجز/تباع البطاقة، ترتبط بالعميل/المستخدم، وتتغير inventoryStatus مع حركة audited واحدة.
- **الفعلي:** ينشأ OrderItem بـcardId فقط؛ البطاقة تبقى `UNASSIGNED`, `AVAILABLE` ولا حركة RESERVED/SOLD.
- **السبب المرجح:** `createOrder` لا يحتوي sales state machine أو transaction تربط Order/Card/InventoryMovement.
- **الملفات المتأثرة:** `apps/web/src/app/business-actions.ts`، `apps/web/src/app/admin/orders/new/page.tsx`، `apps/web/src/app/admin/orders/[id]/page.tsx`.
- **الإصلاح الموصى:** أضف action لتأكيد/تسليم الطلب داخل Serializable transaction؛ تحقق من توفر البطاقة والعميل/المستخدم؛ سجل RESERVED ثم SOLD؛ امنع بيع البطاقة مرتين واجعل الإلغاء يعكس الحجز فقط.

### DEF-03 — تعديل وحذف المصروف غير موجودين

- **الحالة/الخطورة:** FAIL — High
- **إعادة الإنتاج:** افتح `/admin/expenses` بعد إنشاء مصروف.
- **المتوقع:** View/Edit/Delete آمنة مع confirmation وaudit log، والحذف يتعامل مع attachment relation.
- **الفعلي:** الجدول للعرض فقط؛ لا صفحة detail/edit ولا actions للتعديل/الحذف.
- **السبب المرجح:** Phase 1 نفذ create/list فقط.
- **الملفات المتأثرة:** `apps/web/src/app/admin/expenses/page.tsx`، `apps/web/src/app/business-actions.ts`.
- **الإصلاح الموصى:** أضف detail/edit form وupdate/delete actions transactionally، تحقق من الصلاحية، وسجل old/new metadata أو soft-delete إذا كان سجل الأعمال يجب حفظه.

### DEF-04 — ملفات النشر والهجرات غير committed

- **الحالة/الخطورة:** FAIL — High
- **إعادة الإنتاج:** `git status --short`.
- **المتوقع:** migrations وAndroid/mobile API جزء من commit قابل للنشر وإعادة البناء.
- **الفعلي:** مجلدات Android/APIs والهجرتان الأخيرتان untracked، وعدة ملفات modified.
- **السبب المرجح:** Phase 3 ما زالت في working tree ولم تُحفظ في commit.
- **الملفات المتأثرة:** `packages/db/prisma/migrations/20260714030000_android_mobile_security/`، `packages/db/prisma/migrations/20260714040000_activation_hash_unique/`، `apps/android/`، `apps/web/src/app/api/mobile/` وغيرها الظاهرة في Git.
- **الإصلاح الموصى:** راجع diff والأسرار، أضف الملفات المقصودة فقط، شغل البوابات مرة أخرى، ثم commit ذري قبل Railway deploy.

### DEF-05 — ترتيب اختيار اللغة لا يستخدم primaryLanguage

- **الحالة/الخطورة:** FAIL — Medium
- **إعادة الإنتاج:** profile primaryLanguage=`en`، لا cookie، وAccept-Language لغة غير الإنجليزية/العربية مثل `fr`.
- **المتوقع:** Cookie → browser language إن كانت متاحة → profile primaryLanguage → fallback المتاح.
- **الفعلي:** `getLocale()` يعيد العربية لكل Accept-Language لا يبدأ بـ`en`، قبل تحميل profile.
- **السبب المرجح:** locale محسوبة global في layout ولا تستقبل لغات profile المتاحة.
- **الملفات المتأثرة:** `apps/web/src/lib/i18n.ts`، `apps/web/src/app/p/[slug]/page.tsx`، `apps/web/src/components/public-profile.tsx`.
- **الإصلاح الموصى:** افصل `resolvePublicProfileLocale(cookie,browser,primary,available)` واستخدمه بعد select خفيف للprofile؛ أبق locale العامة للإدارة مستقلة.

### DEF-06 — manifest يفضل الاسم العربي دائمًا

- **الحالة/الخطورة:** FAIL — Medium
- **إعادة الإنتاج:** profile يحوي اسمًا عربيًا وإنجليزيًا؛ اطلب manifest مع cookie/Accept-Language إنجليزي.
- **المتوقع:** App name باللغة العامة المختارة مع fallback.
- **الفعلي:** route يستخدم `nameAr || nameEn` دون قراءة locale.
- **السبب المرجح:** manifest route لا يستدعي resolver اللغة.
- **الملفات المتأثرة:** `apps/web/src/app/manifest/profile/[slug]/route.ts`، `apps/web/src/app/api/profile/[slug]/icon/[size]/route.tsx`.
- **الإصلاح الموصى:** استخدم resolver DEF-05 للاسم والحرف الأول، وأضف `Vary: Cookie, Accept-Language` أو query locale/cache key مناسب.

### DEF-07 — الترجمة الإدارية غير كاملة

- **الحالة/الخطورة:** FAIL — Medium
- **إعادة الإنتاج:** اختر العربية وافتح admin users/cards/expenses/orders/settings.
- **المتوقع:** لا نصوص واجهة hardcoded غير مترجمة؛ الجداول تعمل RTL مع LTR للقيم التقنية.
- **الفعلي:** عناوين/أزرار/رسائل كثيرة إنجليزية فقط أو ثنائية hardcoded خارج dictionaries.
- **السبب المرجح:** localization foundation طُبقت جزئيًا على public/dashboard shell لا كل صفحات admin.
- **الملفات المتأثرة:** `apps/web/src/app/admin/**`، `apps/web/src/components/file-manager.tsx`، `apps/web/src/components/pwa-client.tsx`.
- **الإصلاح الموصى:** انقل النصوص إلى dictionaries typed، أضف key parity test أعمق، واختبار RTL/LTR لكل جدول مهم.

### DEF-08 — صورة vCard لا تتحقق من الحجم/التوافق

- **الحالة/الخطورة:** FAIL — Medium
- **إعادة الإنتاج:** ضع avatar URL لصورة كبيرة جدًا أو نوع غير مناسب ثم نزّل vCard.
- **المتوقع:** تضمين الصورة فقط عند نوع وحجم متوافقين، وإلا حذف PHOTO مع بقاء vCard صالحًا.
- **الفعلي:** route يمرر URL الحالي دون HEAD/type/size policy.
- **السبب المرجح:** generator يدعم PHOTO URI لكن route لا ينفذ compatibility gate.
- **الملفات المتأثرة:** `apps/web/src/app/api/profiles/[profileId]/contact.vcf/route.ts`، `apps/web/src/lib/vcard.ts`.
- **الإصلاح الموصى:** استخدم metadata مخزنة للصور المرفوعة أو HEAD محدود timeout؛ اسمح JPEG/PNG/WebP بحجم معقول، ولا تجعل فشل الصورة يفشل vCard.

### DEF-09 — duplicate email عند تحديث المستخدم يظهر 500 عامًا

- **الحالة/الخطورة:** FAIL — Medium
- **إعادة الإنتاج:** من admin عدل مستخدمًا إلى بريد مستخدم آخر.
- **المتوقع:** رسالة محلية `EMAIL_IN_USE` بلا stack/generic server error مع بقاء البيانات.
- **الفعلي:** DB تبقى سليمة، لكن server action يرمي Error وتظهر استجابة 500 عامة.
- **السبب المرجح:** `updateAdminUser` ليس state-returning action والنموذج لا يعرض action state.
- **الملفات المتأثرة:** `apps/web/src/app/actions.ts`، `apps/web/src/app/admin/users/[id]/page.tsx`.
- **الإصلاح الموصى:** أعد discriminated action state مثل create-user، map لـP2002، واعرض localized inline error.

### DEF-10 — رفض المخزون السالب يعرض خطأ خادم

- **الحالة/الخطورة:** FAIL — Low
- **إعادة الإنتاج:** سجل ADJUSTMENT_OUT أكبر من quantityOnHand.
- **المتوقع:** رفض واضح `INSUFFICIENT_STOCK` داخل الصفحة دون 500.
- **الفعلي:** transaction تمنع السالب وتحفظ البيانات، لكن server action ينتهي 500.
- **السبب المرجح:** business error يُرمى ولا يتحول إلى action state.
- **الملفات المتأثرة:** `apps/web/src/app/business-actions.ts`، `apps/web/src/app/admin/inventory/movements/page.tsx`.
- **الإصلاح الموصى:** أعد نتيجة typed/localized مع الكمية المتاحة، مع الإبقاء على التحقق داخل transaction.

## 13. إصلاحات نُفذت أثناء التدقيق

هذه إصلاحات لعيوب مؤكدة فقط، وليست ميزات جديدة:

1. إزالة OTP الخام من سجل development SMS.
2. فرض تطابق امتداد الملف مع MIME للصور والملفات وإضافة اختبارات.
3. جعل claim transaction Serializable مع row lock وretry، ونقل maxCards داخل transaction لمنع سباقات المطالبة.
4. إضافة uniqueness لـ`Card.activationTokenHash` وهجرة `20260714040000_activation_hash_unique`.
5. إصلاح dynamic manifest route لقبول slug المنتهي بـ`.webmanifest` بدل 404.
6. السماح بمسارات vCard الداخلية الموثوقة كوجهة مع منع `//evil` protocol-relative.
7. استكمال `apps/android/README.md` وتجاهل `.kotlin` build cache.

## 14. ملخص الأوامر والنتائج

```text
pnpm install --frozen-lockfile                         PASS
pnpm db:generate                                       PASS
pnpm db:deploy                                         PASS (isolated + Neon)
pnpm db:repair                                         PASS / idempotent
pnpm seed                                              PASS / idempotent
pnpm lint                                              PASS
pnpm test                                              PASS (25/25)
pnpm build                                             PASS (70 routes/pages)
git diff --check                                       PASS
apps/android/gradlew testDebugUnitTest                 PASS (2/2)
apps/android/gradlew lintDebug                         PASS (0 errors, 31 warnings)
apps/android/gradlew assembleDebug                     PASS
apps/android/gradlew validateReleaseConfiguration      PASS
```

## 15. أولوية ما قبل الإنتاج

1. أصلح DEF-01 وDEF-02 وDEF-03.
2. أجرِ مراجعة ثم commit لكل migrations/Android/mobile API (DEF-04).
3. أنشئ R2 QA bucket واختبر upload/replace/delete/private/orphan فعليًا.
4. نفذ OAuth Google في بيئة staging بمستخدم جديد وربط صريح لمستخدم قائم.
5. اختبر APK على هاتفين NFC فعليين على الأقل مع stock tags المقصودة، بما في ذلك read-back وlock غير قابل للعكس وHCE reader.
6. أصلح اللغة/manifest/رسائل الأخطاء المتوسطة، ثم شغل regression كامل وRailway smoke test.

لا ينبغي إعلان production readiness حتى تنجح العيوب High والاختبارات BLOCKED المرتبطة بـR2 وNFC على بيئة staging/أجهزة فعلية.
