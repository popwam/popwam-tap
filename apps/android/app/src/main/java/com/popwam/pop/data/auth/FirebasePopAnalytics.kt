package com.popwam.pop.data.auth

import android.content.Context
import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics
import com.popwam.pop.BuildConfig

class FirebasePopAnalytics(context:Context):PopAnalytics {
    private val applicationContext=context.applicationContext
    private val allowedEvents=setOf("app_open","screen_view","signup_started","phone_auth_started","phone_auth_code_sent","phone_auth_verified","phone_auth_failed","phone_auth_resend","legal_consent_completed","profile_bootstrap_started","profile_kind_selected","profile_category_selected","profile_bootstrap_completed","passkey_enrollment_shown","passkey_enrollment_completed","onboarding_started","onboarding_step_viewed","onboarding_step_completed","onboarding_resumed","onboarding_completed","onboarding_skipped_optional","profile_preview_viewed","publish_readiness_viewed","profile_publish_started","profile_published","profile_paused","visibility_changed","draft_media_uploaded","home_viewed","profile_switched","profile_edit_started","profile_section_saved","profile_module_added","profile_module_reordered","profile_visibility_changed","profile_preview_opened","publish_review_opened","add_profile_started","share_center_viewed","share_profile_selected","share_target_selected","share_qr_opened","share_link_copied","native_share_opened","hce_target_selected","physical_product_target_updated","activation_started","activation_scanned","activation_completed","activation_failed","settings_viewed","security_viewed","devices_viewed","session_revoked","passkey_management_opened","appearance_changed","notification_preference_changed","friends_viewed","friend_search_used","friend_request_sent","friend_request_accepted","friend_request_rejected","friend_removed","friend_favorited","friend_muted","user_blocked","user_unblocked","report_submitted","nearby_viewed","nearby_consent_viewed","nearby_consent_accepted","nearby_enabled","nearby_disabled","nearby_permission_result","nearby_results_loaded","nearby_result_opened","nearby_friend_request_started","nearby_unavailable")
    private val allowedProperties=setOf("user_type","platform","screen_name","app_version","outcome","provider","profile_kind","category_key","step_key","definition_version","module_type","visibility","method","product_type","setting_category","auth_method","action_type","report_category","relationship_state","permission_state","proximity_band","feature_state")
    override fun track(event:String,properties:Map<String,String>) {
        if(!BuildConfig.FIREBASE_RUNTIME_ENABLED||event !in allowedEvents) return
        runCatching {
            val bundle=Bundle()
            properties.filterKeys { it in allowedProperties }.forEach { (key,value) -> if(value.length<=80) bundle.putString(key,value) }
            FirebaseAnalytics.getInstance(applicationContext).logEvent(event,bundle)
        }
    }
}
