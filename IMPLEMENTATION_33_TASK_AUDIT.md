# تدقيق تنفيذ موجز POPWAM Tap ذي الـ33 بنداً

تاريخ التدقيق: 2026-07-15  
نوع التدقيق: قراءة Git والمستودع فقط؛ لم تُنفّذ إعادة كتابة أو تعديل لملفات المنتج، ولم يُستخدم `prisma db push`، ولم تُطبّق أي migration على الإنتاج.

## النتيجة التنفيذية

- **هل اكتملت البنود الـ33؟** لا.
- **COMPLETE:** 12
- **PARTIAL:** 21
- **NOT IMPLEMENTED:** 0
- **EXTERNAL BLOCKER:** 0
- **نسبة الإغلاق الكامل:** **36.36%** (`12 / 33 × 100`). لا تُمنح أنصاف نقاط للبنود الجزئية.
- توجد أجزاء متوقفة على credentials، لكن لا يوجد بند كامل حالته `EXTERNAL BLOCKER`؛ لأن البنود المتأثرة تحتوي أيضاً فجوات كود أو تكامل يجب إغلاقها أولاً.

## نطاق Git الذي تمت مراجعته

- **Baseline commit:** `f14a33684b815f1e7ef12208aa6d328d894b24e5` — `feat: add production batch and virtual card features with wallet integration`
- **HEAD commit:** `7e9c86d8bb740a28480d16818a08d1180fc96910` — `feat: implement social actions and privacy features`
- **Commit range:** `f14a33684b815f1e7ef12208aa6d328d894b24e5..7e9c86d8bb740a28480d16818a08d1180fc96910`
- **Commits داخل النطاق:** commit واحد، هو `7e9c86d`.
- **الأب المباشر لـHEAD:** `f14a336`.
- **حجم الفرق:** 97 ملفاً، 1219 إضافة، 315 حذفاً.
- كان `git status --short` فارغاً عند بدء التدقيق.

ملاحظة حدودية مهمة: Git لا يسجل لحظة إرسال الموجز نفسه. تم اعتماد `f14a336` كنقطة البداية استناداً إلى سياق التشغيل السابق الذي يحدد أن العمل بدأ من هذا الرأس النظيف، وإلى أن أول commit بعده هو `7e9c86d`. يحتوي baseline نفسه على ميزات متداخلة مع الموجز؛ لذلك عوملت كميزات موجودة قبل نطاق التنفيذ، لكنها فُحصت عند تقييم حالة HEAD الحالية.

الأوامر المرجعية المستخدمة:

```text
git log --oneline --decorate
git diff --stat f14a336..HEAD
git diff --name-status f14a336..HEAD
git show --stat 7e9c86d
git show f14a336
git show 7e9c86d
```

## ما غيّره commit التنفيذ

أضاف `7e9c86d` بصورة رئيسية: واجهات الأصدقاء والمحادثات والأفكار والتقارير، قواعد الخصوصية، طلبات الاشتراك ومعالجة طلبات المتجر، التقاط روابط المنصات، مشاركة الملف، إعدادات SMS وقت التشغيل، تحسين Audit/Wallet/Inventory/Production، migration اجتماعية وتجارية، وصورة المنتج المرجعية. كما عدّل التنقل وصفحات الإدارة والملفات والقوالب والتفعيل وAndroid.

### الملفات المضافة داخل النطاق

```text
apps/web/public/brand/popwam-premium-card.png
apps/web/src/app/admin/feature-requests/page.tsx
apps/web/src/app/admin/reports/[reportId]/page.tsx
apps/web/src/app/admin/reports/page.tsx
apps/web/src/app/admin/subscriptions/page.tsx
apps/web/src/app/api/admin/audit/csv/route.ts
apps/web/src/app/commerce-actions.ts
apps/web/src/app/dashboard/chats/[chatId]/page.tsx
apps/web/src/app/dashboard/chats/page.tsx
apps/web/src/app/dashboard/friends/page.tsx
apps/web/src/app/dashboard/plans/page.tsx
apps/web/src/app/dashboard/products/page.tsx
apps/web/src/app/dashboard/templates/preview/[templateId]/page.tsx
apps/web/src/app/ideas/page.tsx
apps/web/src/app/sms-actions.ts
apps/web/src/app/social-actions.ts
apps/web/src/components/platform-link-capture.tsx
apps/web/src/components/product-store.tsx
apps/web/src/components/profile-share-actions.tsx
apps/web/src/lib/audit.ts
apps/web/src/lib/commerce.ts
apps/web/src/lib/friend-privacy.ts
apps/web/src/lib/link-platforms.ts
apps/web/src/lib/sms/runtime.ts
apps/web/src/lib/social.test.ts
apps/web/src/lib/social.ts
packages/db/prisma/migrations/20260715180000_product_workflows/migration.sql
```

