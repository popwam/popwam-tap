# POPWAM Tap — Figma source inventory

> جرد سابق لأي تعديل واجهات، مستخرج مباشرة من `C:\Users\POPWAM\Downloads\Untitled (1).fig` وليس من تقارير التنفيذ السابقة.

## هوية المصدر

- SHA-256: `7116E36FC4AB5C34A30B1438AFBAA6297532A122941B5D742A2A15F6892B4036`
- Export timestamp داخل الملف: `2026-07-16T19:39:26.850Z`
- البنية: ZIP يحتوي `canvas.fig` بصيغة `fig-kiwi`، و`meta.json`، و`thumbnail.png`، و63 صورة مضمّنة.
- المشهد المقروء: 2,615 node في صفحة التصميم المسماة `Page 1`: 1,187 Frame، و604 Vector، و336 Text، و211 Rounded Rectangle، و199 Instance، و34 Ellipse، و26 Component، و17 Boolean Operation، وComponent Set رئيسي واحد ظاهر في الصفحة.
- الشاشات الرئيسية: 15 Top-level Frame. بقية الـFrames عناصر داخلية للشاشات والمكوّنات.
- Prototype: لا توجد أي `reactions` أو روابط Prototype أو destinations مسجّلة في الملف.
- Styles/Variables: لم تُكتشف سجلات Local Paint/Text/Effect/Grid Styles أو Design Variables؛ القيم مرسومة مباشرة داخل الـnodes. توجد عناصر مرجعية داخل `Internal Only Canvas` تحمل أسماء تشبه tokens.

## الشاشات الرئيسية

| Figma ID | اسم الشاشة | المقاس | الوظيفة والمحتوى | الحقول/الأزرار | القالب/الانتقال والحالات |
|---|---|---:|---|---|---|
| `0:4` | profile business pro | 440×956 | ملف أعمال داكن ذو Hero avatar، إحصاءات اجتماعية، تبويبات، ومعرض صور 3×2 | Add، Communicate، Social tiles، All/Photos/Music/Videos | قالب مستقل: `business-pro-grid`. لا Prototype. لا empty/error/loading. |
| `0:60` | profile business pro | 440×1074 | ملف أعمال داكن به Hero avatar، بيانات شخصية وموقع وتاريخ انضمام، وبطاقات اجتماعية متفاوتة المقاس | Follow، Communicate، Add، روابط Email/Instagram/Facebook/Dev/Figma/Twitter/GitHub | قالب مستقل: `business-pro-social`. لا Prototype. لا حالات نظامية. |
| `0:137` | profile business free | 440×956 | ملف أعمال فاتح، صورة واسم وبلد وBio، Follow/Message، تبويبات، Portfolio grid | Follow، Message، Design/Services/About/Liked | قالب مستقل: `business-free-portfolio`. لا Prototype. |
| `0:215` | profile user free | 440×956 | ملف شخصي أسود، avatar دائري، اسم ووصف وأربعة أزرار روابط كبيرة | Instagram، Shopee، Fiverr، Portfolio | قالب مستقل: `personal-free-links`. لا Prototype. |
| `0:247` | profile user pro | 440×956 | صورة Hero كاملة مع اسم وBio فوقها، ثم روابط بيضاء كبيرة مع سهم | Install Bio، podcast، store، articles، channel | قالب مستقل: `personal-pro-hero`. النص الأصلي يستخدم Emoji كأيقونات؛ التنفيذ يجب أن يستبدلها بأيقونات vector محلية. |
| `0:330` | profile user plus | 440×1074 | ملف شخصي داكن، avatar واسم ووظيفة وBio، تبويبات وروابط list، وصف أيقونات اجتماعية أسفلها | Tabs، ستة روابط، Facebook/X/Instagram/LinkedIn/GitHub/Email | قالب مستقل: `personal-plus-tabs`. لا Prototype. |
| `0:405` | Tab 2 - user disconnected | 393×852 | صفحة عامة فاتحة، Header profile، تبويبات، قائمة مقالات، CTA سفلي | Copy link، language، CV، social icons، tabs، link cards، Create my Worktree | نسخة Article من القالب العام. لا Prototype. |
| `0:470` | Tab 1 - user disconnected | 393×852 | الصفحة العامة نفسها مع قائمة مشاريع | Copy link، language، CV، social icons، tabs، project links، CTA | نسخة Projects من القالب العام. لا Prototype. |
| `0:601` | Tab 3 - user disconnected | 393×852 | الصفحة العامة نفسها مع قائمة كتب/روابط Amazon | Copy link، language، CV، tabs، book links، CTA | نسخة Books من القالب العام. لا Prototype. |
| `0:668` | Create account | 393×852 | إنشاء حساب في شاشة واحدة مع Logo وعنوان ووصف | Email، Password؛ Create account؛ Google، Apple، Facebook؛ Login | الانتقال غير مسجّل. دلاليًا يسبق `Create link page` فقط. لا validation/error/loading variants. |
| `0:709` | Create link page | 393×852 | إدخال الاسم والرابط العام في شاشة إنشاء بسيطة | Name، Page link؛ Complete؛ علامة تحقق بجانب slug | الانتقال غير مسجّل. دلاليًا يسبق `User POV`. لا validation/error/loading variants منفصلة. |
| `0:736` | User POV | 393×852 | محرر الملف: رفع صورة، مشاركة/Theme/Language، الاسم/المهنة، حسابات موثقة، تصنيفات، social integrations، tabs، bottom nav | Add photo، Copy link، language، Add profession، Add، category chips، Show/Connect، New tab، Edit | مرجع المحرر وLive preview semantics، لكن لا Prototype ولا شاشة preview جانبية. |
| `0:873` | Tab management | 393×852 | إدارة تبويب وروابطه؛ form أعلى وقائمة روابط قابلة للسحب/القائمة | Title، URL، Add؛ drag handles؛ overflow menu؛ close؛ bottom nav/Edit | مرجع Add Links وترتيب الروابط. لا حالات validation/error/loading. |
| `0:1007` | Analytics | 393×849 | إحصاءات الملف، بطاقة Upgrade، Overview، KPIs، chart، top accounts/links | Share، Get premium، period dropdown، bottom nav/Edit | لا Prototype. لا empty/error/loading. |
| `0:1281` | Settings | 393×849 | الحساب وإعدادات المعلومات والتكاملات والخصوصية والتحليلات وSEO والمحتوى والدعم | Account dropdown، rows بأيقونة/chevron، bottom nav/Edit | لا Prototype. لا حالات نظامية. |

