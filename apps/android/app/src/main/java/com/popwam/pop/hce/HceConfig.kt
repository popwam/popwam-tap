package com.popwam.pop.hce

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.nfc.NfcAdapter
import android.nfc.cardemulation.CardEmulation
import com.popwam.pop.nfc.PermanentUrlPolicy

data class HceProfileSelection(val profileId: String, val canonicalUrl: String)

object HceConfig {
    private const val FILE = "hce_public_config"
    private const val ENABLED = "enabled"
    private const val REQUESTED = "user_requested"
    private const val URL = "public_url"
    private const val PROFILE_ID = "activeProfileId"
    private const val VIRTUAL_CARD_ID = "activeHceVirtualCardId"
    private const val SHARE_TARGET_ID = "activeShareTargetId"

    private fun preferences(context: Context) = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun requested(context: Context): Boolean {
        val preferences = preferences(context)
        return preferences.getBoolean(REQUESTED, preferences.getBoolean(ENABLED, false))
    }

    fun enabled(context: Context): Boolean =
        preferences(context).getBoolean(ENABLED, false) && url(context)?.let(PermanentUrlPolicy::isValid) == true

    fun url(context: Context): String? = preferences(context).getString(URL, null)
    fun activeProfileId(context: Context): String? = preferences(context).getString(PROFILE_ID, null)

    fun profileSelection(context: Context): HceProfileSelection? {
        val profileId = activeProfileId(context)?.takeIf(String::isNotBlank) ?: return null
        val canonicalUrl = url(context)?.takeIf(PermanentUrlPolicy::isValid) ?: return null
        return HceProfileSelection(profileId, canonicalUrl)
    }

    /** Removes the old payload synchronously before server-authoritative profile state loads. */
    fun invalidateForProfile(context: Context, profileId: String) {
        if (!requested(context)) return
        preferences(context).edit()
            .putBoolean(ENABLED, false)
            .remove(URL)
            .putString(PROFILE_ID, profileId)
            .remove(VIRTUAL_CARD_ID)
            .remove(SHARE_TARGET_ID)
            .commit()
    }

    /** Keeps the owner's HCE preference while making the current server-safe profile payload authoritative. */
    fun reconcileProfile(context: Context, profileId: String, canonicalUrl: String?) {
        if (!requested(context)) return
        val state = HceProfilePolicy.reconcile(true, profileId, canonicalUrl)
        preferences(context).edit()
            .putBoolean(REQUESTED, state.requested)
            .putBoolean(ENABLED, state.enabled)
            .putString(PROFILE_ID, state.profileId)
            .putString(URL, state.canonicalUrl)
            .putString(SHARE_TARGET_ID, if (state.enabled) "profile" else null)
            .remove(VIRTUAL_CARD_ID)
            .commit()
    }

    fun selectProfile(context: Context, enable: Boolean, profileId: String, canonicalUrl: String?) {
        val state = HceProfilePolicy.select(enable, profileId, canonicalUrl)
        preferences(context).edit()
            .putBoolean(REQUESTED, state.requested)
            .putBoolean(ENABLED, state.enabled)
            .putString(PROFILE_ID, state.profileId)
            .putString(URL, state.canonicalUrl)
            .putString(SHARE_TARGET_ID, if (state.enabled) "profile" else null)
            .remove(VIRTUAL_CARD_ID)
            .commit()
        updatePreferredService(context, state.enabled)
    }

    fun clearForLogout(context: Context) {
        preferences(context).edit().clear().commit()
        updatePreferredService(context, false)
    }

    /** Keeps the preference visible to the owner but exposes no payload without an active profile. */
    fun clearProfilePayload(context: Context) {
        preferences(context).edit()
            .putBoolean(REQUESTED, requested(context))
            .putBoolean(ENABLED, false)
            .remove(URL)
            .remove(PROFILE_ID)
            .remove(VIRTUAL_CARD_ID)
            .remove(SHARE_TARGET_ID)
            .commit()
        updatePreferredService(context, false)
    }

    fun refreshPreferredService(context: Context) {
        updatePreferredService(context, enabled(context))
    }

    private fun updatePreferredService(context: Context, enabled: Boolean) {
        val activity = context as? Activity ?: return
        val adapter = NfcAdapter.getDefaultAdapter(activity) ?: return
        runCatching {
            val manager = CardEmulation.getInstance(adapter)
            if (enabled) manager.setPreferredService(activity, ComponentName(activity, PopwamHostApduService::class.java))
            else manager.unsetPreferredService(activity)
        }
    }
}