### الملفات المعدلة داخل النطاق

```text
.env.example
apps/android/app/src/main/java/com/popwam/tap/ui/PopwamApp.kt
apps/android/app/src/main/res/values-ar/strings.xml
apps/android/app/src/main/res/values/strings.xml
apps/web/src/app/actions.ts
apps/web/src/app/admin/audit/page.tsx
apps/web/src/app/admin/cards/[id]/page.tsx
apps/web/src/app/admin/cards/batches/new/page.tsx
apps/web/src/app/admin/cards/page.tsx
apps/web/src/app/admin/customers/page.tsx
apps/web/src/app/admin/expense-categories/page.tsx
apps/web/src/app/admin/expenses/new/page.tsx
apps/web/src/app/admin/expenses/page.tsx
apps/web/src/app/admin/inventory/page.tsx
apps/web/src/app/admin/link-platforms/page.tsx
apps/web/src/app/admin/orders/[id]/page.tsx
apps/web/src/app/admin/orders/new/page.tsx
apps/web/src/app/admin/orders/page.tsx
apps/web/src/app/admin/purchases/[id]/page.tsx
apps/web/src/app/admin/purchases/new/page.tsx
apps/web/src/app/admin/purchases/page.tsx
apps/web/src/app/admin/sms/page.tsx
apps/web/src/app/admin/suppliers/page.tsx
apps/web/src/app/admin/wallet/page.tsx
apps/web/src/app/api/admin/card-batches/route.ts
apps/web/src/app/api/admin/sms/test/route.ts
apps/web/src/app/api/otp/send/route.ts
apps/web/src/app/business-actions.ts
apps/web/src/app/catalog-actions.ts
apps/web/src/app/dashboard/appearance/page.tsx
apps/web/src/app/dashboard/cards/page.tsx
apps/web/src/app/dashboard/nfc/page.tsx
apps/web/src/app/dashboard/profile/page.tsx
apps/web/src/app/dashboard/tags/[id]/page.tsx
apps/web/src/app/dashboard/templates/page.tsx
apps/web/src/app/dashboard/transfers/page.tsx
apps/web/src/app/dashboard/uploads/page.tsx
apps/web/src/app/dashboard/wallet/page.tsx
apps/web/src/app/globals.css
apps/web/src/app/manifest/profile/[slug]/route.ts
apps/web/src/app/onboarding-actions.ts
apps/web/src/app/onboarding/page.tsx
apps/web/src/app/p/[slug]/page.tsx
apps/web/src/app/p/id/[profileId]/page.tsx
apps/web/src/app/transfer-actions.ts
apps/web/src/components/confirm-submit.tsx
apps/web/src/components/dashboard-shell.tsx
apps/web/src/components/file-manager.tsx
apps/web/src/components/nfc-platform-actions.tsx
apps/web/src/components/plan-form.tsx
apps/web/src/components/profile-install-button.tsx
apps/web/src/components/public-profile.tsx
apps/web/src/lib/admin-links.test.ts
apps/web/src/lib/inventory.test.ts
apps/web/src/lib/mobile-otp.ts
apps/web/src/lib/onboarding.test.ts
apps/web/src/lib/onboarding.ts
apps/web/src/lib/plans.ts
apps/web/src/lib/platform.test.ts
apps/web/src/lib/production.test.ts
apps/web/src/lib/production.ts
apps/web/src/lib/profile-metadata.ts
apps/web/src/lib/profile-templates.test.ts
apps/web/src/lib/profile-templates.ts
apps/web/src/lib/session.ts
apps/web/src/lib/sms/index.ts
apps/web/src/lib/wallet.test.ts
apps/web/src/lib/wallet.ts
packages/db/prisma/repair.ts
packages/db/prisma/schema.prisma
```

## جدول التدقيق الكامل

