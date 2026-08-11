package com.popwam.pop.ui.profile

import androidx.compose.ui.text.input.ImeAction
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive
import com.popwam.pop.ui.components.PopFormImePolicy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileFormValidationTest {
    @Test fun `identity reports the first invalid field in visual order`() {
        val result=ProfileFormValidation.identity("  ","x".repeat(81),"","","","","","",false)
        assertFalse(result.valid)
        assertEquals(ProfileFormField.DISPLAY_NAME.key,result.firstInvalidField)
        assertEquals(ProfileValidationCode.REQUIRED,result[ProfileFormField.DISPLAY_NAME])
        assertEquals(ProfileValidationCode.TOO_LONG,result[ProfileFormField.DISPLAY_LABEL])
    }

    @Test fun `international phone validation and normalization are not Egypt specific`() {
        val french="+33 1 42 34 56 78"
        val emirates="+971 50 123 4567"
        assertTrue(ProfileFormValidation.contact(french,"","","",emirates,"","","","").valid)
        assertEquals("+33142345678",ProfileFormValidation.normalizedPhone(french))
        assertEquals("+971501234567",ProfileFormValidation.normalizedPhone(emirates))
        assertEquals(ProfileValidationCode.INVALID_PHONE,ProfileFormValidation.contact("+33 1","","","","","","","","")[ProfileFormField.PHONE])
        assertEquals(ProfileValidationCode.INVALID_PHONE,ProfileFormValidation.contact("050 123 4567","","","","","","","","")[ProfileFormField.PHONE])
    }

    @Test fun `technical profile values stay LTR by capability rather than screen chrome`() {
        val url=capability("booking_url",ProfileStructuredValueType.URL)
        val years=capability("education",ProfileStructuredValueType.EDUCATION)
        val skills=capability("skills",ProfileStructuredValueType.STRING_LIST)
        assertTrue(ProfileStructuredPolicy.isTechnical(url))
        assertTrue(ProfileStructuredPolicy.isTechnical(years,"startYear"))
        assertFalse(ProfileStructuredPolicy.isTechnical(skills))
    }

    @Test fun `canonical identity fields are exposed only to relevant profile categories`() {
        assertTrue(ProfileIdentityPolicy.showsPersonalName(ProfileCategoryKind.PERSONAL))
        assertFalse(ProfileIdentityPolicy.showsCompany(ProfileCategoryKind.PERSONAL))
        assertTrue(ProfileIdentityPolicy.showsProfession(ProfileCategoryKind.PROFESSIONAL))
        assertTrue(ProfileIdentityPolicy.showsCompany(ProfileCategoryKind.PROFESSIONAL))
        assertTrue(ProfileIdentityPolicy.showsIndustry(ProfileCategoryKind.BUSINESS))
        assertFalse(ProfileIdentityPolicy.showsProfession(ProfileCategoryKind.RESTAURANT))
    }

    @Test fun `document policy mirrors safe backend type size and extension checks`() {
        assertEquals(ProfileDocumentValidation.VALID,ProfileDocumentPolicy.validate("resume.pdf","application/pdf",128_000))
        assertEquals(ProfileDocumentValidation.VALID,ProfileDocumentPolicy.validate("contact.vcf","text/vcard",2_000))
        assertEquals(ProfileDocumentValidation.INVALID_TYPE,ProfileDocumentPolicy.validate("resume.jpg","application/pdf",128_000))
        assertEquals(ProfileDocumentValidation.TOO_LARGE,ProfileDocumentPolicy.validate("resume.pdf","application/pdf",ProfileDocumentPolicy.maxBytes+1))
        assertEquals(ProfileDocumentValidation.EMPTY,ProfileDocumentPolicy.validate("resume.pdf","application/pdf",0))
    }

    @Test fun `normal profile editor never mixes trust capabilities into public data`() {
        val public=capability("skills",ProfileStructuredValueType.STRING_LIST).copy(classification=ProfileDataClassification.PUBLIC_PROFILE)
        val trust=capability("licenseEvidence",ProfileStructuredValueType.TEXT).copy(classification=ProfileDataClassification.TRUST_VERIFICATION)
        val content=content().copy(fieldCapabilities=listOf(public,trust))
        assertEquals(listOf("skills"),ProfilePolicy.editableCapabilities(content).map{it.key})
        assertTrue(ProfileEditorSection.TYPE_DETAILS in ProfilePolicy.sections(content))
        assertFalse(ProfileEditorSection.TYPE_DETAILS in ProfilePolicy.sections(content.copy(fieldCapabilities=listOf(trust))))
    }

    @Test fun `structured required fields and value semantics are validated`() {
        val education=capability("education",ProfileStructuredValueType.EDUCATION,true)
        val invalid=JsonObject().apply { addProperty("institution","");addProperty("startYear",1800) }
        val result=ProfileStructuredPolicy.validate(education,invalid)
        assertEquals(ProfileValidationCode.REQUIRED,result.errors[ProfileStructuredPolicy.fieldId("education","institution")])
        assertEquals(ProfileValidationCode.INVALID_NUMBER,result.errors[ProfileStructuredPolicy.fieldId("education","startYear")])

        val listCapability=capability("skills",ProfileStructuredValueType.STRING_LIST,true,maxItems=2)
        val list=JsonArray().apply{add("Compose");add("Kotlin")}
        assertTrue(ProfileStructuredPolicy.validate(listCapability,list).valid)
        list.add("Design")
        assertEquals(ProfileValidationCode.TOO_MANY_ITEMS,ProfileStructuredPolicy.validate(listCapability,list).errors[ProfileStructuredPolicy.fieldId("skills")])
    }

    @Test fun `IME policy unions insets and preserves multiline newline action`() {
        assertEquals(720,PopFormImePolicy.bottomInset(60,720))
        assertEquals(60,PopFormImePolicy.bottomInset(60,0))
        assertEquals(ImeAction.Next,PopFormImePolicy.imeAction(singleLine=true,hasNext=true))
        assertEquals(ImeAction.Done,PopFormImePolicy.imeAction(singleLine=true,hasNext=false))
        assertEquals(ImeAction.Default,PopFormImePolicy.imeAction(singleLine=false,hasNext=true))
        assertTrue(PopFormImePolicy.shouldRelocate(true))
        assertFalse(PopFormImePolicy.shouldRelocate(false))
    }

    @Test fun `completion verification and publishing remain independent state`() {
        val content=content().copy(
            contentCompletion=ProfileContentCompletion(complete=true),
            verification=ProfileVerification(submissionSupported=false,overallStatus="NOT_STARTED"),
            summary=summary().copy(completion=ProfileCompletion(publishReady=false,listOf("VISIBILITY_REQUIRED"))),
        )
        assertTrue(content.contentCompletion.complete)
        assertEquals("NOT_STARTED",content.verification.overallStatus)
        assertFalse(content.summary.completion.publishReady)
        assertNull(content.verification.signals.firstOrNull())
    }

    @Test fun `weekly hours edit preserves existing open and close values`() {
        val initial=JsonObject().apply{
            add("monday",JsonObject().apply{addProperty("closed",false);addProperty("open","09:30");addProperty("close","18:15")})
            add("tuesday",JsonObject().apply{addProperty("closed",true)})
        }
        val parts=structuredParts(ProfileStructuredValueType.WEEKLY_HOURS,initial)
        val flags=structuredFlags(ProfileStructuredValueType.WEEKLY_HOURS,initial)
        assertEquals("09:30",parts["monday-open"])
        assertEquals("18:15",parts["monday-close"])
        assertFalse(flags["monday-closed"] ?: true)
        val roundTrip=buildStructuredValue(ProfileStructuredValueType.WEEKLY_HOURS,"",parts,flags).asJsonObject
        assertEquals("09:30",roundTrip["monday"].asJsonObject["open"].asString)
        assertEquals("18:15",roundTrip["monday"].asJsonObject["close"].asString)
        assertTrue(roundTrip["tuesday"].asJsonObject["closed"].asBoolean)
    }

    private fun capability(key:String,type:ProfileStructuredValueType,required:Boolean=false,maxItems:Int=20)=ProfileFieldCapability(key,"ABOUT",key,type,type in setOf(ProfileStructuredValueType.STRING_LIST,ProfileStructuredValueType.EDUCATION),required,true,maxItems)
}
