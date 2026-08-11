import type { ProfileVerificationKind, ProfileVerificationStatus } from "@popwam/db";
import { profileFieldCapabilities, type CanonicalProfileKind } from "./profile-data-capabilities";

export type ProfileCompletionIssue = {
  code: string;
  path: string;
  fieldKey?: string;
  messageKey: string;
};

type CompletionProfile = {
  displayName: string;
  profileKind: CanonicalProfileKind | null;
  type: "PERSONAL" | "ORGANIZATION";
  category?: { slug: string } | null;
  jobTitleAr?: string | null;
  jobTitleEn?: string | null;
  profession?: string | null;
  customProfession?: string | null;
  organizationNameAr?: string | null;
  organizationNameEn?: string | null;
  sectionEntries: Array<{ fieldKey: string; value: unknown }>;
};

/** Content completion is intentionally independent from visibility,
 * publication lifecycle, subscription, and verification state. */
export function evaluateProfileCompletion(profile: CompletionProfile) {
  const kind: CanonicalProfileKind = profile.profileKind || (profile.type === "ORGANIZATION" ? "BUSINESS" : "PERSONAL");
  const categoryKey = profile.category?.slug || null;
  const issues: ProfileCompletionIssue[] = [];
  const issue = (code: string, path: string, fieldKey?: string) => issues.push({ code, path, fieldKey, messageKey: `completion.issue.${code.toLowerCase()}` });
  if (!profile.displayName.trim()) issue("DISPLAY_NAME_REQUIRED", "identity.displayName");
  if (kind === "BUSINESS" && !profile.organizationNameAr?.trim() && !profile.organizationNameEn?.trim() && !profile.displayName.trim()) {
    issue("ORGANIZATION_NAME_REQUIRED", "identity.organizationName");
  }
  if (["freelancer", "professional"].includes(categoryKey || "")
    && profile.profession === "PERSONAL"
    && !profile.customProfession?.trim()
    && !profile.jobTitleAr?.trim()
    && !profile.jobTitleEn?.trim()) {
    issue("PROFESSION_REQUIRED", "identity.profession");
  }
  const populated = new Set(profile.sectionEntries.map((entry) => entry.fieldKey));
  for (const capability of profileFieldCapabilities(kind, categoryKey, "en")) {
    if (!capability.requiredForCompletion) continue;
    if (!populated.has(capability.key)) issue("FIELD_REQUIRED", `structuredEntries.${capability.key}`, capability.key);
  }
  return { complete: issues.length === 0, issues };
}

export type VerificationCaseProjectionSource = {
  kind: ProfileVerificationKind;
  status: ProfileVerificationStatus;
  reasonCode: string | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
};

function verificationKinds(kind: CanonicalProfileKind, categoryKey: string | null): ProfileVerificationKind[] {
  if (categoryKey === "clinic") return ["IDENTITY", "BUSINESS", "MEDICAL"];
  if (categoryKey === "professional" || categoryKey === "freelancer") return ["IDENTITY", "PROFESSIONAL"];
  if (kind === "BUSINESS") return ["BUSINESS"];
  return ["IDENTITY"];
}

const verificationPriority: ProfileVerificationStatus[] = [
  "REJECTED", "NEEDS_UPDATE", "EXPIRED", "PENDING", "IN_PROGRESS", "REQUIRED", "NOT_STARTED", "VERIFIED",
];

/** Only public-safe status metadata leaves the trust boundary. Evidence and
 * provider references are deliberately absent from this projection. */
export function buildVerificationProjection(kind: CanonicalProfileKind, categoryKey: string | null, cases: VerificationCaseProjectionSource[], now = new Date()) {
  const byKind = new Map(cases.map((entry) => [entry.kind, entry]));
  const signals = verificationKinds(kind, categoryKey).map((signalKind) => {
    const record = byKind.get(signalKind);
    const expired = Boolean(record?.expiresAt && record.expiresAt <= now);
    const status: ProfileVerificationStatus = expired && record?.status === "VERIFIED" ? "EXPIRED" : record?.status || "NOT_STARTED";
    return {
      kind: signalKind,
      status,
      verifiedAt: status === "VERIFIED" ? record?.verifiedAt?.toISOString() || null : null,
      expiresAt: record?.expiresAt?.toISOString() || null,
      reasonCode: ["REJECTED", "NEEDS_UPDATE"].includes(status) ? record?.reasonCode || null : null,
      publicBadge: status === "VERIFIED",
    };
  });
  const overallStatus = signals.every((signal) => signal.status === "VERIFIED")
    ? "VERIFIED"
    : verificationPriority.find((status) => signals.some((signal) => signal.status === status)) || "NOT_STARTED";
  return { submissionSupported: false, overallStatus, signals };
}

export function verificationTransitionDecision(actor: "OWNER" | "ADMIN" | "PROVIDER" | "SYSTEM", target: ProfileVerificationStatus) {
  if (actor === "OWNER") return { allowed: false, error: "VERIFICATION_SERVER_AUTHORITY_REQUIRED" } as const;
  if (target === "VERIFIED" && actor !== "ADMIN" && actor !== "PROVIDER") {
    return { allowed: false, error: "VERIFICATION_REVIEW_AUTHORITY_REQUIRED" } as const;
  }
  return { allowed: true } as const;
}
