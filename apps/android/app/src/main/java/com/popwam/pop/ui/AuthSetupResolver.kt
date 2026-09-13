package com.popwam.pop.ui
import com.popwam.pop.data.api.ProfileBootstrapStatusResponse

enum class AuthSetupStage { PUBLIC, AUTHENTICATED_CHECKING, LEGAL_REQUIRED, IDENTITY, ACCOUNT_TYPE, PROFILE_BOOTSTRAP_REQUIRED, TEMPLATE_CHOICE, SECURITY_SETUP, COMPLETION, READY }
fun resolveAuthSetupStage(authenticated:Boolean,status:ProfileBootstrapStatusResponse?):AuthSetupStage=when {
    !authenticated -> AuthSetupStage.PUBLIC
    status==null -> AuthSetupStage.AUTHENTICATED_CHECKING
    !status.legalReady || !status.legalAccepted -> AuthSetupStage.LEGAL_REQUIRED
    status.hasPrimaryProfile -> when(status.setupStep) {
        "TEMPLATE" -> AuthSetupStage.TEMPLATE_CHOICE
        "SECURITY" -> AuthSetupStage.SECURITY_SETUP
        else -> AuthSetupStage.READY
    }
    status.accountName.isBlank() -> AuthSetupStage.IDENTITY
    status.accountKind !in setOf("PERSONAL","BUSINESS") -> AuthSetupStage.ACCOUNT_TYPE
    else -> AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED
}