الصور المرجعية الأصلية لكل Frame موجودة في [`docs/evidence/figma-reference`](docs/evidence/figma-reference).

## Forms وترتيبها

1. `Create account`: Email → Password → Create account، ثم بدائل Google/Apple/Facebook.
2. `Create link page`: Name → Page link → Complete.
3. `Tab management`: Title → URL → Add → My links.
4. `User POV`: photo → identity → verified accounts/categories → tabs.

لا يعرض الملف حقول POPWAM التالية في form واحد: Card name، Card type، Company، Bio، Phone، Email، Website، Location، Company logo، Primary language، Template. لذلك سيُطبّق التدفق المطلوب بهذه البيانات عبر نفس visual grammar (header، pills، rounded inputs، gradient CTA، editor/link cards) مع ربطه بواجهات المشروع الحالية، من دون الادعاء بأن Frame غير موجود في المصدر.

## القوالب الستة الفعلية

| Slug تنفيذي | Figma frame | النوع | اختلاف layout الحقيقي |
|---|---|---|---|
| `business-pro-grid` | `0:4` | Business | Hero avatar داخل notch، stats/social row، tabs، photo grid، خلفية داكنة متدرجة. |
| `business-pro-social` | `0:60` | Business | Hero avatar، metadata، social masonry cards بأحجام وخلفيات مختلفة. |
| `business-free-portfolio` | `0:137` | Business | Header فاتح مركزي، Follow/Message، chips، portfolio grid ثنائي. |
| `personal-free-links` | `0:215` | Personal | خلفية سوداء، خط Courier، أزرار teal كبيرة متمركزة. |
| `personal-pro-hero` | `0:247` | Personal | صورة cover كاملة، النص فوق الصورة، روابط white pill مع arrow circles. |
| `personal-plus-tabs` | `0:330` | Personal | خلفية داكنة، Bio مركزي، tabs، list rows، social circles. |

