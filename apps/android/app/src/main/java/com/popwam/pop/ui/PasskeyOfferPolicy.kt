package com.popwam.pop.ui

/** Optional enrollment state is deliberately separate from POP session authentication. */
internal fun passkeyOfferFailure(state:AuthUiState,error:PasskeyLoginError)=state.copy(
    passkeyLoading=false,
    passkeyError=error,
)

internal fun passkeyOfferSkipped(state:AuthUiState)=state.copy(
    setupStage=AuthSetupStage.AUTHENTICATED_CHECKING,
    passkeyLoading=false,
    passkeyError=null,
    passkeyOfferSkippedForCurrentSetup=true,
    error=null,
)