| # | السلوك المطلوب | الحالة | الدليل | ما يعمل الآن | الناقص ونوعه |
|---:|---|---|---|---|---|
| 1 | مخزون موحد يفصل الكمية عن القيمة، مع كل حالات الكميات والصورة والتسويات والسجل | PARTIAL | `InventoryItem` و`InventoryMovement` في `packages/db/prisma/schema.prisma`؛ `apps/web/src/app/admin/inventory/page.tsx`؛ `business-actions.ts`؛ `inventory.test.ts` | يعرض الكمية الفعلية مستقلة عن `unitCost × quantity`؛ اختبار 1000/2000 موجود؛ تتوفر adjustment/damage/return/reconciliation/history، وصفحات الشراء/الموردين/المصروفات مخفية ومحوّلة إلى المخزون. | جدول الصنف لا يعرض Activated/Damaged/Returned لكل منتج؛ الصورة إدخال URL وليست واجهة رفع منتج فعلية؛ النماذج القديمة ما زالت في schema والصفحات موجودة كـredirects. **كود/UI**. |
| 2 | دفعة إنتاج من منتج + كمية + ملاحظة فقط، مع stock check وسجلات/روابط/QR وتصدير | COMPLETE | `/admin/cards/batches/new`؛ `/api/admin/card-batches`؛ `/api/admin/production-batches/[id]/csv`؛ `ProductionBatch`, `ProducedTag`, `InventoryBatch`, `Card`؛ `production.ts` و`production.test.ts` | النموذج مقتصر على المطلوب، والتحقق والخصم والتوليد داخل transaction؛ URL دائم، activation code/hash أحادي الاستخدام، جدول وطباعة/CSV وQR. | لا يوجد نقص يمنع السلوك المطلوب. تحسين غير حاجب: استبدال `card.count()+1` بمسلسل قاعدة بيانات لتقوية التزامن. |
| 3 | عدم إنشاء بريد أو مستخدم وهمي؛ البطاقة غير المعينة بلا مالك ثم ترتبط بحساب حقيقي | PARTIAL | `Card.ownerId` nullable و`UNASSIGNED`؛ batch route لا ينشئ مستخدماً؛ لكن `apps/web/src/app/api/otp/verify/route.ts` و`lib/mobile-otp.ts` ينشئان `phone-…@otp.popwam.invalid` | دفعة الإنتاج لا تنشئ مستخدمين عشوائيين، والبطاقة يمكن أن تبقى بلا مالك. | تدفق OTP ينشئ بريداً اصطناعياً وحساباً phone-only، مخالفاً لطلب البريد الحقيقي. **كود/تدفق تسجيل**، لا credentials. |
| 4 | جدول بطاقات فعلية مضغوط بسبعة أعمدة وقائمة ثلاث نقاط وصفحة تفاصيل منظمة | COMPLETE | `apps/web/src/app/admin/cards/page.tsx` و`admin/cards/[id]/page.tsx`؛ `admin-links.test.ts` | الأعمدة السبعة المطلوبة موجودة؛ الإجراءات خلف قائمة؛ التفاصيل تحتوي Back وأقساماً ومعلومات التفعيل والتدقيق. | لا نقص جوهري مثبت. |
| 5 | Link Platforms قابلة للضبط، capture/normalize/preview/open-app، ورابط خارجي مخصص مرتبط بملف | PARTIAL | `LinkPlatform` و`Destination`؛ `/admin/link-platforms`؛ `catalog-actions.ts`؛ `platform-link-capture.tsx`؛ `link-platforms.ts`؛ `platform.test.ts` | حقول عربي/إنجليزي، نوع إدخال، templates، app links/fallback، تعليمات، رفع أيقونة R2، validation/preview، WhatsApp normalization، ولا طلب لكلمات المرور. رابط المنصة يُربط ببطاقة افتراضية. | نموذج **custom external link** لا يعرض اختيار profile ويكتب دائماً إلى أول profile شخصي؛ `validationRules` JSON موجود في DB لكنه غير مستخدم في الحفظ/التطبيق (المستخدم هو regex منفرد). **كود/UI**؛ R2 credentials مطلوبة فقط للرفع. |
| 6 | صفحة Wallet إعداد/جاهزية حقيقية وغير فارغة | COMPLETE | `/admin/wallet`؛ `wallet.ts` (`googleWalletReadiness`, `appleWalletReadiness`)؛ `wallet.test.ts` | تعرض كل متطلبات Google/Apple، الوضع، النواقص، والجاهزية؛ الأزرار الوهمية معطلة/غير معروضة. | لا نقص في بند الجاهزية نفسه؛ التنفيذ الفعلي مفصول في البند 23. |
| 7 | أسماء حقول الخطط مترجمة وغير تقنية | COMPLETE | `apps/web/src/components/plan-form.tsx` و`locales/ar.json`, `locales/en.json` | حدود وميزات الخطة معروضة بتسميات بشرية عربية/إنجليزية. | لا نقص جوهري مثبت. |
| 8 | خمسة templates مختلفة فعلياً، متعددة الألوان واللغات، preview/apply/lock/upgrade | PARTIAL | `ProfileTemplate`؛ `repair.ts`؛ `profile-templates.ts`؛ `/dashboard/templates` وpreview؛ `public-profile.tsx`؛ `globals.css`; tests | توجد خمسة قوالب seeded وتختلف في avatar/header/cover/contact/link/desktop layouts، ولها live preview وplan gate وتطبيق عام. | لا يوجد `TemplateVariant` أو selector لعدة color variants؛ QR placement وcompany section وtypography/mobile behavior ليست متغيرة لكل قالب كما طُلب؛ معظم preview images ليست أصولاً حقيقية. اختيار `both` غير متاح في واجهة profiles العادية. **كود/تصميم/أصول**. |
| 9 | اشتراك يبدأ من المستخدم ويُعتمد يدوياً بكل الحالات والتجديد/الترقية/التخفيض | PARTIAL | `UserPlan`, `SubscriptionStatus`, `adminNote`؛ `/dashboard/plans`؛ `/admin/subscriptions`؛ `commerce-actions.ts`, `commerce.ts`; migration؛ test | الطلب لا يصبح ACTIVE تلقائياً؛ transition gates، المراجعة، التواريخ، السبب، الرفض، التعليق، الانتهاء وإعادة التنشيط موجودة. | لا يوجد payment proof/gateway؛ renewal/upgrade/downgrade ليست تدفقات صريحة ومتكاملة، والطلب يمنع وجود طلب آخر في عدة حالات. **كود/UI**؛ payment credentials مستقبلية فقط إن أضيف gateway. |
| 10 | الطلبات تنشأ من متجر المستخدم وتعالجها الإدارة بالحالات المطلوبة | COMPLETE | `/dashboard/products`؛ `product-store.tsx`؛ `createStoreOrder`/`updateStoreOrder`؛ `/admin/orders` و`[id]`؛ `Order`, `OrderItem`; commerce test | cart متعدد المنتجات، تحقق stock وحجز/خصم داخل Serializable transaction، إنشاء user-originated order، transitions ودفع/إلغاء/رد مخزون؛ `/admin/orders/new` redirect. | لا نقص يمنع نموذج request-order اليدوي المطلوب. |
| 11 | إزالة Files العامة وإدارة Profile Attachments داخل الملف المحدد | PARTIAL | `/dashboard/files` redirect إلى `/dashboard/uploads`؛ `uploads/page.tsx`; `file-manager.tsx`; `UploadedFile.profileId` | الاسم أصبح Profile Attachments، والملفات مرتبطة بـprofile وتُرفع/تستبدل/تخفى/ترتب. | ما زالت صفحة standalone؛ تختار أول profile شخصي فقط وتعرض ملفات المستخدم كلها دون اختيار/filter للملف؛ ليست مدمجة داخل كل profile. **كود/UI**. |
| 12 | دمج Appearance في الخطط والقوالب وهوية P + NFC بحسب الخطة | PARTIAL | `/dashboard/appearance` redirect؛ `/dashboard/templates`; plan features؛ `themes.ts`; SVG logos | Appearance غير موجودة في التنقل وتحوّل للقوالب؛ theme/template يطبقان على الصفحة العامة. | لا توجد منظومة plan-specific app icon variants أو اختيار شعار الشركة/الهوية بالمستوى المفصل المطلوب؛ الهوية ليست موحدة في كل الأصول. **تصميم/كود**. |
| 13 | PWA ديناميكي مستقل لكل profile باسم/بدء/أيقونة ووصف وتبديل تثبيت | PARTIAL | `/manifest/profile/[slug].webmanifest`; `/api/profile/[slug]/icon/[size]`; `profile-metadata.ts`; `profile-install-button.tsx`; `Profile.allowInstallable` | manifest ديناميكي، start URL مباشر، avatar أو initial icon، install prompt عند الدعم، إخفاء standalone، وتعليمات iPhone. | لا يوجد route المثال `/install/[slug]` (ليس إلزامياً تقنياً لكنه مطلوب في النص)؛ toggle متاح عملياً في صفحة profile القديمة/default/onboarding وليس داخل محرر كل profile؛ لا اختبارات manifest/toggle تكاملية. **كود/UI/اختبارات**. |
| 14 | إزالة صفحات Settings/Usage Limits الفارغة من التنقل | COMPLETE | `dashboard-shell.tsx`; صفحات `/admin/limits` و`/admin/settings` موجودة لكن غير مدرجة | اختفت الروابط الفارغة؛ حدود الخطط في plan edit، وإعدادات SMS/Wallet ذات الغرض منفصلة. | إبقاء routes القديمة لا يخالف شرط إزالة التنقل، وإن كان يمكن تحويلها بوضوح أكبر. |
| 15 | Audit logs منظمة بكل المرشحات ورسائل مفهومة وCSV/pagination/search | PARTIAL | `/admin/audit`; `/api/admin/audit/csv`; `audit.ts`; `AuditLog`; `admin-links.test.ts` | actor/action/card/date/result/search/pagination، رسائل مقروءة، JSON مطوي ومُنقح، وCSV. | لا توجد مرشحات target user/order/subscription صريحة؛ virtual profile ليس حقلاً مستقلاً؛ CSV لا يطبق إلا `action` ويتجاهل بقية مرشحات الواجهة. **كود/UI**. |
| 16 | إعدادات SMS في DB تطبق فوراً بلا restart مع الأسرار في env | PARTIAL | `SystemSetting`; `sms/runtime.ts`; `sms-actions.ts`; `/admin/sms`; OTP send/mobile/test routes | القراءة من DB كل طلب بلا cache، enabled/provider/sender/templates تتأثر فوراً، الأسرار في env، revalidation موجودة. | `countryRules`, `testMode`, و`defaultLanguage` تُحفظ وتُعرض لكن لا تتحكم فعلياً في مسار الإرسال/التطبيع؛ لا اختبار يثبت التحديث الحي end-to-end. **كود/اختبار**؛ SMS Misr credentials مطلوبة للإنتاج. |
| 17 | تفعيل مختلف لسطح المكتب/mobile web/native وفق التسلسل المطلوب | PARTIAL | `/activate/scan`, `/activate/card/[publicSlug]/*`; `activation-scanner.tsx`; mobile activation APIs؛ Android `ActivationScreen`, `NfcToolsScreen` | mobile web يبدأ QR ويدعم camera/image/manual؛ OTP وتأكيد نهائي واستهلاك أحادي؛ Android يفحص activation QR/manual وNFC read/verify موجود. | desktop لا يحتوي خطوة last 5 ثم code؛ واجهة واحدة تحوّل دائماً إلى QR؛ native activation لا يفرض تسلسل NFC permanent URL ثم activation QR/code. **كود/UI واختبارات أجهزة**. |
| 18 | My Profiles = بطاقات افتراضية مستقلة بكل البيانات والميزات وحدود الخطة | PARTIAL | `Profile`, `VirtualCard`, `Destination`, `ProfileField`, `UploadedFile`, `WalletPass`; `/dashboard/profiles`; plan limits/tests | ملفات متعددة مستقلة حسب الخطة، بيانات ثنائية، روابط وحقول ومرفقات وقوالب وQR وWallet/PWA/ربط مادي في طبقات النظام. | واجهة الملف الموحدة لا تجمع كل هذه الإجراءات لكل profile؛ language UI العادي لا يوفر `both`؛ attachments/PWA/NFC تعتمد أحياناً على default/first profile. **كود/UI**. |
| 19 | استثناء الاتصال الأساسي من حد الروابط | COMPLETE | `countsTowardLinkLimit` في `plans.ts`; `platform.test.ts` | PROFILE/PHONE/EMAIL/WEBSITE/WhatsApp/VCF مستثناة، والروابط الاجتماعية/المخصصة الزائدة تُحتسب. | لا نقص جوهري مثبت. |
| 20 | رسالة ترقية جميلة عند منع الرفع | COMPLETE | `file-manager.tsx` | بطاقة ترقية عربية/إنجليزية، وصف واضح، وأزرار View plans/Upgrade now/Later. | لا نقص جوهري مثبت. |
| 21 | My Products متجر فعلي بمنتجات وصور/سعر/كمية/cart وstock حقيقي | COMPLETE | `/dashboard/products`; `product-store.tsx`; inventory batches; `createStoreOrder`; store availability test | التسمية والتنقل صحيحان، صور وسعر ومتاح وquantity/cart متعدد البنود وطلب شراء؛ التوفر من المخزون الفعلي/المنتج. | لا نقص يمنع checkout على هيئة request order كما سمح الموجز. |
| 22 | إخفاء NFC Tools ووضع assign/HCE/write/test/lock/copy/QR/share داخل كل profile | PARTIAL | `/dashboard/nfc` redirect؛ `/dashboard/tags/[id]`; `nfc-platform-actions.tsx`; Android `NfcToolsScreen` | write/test/HCE/lock confirmation/copy/share/QR موجودة لبطاقة فعلية؛ الويب standalone مخفي. | الإجراءات موجودة في **تفاصيل البطاقة الفعلية** لا داخل كل virtual profile؛ assign physical card ليس action داخل profile؛ Android ما زال يملك شاشة NFC Tools مستقلة. **كود/UI**. |
| 23 | Google/Apple Wallet حقيقيان عند الإعداد مع تحديث Apple | PARTIAL | wallet routes؛ `wallet.ts`; `WalletPass`; `/dashboard/wallet`; tests | Google يوقع JWT RS256 وينقل إلى Add to Google Wallet؛ Apple يولد `.pkpass` موقّعاً؛ ownership/plan/readiness/persistence موجودة ولا تُعامل passes كدفع. | لا توجد Apple PassKit web-service endpoints للتسجيل والتحديث؛ Google class يجب إنشاؤها خارجياً ولم يُختبر مسار حقيقي؛ credentials غير موجودة. **كود + credentials خارجية**. |
| 24 | locked template يعرض preview/ألوان/متطلب/سعر وزر شراء مباشر | PARTIAL | `/dashboard/templates`; preview route؛ `/dashboard/plans`; `requestPlan` | preview وlayout mock/live preview وplan requirement وUpgrade/Buy link موجودة. | لا سعر template ولا شراء template محدد ولا payment/checkout مباشر؛ الزر يحوّل إلى خطط وطلب اشتراك عام. **كود/UI**؛ gateway credentials فقط إن اختير دفع آلي. |
| 25 | نقل البطاقة لصديق بالusername مع قبول/رفض/إلغاء/انتهاء/audit ووجهة جديدة | COMPLETE | `TagTransfer`; `transfer-actions.ts`; `/dashboard/transfers`; `/admin/transfers`; `tag-transfers.test.ts` | username موثّق أو صديق مقبول، request lifecycle، expiry/audit، وتصفير/إيقاف الوجهة عند القبول مع بقاء scan history. | لا نقص جوهري مثبت في التدفق المطلوب. |
| 26 | حفظ وتطبيق القالب فعلياً على الصفحة العامة مع entitlement/revalidation/preview | COMPLETE | `selectProfileTemplate`; `VirtualCard.themeId`; `templateAllowed`; public profile routes/component; CSS; tests | التحديد يُحفظ، يتحقق من الخطة، يعيد validation للصفحة العامة، ويغير tokens/layout مع preview. | لا نقص جوهري في سلسلة التطبيق؛ اتساع اختلاف القوالب نفسه محسوب في البند 8. |
| 27 | toggle تثبيت لكل profile وفصل Google login/Wallet/profile linking | PARTIAL | `Profile.allowInstallable`; manifest 404 عند التعطيل؛ public install شرط؛ `dashboard/settings` و`google-link-button.tsx`; auth config | التعطيل يمنع manifest/button، وGoogle OAuth منفصل عن Wallet، والربط يتطلب جلسة وتأكيداً. | toggle ليس متاحاً بصورة واضحة داخل محرر **كل** profile؛ لا تحقق production فعلي لـGoogle login credentials/callback؛ اختبارات التكامل ناقصة. **كود/UI + Google OAuth credentials**. |
| 28 | مشاركة واضحة لكل profile/card عبر system/copy/QR/WhatsApp/Telegram/email | COMPLETE | `profile-share-actions.tsx` في `public-profile.tsx`; `nfc-platform-actions.tsx`; Android share/QR helpers | زر Share واضح مع كل القنوات للملف العام، وبطاقة فعلية تملك share/copy/QR؛ Android يستخدم share sheet. | لا نقص جوهري مثبت، مع غياب اختبار UI آلي للمشاركة. |
| 29 | عدم كشف IDs/tokens/hashes/errors/URLs الداخلية للمستخدم العادي | PARTIAL | admin card detail ينتقي حقولاً آمنة؛ `safeAuditMetadata`; لكن mobile APIs وdeep links في `nfc-platform-actions.tsx` | hashes/activation secrets لا تظهر في واجهات المستخدم، وأخطاء التفعيل غالباً friendly codes. | mobile JSON يعرض DB `id` وdestination/profile IDs؛ deep links تحتوي `cardId`؛ بعض forms/routes تعرض IDs التقنية وواجهات server actions قد ترمي codes خاماً. **كود/API/UI**. |
| 30 | تطبيق الاتجاه البصري وإنتاج asset set متسق لكل الأسطح | PARTIAL | `apps/web/public/brand/popwam-premium-card.png`; SVG logos؛ Android launcher؛ wallet colors/QR | صورة premium card واحدة وهوية سوداء/ذهبية في المتجر، وأصول شعار سابقة موجودة. | commit أضاف صورة واحدة فقط؛ لا مجموعة مخصصة ومتسقة لـapp icon/favicon/Wallet/QR/loading/empty، ولا إثبات أن P + NFC waves مطبق في كل الأصول. **تصميم/أصول وكود ربط**. |
| 31 | إعادة تصميم mobile مع التنقل الكامل وHome غني وتحديثات شبه فورية/offline | PARTIAL | Android `PopwamApp.kt`, ViewModels/repository/APIs | التنقل المطلوب ظاهر؛ Home يعرض active profile/HCE/scans/share/QR؛ profiles أصلية. | Products/Friends/Chats/Notifications مجرد PortalScreen للويب؛ لا WebSocket/SSE/push/background refresh/offline queue/retry؛ order status/notifications ليست native. **كود mobile/backend + FCM/APNs credentials لاحقاً**. |
| 32 | الاسم النهائي، widgets، Android HCE Type 4، NFC write، iOS Core NFC بلا ادعاء HCE | PARTIAL | Android `PopwamHostApduService`, `HceConfig`, `NfcTagManager`, policies/tests/manifest؛ iOS `NFCWriter.swift`, `DeepLinkRouter.swift`, README | POPWAM Tap مستخدم؛ HCE Type 4 NDEF لرابط واحد cached وغير دفع؛ Android read/write/verify/lock؛ iPhone limitation موثقة بصورة صحيحة وكود Core NFC أولي موجود. | لا Android widget ولا iOS widget؛ iOS ليس مشروع Xcode قابلاً للبناء بل 3 ملفات هيكلية؛ HCE يحتاج اختبار أجهزة فعلية؛ native iOS signing/capabilities غير مهيأة. **كود + Apple/Android signing وأجهزة**. |
| 33 | Friends/chats/privacy/moderation/ideas/voting/onboarding كامل وآمن | PARTIAL | social models في schema/migration؛ `social-actions.ts`; friends/chats/ideas/admin reports/feature requests؛ `friend-privacy.ts`; onboarding pages/actions/tests | request/accept/reject/block/remove/favorite؛ privacy per friend؛ direct chats/unread/attachments/report؛ admin يرى المحادثة فقط عبر report ويسجل access؛ ideas/votes/comments/status/merge pointer؛ onboarding 15 خطوة يحفظ ويستأنف. | إرسال message لا يعيد التحقق من استمرار الصداقة/عدم block؛ لا realtime/push؛ لا retention policy enforcement؛ follow feature status غير موجود؛ merge لا ينقل votes/comments؛ generated avatar لا يولّد صورة؛ اختبارات social helper-level فقط وليست authorization/DB integration. **كود/اختبارات وسياسة تشغيل**. |

