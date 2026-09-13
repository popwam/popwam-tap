import { OtpError } from "./evolution-otp-sender";
export const otpHeaders = { "cache-control": "no-store" };
export function otpFailure(error: unknown) {
  const failure = error instanceof OtpError ? error : new OtpError("OTP_UNAVAILABLE");
  return Response.json({ ok: false, error: failure.code, ...(failure.retryAfterSeconds ? { retryAfterSeconds: failure.retryAfterSeconds } : {}) },
    { status: failure.status, headers: { ...otpHeaders, ...(failure.retryAfterSeconds ? { "retry-after": String(failure.retryAfterSeconds) } : {}) } });
}
