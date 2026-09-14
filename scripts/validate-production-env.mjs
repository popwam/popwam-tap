const errors = [];
// Current Production does not activate Evolution Auth. This explicit preflight
// is for the future authorized auth release; it is not a new runtime flag.
const futureAuth = process.argv.includes("--future-auth");
const value = name => process.env[name]?.trim() || "";
const required = name => { if (!value(name)) errors.push(`${name} is required`); };
const httpsUrl = (name, expectedHost) => {
  try {
    const url = new URL(value(name));
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || /[\[\]()]/.test(value(name)) || (expectedHost && (url.host !== expectedHost || url.pathname !== "/"))) errors.push(`${name} must use its canonical HTTPS origin`);
  } catch { errors.push(`${name} must be a valid HTTPS URL`); }
};
const exactUrl = (name, expected) => {
  try {
    const actual = new URL(value(name));
    const wanted = new URL(expected);
    if (actual.origin !== wanted.origin || actual.pathname.replace(/\/$/, "") !== wanted.pathname.replace(/\/$/, "") || actual.username || actual.password || actual.search || actual.hash) errors.push(`${name} must use its canonical URL`);
  } catch { errors.push(`${name} must use its canonical URL`); }
};
const strongSecret = name => {
  const secret = value(name);
  if (secret.length < 32 || /CHANGE|EXAMPLE|PLACEHOLDER/i.test(secret)) errors.push(`${name} must be a non-placeholder secret of at least 32 characters`);
};

required("DATABASE_URL");
required("DIRECT_DATABASE_URL");
for (const name of ["DATABASE_URL", "DIRECT_DATABASE_URL"]) {
  try {
    const database = new URL(value(name));
    if (!/^postgres(ql)?:$/.test(database.protocol)) errors.push(`${name} must be PostgreSQL`);
  } catch { errors.push(`${name} must be a valid PostgreSQL URL`); }
}

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
if (!passkeyAndroidOrigins.length || passkeyAndroidOrigins.some(origin => !/^android:apk-key-hash:[A-Za-z0-9_-]{43}$/.test(origin))) {
  errors.push("PASSKEY_ANDROID_ORIGINS must contain reviewed android:apk-key-hash origins");
}

const firebaseWebConfig = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"];
const firebaseAdminConfig = ["FCM_PROJECT_ID", "FCM_CLIENT_EMAIL", "FCM_PRIVATE_KEY"];
if (firebaseAdminConfig.some(name => value(name))) for (const name of firebaseAdminConfig) required(name);
const firebasePrivateKey = value("FCM_PRIVATE_KEY").replace(/\\n/g, "\n");
if (firebasePrivateKey && !/^-----BEGIN (?:RSA )?PRIVATE KEY-----\n[\s\S]+\n-----END (?:RSA )?PRIVATE KEY-----$/.test(firebasePrivateKey)) {
  errors.push("FCM_PRIVATE_KEY must be a PEM private key; Railway literal \\\\n line breaks are supported");
}
if (firebaseWebConfig.some(name => value(name))) for (const name of firebaseWebConfig) required(name);
// This validator is exclusively for live Production, never the isolated TEST service.
for (const name of ["STAGING", "OTP_TEST_MODE", "OTP_EXPOSE_IN_RESPONSE"]) {
  if (value(name) && value(name).toLowerCase() !== "false") errors.push(`${name} must be absent or false in Production`);
}
for (const name of ["OTP_TEST_CODE", "OTP_TEST_PHONES"]) if (value(name)) errors.push(`${name} must be absent in Production`);
const evolutionNames = ["EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE"];
if (futureAuth || evolutionNames.some(name => value(name))) {
  for (const name of evolutionNames) required(name);
  httpsUrl("EVOLUTION_API_URL");
  try { const url = new URL(value("EVOLUTION_API_URL")); if (url.username || url.password || url.search || url.hash) errors.push("EVOLUTION_API_URL contains forbidden URL components"); } catch {}
  if (!/^[A-Za-z0-9_.-]{1,120}$/.test(value("EVOLUTION_INSTANCE"))) errors.push("EVOLUTION_INSTANCE has invalid syntax");
}
for (const [name, min, max] of [["OTP_TTL_SECONDS", 60, 900], ["OTP_RESEND_COOLDOWN_SECONDS", 30, 300], ["OTP_MAX_ATTEMPTS", 1, 10]]) {
  if (value(name) && (!Number.isInteger(Number(value(name))) || Number(value(name)) < min || Number(value(name)) > max)) errors.push(`${name} is outside its allowed integer range`);
}
if (futureAuth && passkeyAndroidOrigins.includes("android:apk-key-hash:2wLB6Ar-rc3goPV-Syud8oWJd5Ipu78bFhJ-gRQc5TA")) errors.push("PASSKEY_ANDROID_ORIGINS contains the TEST debug signing origin; release review required");
const storageConfig = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL"];
if (storageConfig.some(name => value(name)) || value("R2_PRIVATE_BUCKET_NAME")) {
  for (const name of storageConfig) required(name);
  httpsUrl("R2_ENDPOINT");
  // This is the R2/CDN delivery origin used by getPublicUrl(), not the public-site host.
  httpsUrl("R2_PUBLIC_BASE_URL", "media.popwam.com");
}
for (const [flag, names] of [
  ["TIKTOK_ENABLED", ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"]],
  ["GOOGLE_CONNECTED_ENABLED", ["GOOGLE_CONNECTED_CLIENT_ID", "GOOGLE_CONNECTED_CLIENT_SECRET", "GOOGLE_CONNECTED_REDIRECT_URI"]],
  ["LINKEDIN_ENABLED", ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI"]],
  ["GITHUB_ENABLED", ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_REDIRECT_URI"]],
]) if (value(flag).toLowerCase() === "true") for (const name of [...names, "INTEGRATION_TOKEN_ENCRYPTION_KEY"]) required(name);

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
