package com.popwam.pop.ui
import com.popwam.pop.data.api.ProfileBootstrapStatusResponse
import org.junit.Assert.*
import org.junit.Test
class Pass7OnboardingTest {
    private fun status()=ProfileBootstrapStatusResponse(ok=true,legalReady=true,legalAccepted=true,accountName="Ada",accountKind="PERSONAL")
    @Test fun `new identity is a distinct screen`(){assertEquals(AuthSetupStage.IDENTITY,resolveAuthSetupStage(true,status().copy(accountName="")))}
    @Test fun `account type is a distinct screen`(){assertEquals(AuthSetupStage.ACCOUNT_TYPE,resolveAuthSetupStage(true,status().copy(accountKind=null)))}
    @Test fun `account without profile resumes at creation`(){assertEquals(AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED,resolveAuthSetupStage(true,status()))}
    @Test fun `existing profile bypasses new onboarding`(){assertEquals(AuthSetupStage.READY,resolveAuthSetupStage(true,status().copy(hasPrimaryProfile=true)))}
    @Test fun `existing consent is not asked again`(){assertNotEquals(AuthSetupStage.LEGAL_REQUIRED,resolveAuthSetupStage(true,status()))}
    @Test fun `missing legal requires agreement`(){assertEquals(AuthSetupStage.LEGAL_REQUIRED,resolveAuthSetupStage(true,status().copy(legalAccepted=false)))}
    @Test fun `personal creates with no template catalog`(){assertNull(bootstrapValidationError("Ada","PERSONAL"))}
    @Test fun `business creates with no template catalog`(){assertNull(bootstrapValidationError("Company","BUSINESS"))}
    @Test fun `old profile types are rejected`(){assertEquals("PROFILE_KIND_INVALID",bootstrapValidationError("Ada","CREATOR"))}
    @Test fun `blank profile rejected`(){assertEquals("PROFILE_NAME_REQUIRED",bootstrapValidationError(" ","PERSONAL"))}
    @Test fun `saved profile resumes after creation`(){assertEquals(AuthSetupStage.TEMPLATE_CHOICE,resolveAuthSetupStage(true,status().copy(hasPrimaryProfile=true,setupStep="TEMPLATE")))}
    @Test fun `saved security checkpoint resumes`(){assertEquals(AuthSetupStage.SECURITY_SETUP,resolveAuthSetupStage(true,status().copy(hasPrimaryProfile=true,setupStep="SECURITY")))}
    @Test fun `completion survives process restart`(){assertEquals(AuthSetupStage.READY,resolveAuthSetupStage(true,status().copy(hasPrimaryProfile=true,setupStep="COMPLETE")))}
    @Test fun `unauthenticated stays public`(){assertEquals(AuthSetupStage.PUBLIC,resolveAuthSetupStage(false,null))}
}