## أدلة schema والمهاجرات

الموديلات الأساسية الموجودة: `InventoryItem`, `InventoryMovement`, `ProductionBatch`, `ProducedTag`, `Card`, `ActivationClaimSession`, `Profile`, `VirtualCard`, `LinkPlatform`, `Destination`, `UploadedFile`, `ProfileTemplate`, `UserPlan`, `Order`, `OrderItem`, `WalletPass`, `TagTransfer`, `Friendship`, `FriendPrivacyRule`, `Chat`, `ChatMember`, `Message`, `MessageReport`, `FeatureRequest`, `FeatureVote`, `FeatureComment`, `AuditLog`.

لا يوجد model باسم `TemplateVariant`، وهذه فجوة مباشرة في بند تعدد ألوان القوالب.

### migrations ذات الصلة

- داخل نطاق التنفيذ: `20260715180000_product_workflows/migration.sql` فقط.
- dependencies كانت موجودة في baseline: `20260714200000_inventory_ledger_core`, `20260714210000_production_batches`, `20260714220000_virtual_cards_wallet_transfers`.
- migration الجديدة additive في معظمها: enum values، أعمدة install/SMS-commerce/link-platform، username unique nullable، وجداول social. كما تجعل `Customer.phone` nullable.
- `prisma validate` نجح في التشغيل السابق، لكن ذلك لا يثبت نجاح migration على نسخة بيانات إنتاج فعلية.

