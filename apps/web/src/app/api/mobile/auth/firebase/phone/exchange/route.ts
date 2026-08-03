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
    const body = await request.json().catch(() => ({})) as { deviceName?: unknown; contractVersion?: unknown; challengeId?: unknown };
    const contractVersion = body.contractVersion === 2 ? 2 : 1;
    const result = await resolveFirebasePhoneSession(
      { uid: proof.uid, phoneNumber: proof.phoneNumber },
      typeof body.deviceName === "string" ? body.deviceName.slice(0, 120) : undefined,
      request.headers.get("x-pop-app-version") || undefined,
      {
        contractVersion,
        challengeId: typeof body.challengeId === "string" ? body.challengeId.slice(0, 80) : undefined,
      },
    );
    if (result.enrollment) {
      return Response.json({ ok: true, ...result.enrollment, user: result.user, isNewAccount: true }, { headers: noStore });
    }
    return Response.json({
      ok: true,
      ...result.session,
      user: result.user,
      isNewAccount: result.isNewUser,
      ...(contractVersion === 2 ? {
        ...result.authentication,
      } : {}),
    }, { headers: noStore });
  } catch (error) {
    const code = error instanceof FirebaseIdentityError || error instanceof ExternalIdentityError
      ? error.code
      : error instanceof Error && error.message.startsWith("AUTH_CHALLENGE_")
        ? error.message
      : "FIREBASE_PHONE_EXCHANGE_UNAVAILABLE";
    const status = code === "FIREBASE_TOKEN_MISSING" || code === "FIREBASE_TOKEN_INVALID"
      ? 401
      : code === "FIREBASE_PHONE_IDENTITY_REQUIRED" || code === "FIREBASE_PHONE_INVALID"
        ? 403
        : code === "EXTERNAL_IDENTITY_CONFLICT" || code === "EXTERNAL_IDENTITY_REVOKED" || code === "POP_USER_UNAVAILABLE"
          ? 409
          : code === "AUTH_CHALLENGE_INVALID" ? 400
          : code === "AUTH_CHALLENGE_EXPIRED" ? 410
          : 503;
    return Response.json({ ok: false, error: code }, { status, headers: noStore });
  }
}
