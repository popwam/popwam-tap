import { createHash } from "node:crypto";
import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { ExternalIdentityError, resolveFirebasePhoneSession } from "@/lib/external-identity";
import {
  FirebaseIdentityError,
  firebaseIdTokenFromRequest,
  verifyFirebasePhoneIdToken,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" };

export async function POST(request: Request) {
  if (!authRequestAllowed(request, "firebase-phone-exchange-network", 12, 60_000)) {
    return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: noStore });
  }
  try {
    const proof = await verifyFirebasePhoneIdToken(firebaseIdTokenFromRequest(request));
    const subjectScope = createHash("sha256").update(proof.uid).digest("base64url").slice(0, 24);
    if (!authRequestAllowed(request, `firebase-phone-exchange-subject:${subjectScope}`, 6, 60_000)) {
      return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: noStore });
    }
    const body = await request.json().catch(() => ({})) as { deviceName?: unknown };
    const result = await resolveFirebasePhoneSession(
      { uid: proof.uid, phoneNumber: proof.phoneNumber },
      typeof body.deviceName === "string" ? body.deviceName.slice(0, 120) : undefined,
      request.headers.get("x-pop-app-version") || undefined,
    );
    return Response.json({ ok: true, ...result.session, user: result.user, isNewAccount: result.isNewUser }, { headers: noStore });
  } catch (error) {
    const code = error instanceof FirebaseIdentityError || error instanceof ExternalIdentityError
      ? error.code
      : "FIREBASE_PHONE_EXCHANGE_UNAVAILABLE";
    const status = code === "FIREBASE_TOKEN_MISSING" || code === "FIREBASE_TOKEN_INVALID"
      ? 401
      : code === "FIREBASE_PHONE_IDENTITY_REQUIRED" || code === "FIREBASE_PHONE_INVALID"
        ? 403
        : code === "EXTERNAL_IDENTITY_CONFLICT" || code === "EXTERNAL_IDENTITY_REVOKED" || code === "POP_USER_UNAVAILABLE"
          ? 409
          : 503;
    return Response.json({ ok: false, error: code }, { status, headers: noStore });
  }
}
