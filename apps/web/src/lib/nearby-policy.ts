export const NEARBY_CONFIG_KEY = "nearby.runtime.v1";
export const NEARBY_CELL_VERSION = 1;
export const NEARBY_SESSION_TOKEN_BYTES = 32;
export const NEARBY_HARD_DELETE_AFTER_MS = 24 * 60 * 60_000;

export const nearbyRolloutStates = ["DISABLED", "INTERNAL", "LIMITED", "ENABLED"] as const;
export type NearbyRolloutState = typeof nearbyRolloutStates[number];

export const nearbyProximityBands = ["SAME_AREA", "NEARBY_AREA", "AROUND_THIS_AREA"] as const;
export type NearbyProximityBand = typeof nearbyProximityBands[number];

export type NearbyFeatureConfig = {
  version: 1;
  rolloutState: NearbyRolloutState;
  presenceEnabled: boolean;
  discoveryEnabled: boolean;
  limitedPercentage: number;
  cellPrecision: 6;
  neighborRing: 1 | 2;
  presenceTtlSeconds: number;
  heartbeatMinSeconds: number;
  maxResults: number;
  minimumCrowdSize: number;
  presenceUpdatesPerWindow: number;
  presenceWindowSeconds: number;
  discoveryRequestsPerWindow: number;
  discoveryWindowSeconds: number;
  enableRequestsPerWindow: number;
  enableWindowSeconds: number;
  maxCellChangesPerWindow: number;
  cellChangeWindowSeconds: number;
};

function integer(value: unknown, minimum: number, maximum: number) {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum ? Number(value) : null;
}

/** Runtime configuration is deliberately strict. A missing, partial, unknown,
 * or out-of-range document resolves to null and therefore turns Nearby off. */