هذه ليست color variants؛ لكل قالب توزيع مستقل للصورة والهوية والروابط والمحتوى.

## Components وVariants

- `Accounts`: 19 variants بحجم 343×68: Default، Connected، Twitter، LinkedIn، Instagram، YouTube، Spotify، Apple Music، Deezer، Twitch، Kick، Steam، Epic Games، Discord، Telegram، WhatsApp، SoundCloud، Pinterest، Google Drive.
- `Social Icons`: 48 variants بحجم 48×48، أي 24 منصة بنسختي `Original` و`Negative`: Discord، Twitch، Spotify، VK، Signal، Clubhouse، Telegram، Tumblr، TikTok، Reddit، Dribbble، Figma، Skype، GitHub، Medium، Pinterest، Snapchat، Apple، YouTube، Google، LinkedIn، Instagram، Twitter، Facebook.
- `.icon effects`: Original / Overlay.
- `Status Bar - iPhone`: Background True / False.
- `Theme`: icon default، icon variant، desktop light، desktop dark.
- `Tab-content`: Default / Active.
- `Tabs`: Default / Tab-2 / Tab-3.
- `Link container`: Simple link / Full article / Shopping.
- `Home Indicator`: iPad/iPhone × Portrait/Landscape.
- `CTA`: Default / Variant2.
- `Mini-tab`: Default / Active.
- `switch`: off / on.
- مكوّنات مفردة مهمة: External Link، Map Pin، Email، Placeholder، Instagram، Facebook، Dev، Figma، Twitter، GitHub، Arrow up-right.

## Visual tokens المستخرجة

- Primary gradient: `#825BDD` → `#5327BA` تقريبًا.
- Core ink: `#121020`.
- Surfaces/borders: `#FFFFFF`, `#FCFCFC`, `#EDEDED`, `#D9D9D9`.
- Muted text: `#6E6E6E`, `#888888`, `#B0B0B0`.
- أشهر spacing: 4، 8، 10، 12، 16، 20، 24، 32 px؛ 8 و10 هما الأكثر استخدامًا، و16 هو padding الغالب.
- Rounded inputs/buttons في شاشات 393px: عرض 345px، ارتفاع يقارب 48–51px، radius بصري pill (نحو 24–99px حسب node).
- الخط الغالب في شاشات التطبيق: ABeeZee Regular بأحجام 12/14/16/17/20/24. القوالب الأخرى تستخدم SF Pro Display، Inter، DM Sans، Poppins، Courier Prime.
- الملف لا يحتوي خطًا عربيًا. Android الحالي يضم Cairo؛ سيُستخدم للعربية مع الحفاظ على scale والوزن، وتبقى القيم التقنية LTR.

## Empty/error/loading واللغة

- لا توجد Top-level Frames لحالات empty أو error أو loading أو keyboard.
- لا توجد حالات locked template أو selected template أو plan badges في الملف.
- لا توجد نسخة عربية، ولا نسخة إنجليزية كاملة؛ لغة شاشات التطبيق برتغالية، ولغة القوالب مزيج إنجليزي.
- لا توجد directionality RTL مصممة. المطلوب التنفيذي سيعكس alignment/navigation في العربية ويُبقي Phone/Email/URL/Serial باتجاه LTR.

## حدود المصدر بالنسبة للتدفق المطلوب

المسار `Home → Create Virtual Card → Select Card Type → Enter Information → Add Links → Select Template → Preview → Create Card → Card Details` غير موجود كـPrototype في الملف. أقرب مصادره المباشرة هي:

- إنشاء الهوية: `Create link page`.
- إدخال/تحرير الهوية: `User POV`.
- إضافة وترتيب الروابط: `Tab management`.
- المعاينة والصفحة العامة: Frames القوالب الستة وFrames التبويبات العامة.
- شكل navigation والإعدادات: `User POV` / `Analytics` / `Settings`.

أي شاشة مطلوبة خارج ذلك ستكون composition وظيفيًا من هذه المراجع، مع توثيقها كـimplementation mapping لا كـFigma frame مختلق.
