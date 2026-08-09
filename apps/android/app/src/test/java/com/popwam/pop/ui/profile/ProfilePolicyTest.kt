package com.popwam.pop.ui.profile

import androidx.compose.ui.unit.LayoutDirection
import com.popwam.pop.data.api.EditorProfileDto
import com.popwam.pop.data.api.ProfileEditorResponse
import com.popwam.pop.data.api.ProfileSelectorItemDto
import com.popwam.pop.data.api.PublishingIssueDto
import com.popwam.pop.data.api.PublishingReadinessDto
import org.junit.Assert.*
import org.junit.Test

class ProfilePolicyTest {
    @Test fun `dynamic backend categories map to one extensible presentation model`() {
        assertEquals(ProfileCategoryKind.PERSONAL,ProfilePolicy.categoryKind("PERSONAL",null))
        assertEquals(ProfileCategoryKind.PROFESSIONAL,ProfilePolicy.categoryKind("PERSONAL","professional-services"))
        assertEquals(ProfileCategoryKind.RESTAURANT,ProfilePolicy.categoryKind("BUSINESS","restaurant"))
        assertEquals(ProfileCategoryKind.CLINIC,ProfilePolicy.categoryKind("BUSINESS","medical-clinic"))
        assertEquals(ProfileCategoryKind.SERVICES,ProfilePolicy.categoryKind("PERSONAL","local-services"))
        assertEquals(ProfileCategoryKind.CREATOR,ProfilePolicy.categoryKind("PERSONAL","creator-public"))
    }

    @Test fun `type specific sections come only from backend supported modules`() {
        val base=content(modules=listOf(ProfileModule("IDENTITY","Identity",true,"PUBLIC",true,true)))
        assertFalse(ProfileEditorSection.SERVICES in ProfilePolicy.sections(base))
        assertFalse(ProfileEditorSection.LOCATIONS in ProfilePolicy.sections(base))
        val service=base.copy(modules=base.modules+ProfileModule("SERVICES","Services",true,"PUBLIC",false,true)+ProfileModule("BRANCHES","Locations",true,"PUBLIC",false,true))
        assertTrue(ProfileEditorSection.SERVICES in ProfilePolicy.sections(service))
        assertTrue(ProfileEditorSection.LOCATIONS in ProfilePolicy.sections(service))
    }

    @Test fun `unsupported type fields remain typed pending capabilities and not fake editors`() {
        assertTrue(ProfilePendingCapability.MENU in ProfilePolicy.pendingCapabilities(ProfileCategoryKind.RESTAURANT))
        assertTrue(ProfilePendingCapability.LICENSE_VERIFICATION in ProfilePolicy.pendingCapabilities(ProfileCategoryKind.CLINIC))
        assertFalse(ProfilePendingCapability.MENU in ProfilePolicy.pendingCapabilities(ProfileCategoryKind.PERSONAL))
    }

    @Test fun `slug normalization is deterministic while availability remains server owned`() {
        assertEquals("sarah-studio",ProfilePolicy.normalizedSlug("  Sarah_Studio!! "))
        assertEquals(63,ProfilePolicy.normalizedSlug("a".repeat(80)).length)
    }

    @Test fun `phone URL username and codes stay LTR under Arabic`() {
        listOf("phone","url","website","username","slug","code","email").forEach {
            assertEquals(LayoutDirection.Ltr,ProfilePolicy.fixedValueDirection(it,LayoutDirection.Rtl))
        }
        assertEquals(LayoutDirection.Rtl,ProfilePolicy.fixedValueDirection("displayName",LayoutDirection.Rtl))
    }

    @Test fun `malformed contact links never pass client validation`() {
        assertTrue(ProfilePolicy.validLink("WEBSITE","https://popwam.com/profile"))
        assertTrue(ProfilePolicy.validLink("PHONE","+20 100 123 4567"))
        assertTrue(ProfilePolicy.validLink("EMAIL","hello@popwam.com"))
        assertFalse(ProfilePolicy.validLink("WEBSITE","javascript:alert(1)"))
        assertFalse(ProfilePolicy.validLink("EMAIL","missing-at.example"))
    }

    @Test fun `primary profile archive requires a safe fallback`() {
        val primary=summary(isPrimary=true)
        assertFalse(ProfilePolicy.canArchive(primary,listOf(primary)))
        assertTrue(ProfilePolicy.canArchive(primary,listOf(primary,summary(id="other"))))
    }

    @Test fun `profile view mapping preserves visibility readiness and honest verification state`() {
        val mapped=ProfileSelectorItemDto("profile-1","Sarah","Sarah","PERSONAL","professional","PUBLISHED",true).toOwnedProfile(
            ProfileEditorResponse(profile=EditorProfileDto(id="profile-1",displayName="Sarah",profileKind="PERSONAL",categoryKey="professional",lifecycle="PUBLISHED",access="UNLISTED"),readiness=PublishingReadinessDto(false,issues=listOf(PublishingIssueDto(code="SLUG_REQUIRED")))),null,
        )
        assertEquals("UNLISTED",mapped.visibility)
        assertEquals(ProfileCategoryKind.PROFESSIONAL,mapped.categoryKind)
        assertFalse(mapped.completion.publishReady)
        assertEquals(listOf("SLUG_REQUIRED"),mapped.completion.blockingIssueCodes)
        assertEquals(ProfileVerificationState.UNAVAILABLE,mapped.verification)
    }

    @Test fun `publishing requires readiness explicit review and idle state`() {
        assertFalse(ProfilePublishingPolicy.canPublish(true,false,false))
        assertFalse(ProfilePublishingPolicy.canPublish(false,true,false))
        assertFalse(ProfilePublishingPolicy.canPublish(true,true,true))
        assertTrue(ProfilePublishingPolicy.canPublish(true,true,false))
    }
}

internal fun summary(id:String="profile-1",isPrimary:Boolean=true)=OwnedProfile(id,"Sarah","Designer",null,ProfileBackendKind.PERSONAL,ProfileCategoryKind.PERSONAL,"personal","DRAFT","PRIVATE",isPrimary,completion=ProfileCompletion(false,listOf("VISIBILITY_REQUIRED")))
internal fun content(modules:List<ProfileModule> = emptyList())=ProfileContent(
    summary=summary(),draftRevision=1,primaryLanguage="en",displayLabel="Sarah",displayName="Sarah",displayNameAr="سارة",displayNameEn="Sarah",
    jobTitleAr="",jobTitleEn="Designer",organizationNameAr="",organizationNameEn="",title="",bio="",bioAr="",bioEn="",descriptionAr="",descriptionEn="",
    phone="",alternatePhone="",email="",website="",whatsappBusiness="",whatsappPrivate="",locationText="",addressAr="",addressEn="",contactVisibility=emptyMap(),
    slug="sarah-a1b2",theme="CLASSIC_LIGHT",templateName="Classic",links=emptyList(),services=emptyList(),locations=emptyList(),media=emptyList(),modules=modules,
)