export function parseNearbyFeatureConfig(value: unknown): NearbyFeatureConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set([
    "version", "rolloutState", "presenceEnabled", "discoveryEnabled", "limitedPercentage",
    "cellPrecision", "neighborRing", "presenceTtlSeconds", "heartbeatMinSeconds", "maxResults",
    "minimumCrowdSize", "presenceUpdatesPerWindow", "presenceWindowSeconds",
    "discoveryRequestsPerWindow", "discoveryWindowSeconds", "enableRequestsPerWindow",
    "enableWindowSeconds", "maxCellChangesPerWindow", "cellChangeWindowSeconds",
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;
  if (input.version !== 1 || typeof input.rolloutState !== "string" || !nearbyRolloutStates.includes(input.rolloutState as never)) return null;
  if (typeof input.presenceEnabled !== "boolean" || typeof input.discoveryEnabled !== "boolean") return null;
  const limitedPercentage = integer(input.limitedPercentage, 0, 100);
  const cellPrecision = integer(input.cellPrecision, 6, 6);
  const neighborRing = integer(input.neighborRing, 1, 2);
  const presenceTtlSeconds = integer(input.presenceTtlSeconds, 300, 900);
  const heartbeatMinSeconds = integer(input.heartbeatMinSeconds, 60, 180);
  const maxResults = integer(input.maxResults, 5, 30);
  const minimumCrowdSize = integer(input.minimumCrowdSize, 2, 5);
  const presenceUpdatesPerWindow = integer(input.presenceUpdatesPerWindow, 4, 30);
  const presenceWindowSeconds = integer(input.presenceWindowSeconds, 300, 3600);
  const discoveryRequestsPerWindow = integer(input.discoveryRequestsPerWindow, 5, 120);
  const discoveryWindowSeconds = integer(input.discoveryWindowSeconds, 300, 3600);
  const enableRequestsPerWindow = integer(input.enableRequestsPerWindow, 2, 12);
  const enableWindowSeconds = integer(input.enableWindowSeconds, 600, 86_400);
  const maxCellChangesPerWindow = integer(input.maxCellChangesPerWindow, 1, 6);
  const cellChangeWindowSeconds = integer(input.cellChangeWindowSeconds, 300, 3600);
  if ([limitedPercentage, cellPrecision, neighborRing, presenceTtlSeconds, heartbeatMinSeconds, maxResults, minimumCrowdSize, presenceUpdatesPerWindow, presenceWindowSeconds, discoveryRequestsPerWindow, discoveryWindowSeconds, enableRequestsPerWindow, enableWindowSeconds, maxCellChangesPerWindow, cellChangeWindowSeconds].some((item) => item == null)) return null;
  if (heartbeatMinSeconds! >= presenceTtlSeconds!) return null;
  return {
    version: 1,
    rolloutState: input.rolloutState as NearbyRolloutState,
    presenceEnabled: input.presenceEnabled,
    discoveryEnabled: input.discoveryEnabled,
    limitedPercentage: limitedPercentage!,
    cellPrecision: cellPrecision! as 6,
    neighborRing: neighborRing! as 1 | 2,
    presenceTtlSeconds: presenceTtlSeconds!,
    heartbeatMinSeconds: heartbeatMinSeconds!,
    maxResults: maxResults!,
    minimumCrowdSize: minimumCrowdSize!,
    presenceUpdatesPerWindow: presenceUpdatesPerWindow!,
    presenceWindowSeconds: presenceWindowSeconds!,
    discoveryRequestsPerWindow: discoveryRequestsPerWindow!,
    discoveryWindowSeconds: discoveryWindowSeconds!,
    enableRequestsPerWindow: enableRequestsPerWindow!,
    enableWindowSeconds: enableWindowSeconds!,
    maxCellChangesPerWindow: maxCellChangesPerWindow!,
    cellChangeWindowSeconds: cellChangeWindowSeconds!,
  };
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function nearbyRolloutEligible(config: NearbyFeatureConfig | null, user: { id: string; role: string }) {
  if (!config || config.rolloutState === "DISABLED") return false;
  if (config.rolloutState === "ENABLED") return true;
  if (config.rolloutState === "INTERNAL") return user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "STAFF";
  return stableHash(`nearby-rollout:${user.id}`) % 100 < config.limitedPercentage;
}

export function nearbyFeatureDecision(config: NearbyFeatureConfig | null, user: { id: string; role: string }) {
  if (!config) return { state: "UNAVAILABLE" as const, available: false, presenceEnabled: false, discoveryEnabled: false };
  if (!nearbyRolloutEligible(config, user)) {
    return {
      state: config.rolloutState === "DISABLED" ? "DISABLED" as const : "ROLLOUT_UNAVAILABLE" as const,
      available: false,
      presenceEnabled: false,
      discoveryEnabled: false,
    };
  }
  const available = config.presenceEnabled || config.discoveryEnabled;
  return {
    state: available ? "AVAILABLE" as const : "DISABLED" as const,
    available,
    presenceEnabled: config.presenceEnabled,
    discoveryEnabled: config.discoveryEnabled,
  };
}

export function validCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === "number"
    && typeof longitude === "number"
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

export type NearbyPresenceInput =
  | { action: "ENABLE"; latitude: number; longitude: number }
  | { action: "REFRESH"; latitude: number; longitude: number; generation: number; sessionToken: string };

export function parseNearbyPresenceInput(value: unknown): NearbyPresenceInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set(["action", "latitude", "longitude", "generation", "sessionToken"]);
  if (Object.keys(input).some((key) => !allowed.has(key)) || !validCoordinate(input.latitude, input.longitude)) return null;
  if (input.action === "ENABLE") {
    if ("generation" in input || "sessionToken" in input) return null;
    return { action: "ENABLE", latitude: input.latitude, longitude: input.longitude as number };
  }
  if (input.action !== "REFRESH" || !Number.isInteger(input.generation) || Number(input.generation) < 1 || Number(input.generation) > 2_147_483_647) return null;
  if (typeof input.sessionToken !== "string" || !/^[A-Za-z0-9_-]{40,120}$/.test(input.sessionToken)) return null;
  return {
    action: "REFRESH",
    latitude: input.latitude,
    longitude: input.longitude as number,
    generation: Number(input.generation),
    sessionToken: input.sessionToken,
  };
}

const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function encodeNearbyCell(latitude: number, longitude: number, precision: 6 = 6) {
  if (!validCoordinate(latitude, longitude)) throw new Error("NEARBY_LOCATION_INVALID");
  let latitudeRange: [number, number] = [-90, 90];
  let longitudeRange: [number, number] = [-180, 180];
  let even = true;
  let bit = 0;
  let character = 0;
  let result = "";
  while (result.length < precision) {
    const range = even ? longitudeRange : latitudeRange;
    const value = even ? longitude : latitude;
    const midpoint = (range[0] + range[1]) / 2;
    if (value >= midpoint) {
      character |= 1 << (4 - bit);
      range[0] = midpoint;
    } else {
      range[1] = midpoint;
    }
    even = !even;
    if (bit < 4) bit += 1;
    else {
      result += GEOHASH_BASE32[character];
      bit = 0;
      character = 0;
    }
  }
  return result;
}

export function decodeNearbyCellBounds(cell: string) {
  if (!/^[0-9bcdefghjkmnpqrstuvwxyz]{6}$/.test(cell)) throw new Error("NEARBY_CELL_INVALID");
  let latitude: [number, number] = [-90, 90];
  let longitude: [number, number] = [-180, 180];
  let even = true;
  for (const character of cell) {
    const value = GEOHASH_BASE32.indexOf(character);
    for (let mask = 16; mask >= 1; mask >>= 1) {
      const range = even ? longitude : latitude;
      const midpoint = (range[0] + range[1]) / 2;
      if (value & mask) range[0] = midpoint;
      else range[1] = midpoint;
      even = !even;
    }
  }
  return { latitude, longitude };
}

function wrapLongitude(value: number) {
  if (value > 180) return value - 360;
  if (value < -180) return value + 360;
  return value;
}

export function nearbyCellNeighborhood(cell: string, ring: 1 | 2) {
  const bounds = decodeNearbyCellBounds(cell);
  const latitudeStep = bounds.latitude[1] - bounds.latitude[0];
  const longitudeStep = bounds.longitude[1] - bounds.longitude[0];
  const centerLatitude = (bounds.latitude[0] + bounds.latitude[1]) / 2;
  const centerLongitude = (bounds.longitude[0] + bounds.longitude[1]) / 2;
  const cells = new Map<string, NearbyProximityBand>();
  for (let y = -ring; y <= ring; y += 1) {
    for (let x = -ring; x <= ring; x += 1) {
      const latitude = Math.max(-89.999999, Math.min(89.999999, centerLatitude + y * latitudeStep));
      const longitude = wrapLongitude(centerLongitude + x * longitudeStep);
      const neighbor = encodeNearbyCell(latitude, longitude);
      const distance = Math.max(Math.abs(x), Math.abs(y));
      cells.set(neighbor, distance === 0 ? "SAME_AREA" : distance === 1 ? "NEARBY_AREA" : "AROUND_THIS_AREA");
    }
  }
  return cells;
}

export function nearbyPreferenceEffectivelyEnabled(preference: {
  enabled: boolean;
  discoverable: boolean;
  generation: number;
  activatedAt: Date | null;
} | null | undefined) {
  return Boolean(preference?.enabled && preference.discoverable && preference.generation > 0 && preference.activatedAt);
}

export function nearbyPresenceActive(input: {
  preferenceEnabled: boolean;
  presenceGeneration: number | null;
  preferenceGeneration: number;
  expiresAt: Date | null;
  now?: Date;
}) {
  const now = input.now || new Date();
  return input.preferenceEnabled
    && input.presenceGeneration === input.preferenceGeneration
    && Boolean(input.expiresAt && input.expiresAt > now);
}

export function nextNearbyGeneration(current: number) {
  return current >= 2_147_483_646 ? 1 : current + 1;
}

export function rateLimitWindow(
  current: { windowStart: Date; count: number } | null,
  now: Date,
  windowSeconds: number,
  limit: number,
) {
  if (!current || current.windowStart.getTime() <= now.getTime() - windowSeconds * 1000) {
    return { allowed: true, windowStart: now, count: 1 };
  }
  const count = current.count + 1;
  return { allowed: count <= limit, windowStart: current.windowStart, count };
}

export function cellChangeWindow(input: {
  currentCell: string;
  nextCell: string;
  windowStart: Date;
  count: number;
  now: Date;
  windowSeconds: number;
  maximum: number;
}) {
  if (input.currentCell === input.nextCell) return { allowed: true, windowStart: input.windowStart, count: input.count };
  if (input.windowStart.getTime() <= input.now.getTime() - input.windowSeconds * 1000) {
    return { allowed: true, windowStart: input.now, count: 1 };
  }
  const count = input.count + 1;
  return { allowed: count <= input.maximum, windowStart: input.windowStart, count };
}

export type NearbyRelationshipState = "NONE" | "OUTGOING_PENDING" | "INCOMING_PENDING" | "FRIENDS" | "UNAVAILABLE";

export function nearbyCapabilities(state: NearbyRelationshipState, allowFriendRequests: boolean) {
  const available = state !== "UNAVAILABLE";
  return {
    canViewProfile: available,
    canSendFriendRequest: state === "NONE" && allowFriendRequests,
    canAcceptRequest: state === "INCOMING_PENDING",
    canCancelRequest: state === "OUTGOING_PENDING",
    canBlock: available,
    canReport: available,
  };
}

export function nearbyStage(input: {
  featureAvailable: boolean;
  communityAvailable: boolean;
  communityAccepted: boolean;
  consentAvailable: boolean;
  consentAccepted: boolean;
  socialProfileEligible: boolean;
  preferenceEnabled: boolean;
  presenceActive: boolean;
}) {
  if (!input.featureAvailable || !input.communityAvailable || !input.consentAvailable) return "UNAVAILABLE" as const;
  if (!input.communityAccepted) return "COMMUNITY_REQUIRED" as const;
  if (!input.consentAccepted) return "CONSENT_REQUIRED" as const;
  if (!input.socialProfileEligible) return "PROFILE_REQUIRED" as const;
  if (!input.preferenceEnabled) return "OFF" as const;
  return input.presenceActive ? "ACTIVE" as const : "READY_TO_RESUME" as const;
}

export function stableNearbyOrder(viewerId: string, targetId: string, now: Date) {
  const fiveMinuteBucket = Math.floor(now.getTime() / (5 * 60_000));
  return stableHash(`nearby-order:${viewerId}:${targetId}:${fiveMinuteBucket}`);
}
