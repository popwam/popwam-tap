# تشخيص أداء Android — القياس أولًا

تاريخ التشخيص: 2026-09-02  
المشروع: POP by POPWAM  
النطاق: بدء التطبيق، التنقل الرئيسي، Home، My Profile، Share، Menu، محمل POP، وتحميل الجلسة/البيانات المتصل بهذه المسارات فقط.

## ملخص تنفيذي

لم يكن هناك هاتف Android أو محاكي متصل عبر ADB وقت الفحص. لذلك لم تُنتج أرقام فعلية لـ cold/warm startup أو frame time أو jank أو PSS/heap أو مدة endpoints من التطبيق. أي رقم من هذا النوع دون جهاز سيكون مختلقًا، ولذلك يعرض هذا التقرير القياسات المتاحة فقط ويفصل صراحة بين السلوك المؤكد من الكود وبين الاختناق الذي يحتاج trace على جهاز حقيقي.

يوجد سببان واضحان يمكن إثباتهما من التنفيذ الحالي:

1. **انتظار بدء ثابت ومؤكد:** بعد خروج Android System Splash، يمنع مسار البدء الوصول إلى الواجهة الفعلية لمدة `2000ms` كاملة في الوضع العادي، حتى إذا انتهت استعادة الجلسة مبكرًا.
2. **تحميل أولي متداخل ومكرر:** بعد المصادقة تُنشأ `MainViewModel` و`HomeViewModel` و`ProfilesViewModel` معًا، ثم يبدأ تحميل Share تلقائيًا عند توفر الملف النشط حتى قبل فتح شاشة Share. العدد النظري للطلبات الأولية هو تقريبًا `N + 13`، حيث `N` عدد ملفات المستخدم، مع تكرار endpoints رئيسية وعدم احتساب رفع FCM المحتمل.

الأول مؤكد كتكلفة انتظار قدرها ثانيتان. الثاني مؤكد كسلوك شبكة في الكود، لكن أثره الزمني الفعلي ما زال يحتاج Network/Perfetto trace على جهاز.

لم يُعدّل أي كود أداء، ولم تُنشأ تهيئة build جديدة، ولم يُنفذ commit.

## 1. Build variants

### Debug

- النوع موجود وقابل للتثبيت.
- Package: `com.popwam.pop.debug`.
- ملف APK الموجود:
  `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`
- الحجم: `45,237,095` بايت، نحو `43.14 MiB`.
- غير مصغر، ويتضمن Compose/debug tooling.
- يفعّل `HttpLoggingInterceptor.Level.BASIC` و`ProfileRuntimeDiagnostics`.
- لا يجوز اعتباره ممثلًا لأداء الإنتاج.

### Release

- النوع موجود ويستخدم R8 و`isMinifyEnabled=true` و`isShrinkResources=true`.
- ملف AAB الموجود:
  `E:\saas\popwam-tap\apps\android\app\build\outputs\bundle\release\app-release.aab`
- الحجم: `28,121,965` بايت، نحو `26.82 MiB`.
- نجح `bundleRelease` و`lintRelease` و`validateReleaseConfiguration`.
- الحزمة غير موقعة، وAAB لا يُثبت مباشرة على الهاتف.

### Profileable/benchmark

- لا يوجد build type حالي باسم profileable أو benchmark.
- لا توجد وحدة Macrobenchmark أو JankStats أو FrameMetrics أو Compose tracing دائمة ضمن النطاق المفحوص.
- لم تُنشأ تهيئة جديدة امتثالًا للتعليمات. القياس الواقعي التالي يحتاج أولًا موافقة على إضافة variant محلي ضيق، مثل `benchmark`/`profileable` مشتق من Release وموقع بمفتاح debug محلي فقط، أو استخدام APK Release موقع بمفتاح الاختبار القائم إن وُجد.

### ما تم اختباره فعليًا

- لم يُشغّل Debug أو Release على جهاز في هذه الجلسة لعدم وجود جهاز ADB.
- المقارنة أعلاه مقارنة إعدادات وآثار build، وليست مقارنة runtime.

## 2. الجهاز والبيئة

- نظام المضيف: Windows 10 `10.0.19045`.
- ADB: الإصدار `1.0.41`، build `37.0.0-14910828`.
- مسار ADB: `E:\dev\sdk\android\platform-tools\adb.exe`.
- نتيجة `adb devices -l`: لا توجد أجهزة أو محاكيات.
- طراز الهاتف: غير متاح.
- إصدار Android: غير متاح.
- Build variant المشغّل: لا يوجد.

