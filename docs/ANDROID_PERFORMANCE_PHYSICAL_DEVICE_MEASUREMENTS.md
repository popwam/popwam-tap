# Android Performance Diagnosis — Physical Device Measurements

تاريخ القياس: 2026-09-02  
المشروع: POP by POPWAM  
الحالة: قياس فقط؛ لم يُنفذ أي optimization أو refactor.

## 1. تفاصيل الهاتف الفعلي

| الخاصية | القيمة |
|---|---|
| الشركة | Motorola |
| الموديل | moto g85 5G (`malmo_gn`) |
| Android | 16 |
| API level | 36 |
| SoC الذي أبلغ عنه النظام | `SM6375` |
| Hardware | `qcom` |
| RAM الفعلية من `/proc/meminfo` | `11,665,568 kB`، نحو `11.13 GiB` |
| دقة الشاشة | `1080×2400` |
| معدلات الشاشة المدعومة | 60/90/120 Hz |
| المعدل الفعّال أثناء القياس | 60 Hz |
| الاتصال | Physical phone عبر Wireless ADB |
| ADB | `37.0.0-14910828` |

ظهر الهاتف في `adb devices -l` بحالة `device` ومصرحًا له، ولم تُستخدم قياسات محاكي.

## 2. Debug build المختبر

- الملف: `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`
- Package: `com.popwam.pop.debug`
- الحجم: `45,237,095` بايت.
- SHA-256: `61DBF2ACE4BCE27C00E9B417D73360B3CD3A48FD4126AB9B3166D0786AEEB502`
- تم تثبيته باستخدام `adb install -r` بنجاح.
- الجلسة المصادق عليها بقيت محفوظة، ووصل التطبيق إلى Home.
- Debug logging وruntime diagnostics مفعّلان، ولا يوجد minification.
- لا يوجد حاليًا APK محسن/profileable قابل للتثبيت. Release الموجود AAB محسن لكنه غير موقع ولا يثبت مباشرة.

## 3. منهجية القياس وحدودها

- Cold start: `am force-stop` ثم `am start -W`.
- Warm start حقيقي: إعادة إنشاء task باستخدام `NEW_TASK|CLEAR_TASK` مع التحقق من بقاء PID نفسه؛ Android أعاد `LaunchState: WARM`.
- تم أيضًا إجراء 10 Hot starts منفصلة، لكنها ليست بديلًا عن Warm ولم تدخل جدول Warm.
- `am start -W TotalTime` يمثل الوصول إلى أول frame للتطبيق، وليس Home القابل للاستخدام.
- First usable Home تم التحقق منه من Compose accessibility hierarchy بظهور عناصر Bottom Navigation الثلاثة.
- `FLAG_SECURE` يجعل ADB screenshots سوداء؛ لذلك لم تُستخدم screenshots لتحديد الجاهزية.
- أخذ عينة UI Automator يستغرق نحو 2.4–2.7 ثانية. لذلك يعرض التقرير first-usable كفاصل زمني بين آخر عينة سالبة وأول عينة موجبة، وليس رقمًا زائف الدقة.
- Network durations مأخوذة من OkHttp BASIC logs وتم تنقيح كل profile IDs وquery values. لم تُحفظ tokens أو phone numbers أو headers أو محتوى ملفات.
- BASIC logging لا يوفر TTFB منفصلًا؛ لذلك TTFB معلّم `غير متاح`.
- Perfetto trace محفوظ في:
  `E:\saas\popwam-tap\apps\android\build\perf-diagnosis\popwam-performance.perfetto-trace`
- حجم trace: `66,960,010` بايت.

## 4. نتائج 10 Cold starts

| الجولة | `am TotalTime` ms | usable lower bound ms | usable upper bound ms |
|---:|---:|---:|---:|
| 1 | 1751 | 4508 | 6898 |
| 2 | 1787 | 4592 | 6956 |
| 3 | 1849 | 4641 | 7003 |
| 4 | 1745 | 4555 | 6901 |
| 5 | 1762 | 4329 | 6704 |
| 6 | 1744 | 4395 | 6808 |
| 7 | 1784 | 4555 | 6860 |
| 8 | 1744 | 4362 | 6740 |
| 9 | 1782 | 4758 | 7156 |
| 10 | 1782 | 4450 | 6884 |

### Cold summary