## المسارات والتنقل

- يوجد 90 ملف page route و38 API route في HEAD.
- admin navigation يتضمن Inventory, Production batches, Physical cards, Unassigned, Users, Customers, Subscriptions, Orders, Products, Profiles, Platforms, Links, Templates, Plans, Wallet, Transfers, Feature requests, Reports, Audit, SMS.
- dashboard navigation يتضمن Home, My Profiles, Profile details, Links, My Products, My NFC cards, Wallet, Templates, Plans, Transfers, Friends, Chats, Ideas, Settings.
- routes القديمة للمشتريات/الموردين/المصروفات وAppearance/NFC/Files ما زالت ملفات فعلية، لكنها redirects أو مخفية من التنقل. صفحات admin limits/settings ما زالت routes لكنها غير مدرجة.
- public routes الرئيسية: `/[shortCode]`, `/p/[slug]`, `/p/id/[profileId]`, `/t/[token]`, activation routes، `/ideas`، وmanifest/icon الديناميكيان.

## الاختبارات والبناء

نتائج التشغيل السابق على HEAD، ولم تُعد أثناء هذا التدقيق حتى لا تتولد artifacts جديدة:

- TypeScript: ناجح.
- Web: **101/101** عبر **17 files**.
- Android Debug وRelease tests: ناجحة.
- Prisma validation: ناجح.
- i18n audit: ناجح؛ 239 web keys و169 Android keys، بلا hardcoded/unused وفق الأداة.
- Monorepo build: **5/5 packages**.
- Next.js: **99 pages** generated في ذلك التشغيل.

