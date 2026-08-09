package com.popwam.pop.ui.profile

import com.google.gson.Gson
import com.popwam.pop.data.api.AdditionalProfileCreateRequest
import com.popwam.pop.data.api.AdditionalProfileCreateResponse
import com.popwam.pop.data.api.ApiResult
import com.popwam.pop.data.api.PublishingActionResponse
import com.popwam.pop.data.api.VisibilityUpdateRequest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileRuntimeContractTest {
    private val gson=Gson()

    @Test fun `personal and business requests use only canonical backend kinds`() {
        val personal=AdditionalProfileCreateRequest("Mina","Mina","PERSONAL","professional","template-personal","en","key-personal")
        val business=AdditionalProfileCreateRequest("Studio","Studio","BUSINESS","restaurant","template-business","en","key-business")
        assertEquals("PERSONAL",gson.fromJson(gson.toJson(personal),AdditionalProfileCreateRequest::class.java).profileKind)
        assertEquals("BUSINESS",gson.fromJson(gson.toJson(business),AdditionalProfileCreateRequest::class.java).profileKind)
        assertFalse(gson.toJson(personal).contains("PROFESSIONAL\""))
        assertFalse(gson.toJson(business).contains("RESTAURANT\""))
    }

    @Test fun `derived type remains canonical kind plus live category and template`() {
        val request=AdditionalProfileCreateRequest("Mina","Mina",ProfileBackendKind.PERSONAL.name,"professional","live-template-id","en","key")
        assertEquals(ProfileCategoryKind.PROFESSIONAL,ProfilePolicy.categoryKind(request.profileKind,request.categorySlug))
        assertEquals("PERSONAL",request.profileKind)
        assertEquals("professional",request.categorySlug)
        assertEquals("live-template-id",request.templateId)
    }

    @Test fun `create response parses profile id wrapper`() {
        val parsed=gson.fromJson("""{"ok":true,"profileId":"profile-new"}""",AdditionalProfileCreateResponse::class.java)
        assertTrue(parsed.ok)
        assertEquals("profile-new",parsed.profileId)
    }

    @Test fun `visibility enum serializes independently from slug and readiness`() {
        val request=VisibilityUpdateRequest(expectedDraftRevision=7,access="PRIVATE")
        val json=gson.toJsonTree(request).asJsonObject
        assertEquals("PRIVATE",json.get("access").asString)
        assertEquals(7,json.get("expectedDraftRevision").asInt)
        assertFalse(json.has("slug"))
    }

    @Test fun `mutation and publishing responses retain revision and readiness reasons`() {
        val mutation=gson.fromJson("""{"ok":true,"draftRevision":8,"readiness":{"ready":false,"draftRevision":8,"issues":[{"code":"TEMPLATE_REQUIRED","blocking":true}]}}""",ApiResult::class.java)
        assertEquals(8,mutation.draftRevision)
        assertEquals("TEMPLATE_REQUIRED",mutation.readiness?.issues?.single()?.code)
        val publish=gson.fromJson("""{"ok":false,"readiness":{"ready":false,"draftRevision":8,"issues":[{"code":"MODULE_INCOMPLETE","blocking":true}]}}""",PublishingActionResponse::class.java)
        assertNull(publish.error)
        assertEquals("MODULE_INCOMPLETE",publish.readiness?.issues?.single()?.code)
    }
}
