package com.popwam.pop.ui

import com.popwam.pop.data.api.ProfileBootstrapStatusResponse
import org.junit.Assert.assertEquals
import org.junit.Test

class AuthSetupResolverTest {
    private fun status(
        isNew:Boolean=true, legalReady:Boolean=true, legalAccepted:Boolean=true,
        bootstrap:Boolean=true, primary:Boolean=true, passkeys:Int=1,
    )=ProfileBootstrapStatusResponse(isNewAccount=isNew,legalReady=legalReady,legalAccepted=legalAccepted,bootstrapComplete=bootstrap,hasPrimaryProfile=primary,passkeyCount=passkeys)

    @Test fun `new user after otp requires legal consent`()=assertEquals(AuthSetupStage.LEGAL_REQUIRED,resolveAuthSetupStage(true,status(legalAccepted=false,bootstrap=false,primary=false,passkeys=0)))
    @Test fun `accepted legal requires bootstrap`()=assertEquals(AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED,resolveAuthSetupStage(true,status(bootstrap=false,primary=false,passkeys=0)))
    @Test fun `existing legal acceptance is bypassed`()=assertEquals(AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED,resolveAuthSetupStage(true,status(legalAccepted=true,bootstrap=false,primary=false,passkeys=0)))
    @Test fun `personal and business bootstrap share server resolver`() { assertEquals(AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED,resolveAuthSetupStage(true,status(bootstrap=false))); assertEquals(AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED,resolveAuthSetupStage(true,status(bootstrap=false))) }
    @Test fun `bootstrap success offers passkey`()=assertEquals(AuthSetupStage.PASSKEY_OFFER,resolveAuthSetupStage(true,status(passkeys=0)))
    @Test fun `passkey cancellation may continue ready`()=assertEquals(AuthSetupStage.READY,passkeyFailureNextStage())
    @Test fun `returning user bypasses setup`()=assertEquals(AuthSetupStage.READY,resolveAuthSetupStage(true,status(isNew=false,primary=true,bootstrap=false,legalAccepted=false,passkeys=0)))
    @Test fun `ambiguous legacy user is held in compatibility state`()=assertEquals(AuthSetupStage.LEGACY_COMPATIBILITY,resolveAuthSetupStage(true,status(isNew=false,primary=false)))
    @Test fun `unavailable legal documents do not permit bootstrap`()=assertEquals(AuthSetupStage.SETUP_UNAVAILABLE,resolveAuthSetupStage(true,status(legalReady=false,legalAccepted=false,bootstrap=false,primary=false,passkeys=0)))
    @Test fun `restart without status remains checking`()=assertEquals(AuthSetupStage.AUTHENTICATED_CHECKING,resolveAuthSetupStage(true,null))
    @Test fun `unauthenticated state is public`()=assertEquals(AuthSetupStage.PUBLIC,resolveAuthSetupStage(false,status()))
}
