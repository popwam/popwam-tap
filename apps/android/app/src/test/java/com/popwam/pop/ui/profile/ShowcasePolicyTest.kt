package com.popwam.pop.ui.profile

import com.google.gson.Gson
import com.popwam.pop.data.api.*
import com.popwam.pop.data.local.AccountLocalState
import com.popwam.pop.data.repository.templateCatalogNeedsRefresh
import org.junit.Assert.*
import org.junit.Test

class ShowcasePolicyTest {
    private val both=StorefrontEntitlementsDto(true,true,true,null,true,true)
    @Test fun `catalog cache is fresh for one day and refresh occurs only when needed`() {
        assertFalse(templateCatalogNeedsRefresh(true,100,101))
        assertTrue(templateCatalogNeedsRefresh(false,100,101))
        assertTrue(templateCatalogNeedsRefresh(true,100,100+24L*60*60*1000))
        assertTrue(templateCatalogNeedsRefresh(true,100,99))
    }
    @Test fun `catalog filters kind and active state while preserving locked and selected metadata`() {
        val personal=ProfileTemplateDto(id="p",nameEn="Sunrise",profileKind="PERSONAL")
        val business=ProfileTemplateDto(id="b",nameEn="Horizon",profileKind="BUSINESS",allowed=false)
        val catalog=listOf(personal,business,personal.copy(id="inactive",isActive=false))
        assertEquals(listOf(personal),ShowcasePolicy.templates(catalog,ProfileBackendKind.PERSONAL))
        assertEquals(listOf(business),ShowcasePolicy.templates(catalog,ProfileBackendKind.BUSINESS))
        assertFalse(ShowcasePolicy.templates(catalog,ProfileBackendKind.BUSINESS).single().allowed)
    }
    @Test fun `PRODUCT SERVICE product only service only both disabled and neither`() {
        assertEquals(listOf("PRODUCT","SERVICE"),ShowcasePolicy.types(both))
        assertEquals(listOf("PRODUCT"),ShowcasePolicy.types(both.copy(storefrontServicesEnabled=false)))
        assertEquals(listOf("SERVICE"),ShowcasePolicy.types(both.copy(storefrontProductsEnabled=false)))
        assertTrue(ShowcasePolicy.types(both.copy(storefrontEnabled=false)).isEmpty())
        assertTrue(ShowcasePolicy.types(both.copy(storefrontProductsEnabled=false,storefrontServicesEnabled=false)).isEmpty())
    }
    @Test fun `null limit is unlimited and finite limit counts hidden items too`() {
        assertTrue(ShowcasePolicy.canAdd(both,10000))
        assertFalse(ShowcasePolicy.canAdd(both.copy(storefrontMaxItems=0),0))
        assertFalse(ShowcasePolicy.canAdd(both.copy(storefrontMaxItems=3),3))
        assertTrue(ShowcasePolicy.canAdd(both.copy(storefrontMaxItems=3),2))
    }
    @Test fun `optional price retains null and explicit zero and rejects negatives precision and overflow`() {
        for(value in listOf("","0","12.34","999999999999.99"))assertTrue(ShowcasePolicy.priceValid(value))
        for(value in listOf("-1","1e2","1.234","1000000000000"))assertFalse(ShowcasePolicy.priceValid(value))
        val payload=ProfileEditorMutation.ServiceUpsert(ProfileService(nameEn="Item",price=null)).toJson()
        assertTrue(payload.get("price").isJsonNull)
        assertEquals("0",ProfileEditorMutation.ServiceUpsert(ProfileService(nameEn="Item",price="0")).toJson().get("price").asString)
        assertFalse(ShowcasePolicy.itemValid(ProfileService()))
        assertTrue(ShowcasePolicy.itemValid(ProfileService(nameEn="Item")))
    }
    @Test fun `snapshot roundtrip preserves selected template storefront fields and entitlement null`() {
        val item=EditorServiceDto(id="s1",name="Item",itemType="PRODUCT",price=null,imageUrl="/api/profiles/p/media/m",featured=true,visibility="ONLY_ME",sortOrder=20)
        val editor=ProfileEditorResponse(ok=true,profile=EditorProfileDto(id="p",draftRevision=7),appearance=EditorAppearanceDto(templateId="t1",templateName="Sunrise"),services=listOf(item),storefront=both)
        val state=AccountLocalState(accountId="owner",editors=mapOf("p" to editor),templateCatalog=TemplatesResponse(ok=true),templateCatalogSyncedAt=100)
        val restored=Gson().fromJson(Gson().toJson(state),AccountLocalState::class.java)
        assertEquals(state,restored)
        val content=restored.editors.getValue("p").toContent(summary("p"),"")
        assertEquals("t1",content.templateId);assertTrue(content.services.single().featured)
        assertEquals("ONLY_ME",content.services.single().visibility);assertNull(content.services.single().price)
        assertNull(content.storefront.storefrontMaxItems)
    }
    @Test fun `delete reorder and template payload use existing revision editor actions`() {
        assertEquals("SERVICE_DELETE",ProfileEditorMutation.ServiceDelete("s1").toJson().get("type").asString)
        assertEquals(listOf("c","a","b"),ShowcasePolicy.move(listOf("a","c","b"),"c",-1))
        assertEquals(listOf("a","b"),ShowcasePolicy.move(listOf("a","b"),"a",-1))
        assertEquals("TEMPLATE_SELECT",ProfileEditorMutation.TemplateSelect(ProfileTemplateDto(id="t1")).toJson().get("type").asString)
    }
    @Test fun `preview authorizes only the exact HTTPS origin and current profile media`() {
        val base="https://pop.popwam.com/"
        assertTrue(DraftPreviewPolicy.authenticatedPath(base+"mobile-preview/p",base,"p"))
        assertTrue(DraftPreviewPolicy.authenticatedPath(base+"api/profiles/p/media/m",base,"p"))
        for(value in listOf("https://evil.example/mobile-preview/p","https://pop.popwam.com.evil/mobile-preview/p","http://pop.popwam.com/mobile-preview/p",base+"api/profiles/other/media/m","file:///a","https://pop.popwam.com:444/mobile-preview/p"))assertFalse(DraftPreviewPolicy.authenticatedPath(value,base,"p"))
    }
}
