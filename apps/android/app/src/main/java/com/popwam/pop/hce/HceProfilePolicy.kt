package com.popwam.pop.hce

import com.popwam.pop.nfc.PermanentUrlPolicy

data class HceProfileState(
    val requested: Boolean,
    val enabled: Boolean,
    val profileId: String?,
    val canonicalUrl: String?,
)

object HceProfilePolicy {
    fun reconcile(requested: Boolean, profileId: String, canonicalUrl: String?): HceProfileState {
        val safe = canonicalUrl?.takeIf(PermanentUrlPolicy::isValid)
        return HceProfileState(requested, requested && safe != null, profileId.takeIf { requested }, safe.takeIf { requested })
    }

    fun select(enable: Boolean, profileId: String, canonicalUrl: String?): HceProfileState =
        reconcile(enable, profileId, canonicalUrl)

    fun logout() = HceProfileState(false, false, null, null)
}