| المقياس | min | median | p95 | max |
|---|---:|---:|---:|---:|
| أول frame، ms | 1744 | 1772 | 1849 | 1849 |
| first usable lower bound، ms | 4329 | 4531.5 | 4758 | 4758 |
| first usable upper bound، ms | 6704 | 6891 | 7156 | 7156 |

تفسير first usable: القيمة الحقيقية لكل جولة تقع بين الحدين. اتساع النافذة سببه تكلفة UI Automator، وليس كله وقتًا يقضيه التطبيق.

## 5. نتائج 10 Warm starts

في كل جولة بقي PID كما هو وأعاد Android الحالة `WARM`.

| الجولة | `am TotalTime` ms | usable lower bound ms | usable upper bound ms |
|---:|---:|---:|---:|
| 1 | 269 | 2895 | 5264 |
| 2 | 140 | 2698 | 5066 |
| 3 | 143 | 2751 | 5123 |
| 4 | 165 | 2729 | 5078 |
| 5 | 140 | 2731 | 5112 |
| 6 | 136 | 2681 | 5045 |
| 7 | 134 | 2651 | 4983 |
| 8 | 125 | 2669 | 5023 |
| 9 | 150 | 2719 | 5116 |
| 10 | 142 | 2700 | 5056 |

### Warm summary

| المقياس | min | median | p95 | max |
|---|---:|---:|---:|---:|
| أول frame، ms | 125 | 141 | 269 | 269 |
| first usable lower bound، ms | 2651 | 2709.5 | 2895 | 2895 |
| first usable upper bound، ms | 4983 | 5072 | 5264 | 5264 |

تم تسجيل 10 Hot starts إضافية للتأكد من الفرق. كان median لـ`am TotalTime` نحو `128ms` تقريبًا، لكن النتائج الأساسية أعلاه Warm حقيقية وليست Hot.

## 6. System Splash وPOP loader ووقت المحتوى

### System Splash

لم يمكن فصل مدة System Splash وحدها بدقة من الـAPK الحالي؛ لا توجد علامة app-level له، و`am TotalTime` يضم process/activity startup حتى أول frame. القيمة الأقرب المتاحة هي median أول frame:

- Cold: `1772ms`.
- Warm: `141ms`.

### سياسة POP الثابتة 2000ms

**مؤكدة على الهاتف الفعلي.**

الأدلة:

- التطبيق لا ينهي Launch قبل اكتمال policy ذات `2000ms` بعد خروج System Splash.
- Perfetto سجّل `121` عينة `Recomposer:animation` تقريبًا، وهو ما يتطابق مع نحو ثانيتين عند 60Hz.
- الفاصل بين أول frame وأول حد أدنى لظهور Home كان أكبر من ثانيتين في Cold وWarm.

تقريب نهاية policy:

| الحالة | median أول frame | نهاية دورة POP النظرية | first usable interval median | الوقت بعد الدورة حتى usable |
|---|---:|---:|---:|---:|
| Cold | 1772ms | 3772ms | 4531.5–6891ms | نحو 759.5–3119ms |
| Warm | 141ms | 2141ms | 2709.5–5072ms | نحو 568.5–2931ms |

نافذة ما بعد loader تقريبية بسبب UI Automator. لكنها تثبت أن policy تضيف ثانيتين، وأن بعض تحميل البيانات يستمر بعدها في عدد من التشغيلات.

## 7. قياسات التنقل

`FirstFrameUpperMs` هو حد أعلى من أخذ `/proc/uptime` قبل إرسال ADB tap إلى أول frame مرصود. يتضمن latency الخاص بـWireless ADB، لذلك هو مناسب للمقارنة النسبية وليس latency لمس المستخدم بدقة مخبرية.

### عشر دورات Root Navigation

المسار: Home → My Profile → Menu → Home، عشر مرات، بفاصل 900ms حتى يستقر كل انتقال.

| الانتقال | min first frame | median | p95/max | frames | janky | jank rate | median p95 frame |
|---|---:|---:|---:|---:|---:|---:|---:|
| Home → My Profile | 104.6ms | 113.9ms | 140.3ms | 998 | 25 | 2.51% | 14ms |
| My Profile → Menu | 98.1ms | 113.6ms | 174.4ms | 1011 | 16 | 1.58% | 15.5ms |
| Menu → Home | 96.1ms | 117.9ms | 206.1ms | 1002 | 24 | 2.40% | 15ms |

