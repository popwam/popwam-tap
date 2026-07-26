package com.popwam.pop.ui

import com.popwam.pop.data.api.ProfileBootstrapStatusResponse

enum class AuthSetupStage { PUBLIC, PHONE_ENTRY, OTP_REQUIRED, AUTHENTICATED_CHECKING, SETUP_UNAVAILABLE, LEGAL_REQUIRED, PROFILE_BOOTSTRAP_REQUIRED, PASSKEY_OFFER, DYNAMIC_ONBOARDING, LEGACY_COMPATIBILITY, READY }

/** Single routing policy for an authenticated POP session. No state is inferred from preferences. */
fun resolveAuthSetupStage(authenticated:Boolean,status:ProfileBootstrapStatusResponse?):AuthSetupStage = when {
    !authenticated -> AuthSetupStage.PUBLIC
    status == null -> AuthSetupStage.AUTHENTICATED_CHECKING
    !status.isNewAccount && !status.hasPrimaryProfile -> AuthSetupStage.LEGACY_COMPATIBILITY
    !status.isNewAccount -> AuthSetupStage.READY
    !status.legalReady -> AuthSetupStage.SETUP_UNAVAILABLE
    !status.legalAccepted -> AuthSetupStage.LEGAL_REQUIRED
    !status.bootstrapComplete -> AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED
    status.passkeyCount == 0 -> AuthSetupStage.PASSKEY_OFFER
    else -> AuthSetupStage.READY
}

/** Enrollment is optional; cancellation and temporary Credential Manager errors never revoke POP access. */
fun passkeyFailureNextStage()=AuthSetupStage.READY
