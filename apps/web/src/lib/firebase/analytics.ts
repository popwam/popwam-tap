"use client";

import { getFirebaseAnalytics } from "./client";

export const FIREBASE_ANALYTICS_EVENTS = [
  "app_open", "screen_view", "signup_started",
  "card_created", "card_viewed", "product_viewed", "product_activated", "meta_connect_started",
  "meta_connect_success", "meta_connect_failed", "passkey_created", "legal_consent_completed",
  "profile_bootstrap_started", "profile_kind_selected", "profile_category_selected", "profile_bootstrap_completed",
  "passkey_enrollment_shown", "passkey_enrollment_completed",
  "onboarding_started", "onboarding_step_viewed", "onboarding_step_completed", "onboarding_resumed",
  "onboarding_completed", "onboarding_skipped_optional",
  "profile_preview_viewed", "publish_readiness_viewed", "profile_publish_started", "profile_published",
  "profile_paused", "visibility_changed", "draft_media_uploaded",
  "home_viewed", "profile_switched", "profile_edit_started", "profile_section_saved",
  "profile_module_added", "profile_module_reordered", "profile_visibility_changed",
  "profile_preview_opened", "publish_review_opened", "add_profile_started",
  "share_center_viewed", "share_profile_selected", "share_target_selected", "share_qr_opened",
  "share_link_copied", "native_share_opened", "hce_target_selected", "physical_product_target_updated",
  "activation_started", "activation_scanned", "activation_completed", "activation_failed",
  "settings_viewed", "security_viewed", "devices_viewed", "session_revoked",
  "passkey_management_opened", "appearance_changed", "notification_preference_changed",
  "friends_viewed", "friend_search_used", "friend_request_sent", "friend_request_accepted",
  "friend_request_rejected", "friend_removed", "friend_favorited", "friend_muted",
  "user_blocked", "user_unblocked", "report_submitted",
  "nearby_viewed", "nearby_consent_viewed", "nearby_consent_accepted", "nearby_enabled",
  "nearby_disabled", "nearby_permission_result", "nearby_results_loaded",
  "nearby_result_opened", "nearby_friend_request_started", "nearby_unavailable",
] as const;

export type FirebaseAnalyticsEvent = (typeof FIREBASE_ANALYTICS_EVENTS)[number];
export type FirebaseAnalyticsProperties = Partial<Record<"user_type" | "platform" | "screen_name" | "app_version" | "outcome" | "provider" | "profile_kind" | "category_key" | "step_key" | "definition_version" | "module_type" | "visibility" | "method" | "product_type" | "setting_category" | "auth_method" | "action_type" | "report_category" | "relationship_state" | "permission_state" | "proximity_band" | "feature_state", string | number | boolean>>;

const allowedProperties = new Set(["user_type", "platform", "screen_name", "app_version", "outcome", "provider", "profile_kind", "category_key", "step_key", "definition_version", "module_type", "visibility", "method", "product_type", "setting_category", "auth_method", "action_type", "report_category", "relationship_state", "permission_state", "proximity_band", "feature_state"]);

export function safeFirebaseAnalyticsProperties(properties: Record<string, unknown> = {}): FirebaseAnalyticsProperties {
  const safe: FirebaseAnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!allowedProperties.has(key) || !["string", "number", "boolean"].includes(typeof value)) continue;
    if (typeof value === "string" && (value.length > 80 || /otp|password|token|secret|cookie|authorization|phone|email|code/i.test(key))) continue;
    safe[key as keyof FirebaseAnalyticsProperties] = value as string | number | boolean;
  }
  return safe;
}

export async function trackFirebaseAnalyticsEvent(event: FirebaseAnalyticsEvent, properties: Record<string, unknown> = {}) {
  try {
    const analytics = await getFirebaseAnalytics();
    if (!analytics) return;
    const { logEvent } = await import("firebase/analytics");
    const send = logEvent as unknown as (instance: typeof analytics, eventName: string, parameters: FirebaseAnalyticsProperties) => void;
    send(analytics, event, safeFirebaseAnalyticsProperties(properties));
  } catch { /* Analytics must never affect POP authentication or rendering. */ }
}