اختبارات تغيرت داخل `f14a336..7e9c86d`: `admin-links.test.ts`, `inventory.test.ts`, `onboarding.test.ts`, `platform.test.ts`, `production.test.ts`, `profile-templates.test.ts`, `wallet.test.ts`، مع إضافة `social.test.ts`. الاختبارات الجديدة مفيدة لكنها في معظمها pure/helper tests؛ لا توجد تغطية DB/integration كافية للطلبات، الاشتراكات، authorization الاجتماعي، manifest، المشاركة، SMS runtime أو Wallet الحقيقي.

## العمل المتبقي حسب الأولوية

### P0 — سلامة الهوية والبيانات والنشر

1. إلغاء إنشاء `@otp.popwam.invalid` وفرض/جمع بريد حقيقي أو تصميم حساب phone-only بلا بريد اصطناعي.
2. منع كشف DB IDs في mobile responses/deep links واستبدالها بمعرّفات عامة opaque.
3. اختبار سلسلة migrations كاملة على clone من بيانات الإنتاج مع backup و`prisma migrate deploy` في staging؛ لا تستخدم `db push`.
4. تقوية تخصيص serial في batch بمسلسل/قفل قاعدة بيانات واختبار concurrent generation.

### P1 — الوعود الوظيفية غير المكتملة

