# تقرير إعادة هيكلة POP — الهوية العالمية والحسابات المتصلة

تاريخ التحقق: 21 يوليو 2026. التنفيذ إضافي فوق الأنظمة الحالية؛ لم يُحذف SMS Misr أو الجلسات أو البطاقات أو NFC أو R2 أو Admin أو Plans أو Google Wallet. لم تُطبّق أي migration على Neon، ولم يُنفّذ db push أو reset أو seed أو commit أو push.

## 1–7. الهوية والهاتف وOTP وPasskeys

1. الهوية الأساسية أصبحت `phoneE164 → POP User`. Google والبريد وكلمة المرور ليست مسارات إنشاء حساب للمستخدم العادي؛ بقي دخول كلمة المرور للإدارة فقط.
2. يستخدم الويب `libphonenumber-js/max` ويستخدم Android مكتبة Google libphonenumber. اختيار الدولة عالمي ويعرض الاسم والعلم وكود الاتصال، ويحفظ آخر دولة، ويستخدم منطقة الجهاز/الشبكة عند عدم وجود اختيار محفوظ.
3. نتائج موثقة بالاختبارات: صيغ مصر الخمس تتحول إلى `+201001234567`، وصيغ السعودية الخمس إلى `+966501234567`، كما اختُبر رقم أمريكي. التخزين الجديد: `phoneE164`, `phoneCountryIso2`, `phoneCallingCode` مع uniqueness على E.164.
4. SMS Misr باقٍ كـadapter مستقل، ولا يحوّل `+20...` إلى صيغة المزود إلا داخله. hash/pepper/expiry/cooldown/attempts/rate limits/single-use لم تتغير.
5. أضيف `PhoneOtpProvider` بقناتي SMS وWhatsApp وfallback server-side. WhatsApp يستخدم Meta Authentication Template عند تفعيل الإعدادات فقط. لا يُعتبر Live دون token وPhone Number ID وtemplate معتمد.
6. أضيف WebAuthn كامل: register/authenticate options وverify، public key فقط، counters، transports، device type، backup state، الإلغاء، وتعدد المفاتيح. challenges مدتها خمس دقائق، مخزنة كـhash، والاستهلاك ذري لمنع replay.
7. بعد OTP يقترح النظام Passkey اختياريًا، مع “Not now”. شاشة الدخول تعرض Passkey وتبقي “استخدم الهاتف” دائمًا. Android يحتوي جسر Credential Manager؛ runtime Android لم يُختبر.

## 8–12. Google وContacts وBackup وFCM وWallet

8. Google أصبح Connected Account منفصلًا بإعدادات `GOOGLE_CONNECTED_*` ولا يختلط مع Firebase أو Login.
9. لم تُطلب صلاحية Contacts عند الدخول. أضيف أساس matching آمن باستخدام E.164 + HMAC؛ مزامنة Google Contacts الفعلية تحتاج إضافة scope وموافقة Google ولم تُشغّل.
10. أضيف `BackupProvider` بمزود `POP_CLOUD` الافتراضي و`GOOGLE_DRIVE` الاختياري. Google Drive production behavior يتعمد الرفض حتى تتوفر OAuth scopes.
11. أضيف `DevicePushToken` بتشفير token على الخادم، API تسجيل/إلغاء، وAndroid FCM service يحفظ token داخل مساحة التطبيق حتى توجد جلسة POP. لا يحتاج FCM إلى Google Login. الإرسال الإنتاجي يحتاج Firebase service account/config.
12. Google Wallet الحالي بقي مستقلًا عن Google Connected Account؛ ربط Google ليس شرطًا لإضافة pass للمحفظة.

## 13–21. مزودو الحسابات المتصلة

13. Meta: OAuth state، scopes، callback ثابت، تخزين مشفر، ومزامنة profile foundation.
14. Facebook Profile: التنفيذ يطلب فقط الحقول الرسمية المتاحة؛ الأصدقاء/المتابعون غير موعود بهم ولا يوجد scraping.
15. Facebook Pages: enum/Meta scopes/metadata architecture جاهزة، لكن جلب pages التفصيلي يحتاج credentials وGraph review.
16. Instagram Professional: البنية تستوعب username/avatar/bio/stats caching؛ الجلب المتخصص يحتاج Meta review وربط Page/Professional account.
17. Threads: provider enum وسجل منصة ودعم Meta architecture موجود؛ API fields تحتاج approval فعلي.
18. WhatsApp Business Connected Account منفصل تمامًا عن WhatsApp OTP؛ assets التفصيلية تحتاج WABA credentials/review.
19. TikTok: OAuth/PKCE وDisplay API profile/stats foundation موجودة، ومعطلة افتراضيًا.
20. LinkedIn: OIDC profile foundation وبأقل scopes، بلا scraping، ومعطلة افتراضيًا.
21. GitHub منفذ في registry/OAuth. كما توجد enums ومنصات قابلة للتوسع لـGitLab/YouTube/Spotify/Twitch/Pinterest/Discord/Reddit/Microsoft. لا تفشل البيئة إذا كانت credentials غائبة.

