const errors = [];
const value = name => process.env[name]?.trim() || "";
const required = name => { if (!value(name)) errors.push(`${name} is required`); };
const httpsUrl = (name, expectedHost) => {
  try {
    const url = new URL(value(name));
    if (url.protocol !== "https:" || (expectedHost && url.hostname !== expectedHost)) errors.push(`${name} must use https://${expectedHost || "..."}`);
  } catch { errors.push(`${name} must be a valid HTTPS URL`); }
};
const exactUrl = (name, expected) => {
  try {
    const actual = new URL(value(name));
    const wanted = new URL(expected);
    if (actual.origin !== wanted.origin || actual.pathname.replace(/\/$/, "") !== wanted.pathname.replace(/\/$/, "") || actual.search || actual.hash) errors.push(`${name} must be exactly ${expected}`);
  } catch { errors.push(`${name} must be exactly ${expected}`); }
};
const strongSecret = name => {
  const secret = value(name);
  if (secret.length < 32 || /CHANGE|EXAMPLE|PLACEHOLDER/i.test(secret)) errors.push(`${name} must be a non-placeholder secret of at least 32 characters`);
};

required("DATABASE_URL");
try {
  const database = new URL(value("DATABASE_URL"));
  if (!/^postgres(ql)?:$/.test(database.protocol)) errors.push("DATABASE_URL must be PostgreSQL");
} catch { errors.push("DATABASE_URL must be a valid PostgreSQL URL"); }

for (const name of ["NEXTAUTH_SECRET", "MOBILE_TOKEN_SECRET", "MOBILE_ENROLLMENT_SECRET", "OTP_PEPPER", "ACTIVATION_SCRATCH_PEPPER", "ACTIVATION_RATE_LIMIT_PEPPER"]) strongSecret(name);
const secretNames = ["NEXTAUTH_SECRET", "MOBILE_TOKEN_SECRET", "MOBILE_ENROLLMENT_SECRET", "OTP_PEPPER", "ACTIVATION_SCRATCH_PEPPER", "ACTIVATION_RATE_LIMIT_PEPPER"];
const secrets = secretNames.map(value).filter(Boolean);
if (new Set(secrets).size !== secrets.length) errors.push(`${secretNames.join(", ")} must be distinct`);

