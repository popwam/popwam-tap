export const OTP_EXPIRY_MINUTES = 5;
export const OTP_RESEND_SECONDS = 60;
export const OTP_HOURLY_SEND_LIMIT = 5;
export const OTP_MAX_ATTEMPTS = 10;

export function otpPolicyFromEnv() {
  return {
    expiryMinutes: Math.min(OTP_EXPIRY_MINUTES, Math.max(3, Number(process.env.OTP_EXPIRY_MINUTES || OTP_EXPIRY_MINUTES))),
    resendSeconds: Math.max(OTP_RESEND_SECONDS, Number(process.env.OTP_SEND_COOLDOWN_SECONDS || OTP_RESEND_SECONDS)),
    hourlySendLimit: Math.min(OTP_HOURLY_SEND_LIMIT, Math.max(1, Number(process.env.OTP_HOURLY_SEND_LIMIT || OTP_HOURLY_SEND_LIMIT))),
    maxAttempts: Math.min(OTP_MAX_ATTEMPTS, Math.max(1, Number(process.env.OTP_MAX_ATTEMPTS || OTP_MAX_ATTEMPTS))),
  };
}

export function isOtpUsable(challenge: { consumedAt: Date | null; expiresAt: Date; attempts: number; maxAttempts: number }, now = new Date()) {
  if (challenge.consumedAt) return "USED" as const;
  if (challenge.expiresAt <= now) return "EXPIRED" as const;
  if (challenge.attempts >= challenge.maxAttempts) return "RATE_LIMITED" as const;
  return "VALID" as const;
}