1. إكمال تفعيل desktop last-5، وربط NFC→activation في native.
2. نقل NFC actions إلى كل virtual profile، وإضافة assign physical card داخل الملف.
3. بناء Apple PassKit update service واختبار Google/Apple Wallet فعلياً.
4. تنفيذ widgets Android/iOS وإنشاء مشروع iOS كامل قابل للبناء.
5. إغلاق فجوات chat/block/retention/follow/merge وإضافة integration authorization tests.
6. تنفيذ near-real-time/push/cache/background/offline retry بدلاً من portal placeholders في Android.

### P2 — اكتمال تجربة المنتج

1. Template variants وأصول preview حقيقية وخمسة layouts تختلف في كل العناصر المطلوبة.
2. محرر موحد لكل profile يجمع attachments/PWA/NFC/Wallet/language both.
3. template-specific purchase/price، وتجديد/upgrade/downgrade للاشتراكات.
4. ربط custom links بالprofile المختار، وتطبيق `validationRules` الحقيقي.
5. تطبيق كل حقول SMS runtime فعلياً.

### P3 — الإدارة والهوية البصرية

1. استكمال Audit filters وCSV المطابق للمرشحات.
2. إنشاء asset system الكامل والمتسق P + NFC waves.
3. إظهار stock state counts لكل منتج ورفع صورة المنتج عبر R2.
4. تحويل routes القديمة إلى aliases واضحة أو إزالتها في migration آمنة لاحقة دون حذف بيانات.