هذه ليست نتائج أداء هاتف فعلي، ولا ينبغي استخدامها كأرقام قبول نهائية.

## 3. قياسات بدء التطبيق

| القياس | النتيجة | الحالة |
|---|---:|---|
| Cold startup | غير مقاس | يحتاج هاتف ADB و`am start -W`/Macrobenchmark/Perfetto |
| Warm startup | غير مقاس | يحتاج هاتف ADB |
| Time to first usable UI | غير مقاس ميدانيًا | يوجد حد أدنى مؤكد في الكود قدره 2000ms بعد System Splash في الوضع العادي |
| System Splash duration | غير مقاس | لا يحتفظ الكود به حتى انتهاء البيانات؛ تتم إزالته عبر exit listener |
| POP branded loading | 2000ms كجدول زمني ثابت | مؤكد من الكود، وليس frame trace |
| Session restore | غير مقاس | يجري على `Dispatchers.IO` |
| Profile/network initialization | غير مقاس | يبدأ بعد دخول الجزء authenticated ويطلق عدة ViewModels |

### تسلسل البدء المؤكد

1. `MainActivity` يستدعي `installSplashScreen()`.
2. عند خروج System Splash تتم إزالته فورًا ويُبلغ `LaunchViewModel`.
3. بالتوازي، يبدأ `LaunchViewModel` على IO:
   - قراءة الجلسة المشفرة من DataStore.
   - ترحيل حالة التشغيل القديمة.
   - استدعاء `afterSessionInitialized` الذي قد يرفع FCM token معلقًا.
4. تحديث localization يبدأ في coroutine منفصلة ولا يُنتظر قبل الانتقال.
5. بعد خروج System Splash، ينفذ التطبيق جدول POP كاملًا لمدة `2000ms` في الوضع العادي.
6. بعد انتهاء الثانيتين ينتظر startup إذا لم يكن قد انتهى.
7. يقرر المسار: PhoneAuth أو Home أو onboarding.

صيغة زمن الوصول النظرية:

```text
وقت أول واجهة فعلية ≈ وقت System Splash + max(2000ms, زمن استعادة الجلسة/الترحيل/رفع FCM المعلق)
```

في reduced motion تصبح مدة الجدول `0ms` ويعرض المحمل الشعار الثابت.

### الدليل

- `apps/mobile/onboarding/src/commonMain/kotlin/com/popwam/mobile/onboarding/LaunchFlow.kt:17` يحدد `Standard = 2000ms`.
- `LaunchFlow.kt:19` يحدد reduced motion بقيمة صفر.
- `apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt:100-109` يشغّل استعادة الجلسة والترحيل ورفع FCM المحتمل.
- `LaunchViewModel.kt:113-124` ينتظر خروج System Splash ثم يكمل الجدول كاملًا قبل إنهاء splash.
- `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt:45` يحدد حركة الرسم نفسها بـ`2000ms`.

### التصنيف

- الانتظار الثابت: **Not performance-related / perceived-performance policy** من حيث أنه قرار زمني متعمد، لكنه يضيف `2000ms` مؤكدة إلى قابلية الاستخدام.
- استعادة الجلسة: لا يظهر blocking على main thread؛ تعمل على IO.
- رفع FCM المعلق داخل شرط إنهاء startup: **Network/client behavior** مشتبه، ولا يُعرف أثره دون trace وحالة token معلقة.

## 4. قياسات التنقل

لا توجد أزمنة فعلية لغياب الجهاز.

| الانتقال | الزمن | إعادة إنشاء composition | إعادة تحميل بيانات مباشرة بسبب الانتقال |
|---|---:|---|---|
| Home → My Profile | غير مقاس | نعم، entry الوجهة يُركب؛ state محفوظ في ViewModel على مستوى Activity | لا يظهر reload خاص بالنقرة |
| My Profile → Share | غير مقاس | نعم | غالبًا لا، لأن Share يُحمّل مسبقًا عند توفر active profile |
| Share → Back | غير مقاس | نعم للوجهة السابقة عند الرجوع | لا يظهر reload قسري إذا بقي active profile نفسه |
| My Profile → Menu | غير مقاس | نعم | Menu يقرأ profile state الموجود ولا يبدأ API بنفسه |
| Menu → Home | غير مقاس | قد يعاد تركيب Home حسب back stack | HomeViewModel نفسه باقٍ ولا يبدأ `init` مجددًا |

