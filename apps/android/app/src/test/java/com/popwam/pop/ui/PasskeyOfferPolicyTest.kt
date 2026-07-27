package com.popwam.pop.ui

import com.popwam.pop.data.api.ProfileBootstrapStatusResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class PasskeyOfferPolicyTest {
    private val offered=ProfileBootstrapStatusResponse(
        ok=true,isNewAccount=true,legalReady=true,legalAccepted=true,bootstrapComplete=true,
        hasPrimaryProfile=true,passkeyCount=0,passkeyEnrollmentEligible=true,
    )

    @Test fun `not now bypasses only this offer and resumes server driven onboarding`() {
        val skipped=passkeyOfferSkipped(AuthUiState(authenticated=true,setupStage=AuthSetupStage.PASSKEY_OFFER))
        assertTrue(skipped.authenticated)
        assertTrue(skipped.passkeyOfferSkippedForCurrentSetup)
        assertEquals(AuthSetupStage.READY,resolveAuthSetupStage(skipped.authenticated,offered,skipped.passkeyOfferSkippedForCurrentSetup))
    }

    @Test fun `failed creation leaves the POP session authenticated and skip available`() {
        val failed=passkeyOfferFailure(AuthUiState(authenticated=true,setupStage=AuthSetupStage.PASSKEY_OFFER),PasskeyLoginError.UNAVAILABLE)
        assertTrue(failed.authenticated)
        assertEquals(PasskeyLoginError.UNAVAILABLE,failed.passkeyError)
        assertFalse(failed.passkeyOfferSkippedForCurrentSetup)
        assertTrue(passkeyOfferSkipped(failed).authenticated)
    }

    @Test fun `cancelled creation also permits skip without an auth error`() {
        val cancelled=passkeyOfferFailure(AuthUiState(authenticated=true,setupStage=AuthSetupStage.PASSKEY_OFFER),PasskeyLoginError.CANCELLED)
        val skipped=passkeyOfferSkipped(cancelled)
        assertTrue(skipped.authenticated)
        assertNull(skipped.passkeyError)
        assertNull(skipped.error)
    }

    @Test fun `skip marker prevents a current journey reoffer but does not alter server passkey state`() {
        assertEquals(AuthSetupStage.PASSKEY_OFFER,resolveAuthSetupStage(true,offered,false))
        assertEquals(AuthSetupStage.READY,resolveAuthSetupStage(true,offered,true))
        assertEquals(0,offered.passkeyCount)
    }

    @Test fun `security settings retains a later independent passkey enrollment entry point`() {
        val securityScreen=File("src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt").readText()
        assertTrue(securityScreen.contains("StepUpAction(\"ADD_PASSKEY\")"))
    }

    @Test fun `skip delegates the next destination to the bootstrap resolver`() {
        val viewModel=File("src/main/java/com/popwam/pop/ui/AppViewModels.kt").readText()
        val skip=viewModel.substringAfter("fun skipPasskey(locale:String)").substringBefore("fun continueLegacyCompatibility")
        assertTrue(skip.contains("refreshSetup(locale)"))
        assertFalse(skip.contains("refreshDynamicOnboarding(locale)"))
    }
}
