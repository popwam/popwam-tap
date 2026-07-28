package com.popwam.pop.ui

import com.popwam.pop.data.api.ProfileSelectorItemDto
import org.junit.Assert.*
import org.junit.Test

class ProfileHomePolicyTest {
    private val primary=ProfileSelectorItemDto(id="primary",label="Primary",isPrimary=true)
    private val secondary=ProfileSelectorItemDto(id="secondary",label="Secondary")

    @Test fun `selected profile respects explicit server-authorized selection`() {
        assertEquals("secondary",ProfileHomePolicy.selectedProfile("secondary",listOf(primary,secondary)))
    }

    @Test fun `selected profile falls back to server primary then first`() {
        assertEquals("primary",ProfileHomePolicy.selectedProfile("missing",listOf(secondary,primary)))
        assertEquals("secondary",ProfileHomePolicy.selectedProfile(null,listOf(secondary)))
    }

    @Test fun `registry contains only code owned Phase F editors`() {
        assertEquals(setOf("IDENTITY","ABOUT","CONTACT","SOCIAL","LINKS","SERVICES","PORTFOLIO","GALLERY","BRANCHES"),ProfileHomePolicy.supportedEditors)
        assertFalse("BOOKING" in ProfileHomePolicy.supportedEditors)
        assertFalse("CATALOG" in ProfileHomePolicy.supportedEditors)
    }

    @Test fun `required modules cannot be disabled`() {
        assertFalse(ProfileHomePolicy.canDisable(true))
        assertTrue(ProfileHomePolicy.canDisable(false))
    }

    @Test fun `publish remains blocked by server readiness or loading`() {
        assertTrue(ProfileHomePolicy.canPublish(true,false))
        assertFalse(ProfileHomePolicy.canPublish(false,false))
        assertFalse(ProfileHomePolicy.canPublish(true,true))
    }

    @Test fun `visibility cycle is controlled`() {
        assertEquals("FRIENDS",ProfileHomePolicy.nextVisibility("PUBLIC"))
        assertEquals("ONLY_ME",ProfileHomePolicy.nextVisibility("FRIENDS"))
        assertEquals("PUBLIC",ProfileHomePolicy.nextVisibility("ONLY_ME"))
    }

    @Test fun `publish blockers map to actionable destinations`() {
        assertEquals("TEMPLATE",ProfileHomePolicy.issueAction("TEMPLATE_REQUIRED",null))
        assertEquals("MODULE_OR_ADD",ProfileHomePolicy.issueAction("REQUIRED_MODULE_MISSING","IDENTITY"))
        assertEquals("MODULE_OR_ADD",ProfileHomePolicy.issueAction("REQUIRED_MODULE_MISSING","BOOKING"))
    }

    @Test fun `publish blocker copy is localized resource backed not backend code text`() {
        assertNotEquals(0,ProfileHomePolicy.issueTitle("TEMPLATE_REQUIRED"))
        assertNotEquals(0,ProfileHomePolicy.issueDescription("REQUIRED_MODULE_MISSING"))
    }

    @Test fun `ordering is bounded and deterministic`() {
        assertEquals(listOf("ABOUT","IDENTITY","CONTACT"),ProfileHomePolicy.moved(listOf("IDENTITY","ABOUT","CONTACT"),0,1))
        assertEquals(listOf("IDENTITY","ABOUT"),ProfileHomePolicy.moved(listOf("IDENTITY","ABOUT"),0,-1))
    }
}