### سلوك back stack

Bottom Navigation يستخدم:

```kotlin
nav.navigate(route) {
    popUpTo("home")
    launchSingleTop = true
}
```

ولا يستخدم `saveState`/`restoreState`. هذا يعني أن وجهات tabs السابقة قد تُزال ويعاد تركيب UI عند الرجوع إليها، لكن ViewModels الأربعة أُنشئت أعلى `NavHost` داخل `MainActivity`، لذلك لا يعاد `init` أو تحميلها تلقائيًا مع كل tab switch.

التصنيف: **Compose/navigation behavior مؤكد**، وتأثيره على frames/scroll position غير مقاس.

## 5. rendering وjank

### القياسات

- Frame times: غير مقاسة.
- Dropped/janky frames: غير مقاسة.
- Long frames: غير مقاسة.
- Main-thread stalls: غير مقاسة.
- Scroll jank في My Profile/Menu: غير مقاس.

### ملاحظات ساكنة

- Home وMy Profile وShare وMenu تستخدم `LazyColumn`، وهو الخيار الصحيح مبدئيًا للقوائم الطويلة.
- عناصر ملفات Profile لها keys في مواضع القوائم الرئيسية.
- الصور تستخدم Coil و`SingletonImageLoader` مشتركًا، ما يسمح بإعادة استخدام cache واتصالات OkHttp.
- محمل POP ينشئ bitmap بدقة `1024×1024` من VectorDrawable ثم يرسمه بقناع متحرك.
- أثناء كل frame للمحمل ينفذ `saveLayer`، ويبني path مكشوفًا، ويرسم stroke، ثم يرسم bitmap باستخدام `BlendMode.SrcIn` و`FilterQuality.High`.

هذا يجعل محمل POP مرشحًا للفحص على أجهزة ضعيفة، لكنه **ليس اختناقًا مؤكدًا** دون Perfetto/GPU rendering trace. الـbitmap الخام RGBA بدقة 1024² يعادل نظريًا نحو `4 MiB` قبل أي نفقات إضافية، لكنه يُنشأ مرة لكل composition بفضل `remember` وليس كل frame.

## 6. Compose وإعادة التركيب

### المؤكد

`FigmaMainNavigation` يجمع في أعلى الشجرة أربع حالات كاملة:

- `MainUiState`
- `HomeUiState`
- `ProfilesUiState`
- `ShareUiState`

أي تحديث لإحداها يعيد تشغيل `FigmaMainNavigation`، وبعد ذلك يعتمد مقدار العمل الحقيقي على قدرة Compose على تخطي الأبناء المستقرين.

كما أن `activeShareProfile` يُعاد بناؤه من Home/Profile state، و`LaunchedEffect(activeShareProfile)` يفعّل تحميل Share. يوجد guard يمنع إعادة الطلب إذا كانت القيمة نفسها والحالة READY/LOADING، لذلك لا يظهر loop مباشر.

### غير المؤكد

- عدد recompositions لكل انتقال.
- هل DTOs مستقرة بما يكفي ليعمل skipping بكفاءة.
- كلفة layout/draw لبطاقات الملف والقوائم.
- هل تحديث upload progress يعيد تركيب أجزاء أكثر من اللازم.

هذه تحتاج Compose Layout Inspector/Recomposition Counts أو composition tracing على build قابل للـprofiling.

## 7. الذاكرة

| الحالة | PSS/heap | GC | النتيجة |
|---|---:|---:|---|
| بعد cold start | غير مقاس | غير مقاس | لا يوجد جهاز |
| بعد زيارة الشاشات الأربع | غير مقاس | غير مقاس | لا يوجد جهاز |
| بعد تكرار التنقل | غير مقاس | غير مقاس | لا يوجد جهاز |

لا يمكن إثبات leak أو retained screen من القراءة الساكنة. المؤشرات التي يجب قياسها لاحقًا:

- عمر bitmap الخاص بمحمل POP بعد مغادرة Launch.
- Coil memory cache بعد تحميل avatars/covers.
- Nav back-stack entries عند تكرار tabs.
- نمو `ProfilesUiState.content` وبيانات editors مع عدد الملفات.
- GC أثناء My Profile scrolling والصور.

أوامر القياس المقترحة على الهاتف:

