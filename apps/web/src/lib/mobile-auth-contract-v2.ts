export const MOBILE_AUTH_CONTRACT_VERSION = 2 as const;

export type MobileAccountState = "UNKNOWN" | "NEW" | "RETURNING";
export type MobileAuthMethod = "PHONE_OTP" | "PASSKEY" | "BIOMETRIC_DEVICE_CREDENTIAL";
export type MobileSessionScope = "NONE" | "ENROLLMENT" | "FULL";
export type MobilePasskeyRequirement = "NOT_REQUIRED" | "AVAILABLE" | "REQUIRED";
export type MobileBiometricEnrollmentPolicy = "REQUIRED_WHEN_AVAILABLE";
export type MobileAuthNextAction =
  | "VERIFY_OTP"
  | "AUTHENTICATE_PASSKEY"
  | "AUTHENTICATE_BIOMETRIC"
  | "ENROLL_PASSKEY"
  | "ENROLL_BIOMETRIC"
  | "ACCOUNT_CREATED"
  | "PROFILE_SETUP"
  | "AUTHENTICATED"
  | "RECOVERY_REQUIRED"
  | "BLOCKED";

export type MobileOtpConfiguration = {
  codeLength: number;
  expiresAfterSeconds: number;
  resendAfterSeconds: number;
  maximumAttempts: number;
  automaticSubmissionAllowed: boolean;
};

export type MobileAuthChallenge = {
  contractVersion: typeof MOBILE_AUTH_CONTRACT_VERSION;
  challengeId: string;
  accountState: MobileAccountState;
  allowedMethods: MobileAuthMethod[];
  preferredMethod: MobileAuthMethod;
  otpConfiguration: MobileOtpConfiguration | null;
  passkeyRequirement: MobilePasskeyRequirement;
  biometricEnrollmentPolicy: MobileBiometricEnrollmentPolicy;
  sessionScope: MobileSessionScope;
  nextAction: MobileAuthNextAction;
  expiresAt: string;
};

export type MobileEnrollmentView = MobileAuthChallenge & {
  enrollmentSession?: { token: string; expiresAt: string };
};

export function nextEnrollmentAction(input: {
  passkeyEnrolled: boolean;
  biometricOutcome: "ENROLLED" | "UNAVAILABLE" | null;
}): MobileAuthNextAction {
  if (!input.passkeyEnrolled) return "ENROLL_PASSKEY";
  if (!input.biometricOutcome) return "ENROLL_BIOMETRIC";
  return "ACCOUNT_CREATED";
}

export function sessionScopeForNextAction(nextAction: MobileAuthNextAction): MobileSessionScope {
  if (nextAction === "AUTHENTICATED" || nextAction === "PROFILE_SETUP") return "FULL";
  if (["ENROLL_PASSKEY", "ENROLL_BIOMETRIC", "ACCOUNT_CREATED"].includes(nextAction)) return "ENROLLMENT";
  return "NONE";
}

export const firebaseOtpConfiguration = (): MobileOtpConfiguration => ({
  codeLength: 6,
  expiresAfterSeconds: 300,
  resendAfterSeconds: 60,
  maximumAttempts: 5,
  automaticSubmissionAllowed: true,
});

