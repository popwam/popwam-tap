# تقرير تنفيذ مرجع Figma — POPWAM Tap

## النتيجة التنفيذية

تم فتح `C:\Users\POPWAM\Downloads\Untitled (1).fig` وقراءته مباشرة، ثم ربط التدفق الجديد بالـAndroid navigation والـmobile API وقاعدة البيانات الفعلية. الجرد السابق للتعديل موجود في [`FIGMA_SOURCE_INVENTORY.md`](FIGMA_SOURCE_INVENTORY.md).

- SHA-256 للمصدر: `7116E36FC4AB5C34A30B1438AFBAA6297532A122941B5D742A2A15F6892B4036`.
- المصدر يحتوي صفحة تصميم فعلية واحدة، 15 top-level frame، 2,615 node، وستة قوالب مستقلة.
- لا يحتوي الملف Prototype reactions أو destinations، ولا شاشات عربية، ولا حالات top-level منفصلة للخطأ/التحميل/الفراغ.
- تم تنفيذ المسار الحقيقي: Home → Create Virtual Card → Select Card Type → Enter Information → Add Links → Select Template → Preview → Create Card → Card Details.
- لم تُطبّق migrations، ولم تتغير ملفات البيئة أو الأسرار، ولم يحدث Commit أو Push.

## الجلسة الفعلية من البداية للنهاية

تم التشغيل على Android Emulator API 35 وربط Debug build بخادم Next محلي عبر process-only override. استُخدم OTP اختباري allowlisted في ذاكرة العملية فقط لمنع إرسال SMS حقيقي.

| العملية | النتيجة الفعلية |
|---|---|
| OTP send | `POST /api/mobile/auth/otp/send` → 200 |
| OTP verify | `POST /api/mobile/auth/otp/verify` → 200 |
| تحميل القوالب | `GET /api/mobile/templates` → 200 |
| إنشاء/تهيئة البطاقة | `POST /api/mobile/profiles` → 201 |
| البطاقة الناتجة | `cmro0u45m001cunugaz4mj9ws`، الاسم `PopwamTest` |
| الملف العام الناتج | `cmro0u40n001aunugeqhnk3bz` |
| القالب الأول | `personal-free-links` |
| تغيير القالب | `PATCH /api/mobile/virtual-cards/{id}/template` → 200 |
| القالب النهائي | `personal-pro-hero` |
| الصفحة العامة | `GET /p/id/cmro0u40n001aunugeqhnk3bz` → 200 |
| Google Wallet | إعداد الخادم false؛ لم يظهر زر ميت في Card Details |

قراءة تحقق نهائية من قاعدة البيانات أعادت البطاقة `ACTIVE` بالقالب `personal-pro-hero`، والاسم `MamdouhTest`، والوظيفة `ProductDesigner`، والشركة `POPWAM`، والـBio وPhone وEmail وWebsite وLocation، ورابط Portfolio بترتيب `sortOrder: 2`.

كان المستخدم الجديد يملك بطاقة bootstrap تلقائية ضمن حد Free `1/1`. عُدّل POST ليعيد استخدام هذه البطاقة فقط عندما تكون غير مهيأة (لا قالب ولا محتوى مخصص)، بدل رفض إنشاء أول بطاقة أو تجاوز الخطة. البطاقة المهيأة تبقى خاضعة لحدود الخطة.

## مطابقة Frames مع Android