مدى p95 frame عبر الجولات:

- Home → My Profile: `13–24ms`.
- My Profile → Menu: `14–22ms`.
- Menu → Home: `14–17ms`.

### Share transitions

خمس جولات بعد اكتمال preload:

| الانتقال | min first frame | median | p95/max | ملاحظة frames |
|---|---:|---:|---:|---|
| My Profile → Share | 102.4ms | 112.9ms | 201.2ms | p95 frame بين 27 و46ms |
| Share → Back | 129.6ms | 137.9ms | 154.3ms | p95 frame بلغ 150ms في الجولات الخمس |

`Share → Back` يعرض jank متكررًا وواضحًا مقارنة بالتنقلات الجذرية، ويحتاج تحسينًا بعد تحديد slice المسبب بصورة أدق.

### الإجمالي في السيناريو الطويل

يشمل cold startup والمسار الكامل وعشر دورات:

| المقياس | النتيجة |
|---|---:|
| Total frames | 3717 |
| Janky frames | 85 |
| Jank rate | 2.29% |
| p50 frame | 11ms |
| p95 frame | 16ms |
| p99 frame | 42ms |
| Slow UI thread markers | 48 |
| Missed Vsync | 14 |

## 8. Main-thread وPerfetto

### أهم slices في عملية التطبيق

| slice | العدد/المدة |
|---|---:|
| `bindApplication` | 857.91ms |
| فتح base APK | 238.17ms |
| `OpenDexFilesFromOat` | 234.17ms |
| `AppImage:Loading` | 201.00ms |
| `activityResume` | 128.40ms |
| `performResume` | 97.99ms |
| `performCreate` | 53.54ms |
| `Compose:initializeView` | 36.20ms |
| أطول `Compose:recompose` | 35.72ms |
| أطول `AndroidOwner:draw` | 2.43ms |
| أطول `Recomposer:animation` | 3.92ms |

### حالات main thread

| الحالة | الوقت التراكمي | أقصى slice |
|---|---:|---:|
| Running | 1708.94ms | 64.71ms |
| Sleeping | 2317.28ms | 715.07ms |
| Uninterruptible sleep | 197.01ms | 14.36ms |

ظهر `Choreographer#doFrame` طويل واحد بنحو `146.34ms` أثناء cold startup، مع traversal بنحو `145.34ms`.

### Debug-only overhead

Perfetto أظهر:

- `Compiling baseline`: `3035.60ms` تراكميًا عبر `14,023` slice.
- dex/oat filter كان `verify`.
- `Mutator threads suspended for EnableDebugFeatures`: `52.98ms`.

هذا يثبت وجود Debug overhead مادي. لا يمكن تحديد مقدار تحسن Release-like بدقة دون APK profileable محسن، لكن Debug ليس ممثلًا للإنتاج.

لم يظهر ANR أو fatal exception أثناء السيناريو.

## 9. حالة التمرير والتنقل

تم تمرير My Profile لأعلى ثم الانتقال إلى Menu ثم العودة إلى My Profile من Bottom Navigation.

موضع صف `المعلومات الأساسية`:

| الحالة | bounds |
|---|---|
| قبل التمرير | `[460,1362][880,1437]` |
| بعد التمرير | `[460,790][880,865]` |
| بعد Menu ثم العودة | `[460,1362][880,1437]` |

النتيجة: **موضع التمرير لا يُستعاد؛ يعود My Profile إلى أعلى الشاشة.** هذا يؤكد الأثر المتوقع من إزالة destination دون `saveState/restoreState`.

التصنيف: Compose/navigation state، وهو UX/perceived-performance issue وليس network bottleneck.

## 10. الطلبات الفعلية بعد المصادقة

تم مسح Logcat، ثم إجراء cold launch والبقاء على Home دون فتح Share. لدى الحساب المختبر ملفان (`N=2`).

- التوقع الساكن: `N + 13 = 15` طلبًا تقريبًا.
- الفعلي: `24` استجابة.
- الفرق: `+9`، أي أعلى من التوقع بنحو `60%`.
- Share data نُزلت **قبل فتح Share**.

### Endpoint timing table

