import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

export type VerifiedFirebaseIdentity = {
  uid: string;
  signInProvider: string | null;
  authTime: number | null;
  issuedAt: number | null;
};

export type FirebaseTokenVerifier = (token: string) => Promise<Pick<DecodedIdToken, "uid" | "auth_time" | "iat"> & { firebase?: { sign_in_provider?: unknown } }>;
export type FirebasePhoneTokenVerifier = (token: string) => Promise<{
  claims: Pick<DecodedIdToken, "uid" | "auth_time" | "iat"> & { firebase?: { sign_in_provider?: unknown } };
  phoneNumber: string | null;
}>;

export class FirebaseIdentityError extends Error {
  constructor(readonly code:
    | "FIREBASE_TOKEN_MISSING"
    | "FIREBASE_TOKEN_INVALID"
    | "FIREBASE_ADMIN_UNAVAILABLE"
    | "FIREBASE_PHONE_IDENTITY_REQUIRED"
  ) {
    super(code);
  }
}

function adminCredentials() {
  const projectId = process.env.FCM_PROJECT_ID?.trim();
  const clientEmail = process.env.FCM_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return projectId && clientEmail && privateKey ? { projectId, clientEmail, privateKey } : null;
}

export function getFirebaseAdminApp(): App {
  const credentials = adminCredentials();
  if (!credentials) throw new FirebaseIdentityError("FIREBASE_ADMIN_UNAVAILABLE");
  return getApps().length ? getApp() : initializeApp({ credential: cert(credentials) });
}

async function verifyWithFirebaseAdmin(token: string) {
  return getAuth(getFirebaseAdminApp()).verifyIdToken(token, true);
}

async function verifyPhoneWithFirebaseAdmin(token: string) {
  const auth = getAuth(getFirebaseAdminApp());
  const claims = await auth.verifyIdToken(token, true);
  const user = await auth.getUser(claims.uid);
  return { claims, phoneNumber: user.phoneNumber || null };
}

export async function verifyFirebaseIdToken(token: string | null | undefined, verifier: FirebaseTokenVerifier = verifyWithFirebaseAdmin): Promise<VerifiedFirebaseIdentity> {
  if (!token?.trim()) throw new FirebaseIdentityError("FIREBASE_TOKEN_MISSING");
  if (token.length > 16_384 || token.split(".").length !== 3) throw new FirebaseIdentityError("FIREBASE_TOKEN_INVALID");
  try {
    const claims = await verifier(token);
    if (!claims.uid || typeof claims.uid !== "string") throw new FirebaseIdentityError("FIREBASE_TOKEN_INVALID");
    return {
      uid: claims.uid,
      signInProvider: typeof claims.firebase?.sign_in_provider === "string" ? claims.firebase.sign_in_provider : null,
      authTime: typeof claims.auth_time === "number" ? claims.auth_time : null,
      issuedAt: typeof claims.iat === "number" ? claims.iat : null,
    };
  } catch (error) {
    if (error instanceof FirebaseIdentityError) throw error;
    throw new FirebaseIdentityError("FIREBASE_TOKEN_INVALID");
  }
}

/**
 * Verifies Firebase proof with the Admin SDK and derives the phone from the
 * server-side Firebase user record. No client-supplied phone participates in
 * POP identity resolution.
 */
export async function verifyFirebasePhoneIdToken(
  token: string | null | undefined,
  verifier: FirebasePhoneTokenVerifier = verifyPhoneWithFirebaseAdmin,
) {
  if (!token?.trim()) throw new FirebaseIdentityError("FIREBASE_TOKEN_MISSING");
  if (token.length > 16_384 || token.split(".").length !== 3) throw new FirebaseIdentityError("FIREBASE_TOKEN_INVALID");
  try {
    const result = await verifier(token);
    const provider = typeof result.claims.firebase?.sign_in_provider === "string"
      ? result.claims.firebase.sign_in_provider
      : null;
    if (!result.claims.uid || typeof result.claims.uid !== "string") throw new FirebaseIdentityError("FIREBASE_TOKEN_INVALID");
    if (provider !== "phone" || !result.phoneNumber) throw new FirebaseIdentityError("FIREBASE_PHONE_IDENTITY_REQUIRED");
    return {
      uid: result.claims.uid,
      phoneNumber: result.phoneNumber,
      signInProvider: provider,
      authTime: typeof result.claims.auth_time === "number" ? result.claims.auth_time : null,
      issuedAt: typeof result.claims.iat === "number" ? result.claims.iat : null,
    };
  } catch (error) {
    if (error instanceof FirebaseIdentityError) throw error;
    throw new FirebaseIdentityError("FIREBASE_TOKEN_INVALID");
  }
}

export function firebaseIdTokenFromRequest(request: Request) {
  return request.headers.get("x-firebase-id-token")?.trim() || null;
}
