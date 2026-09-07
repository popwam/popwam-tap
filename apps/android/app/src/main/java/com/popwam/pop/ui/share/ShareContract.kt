package com.popwam.pop.ui.share

import com.popwam.pop.data.api.ProfileSelectorResponse
import com.popwam.pop.data.api.ScratchActivationInspectResponse
import com.popwam.pop.data.api.ShareProductDto
import com.popwam.pop.data.api.ShareTargetDto

enum class ShareLoadState { INITIAL_LOADING, READY, EMPTY, ERROR }

enum class ShareProfileAccess { PUBLIC, UNLISTED, PRIVATE, UNKNOWN;
    companion object {
        fun from(value: String?) = entries.firstOrNull { it.name == value } ?: UNKNOWN
    }
}

enum class ShareAvailability { PUBLIC, UNLISTED, PRIVATE, PAUSED, NOT_PUBLISHED, UNAVAILABLE }

data class ActiveShareProfile(
    val id: String,
    val name: String? = null,
    val access: ShareProfileAccess = ShareProfileAccess.UNKNOWN,
    val lifecycle: String? = null,
    val type: String? = null,
)

/** The only payload allowed through the profile share, QR, NFC and HCE paths. */
data class CanonicalSharePayload(
    val profileId: String,
    val profileName: String,
    val canonicalUrl: String,
)

enum class NfcAvailability { UNAVAILABLE, DISABLED, READY }
enum class NfcOperation { WRITE, LOCK }
enum class NfcStage { IDLE, WAITING_FOR_TAG, WRITING, SUCCESS, ERROR }

data class ShareNfcState(
    val availability: NfcAvailability = NfcAvailability.UNAVAILABLE,
    val operation: NfcOperation = NfcOperation.WRITE,
    val stage: NfcStage = NfcStage.IDLE,
    val failureCode: String? = null,
    val locked: Boolean = false,
)

enum class HceAvailability { UNAVAILABLE, DISABLED, UNSUPPORTED, READY }

data class ShareHceState(
    val availability: HceAvailability = HceAvailability.UNAVAILABLE,
    val requested: Boolean = false,
    val activeForProfile: Boolean = false,
)

enum class ShareFeedback {
    LINK_COPIED,
    SHARE_OPENED,
    QR_SAVED,
    QR_SHARED,
    QR_FAILED,
    PRODUCT_UPDATED,
    PRODUCT_ACTIVATED,
}

data class ShareUiState(
    val loadState: ShareLoadState = ShareLoadState.INITIAL_LOADING,
    val activeProfile: ActiveShareProfile? = null,
    val availability: ShareAvailability = ShareAvailability.UNAVAILABLE,
    val payload: CanonicalSharePayload? = null,
    val profileSelector: ProfileSelectorResponse? = null,
    val productTargets: List<ShareTargetDto> = emptyList(),
    val products: List<ShareProductDto> = emptyList(),
    val activation: ScratchActivationInspectResponse? = null,
    val refreshing: Boolean = false,
    val partial: Boolean = false,
    val busy: Boolean = false,
    val qrVisible: Boolean = false,
    val nfc: ShareNfcState = ShareNfcState(),
    val hce: ShareHceState = ShareHceState(),
    val feedback: ShareFeedback? = null,
    val errorCode: String? = null,
) {
    val shareable: Boolean get() = payload != null && availability in setOf(ShareAvailability.PUBLIC, ShareAvailability.UNLISTED)
}

sealed interface ShareEffect {
    data object SessionExpired : ShareEffect
}