| Figma frame | الحالة | ملف/تنفيذ Android |
|---|---|---|
| `0:4` business-pro-grid | منفذ | `ui/VirtualCardFlow.kt`، renderer مستقل لـ`business-pro-grid` |
| `0:60` business-pro-social | منفذ | `ui/VirtualCardFlow.kt`، renderer مستقل لـ`business-pro-social` |
| `0:137` business-free-portfolio | منفذ | `ui/VirtualCardFlow.kt`، renderer مستقل لـ`business-free-portfolio` |
| `0:215` personal-free-links | منفذ ومختبر فعليًا | `ui/VirtualCardFlow.kt`، preview/list layout مستقل |
| `0:247` personal-pro-hero | منفذ ومختبر فعليًا | `ui/VirtualCardFlow.kt`، hero/cover layout مستقل |
| `0:330` personal-plus-tabs | منفذ | `ui/VirtualCardFlow.kt`، dark tabs/list layout مستقل |
| `0:405` public articles | جزئي | link/content rendering داخل `VirtualCardFlow.kt`؛ لا شاشة tab مستقلة |
| `0:470` public projects | جزئي | link/content rendering داخل `VirtualCardFlow.kt`؛ لا شاشة tab مستقلة |
| `0:601` public books | جزئي | link/content rendering داخل `VirtualCardFlow.kt`؛ لا شاشة tab مستقلة |
| `0:668` Create account | غير مستبدل حرفيًا | المصادقة الحالية الحقيقية OTP في `ui/PopwamApp.kt`؛ social auth في frame غير موصول بالـbackend الحالي |
| `0:709` Create link page | منفذ بالتركيب | start/info steps في `ui/VirtualCardFlow.kt` |
| `0:736` User POV | منفذ | information editor وlive preview في `ui/VirtualCardFlow.kt`، وربط المحرر القديم من `ui/PopwamApp.kt` |
| `0:873` Tab management | منفذ | links add/reorder/remove في `ui/VirtualCardFlow.kt` |
| `0:1007` Analytics | جزئي | Activity tab حقيقي في `ui/FigmaNavigation.kt`، من دون chart المطابق كاملًا |
| `0:1281` Settings | منفذ وظيفيًا | route حقيقي إلى Settings في `ui/FigmaNavigation.kt` و`ui/PopwamApp.kt` |

الشاشات المشتقة المطلوبة التي لا تملك Frames مستقلة في الملف—Select Card Type، Template Picker، Preview، Card Details—موجودة في `ui/VirtualCardFlow.kt` باستخدام visual grammar والقوالب الفعلية من المصدر، وليست منسوبة زورًا إلى Frame غير موجود.

## مطابقة Frames مع Web

| Figma frame/المجموعة | Web route | الملفات الأساسية |
|---|---|---|
| القوالب الستة `0:4`، `0:60`، `0:137`، `0:215`، `0:247`، `0:330` | `/p/id/[profileId]` و`/p/[slug]` | `app/globals.css`، `lib/figma-templates.ts`، صور `public/templates/` |
| public articles/projects/books `0:405/470/601` | `/p/id/[profileId]` | الصفحة العامة تعرض destinations الفعلية؛ لا routes منفصلة لكل tab |
| Create account `0:668` | `/login` و`/login/phone` | المصادقة الفعلية الحالية، وليست نسخة social-only من Figma |
| Create link page `0:709` | `/onboarding` | مسار Web الحالي؛ wizard الجديد Android-first |
| User POV `0:736` | `/dashboard/profile` | محرر الملف الحالي والـpublic preview |
| Tab management `0:873` | `/dashboard/profile` | destination management الحالي |
| Analytics `0:1007` | لا مسار مطابق منفصل | لم يُنشأ Web analytics وهمي |
| Settings `0:1281` | `/dashboard/settings` | إعدادات Web الحالية |
| Template catalog | `/dashboard/templates` و`/dashboard/templates/preview/[templateId]` | يتم ضمان وجود القوالب الستة وعرض preview الحقيقي |

واجهات الربط الجديدة:

- `GET /api/mobile/templates`
- `POST /api/mobile/profiles`
- `PATCH /api/mobile/virtual-cards/[id]/template`
- `POST /api/mobile/virtual-cards/[id]/google-wallet`

## القوالب والخطط

منتقي Android يعرض فقط القوالب الستة الموجودة في Figma؛ القالب القديم `Minimal` لم يعد يُرسل إلى منتقي الموبايل. القالبان `personal-free-links` و`personal-pro-hero` متاحان في Free لإتاحة تبديل تخطيط فعلي، بينما تبقى القوالب الأخرى مقفلة وفق الخطة. لكل قالب thumbnail من frame الأصلي وrenderer مستقل في Android وCSS مستقل في الصفحة العامة.

## اللغة والاتجاه

- التحويل English → Arabic تم فورًا بعد إصلاح `MainActivity` لاستخدام `AppCompatActivity` مع per-app locales.
- العربية RTL، والـbottom navigation/header انعكسا فعليًا.
- القيم التقنية وحقول Phone/Email/URL/Serial تستخدم `LayoutDirection.Ltr` داخل الواجهة العربية.
- أُغلق التطبيق وأعيد فتحه، وكانت نتيجة الفحص `RTL_PERSISTED=true`.
- تدقيق i18n: 239 مفتاح Web، و247 مفتاح Android، و0 hardcoded candidates، و0 unused candidates.

## Pull-to-Refresh وNavigation

`ui/FigmaNavigation.kt` هو navigation الفعلي الذي يستدعيه `PopwamApp`. توجد `PullToRefreshBox` في Home وCards وProfiles وLinks وActivity، ولا يوجد زر Refresh علوي في هذه الشاشات.

