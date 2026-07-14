const errors = [];
const value = name => process.env[name]?.trim() || "";
const required = name => { if (!value(name)) errors.push(`${name} is required`); };
const httpsUrl = (name, expectedHost) => {
  try {
    const url = new URL(value(name));
    if (url.protocol !== "https:" || (expectedHost && url.hostname !== expectedHost)) errors.push(`${name} must use https://${expectedHost || "..."}`);
  } catch { errors.push(`${name} must be a valid HTTPS URL`); }
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

httpsUrl("NEXTAUTH_URL", "app.popwam.com");
httpsUrl("NEXT_PUBLIC_APP_URL", "go.popwam.com");
if (value("APP_HOST") !== "app.popwam.com") errors.push("APP_HOST must be app.popwam.com");
if (value("PUBLIC_HOST") !== "go.popwam.com") errors.push("PUBLIC_HOST must be go.popwam.com");

if (value("SMS_PROVIDER").toLowerCase() !== "webhook") errors.push("SMS_PROVIDER must be webhook in production");
httpsUrl("SMS_API_URL"); required("SMS_API_TOKEN"); required("SMS_SENDER_ID");

for (const name of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]) required(name);
httpsUrl("R2_ENDPOINT");
httpsUrl("R2_PUBLIC_BASE_URL", "media.popwam.com");

const googleId = value("GOOGLE_CLIENT_ID"); const googleSecret = value("GOOGLE_CLIENT_SECRET");
if (Boolean(googleId) !== Boolean(googleSecret)) errors.push("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must either both be set or both be empty");

if (errors.length) {
  console.error("Production environment validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Production environment validation passed (secret values were not printed).");