```text
adb shell dumpsys meminfo com.popwam.pop.debug
adb shell am force-stop com.popwam.pop.debug
adb shell am start -W -n com.popwam.pop.debug/com.popwam.pop.MainActivity
```

## 8. تحليل طلبات الشبكة

الأزمنة أدناه غير مقاسة. الجدول يصف ما يستدعيه الكود الحالي.

| الشاشة/المرحلة | endpoint | العدد المتوقع | متوازٍ/متسلسل | مكرر | يحجب UI |
|---|---|---:|---|---|---|
| Main init | `GET /api/mobile/cards` | 1 | متسلسل مع التالي | نعم، مع Home | لا يحجب Home مباشرة لكنه يستهلك الشبكة/الخادم |
| Main init | `GET /api/mobile/profiles` | 1 | متسلسل | نعم، مع Home وProfiles | لا مباشرة |
| Main init | `GET /api/mobile/templates` | 1 | متسلسل | لا ضمن النطاق | لا مباشرة |
| Home init | `GET /api/mobile/profiles` | 1 | متوازٍ مع cards/selector | نعم | نعم، profiles أساسي للمحتوى |
| Home init | `GET /api/mobile/cards` | 1 | متوازٍ | نعم | اختياري/partial |
| Home init | `GET /api/profiles?selected=…` | 1 | متوازٍ | نعم | اختياري لكنه يحدد active profile |
| Home init | `GET /api/profiles/{id}/editor?locale=…` | 0 أو 1 | يبدأ بعد تحديد selected | نعم للملف النشط | يؤخر readiness/completion، لا قائمة الملفات الأساسية |
| Profiles init | `GET /api/profiles?selected=…` | 1 | متوازٍ مع legacy profiles | نعم | نعم |
| Profiles init | `GET /api/mobile/profiles` | 1 | متوازٍ | نعم | اختياري/partial |
| Profiles init | `GET /api/profiles/{id}/editor?locale=…` | `N` | متوازٍ لكل الملفات | active editor مكرر مع Home | نعم لوصول محتوى My Profile الكامل |
| Profiles init | `GET /api/profiles/{selected}/publishing?locale=…` | 0 أو 1 | بعد selector/editors | لا | يدخل في اكتمال المحتوى |
| Share preload | `GET /api/profiles?selected={id}` | 1 | متسلسل | نعم | يحجب Share payload |
| Share preload | `GET /api/profiles/{id}/share-targets?locale=…` | 1 | بعد selector | لا | نعم |
| Share preload | `GET /api/share/products` | 1 | بعد targets | لا | لا؛ failure ينتج partial |
| Startup | push-token endpoint | 0 أو 1 حسب الحالة | داخل startup | لا | قد يؤخر إنهاء startup إذا كان pending |

### إجمالي التحميل الأولي النظري

بعد دخول الحالة authenticated:

```text
Main       = 3
Home       = 4 عند وجود ملف نشط
Profiles   = N + 3
Share      = 3 عند توفر active profile
Total      = N + 13 طلبًا تقريبًا
```

أمثلة حسابية فقط، وليست قياسًا للشبكة:

- ملف واحد: نحو 14 طلبًا.
- 3 ملفات: نحو 16 طلبًا.
- 10 ملفات: نحو 23 طلبًا.

وقد يضاف طلب FCM token. بعض الطلبات متوازية وبعضها متسلسل، لذا لا يجوز جمع مددها حسابيًا لتحديد زمن الشاشة.

### فصل الأزمنة المطلوب في الجولة الميدانية

لكل request يجب تسجيل:

```text
Client queue/interceptor time
+ DNS/connect/TLS/network time
+ server response time (TTFB)
+ response body/JSON parsing
+ state update and UI render
= perceived screen time
```

لا توجد بيانات حاليًا تسمح بإسناد البطء إلى backend أو database.

## 9. الاختناقات مرتبة

### P0 — جدول بدء ثابت قدره ثانيتان

- **الحالة:** مساهم مؤكد في زمن الوصول، وليس حكمًا على jank.
- **التصنيف:** Not performance-related timing policy / perceived performance.
- **الدليل:** `LaunchFlow.kt:17` و`LaunchViewModel.kt:113-124`.
- **الأثر المقاس من الثابت البرمجي:** `+2000ms` بعد خروج System Splash في الوضع العادي، ما لم تكن تهيئة البيانات أطول.
- **الموقع:**
  - `apps/mobile/onboarding/src/commonMain/kotlin/com/popwam/mobile/onboarding/LaunchFlow.kt:17`
  - `apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt:113`
  - `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt:45`
