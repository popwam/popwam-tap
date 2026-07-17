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
    cardTitle: localized("POP by POPWAM"),
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
    linksModuleData: { uris: [{ id: "profile", uri: data.publicUrl, description: "Open POP by POPWAM profile" }] },
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
    organizationName: "POP by POPWAM",
    description: `${data.name} digital identity`,
    serialNumber: data.serialNumber,
    logoText: "POP by POPWAM",
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

export type WalletReadinessItem = { key:string;label:string;configured:boolean;detail:string };
export function googleWalletReadiness(env: Record<string,string|undefined> = process.env) {
  const items:WalletReadinessItem[] = [
    {key:"issuerStatus",label:"Issuer account status",configured:Boolean(env.GOOGLE_WALLET_ISSUER_STATUS),detail:env.GOOGLE_WALLET_ISSUER_STATUS || "Not confirmed"},
    {key:"issuerId",label:"Issuer ID",configured:Boolean(env.GOOGLE_WALLET_ISSUER_ID),detail:env.GOOGLE_WALLET_ISSUER_ID ? "Configured" : "GOOGLE_WALLET_ISSUER_ID is missing"},
    {key:"serviceAccount",label:"Service account",configured:Boolean(env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_WALLET_PRIVATE_KEY),detail:env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_WALLET_PRIVATE_KEY ? "Signing credentials configured" : "Service account email or private key is missing"},
    {key:"genericClass",label:"Generic Pass class",configured:Boolean(env.GOOGLE_WALLET_CLASS_SUFFIX),detail:env.GOOGLE_WALLET_CLASS_SUFFIX ? "Configured" : "GOOGLE_WALLET_CLASS_SUFFIX is missing"},
    {key:"mode",label:"Mode",configured:true,detail:(env.GOOGLE_WALLET_MODE || "test").toLowerCase() === "production" ? "Production" : "Test"},
  ];
  return { ready: googleWalletConfigured(env), items };
}

export function appleWalletReadiness(env: Record<string,string|undefined> = process.env) {
  const items:WalletReadinessItem[] = [
    {key:"membership",label:"Apple Developer membership",configured:Boolean(env.APPLE_WALLET_TEAM_ID),detail:env.APPLE_WALLET_TEAM_ID ? "Team configured" : "APPLE_WALLET_TEAM_ID is missing"},
    {key:"passTypeId",label:"Pass Type ID",configured:Boolean(env.APPLE_WALLET_PASS_TYPE_ID),detail:env.APPLE_WALLET_PASS_TYPE_ID ? "Configured" : "APPLE_WALLET_PASS_TYPE_ID is missing"},
    {key:"signingCertificate",label:"Signing certificate",configured:Boolean(env.APPLE_WALLET_SIGNER_CERT_BASE64 && env.APPLE_WALLET_SIGNER_KEY_BASE64),detail:env.APPLE_WALLET_SIGNER_CERT_BASE64 && env.APPLE_WALLET_SIGNER_KEY_BASE64 ? "Certificate and key configured" : "Signing certificate or key is missing"},
    {key:"wwdr",label:"WWDR certificate",configured:Boolean(env.APPLE_WALLET_WWDR_CERT_BASE64),detail:env.APPLE_WALLET_WWDR_CERT_BASE64 ? "Configured" : "APPLE_WALLET_WWDR_CERT_BASE64 is missing"},
    {key:"webService",label:"webServiceURL",configured:Boolean(env.APPLE_WALLET_WEB_SERVICE_URL),detail:env.APPLE_WALLET_WEB_SERVICE_URL || "Optional updates service is not configured"},
    {key:"authenticationToken",label:"Authentication token secret",configured:Boolean(env.APPLE_WALLET_AUTH_SECRET),detail:env.APPLE_WALLET_AUTH_SECRET ? "Configured" : "Required when webServiceURL is enabled"},
  ];
  return { ready: appleWalletConfigured(env), items };
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
