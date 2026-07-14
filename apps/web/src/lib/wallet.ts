import { createHmac, createSign } from "node:crypto";
import { PKPass } from "passkit-generator";

export type WalletCardData = {
  id: string;
  serialNumber: string;
  name: string;
  title?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  publicUrl: string;
  phone?: string | null;
  email?: string | null;
  updatedAt: Date;
};

const localized = (value: string) => ({ defaultValue: { language: "en-US", value } });
const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

export function buildGoogleWalletObject(data: WalletCardData, issuerId: string, classSuffix: string) {
  const objectId = `${issuerId}.${data.id.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  return {
    id: objectId,
    classId: `${issuerId}.${classSuffix}`,
    state: "ACTIVE",
    cardTitle: localized("POPWAM Tap"),
    header: localized(data.name),
    subheader: data.title ? localized(data.title) : undefined,
    barcode: { type: "QR_CODE", value: data.publicUrl, alternateText: data.publicUrl },
    hexBackgroundColor: "#111313",
    logo: data.avatarUrl ? { sourceUri: { uri: data.avatarUrl }, contentDescription: localized(data.name) } : undefined,
    textModulesData: [
      data.company ? { id: "company", header: "Company", body: data.company } : null,
      data.email ? { id: "email", header: "Email", body: data.email } : null,
      data.phone ? { id: "phone", header: "Phone", body: data.phone } : null,
      { id: "updated", header: "Last updated", body: data.updatedAt.toISOString().slice(0, 10) },
    ].filter(Boolean),
    linksModuleData: { uris: [{ id: "profile", uri: data.publicUrl, description: "Open POPWAM Tap profile" }] },
  };
}

export function signGoogleWalletJwt(data: WalletCardData, config: { issuerId: string; classSuffix: string; serviceAccountEmail: string; privateKey: string; origins: string[] }) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: config.serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: config.origins,
    payload: { genericObjects: [buildGoogleWalletObject(data, config.issuerId, config.classSuffix)] },
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  signer.end();
  const signature = signer.sign(config.privateKey.replace(/\\n/g, "\n")).toString("base64url");
  return `${header}.${claims}.${signature}`;
}

export function buildApplePassData(data: WalletCardData, config: { passTypeIdentifier: string; teamIdentifier: string; webServiceURL?: string; authenticationSecret?: string }) {
  const authenticationToken = config.webServiceURL && config.authenticationSecret
    ? createHmac("sha256", config.authenticationSecret).update(data.serialNumber).digest("base64url")
    : undefined;
  return {
    formatVersion: 1 as const,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    organizationName: "POPWAM Tap",
    description: `${data.name} digital identity`,
    serialNumber: data.serialNumber,
    logoText: "POPWAM Tap",
    foregroundColor: "rgb(245, 245, 245)",
    backgroundColor: "rgb(17, 19, 19)",
    labelColor: "rgb(180, 180, 180)",
    webServiceURL: config.webServiceURL,
    authenticationToken,
    generic: {
      primaryFields: [{ key: "name", label: "NAME", value: data.name }],
      secondaryFields: data.title ? [{ key: "title", label: "TITLE", value: data.title }] : [],
      auxiliaryFields: data.company ? [{ key: "company", label: "COMPANY", value: data.company }] : [],
      backFields: [
        { key: "profile", label: "PROFILE", value: data.publicUrl },
        ...(data.email ? [{ key: "email", label: "EMAIL", value: data.email }] : []),
        ...(data.phone ? [{ key: "phone", label: "PHONE", value: data.phone }] : []),
      ],
    },
  };
}

const requiredAppleEnv = ["APPLE_WALLET_PASS_TYPE_ID", "APPLE_WALLET_TEAM_ID", "APPLE_WALLET_SIGNER_CERT_BASE64", "APPLE_WALLET_SIGNER_KEY_BASE64", "APPLE_WALLET_WWDR_CERT_BASE64", "APPLE_WALLET_ICON_BASE64"] as const;

export function appleWalletConfigured(env: Record<string, string | undefined> = process.env) {
  return requiredAppleEnv.every(key => Boolean(env[key]));
}

export function googleWalletConfigured(env: Record<string, string | undefined> = process.env) {
  return ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_CLASS_SUFFIX", "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL", "GOOGLE_WALLET_PRIVATE_KEY"].every(key => Boolean(env[key]));
}

export function generateApplePkpass(data: WalletCardData) {
  if (!appleWalletConfigured()) throw new Error("APPLE_WALLET_NOT_CONFIGURED");
  const passData = buildApplePassData(data, {
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID!,
    teamIdentifier: process.env.APPLE_WALLET_TEAM_ID!,
    webServiceURL: process.env.APPLE_WALLET_WEB_SERVICE_URL,
    authenticationSecret: process.env.APPLE_WALLET_AUTH_SECRET,
  });
  const icon = Buffer.from(process.env.APPLE_WALLET_ICON_BASE64!, "base64");
  const pass = new PKPass(
    { "pass.json": Buffer.from(JSON.stringify(passData)), "icon.png": icon, "icon@2x.png": icon },
    {
      signerCert: Buffer.from(process.env.APPLE_WALLET_SIGNER_CERT_BASE64!, "base64"),
      signerKey: Buffer.from(process.env.APPLE_WALLET_SIGNER_KEY_BASE64!, "base64"),
      wwdr: Buffer.from(process.env.APPLE_WALLET_WWDR_CERT_BASE64!, "base64"),
      signerKeyPassphrase: process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE,
    },
  );
  pass.setBarcodes({ format: "PKBarcodeFormatQR", message: data.publicUrl, messageEncoding: "iso-8859-1", altText: data.publicUrl });
  return pass.getAsBuffer();
}