## Screenshots والأدلة

المراجع الأصلية المصدّرة لكل الـ15 frame: [`docs/evidence/figma-reference`](docs/evidence/figma-reference).

| الدليل | الصورة |
|---|---|
| Welcome بعد التغيير البصري | [`welcome.png`](docs/evidence/android-after/welcome.png) |
| Home English | [`home-en.png`](docs/evidence/android-after/home-en.png) |
| Select Card Type | [`vc-type.png`](docs/evidence/android-after/vc-type.png) |
| Information + Live Preview | [`vc-info-live.png`](docs/evidence/android-after/vc-info-live.png) |
| Links + reorder controls | [`vc-links.png`](docs/evidence/android-after/vc-links.png) |
| Template Picker + thumbnails/locks/selected | [`vc-template.png`](docs/evidence/android-after/vc-template.png) |
| Preview قبل الإنشاء | [`vc-preview.png`](docs/evidence/android-after/vc-preview.png) |
| Card Details — Personal Links | [`vc-details-personal-links.png`](docs/evidence/android-after/vc-details-personal-links.png) |
| Card Details — Professional Hero | [`vc-details-professional-hero.png`](docs/evidence/android-after/vc-details-professional-hero.png) |
| الصفحة العامة بعد تغيير القالب | [`public-professional-hero.png`](docs/evidence/android-after/public-professional-hero.png) |
| Home Arabic RTL | [`home-ar.png`](docs/evidence/android-after/home-ar.png) |
| العربية بعد إعادة تشغيل التطبيق | [`home-ar-restart.png`](docs/evidence/android-after/home-ar-restart.png) |

للمقارنة البصرية يمكن وضع `figma-reference/user-editor.png` مقابل `android-after/vc-info-live.png`، و`figma-reference/tab-management.png` مقابل `android-after/vc-links.png`، و`figma-reference/template-personal-pro.png` مقابل `android-after/vc-details-professional-hero.png`. لا توجد لقطة baseline للتطبيق القديم التُقطت قبل بدء هذه الجلسة؛ لذلك لا يُقدَّم ادعاء Before screenshot تاريخي غير موجود.

## الاختبارات والبناء

| التحقق | النتيجة |
|---|---|
| Web TypeScript lint | نجح (`tsc --noEmit`) |
| Web unit tests | 18 files، 104/104 tests نجحت |
| Next production build | نجح: compile، type validation، page data، 100 static pages |
| Android unit tests | نجحت (`testDebugUnitTest`) |
| Android Lint | نجح دون errors؛ التقرير يحتوي 55 warnings غير مانعة |
| Android assemble | `BUILD SUCCESSFUL` |
| `git diff --check` | نجح؛ لا whitespace errors |

## APK

- المسار: `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`
- الحجم: `47,309,917` bytes.
- SHA-256: `ADDCA1E45A98153F55BC8EFC24A8FCA1FF6120B04CC97BF2BD4ED96A319371EF`.
- `BuildConfig.API_BASE_URL`: `https://pop.popwam.com/` في الـAPK النهائي. عنوان `10.0.2.2` استُخدم فقط في build اختباري سابق للتشغيل المحلي.

## غير المنفذ أو غير المختبر بالكامل

- لا توجد Prototype links في ملف Figma كي تُنفذ أو تُطابق.
- Create account social buttons في Figma لم تستبدل OTP الحقيقي لأن Google/Apple/Facebook ليست كلها مهيأة في الـbackend الحالي.
- Frames المقالات/المشاريع/الكتب ليست شاشات Android مستقلة؛ جرى تمثيل محتواها بالروابط والصفحة العامة.
- Android Analytics الكامل ذو chart من frame `0:1007` لم يُنسخ؛ Activity tab الحالي وظيفي لكنه partial بصريًا.
- قوالب Business الثلاثة وPersonal Plus منفذة ومقفلة حسب الخطة، لكن جلسة E2E كانت على Free، لذلك لم يُجرَ تبديل runtime إليها بتجاوز مصطنع للخطة.
- Google Wallet اختُبر في حالة backend غير المهيأ فقط: الزر مخفي. لم تُختبر إضافة pass ناجحة لغياب إعداد backend، ولم يُعرض زر ميت.
- حالات الخطأ/التحميل/الفراغ أضيفت وظيفيًا لأن الملف لا يحتوي Frames مخصصة لها؛ ليست variants منسوبة إلى Figma.