| endpoint المنقح | count | min | median | max | TTFB | duplicate | blocks visible UI | المصدر |
|---|---:|---:|---:|---:|---|---|---|---|
| `/api/localization/bootstrap` | 1 | 1352ms | 1352ms | 1352ms | غير متاح | لا | لا؛ refresh غير منتظر | `LocalizationAuthorityStore` |
| `/api/mobile/cards` | 2 | 439ms | 509ms | 579ms | غير متاح | نعم | نسخة Home تدخل في snapshot قبل عرض Home | `MainViewModel` + `HomeViewModel` |
| `/api/mobile/profiles` | 3 | 875ms | 1304ms | 1649ms | غير متاح | نعم | نسخة Home/Profile تدخل في snapshots | Main + Home + Profiles |
| `/api/mobile/push-tokens` | 1 | 1519ms | 1519ms | 1519ms | غير متاح | لا | يمكن أن يؤخر إنهاء startup إذا كان token معلقًا | Launch/session hook |
| `/api/mobile/templates` | 1 | 608ms | 608ms | 608ms | غير متاح | لا | لا يحجب Home مباشرة | `MainViewModel` |
| `/api/platform/bootstrap` | 1 | 19989ms | 19989ms | 19989ms | غير متاح | لا | لم يثبت أنه حجب Home | `PhoneCountryStore` |
| `/api/profile-bootstrap?locale=…` | 1 | 1086ms | 1086ms | 1086ms | غير متاح | لا | لم يثبت أنه حجب Home | auth/profile setup |
| `/api/profiles/{active}/editor?locale=…` | 2 | 3077ms | 3902ms | 4727ms | غير متاح | نعم | يحجب اكتمال Home/Profile snapshots | Home + Profiles |
| `/api/profiles/{other}/editor?locale=…` | 1 | 2790ms | 2790ms | 2790ms | غير متاح | لا | يحجب اكتمال Profiles snapshot رغم أنه غير نشط | Profiles |
| `/api/profiles/{active}/publishing?locale=…` | 1 | 2095ms | 2095ms | 2095ms | غير متاح | لا | يدخل في Profile content readiness | Profiles |
| `/api/profiles/{active}/share-targets?locale=…` | 3 | 2798ms | 3630ms | 5377ms | غير متاح | نعم | لا يحجب Home، لكنه يحجب Share إن فُتح أثناء التحميل | Share preload |
| `/api/profiles?selected={id}` | 5 | 538ms | 880ms | 1331ms | غير متاح | نعم | Home/Profile يستفيدان؛ مرات Share preload لا تحجب Home | Home + Profiles + Share activations |
| `/api/share/products` | 3 | 469ms | 469ms | 611ms | غير متاح | نعم | لا يحجب Home | Share preload |

`/api/platform/bootstrap` انتهى HTTP `522` بعد قرابة 20 ثانية؛ بقية الاستجابات في الجدول كانت 200. هذه مشكلة API/network حقيقية، لكن القياس لم يثبت أنها على critical path لعرض Home في الجلسة المصادق عليها.

### لماذا تجاوز العدد التوقع؟

بالإضافة إلى الطلبات الأربعة التي لم تدخل المعادلة المبسطة بالكامل — localization، push token، platform bootstrap، profile bootstrap — تغير كائن `activeShareProfile` أثناء إثراء Home/Profile state أدى إلى تفعيل Share أكثر من مرة. ظهر ذلك ميدانيًا كالتالي قبل فتح Share:

- selector خمس مرات بدل نحو ثلاث.
- share-targets ثلاث مرات.
- share-products ثلاث مرات.

التحميل المسبق لا يكتفي بطلب واحد؛ توجد activations متكررة وطلبات الشبكة السابقة لا تُلغى فعليًا بمجرد زيادة `loadGeneration`.

## 11. الذاكرة A/B/C

| المقياس | A: Home جديد | B: بعد الشاشات الأربع | C: بعد 10 دورات | A→B | B→C | A→C |
|---|---:|---:|---:|---:|---:|---:|
| Total PSS | 241852 kB | 238518 kB | 209502 kB | -3334 kB | -29016 kB | -32350 kB |
| Java/Kotlin PSS | 27220 kB | 22960 kB | 20632 kB | -4260 kB | -2328 kB | -6588 kB |
| Native PSS | 28316 kB | 27948 kB | 20832 kB | -368 kB | -7116 kB | -7484 kB |
| Graphics PSS | 68888 kB | 68372 kB | 47416 kB | -516 kB | -20956 kB | -21472 kB |
| Total RSS | 379336 kB | 377928 kB | 350080 kB | -1408 kB | -27848 kB | -29256 kB |
| Swap PSS | 102 kB | 26 kB | 26 kB | -76 kB | 0 | -76 kB |

