package com.popwam.pop.ui

import com.popwam.pop.data.api.FriendsPolicyDto
import com.popwam.pop.data.api.NearbyConsentDto
import com.popwam.pop.data.api.NearbyFeatureDto
import com.popwam.pop.data.api.NearbyPreferenceDto
import com.popwam.pop.data.api.NearbyPresenceStatusDto
import com.popwam.pop.data.api.NearbySettingsResponse
import com.popwam.pop.data.api.NearbySocialProfileDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NearbyPolicyTest {
    private fun settings(stage:String="ACTIVE",ok:Boolean=true)=NearbySettingsResponse(
        ok=ok,
        feature=NearbyFeatureDto(state="AVAILABLE",available=true,presenceEnabled=true,discoveryEnabled=true),
        community=FriendsPolicyDto(available=true,accepted=true),
        consent=NearbyConsentDto(available=true,accepted=true),
        preference=NearbyPreferenceDto(enabled=stage=="ACTIVE"||stage=="READY_TO_RESUME",discoverable=stage=="ACTIVE"||stage=="READY_TO_RESUME"),
        presence=NearbyPresenceStatusDto(active=stage=="ACTIVE"),
        socialProfile=NearbySocialProfileDto(eligible=true),
        stage=stage,
    )

    @Test fun `Android renders every server-owned Nearby gate in order`() {
        assertEquals(NearbyStage.LOADING,NearbyPolicy.resolve(null,false))
        assertEquals(NearbyStage.UNAVAILABLE,NearbyPolicy.resolve(settings("UNAVAILABLE"),false))
        assertEquals(NearbyStage.COMMUNITY_REQUIRED,NearbyPolicy.resolve(settings("COMMUNITY_REQUIRED"),false))
        assertEquals(NearbyStage.CONSENT_REQUIRED,NearbyPolicy.resolve(settings("CONSENT_REQUIRED"),false))
        assertEquals(NearbyStage.PROFILE_REQUIRED,NearbyPolicy.resolve(settings("PROFILE_REQUIRED"),false))
        assertEquals(NearbyStage.OFF,NearbyPolicy.resolve(settings("OFF"),false))
        assertEquals(NearbyStage.READY_TO_RESUME,NearbyPolicy.resolve(settings("READY_TO_RESUME"),false))
    }

    @Test fun `process recreation never resumes collection without a fresh explicit client session`() {
        assertEquals(NearbyStage.READY_TO_RESUME,NearbyPolicy.resolve(settings("ACTIVE"),false))
        assertEquals(NearbyStage.ACTIVE,NearbyPolicy.resolve(settings("ACTIVE"),true))
    }

    @Test fun `location collection requires active stage lifecycle screen and memory session`() {
        assertTrue(NearbyPolicy.shouldCollect(NearbyStage.ACTIVE,true,true,true))
        assertFalse(NearbyPolicy.shouldCollect(NearbyStage.ACTIVE,false,true,true))
        assertFalse(NearbyPolicy.shouldCollect(NearbyStage.ACTIVE,true,false,true))
        assertFalse(NearbyPolicy.shouldCollect(NearbyStage.ACTIVE,true,true,false))
        assertFalse(NearbyPolicy.shouldCollect(NearbyStage.OFF,true,true,true))
        assertEquals(90_000L,NearbyPolicy.heartbeatMillis)
    }

    @Test fun `only broad bands and public relationship states are projected`() {
        assertEquals("SAME_AREA",NearbyPolicy.bandLabel("SAME_AREA"))
        assertEquals("NEARBY_AREA",NearbyPolicy.bandLabel("NEARBY_AREA"))
        assertEquals("AROUND_THIS_AREA",NearbyPolicy.bandLabel("UNKNOWN"))
        assertEquals("FRIENDS",NearbyPolicy.publicRelationshipState("FRIENDS"))
        assertEquals("UNAVAILABLE",NearbyPolicy.publicRelationshipState("BLOCKED_ME"))
    }

    @Test fun `permission model has no precise or background state`() {
        assertTrue(NearbyPermissionState.entries.contains(NearbyPermissionState.APPROXIMATE))
        assertFalse(NearbyPermissionState.entries.any{it.name.contains("BACKGROUND")||it.name.contains("PRECISE")})
    }

    @Test fun `server errors fail safely`() {
        assertEquals(NearbyStage.ERROR,NearbyPolicy.resolve(settings(ok=false),false))
        assertEquals(NearbyStage.UNAVAILABLE,NearbyPolicy.resolve(settings(ok=false).copy(error="NEARBY_UNAVAILABLE"),false))
    }
}