- **الإصلاح المقترح بعد الموافقة:** اجعل المحمل مرتبطًا بوجود عمل حقيقي؛ اسمح بالخروج عند اكتمال startup بعد حد بصري صغير، أو شغّل الحركة دون جعل دورتها الكاملة شرطًا دائمًا للوصول إلى Home. يجب مقارنة TTID قبل/بعد مع الحفاظ على هوية POP.

### P0 — fan-out وتكرار الطلبات عند إنشاء الواجهة authenticated

- **الحالة:** السلوك مؤكد؛ كونه الاختناق الأكبر مشتبه حتى القياس.
- **التصنيف:** Network/client behavior.
- **الدليل:** إنشاء ViewModels معًا في `MainActivity.kt:130-133`، و`init` loaders في Home/Profile/Main، وShare preload في `FigmaNavigation.kt:98-100`.
- **الأثر:** `N + 13` طلبًا نظريًا تقريبًا، مع تكرار profiles/cards/selector/editor.
- **المواقع:**
  - `apps/android/app/src/main/java/com/popwam/pop/MainActivity.kt:130-133`
  - `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt:538-549`
  - `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeViewModel.kt:35-48`
  - `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfilesViewModel.kt:55-79`
  - `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt:82-100`
- **الإصلاح المقترح:** قياس الطلبات أولًا، ثم مشاركة bootstrap/cache واحد للبيانات المتكررة، وعدم تحميل بيانات Share قبل فتحها إلا إذا أثبت prefetch فائدة صافية.

### P1 — تحميل editor لكل ملف في My Profile

- **الحالة:** سلوك مؤكد؛ أثره يتزايد خطيًا مع عدد الملفات.
- **التصنيف:** Network/client behavior.
- **الدليل:** `selector.profiles.map { async { profileEditor(...) } }`.
- **الأثر:** `N` طلبات editor بدل طلب active profile فقط؛ غير مقاس زمنيًا.
- **الموقع:** `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfilesViewModel.kt:61-64`.
- **الإصلاح المقترح:** تحميل summary لكل الملفات وeditor للملف النشط فقط، ثم lazy load/cache عند التبديل.

### P1 — سلاسل طلبات مستقلة تُنفذ بالتتابع

- **الحالة:** مؤكد من الكود، والأثر الزمني غير مقاس.
- **التصنيف:** Network/client behavior.
- **الدليل:**
  - Main ينفذ cards ثم profiles ثم templates بالتتابع.
  - Share ينفذ selector ثم targets ثم products بالتتابع.
- **المواقع:**
  - `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt:542-549`
  - `apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareViewModel.kt:52-69`
- **الإصلاح المقترح:** بعد إثبات timings، تشغيل المستقل منها بـ`supervisorScope/async` أو إزالة الطلبات التي يغطيها bootstrap مشترك.

### P2 — كلفة رسم محمل POP

- **الحالة:** مشتبه فقط.
- **التصنيف:** Android rendering/UI.
- **الدليل:** bitmap 1024²، `saveLayer`، path segment، blend وHigh filtering لكل frame.
- **الأثر:** غير مقاس؛ قد يظهر على GPU/أجهزة ضعيفة.
- **الموقع:** `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt:92-151`.
- **الإصلاح المقترح:** Perfetto/GPU trace أولًا. إذا ثبتت الكلفة، حافظ على نفس الأصل البصري مع bitmap أصغر مناسب لحجم العرض أو cache مشتق، وقلل offscreen layer فقط إذا لم يغير الشكل.

### P2 — إعادة تركيب وجهات Bottom Navigation

- **الحالة:** إعادة إنشاء destination composition مؤكدة؛ تأثيرها غير مقاس.
- **التصنيف:** Compose state/navigation.
- **الدليل:** `popUpTo("home")` و`launchSingleTop` دون `saveState/restoreState`.
- **الموقع:** `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt:161-166`.
- **الإصلاح المقترح:** قياس الانتقال وحفظ scroll state أولًا، ثم تقييم نمط multiple back stacks أو `saveState/restoreState` دون تغيير UX.

## 10. التصنيف النهائي

### اختناقات/تكاليف مؤكدة