النتيجة: **لا يوجد نمو ذاكرة مستمر أو leak واضح في السيناريو المختبر.** الذاكرة استقرت ثم انخفضت مع reclamation/GC بدل الارتفاع.

في جولة مستقلة لعشر دورات سُجل GC event واحد فقط، دون crash أو ANR. لا يوجد دليل على GC thrashing.

## 12. كلفة رسم POP loader

### النتيجة المطلوبة

**NOT SIGNIFICANT ON TEST DEVICE**

تم عزل ثلاث نوافذ بطول يقارب 1.5 ثانية من منتصف حركة loader، وثلاث نوافذ بطول يقارب 2.2 ثانية تشمل نهاية الحركة.

#### نافذة 1.5 ثانية

| الجولة | frames | janky | p95 | p99 |
|---:|---:|---:|---:|---:|
| 1 | 98 | 5 | 27ms | 121ms |
| 2 | 93 | 3 | 25ms | 105ms |
| 3 | 90 | 2 | 14ms | 101ms |

#### نافذة 2.2 ثانية

| الجولة | frames | janky | p50 | p95 | p99 |
|---:|---:|---:|---:|---:|---:|
| 1 | 129 | 3 | 11ms | 25ms | 150ms |
| 2 | 126 | 3 | 10ms | 15ms | 150ms |
| 3 | 120 | 3 | 10ms | 17ms | 150ms |

الـp99 الطويل يتزامن مع cold startup/الانتقال وليس مع كلفة Canvas وحدها. داخل Perfetto:

- أقصى `AndroidOwner:draw`: `2.43ms`.
- أقصى `Recomposer:animation`: `3.92ms`.
- لم تظهر `saveLayer` أو path draw أو blend/filter كأعلى مستهلكات thread/GPU.
- تم رصد نحو 121 animation frame، ما يؤكد عمل الرسم طوال policy ذات الثانيتين.

الاستنتاج: bitmap 1024×1024 و`saveLayer` و`BlendMode.SrcIn` وpath animation و`FilterQuality.High` لا تمثل اختناقًا مؤكدًا على moto g85 5G عند 60Hz. لا يوصى بتبسيط الأصل المرئي الآن. المشكلة المؤكدة هي **مدة policy الإجبارية**، لا كلفة الرسم.

## 13. الاختناقات المؤكدة مرتبة

### P0 — سياسة POP تضيف 2000ms قبل الواجهة

- التصنيف: perceived startup / timing policy.
- الحالة: مؤكد على الهاتف.
- الأثر: ثانيتان ثابتتان بعد خروج System Splash حتى عندما تنتهي التهيئة أسرع.
- التحسن المقدر: حتى `2000ms` في التشغيلات التي تكون بياناتها جاهزة؛ أقل إذا بقيت الشبكة أطول من policy.
- الموقع المقترح للمراجعة لاحقًا: `LaunchViewModel` و`SplashTiming`، دون تغيير الرسم نفسه.

### P0 — fan-out وتكرار الشبكة عند startup

- التصنيف: Network/client behavior.
- الحالة: مؤكد.
- الدليل: 24 استجابة فعلية مقابل توقع 15 لدى حساب بملفين.
- أبرز التكرار: cards×2، mobile profiles×3، selector×5، active editor×2، share-targets×3، share-products×3.
- التحسن المقدر: دمج cache/bootstrap وتأجيل Share يمكن أن يخفض 24 طلبًا إلى نحو 10–14 في هذا الحساب، أي خفض تقريبي `42–58%`. أثر الزمن لا يساوي مجموع مدد الطلبات بسبب التوازي.

### P1 — Share preload يتكرر قبل فتح Share

- التصنيف: Network/client behavior + Compose state trigger.
- الحالة: مؤكد.
- الأثر: ثلاث سلاسل Share؛ share-targets median `3630ms` وأقصى `5377ms`، إضافة إلى selector/products.
- التحسن المقدر: إزالة التفعيلات المكررة توفر ستة طلبات Share مباشرة وثلاثة selector تقريبًا في العينة الحالية، وتقلل منافسة الاتصالات أثناء Home/Profile.

