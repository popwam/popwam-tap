package com.popwam.pop.ui

import com.popwam.pop.data.api.FriendsPolicyDto
import com.popwam.pop.data.api.FriendsPreferenceDto
import com.popwam.pop.data.api.FriendsSettingsResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FriendsPolicyTest {
    private fun settings(
        policyAvailable:Boolean=true,
        policyAccepted:Boolean=true,
        profileConfigured:Boolean=true,
        privacyConfigured:Boolean=true,
    ) = FriendsSettingsResponse(
        ok=true,
        policy=FriendsPolicyDto(available=policyAvailable,accepted=policyAccepted),
        preference=FriendsPreferenceDto(
            profileConfigured=profileConfigured,
            privacyConfigured=privacyConfigured,
            configured=profileConfigured&&privacyConfigured,
        ),
    )

    @Test fun `first Friends open follows policy profile privacy and ready stages`() {
        assertEquals(FriendsStage.LOADING,FriendsPolicy.resolve(null))
        assertEquals(FriendsStage.POLICY_UNAVAILABLE,FriendsPolicy.resolve(settings(policyAvailable=false,policyAccepted=false)))
        assertEquals(FriendsStage.POLICY_REQUIRED,FriendsPolicy.resolve(settings(policyAccepted=false)))
        assertEquals(FriendsStage.SOCIAL_PROFILE_REQUIRED,FriendsPolicy.resolve(settings(profileConfigured=false,privacyConfigured=false)))
        assertEquals(FriendsStage.PRIVACY_REQUIRED,FriendsPolicy.resolve(settings(privacyConfigured=false)))
        assertEquals(FriendsStage.READY,FriendsPolicy.resolve(settings()))
    }

    @Test fun `Arabic and English search normalize safely without exposing phone discovery`() {
        assertEquals("أحمد علي",FriendsPolicy.normalizeSearch("  أحمد   علي "))
        assertEquals("alice",FriendsPolicy.normalizeSearch("ＡＬＩＣＥ"))
        assertNull(FriendsPolicy.normalizeSearch("a"))
        assertNull(FriendsPolicy.normalizeSearch("x".repeat(65)))
        assertTrue(FriendsPolicy.usesRtl("ar"))
        assertFalse(FriendsPolicy.usesRtl("en"))
    }

    @Test fun `request lifecycle exposes only relationship appropriate actions`() {
        assertEquals(setOf("REQUEST","BLOCK","REPORT"),FriendsPolicy.actionsFor("NONE"))
        assertEquals(setOf("CANCEL","BLOCK","REPORT"),FriendsPolicy.actionsFor("OUTGOING_PENDING"))
        assertEquals(setOf("ACCEPT","REJECT","BLOCK","REPORT"),FriendsPolicy.actionsFor("INCOMING_PENDING"))
        assertEquals(setOf("FAVORITE","MUTE","REMOVE","BLOCK","REPORT"),FriendsPolicy.actionsFor("FRIENDS"))
    }

    @Test fun `blocked direction is hidden from the Android client`() {
        assertEquals("UNAVAILABLE",FriendsPolicy.publicRelationshipState("BLOCKED_ME"))
        assertTrue(FriendsPolicy.actionsFor("BLOCKED_ME").isEmpty())
        assertEquals("BLOCKED_BY_ME",FriendsPolicy.publicRelationshipState("BLOCKED_BY_ME"))
    }

    @Test fun `reports use controlled categories bounded plain text and optional block remains separate`() {
        assertTrue(FriendsPolicy.validReport("SPAM",""))
        assertTrue(FriendsPolicy.validReport("HARASSMENT","Repeated unwanted contact"))
        assertFalse(FriendsPolicy.validReport("MADE_UP",""))
        assertFalse(FriendsPolicy.validReport("OTHER","x".repeat(501)))
        assertFalse(FriendsPolicy.validReport("OTHER","<b>unsafe</b>"))
        assertTrue("BLOCK" in FriendsPolicy.actionsFor("FRIENDS"))
        assertTrue("REPORT" in FriendsPolicy.actionsFor("FRIENDS"))
    }

    @Test fun `FCM failure cannot roll back authoritative request or friendship success`() {
        assertTrue(FriendsPolicy.relationshipSurvivesDeliveryFailure(true,false))
        assertTrue(FriendsPolicy.relationshipSurvivesDeliveryFailure(true,true))
        assertFalse(FriendsPolicy.relationshipSurvivesDeliveryFailure(false,true))
    }
}
