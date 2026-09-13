package com.popwam.pop.ui.profile

import androidx.compose.ui.unit.LayoutDirection
import com.popwam.pop.data.api.EditorProfileDto
import com.popwam.pop.data.api.EditorIdentityDto
import com.popwam.pop.data.api.EditorDocumentDto
import com.popwam.pop.data.api.EditorDocumentCapabilityDto
import com.popwam.pop.data.api.ProfileEditorResponse
import com.popwam.pop.data.api.ProfileSelectorItemDto
import com.popwam.pop.data.api.PublishingIssueDto
import com.popwam.pop.data.api.PublishingReadinessDto
import org.junit.Assert.*
import org.junit.Test

class ProfilePolicyTest {

    @Test fun `type specific sections come only from backend supported modules`() {
        val base=content(modules=listOf(ProfileModule("IDENTITY","Identity",true,"PUBLIC",true,true)))
        assertFalse(ProfileEditorSection.SERVICES in ProfilePolicy.sections(base))
        assertFalse(ProfileEditorSection.LOCATIONS in ProfilePolicy.sections(base))
        val service=base.copy(summary=base.summary.copy(backendKind=ProfileBackendKind.BUSINESS),modules=base.modules+ProfileModule("SERVICES","Services",true,"PUBLIC",false,true)+ProfileModule("BRANCHES","Locations",true,"PUBLIC",false,true))
        assertTrue(ProfileEditorSection.SERVICES in ProfilePolicy.sections(service))
        assertTrue(ProfileEditorSection.LOCATIONS in ProfilePolicy.sections(service))
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
        assertFalse(ProfilePolicy.validLink("PHONE","0100 123 4567"))
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
        assertEquals(ProfileBackendKind.PERSONAL,mapped.backendKind)
        assertFalse(mapped.completion.publishReady)
        assertEquals(listOf("SLUG_REQUIRED"),mapped.completion.blockingIssueCodes)
        assertEquals(ProfileVerificationState.UNVERIFIED,mapped.verification)
    }

    @Test fun `publishing requires readiness explicit review and idle state`() {
        assertFalse(ProfilePublishingPolicy.canPublish(true,false,false))
        assertFalse(ProfilePublishingPolicy.canPublish(false,true,false))
        assertFalse(ProfilePublishingPolicy.canPublish(true,true,true))
        assertTrue(ProfilePublishingPolicy.canPublish(true,true,false))
    }

    @Test fun `editor mapping preserves canonical identity fields and safe document metadata`() {
        val mapped=ProfileEditorResponse(
            profile=EditorProfileDto(id="profile-1",displayName="Sarah",draftRevision=4),
            identity=EditorIdentityDto(displayName="Sarah",firstName="Sarah",lastName="Ahmed",profession="DESIGNER",customProfession="Product designer",company="POP",industryAr="تصميم",industryEn="Design"),
            documents=listOf(EditorDocumentDto(id="doc-1",originalFilename="portfolio.pdf",originalName="portfolio.pdf",publicUrl="https://cdn.example/portfolio.pdf",mimeType="application/pdf",sizeBytes="1024",title="Portfolio",displayTitleAr="الأعمال",displayTitleEn="Portfolio",visibility="PUBLIC",sortOrder=0,createdAt="2026-08-09T00:00:00Z")),
            documentCapability=EditorDocumentCapabilityDto(uploadSupported=true,uploadEndpoint="/api/mobile/profiles/profile-1/files",unavailableReason="MOBILE_DOCUMENT_REPLACE_DELETE_NOT_IMPLEMENTED"),
        ).toContent(summary(),"sarah-a1b2")
        assertEquals("Sarah",mapped.firstName)
        assertEquals("DESIGNER",mapped.profession)
        assertEquals("Design",mapped.industryEn)
        assertEquals("doc-1",mapped.documents.single().id)
        assertEquals(1024L,mapped.documents.single().sizeBytes)
        assertTrue(mapped.documentCapability.uploadSupported)
        assertFalse(mapped.documentCapability.deleteSupported)
    }
}

internal fun summary(id:String="profile-1",isPrimary:Boolean=true)=OwnedProfile(id,"Sarah","Designer",null,ProfileBackendKind.PERSONAL,"personal","DRAFT","PRIVATE",isPrimary,completion=ProfileCompletion(false,listOf("VISIBILITY_REQUIRED")))
internal fun content(modules:List<ProfileModule> = emptyList())=ProfileContent(
    summary=summary(),draftRevision=1,primaryLanguage="en",displayLabel="Sarah",displayName="Sarah",displayNameAr="سارة",displayNameEn="Sarah",
    jobTitleAr="",jobTitleEn="Designer",organizationNameAr="",organizationNameEn="",title="",bio="",bioAr="",bioEn="",descriptionAr="",descriptionEn="",
    phone="",alternatePhone="",email="",website="",whatsappBusiness="",whatsappPrivate="",locationText="",addressAr="",addressEn="",contactVisibility=emptyMap(),
    slug="sarah-a1b2",theme="CLASSIC_LIGHT",templateName="Classic",links=emptyList(),services=emptyList(),locations=emptyList(),media=emptyList(),modules=modules,
)
