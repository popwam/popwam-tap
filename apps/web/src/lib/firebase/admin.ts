import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";

export function normalizeFirebasePrivateKey(value: string | null | undefined) {
  return value?.trim().replace(/\\n/g, "\n") || "";
}

export function validFirebasePrivateKey(value: string | null | undefined) {
  return /^-----BEGIN (?:RSA )?PRIVATE KEY-----\n[\s\S]+\n-----END (?:RSA )?PRIVATE KEY-----$/.test(
    normalizeFirebasePrivateKey(value),
  );
}

function adminCredentials() {
  const projectId = process.env.FCM_PROJECT_ID?.trim();
  const clientEmail = process.env.FCM_CLIENT_EMAIL?.trim();
  const privateKey = normalizeFirebasePrivateKey(process.env.FCM_PRIVATE_KEY);
  return projectId && clientEmail && validFirebasePrivateKey(privateKey) ? { projectId, clientEmail, privateKey } : null;
}

export function getFirebaseAdminApp(): App {
  const credentials = adminCredentials();
  if (!credentials) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  return getApps().length ? getApp() : initializeApp({ credential: cert(credentials) });
}
