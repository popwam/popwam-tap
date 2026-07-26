export type ProfileBackfillInput = {
  profileId: string;
  hasDisplayName: boolean;
  hasAbout: boolean;
  contactCount: number;
  directSocialCount: number;
  socialDestinationCount: number;
  linkCount: number;
  uploadCount: number;
  serviceCount: number;
  branchCount: number;
  unsupportedFieldCount: number;
};

export type ProfileModuleBackfillSummary = {
  profileId: string;
  mapped: string[];
  missing: string[];
  ambiguous: string[];
  duplicate: string[];
  unsupported: number;
};

export function summarizeProfileModuleBackfill(input: ProfileBackfillInput): ProfileModuleBackfillSummary {
  const mapped: string[] = [];
  const missing: string[] = [];
  const ambiguous: string[] = [];
  const duplicate: string[] = [];
  const add = (key: string, present: boolean) => (present ? mapped : missing).push(key);
  add("IDENTITY", input.hasDisplayName);
  add("ABOUT", input.hasAbout);
  add("CONTACT", input.contactCount > 0);
  add("SOCIAL", input.directSocialCount + input.socialDestinationCount > 0);
  add("LINKS", input.linkCount > 0);
  add("GALLERY", input.uploadCount > 0);
  add("SERVICES", input.serviceCount > 0);
  add("BRANCHES", input.branchCount > 0);
  if (input.directSocialCount > 0 && input.socialDestinationCount > 0) duplicate.push("SOCIAL");
  if (input.contactCount > 1) ambiguous.push("CONTACT");
  return { profileId: input.profileId, mapped, missing, ambiguous, duplicate, unsupported: input.unsupportedFieldCount };
}

export type PrimaryProfileCandidateInput = {
  userId: string;
  profiles: Array<{ id: string; isPrimary: boolean; createdAt: Date; virtualCardIds: string[]; defaultVirtualCard: boolean }>;
  defaultSharingCardId?: string | null;
};

export type PrimaryProfileCandidate = { userId: string; status: "CANDIDATE" | "AMBIGUOUS" | "MISSING"; profileId?: string; evidence: string[] };

export function selectPrimaryProfileCandidate(input: PrimaryProfileCandidateInput): PrimaryProfileCandidate {
  const evidence = new Map<string, string[]>();
  const note = (profileId: string, reason: string) => evidence.set(profileId, [...(evidence.get(profileId) || []), reason]);
  for (const profile of input.profiles) {
    if (profile.isPrimary) note(profile.id, "EXISTING_PRIMARY");
    if (profile.defaultVirtualCard) note(profile.id, "DEFAULT_VIRTUAL_CARD");
    if (input.defaultSharingCardId && profile.virtualCardIds.includes(input.defaultSharingCardId)) note(profile.id, "DEFAULT_SHARING_REFERENCE");
  }
  if (!evidence.size && input.profiles.length === 1) note(input.profiles[0].id, "ONLY_PROFILE");
  if (!evidence.size && input.profiles.length > 1) {
    const oldest = [...input.profiles].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (oldest.length && oldest[0].createdAt.getTime() < oldest[1].createdAt.getTime()) note(oldest[0].id, "UNIQUE_OLDEST_PROFILE");
  }
  if (evidence.size === 1) {
    const [profileId, reasons] = [...evidence.entries()][0];
    return { userId: input.userId, status: "CANDIDATE", profileId, evidence: reasons };
  }
  if (!evidence.size) return { userId: input.userId, status: "MISSING", evidence: [] };
  return { userId: input.userId, status: "AMBIGUOUS", evidence: [...evidence.values()].flat() };
}