## حالة migration الإنتاجية وهل النشر آمن

- لا يوجد دليل أن أي migration من هذا التشغيل طُبقت على production، ولم يُستخدم `prisma db push`.
- المراجعة الساكنة لـ`20260715180000_product_workflows` لا تكشف destructive data drop؛ معظمها additive، مع تغيير `Customer.phone` إلى nullable.
- **ليس آمناً اعتبارها جاهزة للنشر المباشر الآن**: لم تُشغّل `migrate deploy` على staging clone، ولم يُفحص `migrate status` على قاعدة الإنتاج، ولم تُختبر أحجام البيانات/الأقفال/مدة الفهارس، ولا توجد خطة rollback/backup موثقة.
- يمكن أن تصبح آمنة للنشر المشروط بعد: backup قابل للاستعادة، clone حديث، تطبيق كل migrations المعلقة بالترتيب، smoke tests للهوية/الطلبات/التفعيل/social، فحص الفهارس والـlocks، ثم نافذة نشر ومراقبة. لا ينبغي فصل migration الجديدة عن dependencies السابقة إذا كانت production متأخرة عنها.

## credentials والتجهيزات الخارجية المطلوبة

- **Google Wallet:** issuer account/status، Issuer ID، Generic Pass class، service-account email/private key، origins، واعتماد production.
- **Apple Wallet:** Apple Developer Team، Pass Type ID، signer cert/key، WWDR، icon، ويفضل `webServiceURL`/auth secret؛ لكن credentials وحدها لا تكفي قبل بناء update service.
- **SMS Misr/Webhook:** environment/username/password/sender/template tokens أو SMS API URL/token.
- **Google login:** OAuth client ID/secret وredirect URIs الصحيحة؛ منفصل عن Wallet.
- **R2:** endpoint/account/bucket/access keys/public media URL لرفع الصور/الملفات والأيقونات.
- **Android:** release signing، Play configuration، واختبار أجهزة NFC/HCE وقارئات فعلية.
- **iOS:** macOS/Xcode project، Apple signing/provisioning، NFC capability و`NFCReaderUsageDescription`، وApp Group/widget signing عند التنفيذ.
- **Realtime/push مستقبلاً:** FCM/APNs credentials بعد بناء backend/client المطلوبين؛ غيابها ليس سبب الفجوة الحالية وحده.

## الحكم النهائي

المنصة تبني وتنجح اختباراتُها الحالية، لكنها **ليست تنفيذاً كاملاً للبنود الـ33**. البناء الأخضر يثبت التوافق التقني لما هو موجود فقط، ولا يثبت وجود الأجزاء غير المبنية أو التكاملات الخارجية. النسبة الصارمة هي **36.36% مكتمل بالكامل**، وبقية البنود الـ21 جزئية.