## 22–23. Platform Registry والتوصيات

22. وسّع migration سجل `LinkPlatform` إلى 30+ منصة ديناميكية، مع category/input/url template و`supportsOAuth/oauthProvider`. الروابط القديمة تبقى manual ولا تتحول تلقائيًا إلى Connected Accounts.
23. أضيفت قواعد توصيات لكل المهن الـ15. الدالة تعيد المقترحات أولًا ثم جميع المنصات الأخرى، لذلك لا تمنع البحث أو الاختيار خارج التوصيات.

## 24–25. الشاشات

24. Android: شاشة الهاتف العالمية والقنوات، Menu → Connected Accounts، Menu → Passkeys، Custom Tabs الآمنة، Credential Manager foundation، FCM service، وترجمات en/ar. حقول الهاتف/OTP تظل LTR.
25. Web: `/login`, `/login/phone`, `/onboarding/passkey`, `/dashboard/security/passkeys`, `/dashboard/integrations`, `/admin/integrations`، وتحديث navigation. الربط لا يعدّل البطاقة تلقائيًا؛ API الاستيراد يتطلب حسابًا وبطاقة وحقولًا محددة.

## 26. APIs الجديدة أو المعدلة

- `GET /api/otp/channels`, `POST /api/otp/send`, وmobile OTP مع country/channel.
- `POST /api/passkeys/register/options|verify` و`authenticate/options|verify`, وGET/DELETE management.
- `GET /api/integrations`، و`/:provider/connect|callback` للمزود، و`/accounts/:id/sync|importable-fields` و`DELETE /accounts/:id` للحساب المرتبط. هذا الفصل يمنع تعارض أسماء dynamic segments في Next.js App Router.
- `POST /api/cards/:cardId/import-connected-account`.
- `POST|DELETE /api/mobile/push-tokens`.

الحماية تشمل ownership، same-origin mutations، OAuth state، PKCE حيث يدعم المزود، callback ثابت، عدم open redirect، expiry، duplicate-provider-account rejection، وعدم إعادة tokens للعميل أو تسجيلها في logs.

## 27–28. Prisma وBackfill

27. migration الإضافية: `20260721190000_global_identity_integrations`. تضيف حقول الهاتف وPasskeyCredential/Challenge وConnectedAccount/OAuthConnectionState/CardImportedField/DevicePushToken/PlatformSuggestion والمهن والمنصات. لم تُطبق على Neon.
28. `pnpm --filter @popwam/db backfill:global-phones` يعمل dry-run افتراضيًا. `--apply` مطلوب صراحة. يقبل الدولي self-describing وموبايل مصر القديم الدقيق فقط، ويضع ambiguous/duplicate في report ولا يخمّن.

## 29–30. الاختبارات والبناء

- `pnpm db:generate`: ناجح.
- `pnpm i18n:audit`: ناجح؛ 0 hardcoded candidates و0 unused candidates.
- `pnpm lint`: ناجح.
- `pnpm test`: ناجح؛ 138/138 اختبار Web.
- `pnpm build`: ناجح؛ Next.js production build و115 صفحة.
- `git diff --check`: ناجح (تحذيرات تحويل LF/CRLF فقط).
- `gradlew lintDebug`: ناجح.
- `gradlew testDebugUnitTest`: ناجح؛ 16/16.
- `gradlew assembleDebug`: ناجح.

## 31–33. الاعتمادات والمراجعات وما لم يُختبر E2E

31. المفقود خارجيًا: Meta/WABA/WhatsApp template، TikTok، Google Connected، LinkedIn، GitHub، integration encryption key، Firebase credentials، وGoogle Drive scopes. القيم placeholders ومعطلة افتراضيًا.
32. يحتاج مراجعة خارجية: Meta permissions (Pages/Instagram/Threads/WABA)، WhatsApp Authentication Template، TikTok scopes/app review، LinkedIn product access، Google Contacts/Drive scopes، وإعداد FCM.
33. لم يُختبر End-to-End: أي OAuth حقيقي، WhatsApp OTP Live، SMS عالمي خارج نطاق المزود، Google Contacts/Drive، إرسال FCM، Passkey Android runtime، biometric، Camera، NFC، HCE. اختبارات automation لا تستدعي provider APIs حقيقية.

## 34. تأكيد المحاكي

لم يتم إنشاء أو تشغيل أو استخدام أي Android Emulator أو AVD، ولم يُشغّل `emulator` أو `avdmanager` أو QEMU. أعاد `adb devices` قائمة فارغة؛ لذلك Android runtime testing = **NOT RUN**.

## 35. APK

- المسار: `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`
- الحجم: `49,742,346` bytes.
- SHA-256: `77C061F392F45759169F554B34F0184CE24BF9E44BC44B9F0C4269675B0BDBDC`
