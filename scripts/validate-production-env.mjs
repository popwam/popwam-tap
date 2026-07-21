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

for (const name of ["NEXTAUTH_SECRET", "MOBILE_TOKEN_SECRET", "OTP_PEPPER"]) strongSecret(name);
const secrets = [value("NEXTAUTH_SECRET"), value("MOBILE_TOKEN_SECRET"), value("OTP_PEPPER")].filter(Boolean);
if (new Set(secrets).size !== secrets.length) errors.push("NEXTAUTH_SECRET, MOBILE_TOKEN_SECRET and OTP_PEPPER must be distinct");

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

const smsProvider = value("SMS_PROVIDER").toLowerCase();
const booleanValue = name => ["true", "false"].includes(value(name).toLowerCase());
for (const name of ["STAGING", "OTP_TEST_MODE", "OTP_EXPOSE_IN_RESPONSE"]) if (value(name) && !booleanValue(name)) errors.push(`${name} must be true or false`);
const staging = value("STAGING").toLowerCase() === "true";
const otpTestMode = value("OTP_TEST_MODE").toLowerCase() === "true";
const otpExpose = value("OTP_EXPOSE_IN_RESPONSE").toLowerCase() === "true";
if (!['smsmisr', 'webhook'].includes(smsProvider)) errors.push("SMS_PROVIDER must be smsmisr or webhook in production");
if (smsProvider === "smsmisr") {
  for (const name of ["SMSMISR_ENVIRONMENT", "SMSMISR_USERNAME", "SMSMISR_PASSWORD", "SMSMISR_SENDER_TOKEN", "SMSMISR_TEMPLATE_TOKEN"]) required(name);
  httpsUrl("SMSMISR_BASE_URL", "smsmisr.com");
  if (!["1", "2"].includes(value("SMSMISR_ENVIRONMENT"))) errors.push("SMSMISR_ENVIRONMENT must be 1 (Live) or 2 (Test)");
  if (value("SMSMISR_ENVIRONMENT") === "2") console.warn("WARNING: SMSMISR_ENVIRONMENT=2 is Test mode, not Live delivery.");
}
if (smsProvider === "webhook") {
  httpsUrl("SMS_API_URL"); required("SMS_API_TOKEN"); required("SMS_SENDER_ID");
}

if (otpTestMode) {
  if (!staging) errors.push("OTP_TEST_MODE=true is forbidden on live production; set it only on an explicitly marked STAGING deployment");
  if (value("SMSMISR_ENVIRONMENT") !== "2") errors.push("OTP_TEST_MODE=true requires SMSMISR_ENVIRONMENT=2");
  const phones = value("OTP_TEST_PHONES").split(",").map(phone => phone.trim()).filter(Boolean);
  if (!phones.length || phones.some(phone => !/^\+[1-9]\d{7,14}$/.test(phone))) errors.push("OTP_TEST_PHONES must be a non-empty comma-separated list of normalized E.164 phone numbers");
  if (value("OTP_TEST_CODE") && !/^\d{6}$/.test(value("OTP_TEST_CODE"))) errors.push("OTP_TEST_CODE must be exactly 6 digits when provided");
}
if (otpExpose && !otpTestMode) errors.push("OTP_EXPOSE_IN_RESPONSE=true requires OTP_TEST_MODE=true");
if (otpExpose && !staging) errors.push("OTP_EXPOSE_IN_RESPONSE=true is forbidden on live production");

for (const name of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]) required(name);
httpsUrl("R2_ENDPOINT");
httpsUrl("R2_PUBLIC_BASE_URL", "go.popwam.com");

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
