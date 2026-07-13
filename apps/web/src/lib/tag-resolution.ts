import type { DestinationType } from "@popwam/db";

export type TagResolutionInput = {
  status: "ACTIVE" | "PAUSED" | "LOST" | "DISABLED";
  activeDestination: null | { isActive: boolean; type: DestinationType; url: string; profileId?: string | null };
};

export function decideTagResolution(tag: TagResolutionInput) {
  if (tag.status !== "ACTIVE") return { kind: "status" as const, status: tag.status.toLowerCase() as "paused" | "lost" | "disabled" };
  const destination = tag.activeDestination;
  if (!destination?.isActive) return { kind: "unconfigured" as const };
  if (destination.type === "PROFILE") return destination.profileId ? { kind: "profile" as const, profileId: destination.profileId } : { kind: "unconfigured" as const };
  return { kind: "redirect" as const, url: destination.url };
}