exactUrl("NEXTAUTH_URL", "https://pop.popwam.com");
httpsUrl("NEXT_PUBLIC_APP_URL", "go.popwam.com");
exactUrl("APP_URL", "https://pop.popwam.com");
if (value("NEXT_PUBLIC_WEB_APP_URL")) exactUrl("NEXT_PUBLIC_WEB_APP_URL", "https://pop.popwam.com");
httpsUrl("PUBLIC_URL", "go.popwam.com");
const metaEnabled = value("META_ENABLED").toLowerCase() === "true";
if (metaEnabled) for (const name of ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI", "INTEGRATION_TOKEN_ENCRYPTION_KEY"]) required(name);
if (metaEnabled || value("META_REDIRECT_URI")) exactUrl("META_REDIRECT_URI", "https://pop.popwam.com/api/integrations/meta/callback");
const metaCapabilities = value("META_OAUTH_CAPABILITIES").split(",").map(capability => capability.trim()).filter(Boolean);
const allowedMetaCapabilities = new Set(["facebook_pages", "instagram", "threads", "whatsapp_business"]);
if (metaCapabilities.some(capability => !allowedMetaCapabilities.has(capability))) errors.push("META_OAUTH_CAPABILITIES contains an unknown capability");
if (value("APP_HOST") !== "pop.popwam.com") errors.push("APP_HOST must be pop.popwam.com");
if (value("PUBLIC_HOST") !== "go.popwam.com") errors.push("PUBLIC_HOST must be go.popwam.com");
if (value("PASSKEY_RP_ID") !== "pop.popwam.com") errors.push("PASSKEY_RP_ID must be pop.popwam.com");
exactUrl("PASSKEY_ORIGIN", "https://pop.popwam.com");
const passkeyAndroidOrigins = value("PASSKEY_ANDROID_ORIGINS").split(",").map(origin => origin.trim()).filter(Boolean);
if (!passkeyAndroidOrigins.length || passkeyAndroidOrigins.some(origin => !/^android:apk-key-hash:[A-Za-z0-9_-]{20,}$/.test(origin))) {
  errors.push("PASSKEY_ANDROID_ORIGINS must contain reviewed android:apk-key-hash origins");
}

const firebaseWebConfig = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"];
const firebaseAdminConfig = ["FCM_PROJECT_ID", "FCM_CLIENT_EMAIL", "FCM_PRIVATE_KEY"];
for (const name of firebaseAdminConfig) required(name);
const firebasePrivateKey = value("FCM_PRIVATE_KEY").replace(/\\n/g, "\n");
if (firebasePrivateKey && !/^-----BEGIN (?:RSA )?PRIVATE KEY-----\n[\s\S]+\n-----END (?:RSA )?PRIVATE KEY-----$/.test(firebasePrivateKey)) {
  errors.push("FCM_PRIVATE_KEY must be a PEM private key; Railway literal \\\\n line breaks are supported");
}
if (firebaseWebConfig.some(name => value(name))) for (const name of firebaseWebConfig) required(name);
if (value("FCM_ENABLED") && !["true", "false"].includes(value("FCM_ENABLED").toLowerCase())) errors.push("FCM_ENABLED must be true or false");
if (value("FCM_ENABLED").toLowerCase() === "true") for (const name of firebaseAdminConfig) required(name);

const booleanValue = name => ["true", "false"].includes(value(name).toLowerCase());
for (const name of ["STAGING", "OTP_TEST_MODE", "OTP_EXPOSE_IN_RESPONSE"]) if (value(name) && !booleanValue(name)) errors.push(`${name} must be true or false`);
const staging = value("STAGING").toLowerCase() === "true";
const otpTestMode = value("OTP_TEST_MODE").toLowerCase() === "true";
const otpExpose = value("OTP_EXPOSE_IN_RESPONSE").toLowerCase() === "true";
if (otpTestMode) {
  if (!staging) errors.push("OTP_TEST_MODE=true is forbidden on live production; set it only on an explicitly marked STAGING deployment");
  const phones = value("OTP_TEST_PHONES").split(",").map(phone => phone.trim()).filter(Boolean);
  if (!phones.length || phones.some(phone => !/^\+[1-9]\d{7,14}$/.test(phone))) errors.push("OTP_TEST_PHONES must be a non-empty comma-separated list of normalized E.164 phone numbers");
  if (value("OTP_TEST_CODE") && !/^\d{6}$/.test(value("OTP_TEST_CODE"))) errors.push("OTP_TEST_CODE must be exactly 6 digits when provided");
}
if (otpExpose && !otpTestMode) errors.push("OTP_EXPOSE_IN_RESPONSE=true requires OTP_TEST_MODE=true");
if (otpExpose && !staging) errors.push("OTP_EXPOSE_IN_RESPONSE=true is forbidden on live production");

for (const name of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]) required(name);
httpsUrl("R2_ENDPOINT");
// This is the R2/CDN delivery origin used by getPublicUrl(), not the public-site host.
httpsUrl("R2_PUBLIC_BASE_URL", "media.popwam.com");

const googleId = value("GOOGLE_CLIENT_ID"); const googleSecret = value("GOOGLE_CLIENT_SECRET");
if (Boolean(googleId) !== Boolean(googleSecret)) errors.push("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must either both be set or both be empty");

const googleWalletKeys = ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_CLASS_SUFFIX", "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL", "GOOGLE_WALLET_PRIVATE_KEY"];
if (googleWalletKeys.some(name => value(name))) for (const name of googleWalletKeys) required(name);
const appleWalletKeys = ["APPLE_WALLET_PASS_TYPE_ID", "APPLE_WALLET_TEAM_ID", "APPLE_WALLET_SIGNER_CERT_BASE64", "APPLE_WALLET_SIGNER_KEY_BASE64", "APPLE_WALLET_WWDR_CERT_BASE64", "APPLE_WALLET_ICON_BASE64"];
if (appleWalletKeys.some(name => value(name))) for (const name of appleWalletKeys) required(name);
if (value("APPLE_WALLET_WEB_SERVICE_URL")) { httpsUrl("APPLE_WALLET_WEB_SERVICE_URL"); strongSecret("APPLE_WALLET_AUTH_SECRET"); }

if (errors.length) {
  console.error("Production environment validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Production environment validation passed (secret values were not printed).");
