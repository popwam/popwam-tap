package com.popwam.pop.ui.profile

import com.popwam.pop.data.api.*
import com.popwam.pop.data.local.*
import com.popwam.pop.data.repository.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import java.lang.reflect.Proxy

class ShowcaseLocalFirstTest {
    private class MemoryStore:LocalFirstSnapshotStore {
        val data=mutableMapOf<String,AccountLocalState>()
        override suspend fun read(accountId:String)=data[accountId]
        override suspend fun update(accountId:String,transform:(AccountLocalState)->AccountLocalState)=transform(data[accountId] ?: AccountLocalState(accountId=accountId)).also{data[accountId]=it}
        override suspend fun clearAccount(accountId:String)=data.remove(accountId)!=null
    }
    private fun remote(call:(String)->Any?):PopwamRepository {
        val api=Proxy.newProxyInstance(PopwamApi::class.java.classLoader,arrayOf(PopwamApi::class.java)){_,method,args->
            try { call(method.name) } catch(error:Throwable) {
                // Retrofit reports suspend-call failures through the continuation, not Java checked exceptions.
                @Suppress("UNCHECKED_CAST")
                val continuation=args!!.last() as kotlin.coroutines.Continuation<Any?>
                continuation.resumeWith(Result.failure(error))
                kotlin.coroutines.intrinsics.COROUTINE_SUSPENDED
            }
        } as PopwamApi
        return PopwamRepository(api)
    }
    private fun snapshot()=AccountLocalState(accountId="owner",profiles=ProfilesResponse(ok=true),selector=ProfileSelectorResponse(ok=true,selectedProfileId="p"),editors=mapOf("p" to ProfileEditorResponse(ok=true,profile=EditorProfileDto(id="p",draftRevision=4))),lastSuccessfulSyncAt=100)
    @Test fun `real cached startup and storefront inspection make zero requests`()=runTest {
        val store=MemoryStore().apply{data["owner"]=snapshot()}
        val local=LocalFirstRepository(remote{error("Unexpected request: $it")},store,{"owner"},backgroundScope,now={101})
        assertEquals(4,local.core("p","en").editors["p"]?.profile?.draftRevision)
        assertTrue(local.core("p","en").editors["p"]?.services?.isEmpty()==true)
    }
    @Test fun `real catalogue reads fresh cache refreshes stale cache and preserves cache on network failure`()=runTest {
        var requests=0;var offline=false;var time=101L
        val cached=TemplatesResponse(ok=true,templates=listOf(ProfileTemplateDto(id="old")))
        val store=MemoryStore().apply{data["owner"]=snapshot().copy(templateCatalog=cached,templateCatalogSyncedAt=100)}
        val local=LocalFirstRepository(remote{requests++;if(offline)throw IOException("offline");TemplatesResponse(ok=true,templates=listOf(ProfileTemplateDto(id="new")))},store,{"owner"},backgroundScope,now={time})
        assertEquals("old",local.templateCatalog().templates.single().id);assertEquals(0,requests)
        time+=24L*60*60*1000
        assertEquals("new",local.templateCatalog().templates.single().id);assertEquals(1,requests)
        time+=24L*60*60*1000;offline=true
        assertEquals("new",local.templateCatalog().templates.single().id);assertEquals(2,requests)
        assertNotNull(store.data["owner"])
    }
    @Test fun `real mutation persists server snapshot without refetch and does not overwrite a newer revision`()=runTest {
        val store=MemoryStore().apply{data["owner"]=snapshot()}
        val editor=ProfileEditorResponse(ok=true,profile=EditorProfileDto(id="p",draftRevision=5),appearance=EditorAppearanceDto(templateId="t"),services=listOf(EditorServiceDto(id="s",itemType="PRODUCT",price=null,featured=true)))
        val requests=mutableListOf<String>()
        val remote=remote{requests+=it;assertEquals("mutateProfileEditor",it);ApiResult(ok=true,draftRevision=5,editor=editor)}
        val local=LocalFirstRepository(remote,store,{"owner"},backgroundScope,now={101})
        AndroidProfilesRepository(remote,local,{"en"}).mutate("p",4,ProfileEditorMutation.TemplateSelect(ProfileTemplateDto(id="t")))
        assertEquals(editor,store.data["owner"]?.editors?.get("p"));assertEquals(listOf("mutateProfileEditor"),requests)
        local.persistEditor("owner","p",editor.copy(profile=editor.profile.copy(draftRevision=3)))
        assertEquals(5,store.data["owner"]?.editors?.get("p")?.profile?.draftRevision)
    }
    @Test fun `failed writes keep readable cache and logout and account switch isolate snapshots`()=runTest {
        val store=MemoryStore().apply{data["owner"]=snapshot();data["other"]=AccountLocalState(accountId="other")}
        var account="owner"
        val remote=remote{throw IOException("offline")}
        val local=LocalFirstRepository(remote,store,{account},backgroundScope,now={101})
        try { AndroidProfilesRepository(remote,local,{"en"}).mutate("p",4,ProfileEditorMutation.ServiceDelete("s"));fail("Expected failure") }catch(_:IOException){}
        assertEquals(snapshot(),local.core("p","en"))
        account="other"
        local.persistEditor("owner","p",ProfileEditorResponse(ok=true,profile=EditorProfileDto(id="p",draftRevision=9)))
        assertEquals(4,store.data["owner"]?.editors?.get("p")?.profile?.draftRevision)
        assertTrue(store.data["other"]!!.editors.isEmpty())
        local.clearCurrentAccount();assertNull(store.data["other"]);assertNotNull(store.data["owner"])
    }
    @Test fun `successful image upload persists draft asset with no follow-up request`()=runTest {
        val store=MemoryStore().apply{data["owner"]=snapshot()}
        val requests=mutableListOf<String>()
        val remote=remote{requests+=it;assertEquals("uploadMedia",it);ProfileMediaUploadResponse(ok=true,asset=ProfileMediaAssetDto("image","GALLERY","DRAFT_ATTACHED","/api/profiles/p/media/image"))}
        val local=LocalFirstRepository(remote,store,{"owner"},backgroundScope,now={101})
        val (url,result)=AndroidProfilesRepository(remote,local,{"en"}).uploadItemImage("p",4,ProfileMediaUpload("GALLERY","item.jpg","image/jpeg",byteArrayOf(1)))
        assertEquals("/api/profiles/p/media/image",url);assertEquals(5,result.draftRevision)
        assertEquals("ONLY_ME",store.data["owner"]?.editors?.get("p")?.media?.single()?.visibility)
        assertEquals(listOf("uploadMedia"),requests)
    }
    @Test fun `conflict refresh reads only the affected editor and replaces the stale cached revision`()=runTest {
        val store=MemoryStore().apply{data["owner"]=snapshot()}
        val requests=mutableListOf<String>()
        val editor=ProfileEditorResponse(ok=true,profile=EditorProfileDto(id="p",draftRevision=9))
        val remote=remote{requests+=it;assertEquals("profileEditor",it);editor}
        val local=LocalFirstRepository(remote,store,{"owner"},backgroundScope,now={101})
        AndroidProfilesRepository(remote,local,{"en"}).refreshEditor("p")
        assertEquals(editor,store.data["owner"]?.editors?.get("p"))
        assertEquals(listOf("profileEditor"),requests)
    }
}
