import { ProfileLifecycle, ProfileModuleVisibility } from "@popwam/db";

type PublicProfileState = { isPublic: boolean; profileKind: unknown; lifecycle: ProfileLifecycle };
type ModuleState = { enabled: boolean; visibility: ProfileModuleVisibility };

/** Legacy rows have no profileKind until reviewed/backfilled, so their existing
 * isPublic semantics remain the compatibility fallback. New canonical profiles
 * must be published before public projection is allowed. */
export function isPublicProfileReadable(profile: PublicProfileState) {
  return profile.isPublic && (profile.profileKind == null || profile.lifecycle === "PUBLISHED");
}

export function isPublicModuleReadable(module: ModuleState) {
  return module.enabled && module.visibility === "PUBLIC";
}