- انتظار branded startup ثابت قدره 2000ms في الوضع العادي.
- بدء Main/Home/Profile loaders معًا بعد المصادقة.
- prefetch تلقائي لبيانات Share قبل دخول شاشة Share.
- تكرار profiles/cards/profile selector/editor بين ViewModels.
- تحميل editor لكل ملف داخل Profiles.
- تنفيذ طلبات Main وShare المستقلة بالتتابع.
- إزالة بعض tab destinations من back stack دون حفظ state.

### اختناقات مشتبه بها تحتاج قياسًا

- أن network fan-out هو السبب الأكبر للبطء المحسوس.
- كلفة محمل POP على GPU/main thread.
- recomposition زائدة بسبب جمع أربع حالات كبيرة أعلى NavHost.
- memory growth بسبب الصور أو back stack.
- بطء endpoint أو PostgreSQL بعينه.
- debug-only overhead من logging/tooling.

### أمور غير مرتبطة أو غير مثبتة

- لا يوجد دليل يسمح بإلقاء السبب على قاعدة البيانات.
- قياسات `/health ~588ms` و`go.popwam.com ~703ms` السابقة ليست قياسات Android endpoints ولا load test.
- حجم APK/AAB لا يثبت بطء runtime وحده.
- تحذيرات security/Google Play/lint خارج نطاق تشخيص الأداء الحالي.

## 11. ترتيب القياس والتحسين المقترح

1. توصيل الهاتف الحقيقي الذي ظهرت عليه المشكلة وتسجيل الموديل ونسخة Android.
2. قياس Debug الحالي كمرجع فقط: 10 cold starts و10 warm starts باستخدام `am start -W`.
3. بعد موافقة المالك، إضافة build profileable محلي ضيق مشتق من Release، دون مفتاح إنتاج، ثم إعادة نفس القياسات.
4. تسجيل Perfetto يشمل startup وHome → My Profile → Share → Back → Menu → Home.
5. تسجيل OkHttp EventListener أو timing interceptor مؤقت آمن لتمييز queue/connect/TLS/TTFB/body، دون طباعة tokens أو البيانات الشخصية.
6. حساب request count الفعلي ومقارنته بتوقع `N + 13`.
7. قياس frames وjank أثناء Profile/Menu scroll وحركة POP.
8. تسجيل `dumpsys meminfo` بعد cold start، بعد الشاشات الأربع، وبعد 10 دورات تنقل.
9. تنفيذ أول تحسين صغير فقط بعد إثبات أثره؛ المرشح الأول إزالة الانتظار غير الضروري أو منع التحميل المسبق/المكرر.
10. إعادة نفس السيناريو والحكم على التحسن من median وp95، لا من تجربة بصرية واحدة.

## 12. بروتوكول القبول للجولة التالية

يجب أن يحتوي القياس الميداني على الأقل على:

- الجهاز، Android version، SoC/RAM إن أمكن، build variant.
- 10 cold و10 warm runs.
- median وp95 لـTTID ووقت أول UI قابل للاستخدام.
- مدة System Splash وPOP loader منفصلتين.
- Perfetto trace لكل flow.
- janky frame percentage وp95 frame time.
- PSS وJava/native heap وGC count في نقاط الذاكرة الثلاث.
- جدول endpoints الفعلي: count، client duration، TTFB، duplicate، وهل حجب UI.
- مقارنة Debug مقابل profileable Release-like.

## 13. الملفات المفحوصة

- `apps/android/app/build.gradle.kts`
- `apps/android/settings.gradle.kts`
- `apps/android/gradle.properties`
- `apps/android/app/src/main/AndroidManifest.xml`
- `apps/android/app/src/main/java/com/popwam/pop/MainActivity.kt`
- `apps/android/app/src/main/java/com/popwam/pop/TapApplication.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchExperience.kt`
- `apps/mobile/onboarding/src/commonMain/kotlin/com/popwam/mobile/onboarding/LaunchFlow.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PopNavigationPolicy.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeViewModel.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeScreen.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfilesViewModel.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileScreens.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareViewModel.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareScreens.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/MenuScreens.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/api/PopwamApi.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/repository/PopwamRepository.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/SessionRepository.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/SecureSessionStore.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/AuthNetwork.kt`

## 14. تأكيدات

- لم يبدأ تحسين أو refactor.
- لم يتغير backend أو signing أو UI.
- لم تُضف أدوات profiling دائمة.
- لم يُنشأ build type جديد.
- لم يُنشأ commit.