### P1 — `platform/bootstrap` بطيء وفشل 522

- التصنيف: Backend/API latency أو network edge.
- الحالة: latency/failure مؤكد؛ كونه حجب Home غير مؤكد.
- الأثر: `19989ms` وHTTP 522.
- التحسن المقدر: غير قابل للتقدير قبل معرفة سبب 522؛ يجب أولًا إثبات هل هو critical path في شاشة auth/first launch.

### P1 — Share → Back jank

- التصنيف: Android rendering/navigation.
- الحالة: مؤكد ومتكرر.
- الدليل: p95 frame `150ms` في خمس جولات؛ median أول frame upper bound `137.9ms`.
- التحسن المقدر: إزالة frame طويل 150ms ستجعل العودة أقرب إلى root transitions ذات p95 frame نحو 14–22ms؛ يلزم trace مركز لتحديد العمل المسؤول.

### P1 — Debug startup overhead

- التصنيف: Debug-build-only overhead.
- الحالة: مؤكد.
- الدليل: bindApplication 858ms، dex/oat نحو 238/234ms، baseline compilation 3036ms تراكميًا.
- التحسن المقدر: غير معروف حتى اختبار profileable Release-like؛ متوقع أن يكون ماديًا في cold start، ولا يجوز تحويله إلى رقم دون بناء القياس المناسب.

### P2 — تحميل editor لكل الملفات

- التصنيف: Network/client behavior.
- الحالة: مؤكد.
- الأثر الحالي: editor للملف غير النشط استغرق `2790ms` ويشارك موارد الشبكة، رغم أن المستخدم على Home/الملف النشط.
- التحسن المقدر: توفير `N-1` editor requests في البداية؛ في الحساب الحالي طلب واحد.

### P2 — فقدان scroll state بين tabs

- التصنيف: Compose/navigation state.
- الحالة: مؤكد.
- الأثر: My Profile يعود إلى أعلى الصفحة بعد Menu → My Profile.
- التحسن المقدر: لا يوفر backend time، لكنه يزيل إعادة العمل والتمرير ويُحسن perceived navigation.

### ليس اختناقًا مؤكدًا

- POP loader Canvas/rendering على جهاز الاختبار.
- memory leak أثناء عشر دورات.
- GC thrashing.
- database latency؛ لا توجد قياسات DB منفصلة.

## 14. أول مرحلة تحسين موصى بها

لا يبدأ التنفيذ قبل موافقة المالك.

المرحلة الأولى المقترحة صغيرة وقابلة للقياس:

1. افصل **مدة عرض loader** عن شرط إكمال دورة 2000ms؛ يبقى POP loader أثناء وجود عمل حقيقي ويغادر فور الجاهزية بعد حد بصري قصير متفق عليه.
2. امنع `activeShareProfile` من إعادة تحميل Share عند تغير حقول العرض فقط؛ اعتمد مفتاحًا ثابتًا مثل profile ID/access/lifecycle، وألغِ Job الشبكة السابق فعليًا.
3. لا تحمل Share data حتى فتح Share، أو نفذ prefetch واحدًا مؤجلًا بعد استقرار Home إن أثبتت تجربة A/B فائدته.
4. شارك/cachِ نتائج cards، mobile profiles، selector وactive editor بين Main/Home/Profiles بدل طلب النسخة نفسها عدة مرات.
5. لا تحمل editor لكل الملفات؛ active profile أولًا ثم lazy load عند التبديل.

### معايير before/after للمرحلة الأولى

- خفض warm first-usable median بما يقارب مدة policy إذا كانت البيانات جاهزة.
- خفض الطلبات من 24 إلى 14 أو أقل لنفس الحساب والسيناريو.
- share-targets/products مرة واحدة كحد أقصى عند فتح Share، وصفر قبل الفتح إذا اختير lazy load.
- عدم تراجع p95 frame أو الذاكرة.
- إبقاء شكل وحركة POP الرسمية دون تبسيط، لأن الرسم لم يثبت أنه المشكلة.

## 15. التأكيد

- لم يُنفذ optimization.
- لم يُعدّل navigation أو UI أو backend.
- لم تُنشأ signing keys أو build types.
- لم يُنشأ commit.
- انتهى العمل عند القياس والتوصية فقط.

