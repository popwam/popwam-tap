package com.popwam.pop.ui.profile

import com.popwam.pop.data.auth.PopAnalytics
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ProfilesViewModelTest {
    private val dispatcher=StandardTestDispatcher()
    private val analytics=object:PopAnalytics{override fun track(event:String,properties:Map<String,String>)=Unit}
    @Before fun setUp()=Dispatchers.setMain(dispatcher)
    @After fun tearDown()=Dispatchers.resetMain()

    @Test fun `profile list loads active content`()=runTest(dispatcher){val repo=FakeProfilesRepository();val vm=ProfilesViewModel(repo,analytics,"profile-1",{});runCurrent();assertEquals(ProfileLoadState.CONTENT,vm.state.value.loadState);assertEquals("profile-1",vm.state.value.content?.summary?.id)}

    @Test fun `initial load failure exposes a recoverable error state`()=runTest(dispatcher){val vm=ProfilesViewModel(FakeProfilesRepository(loadError=IllegalStateException("PROFILE_UNAVAILABLE")),analytics,null,{});runCurrent();assertEquals(ProfileLoadState.ERROR,vm.state.value.loadState);assertEquals("PROFILE_UNAVAILABLE",vm.state.value.errorCode)}

    @Test fun `switch persists active profile and refreshes Home boundary`()=runTest(dispatcher){val selected=mutableListOf<String>();val repo=FakeProfilesRepository();val vm=ProfilesViewModel(repo,analytics,"profile-1",selected::add);runCurrent();vm.onEvent(ProfileEvent.SelectProfile("profile-2"));runCurrent();assertEquals("profile-2",repo.lastLoaded);assertEquals("profile-2",selected.last());assertEquals("profile-2",vm.state.value.activeProfileId)}

    @Test fun `editor dirty state clears only after save success`()=runTest(dispatcher){val repo=FakeProfilesRepository();val vm=ProfilesViewModel(repo,analytics,null,{});runCurrent();vm.onEvent(ProfileEvent.SetDirty(true));vm.onEvent(ProfileEvent.Save(ProfileEditorMutation.Appearance("ELEGANT_DARK")));runCurrent();assertFalse(vm.state.value.editorDirty);assertEquals(ProfileSaveState.SUCCESS,vm.state.value.saveState);assertTrue(repo.saved is ProfileEditorMutation.Appearance)}

    @Test fun `successful mutation advances revision before a subsequent visibility request`()=runTest(dispatcher){val repo=FakeProfilesRepository();val vm=ProfilesViewModel(repo,analytics,null,{});runCurrent();vm.onEvent(ProfileEvent.SetDirty(true));vm.onEvent(ProfileEvent.Save(ProfileEditorMutation.Appearance("ELEGANT_DARK")));runCurrent();assertEquals(2,vm.state.value.content?.draftRevision);vm.onEvent(ProfileEvent.SaveVisibility("PRIVATE",vm.state.value.content!!.slug));runCurrent();assertEquals(2,repo.visibilityRevision);assertEquals(3,vm.state.value.content?.draftRevision);assertEquals("PRIVATE",vm.state.value.content?.summary?.visibility)}

    @Test fun `private visibility persists independently from publish readiness`()=runTest(dispatcher){val repo=FakeProfilesRepository();val vm=ProfilesViewModel(repo,analytics,null,{});runCurrent();vm.onEvent(ProfileEvent.SaveVisibility("PRIVATE",vm.state.value.content!!.slug));runCurrent();assertEquals(ProfileSaveState.SUCCESS,vm.state.value.saveState);assertEquals("PRIVATE",vm.state.value.content?.summary?.visibility);assertFalse(vm.state.value.content!!.summary.completion.publishReady)}

    @Test fun `save failure remains recoverable and preserves dirty edit`()=runTest(dispatcher){val repo=FakeProfilesRepository(saveError=IllegalStateException("STALE_DRAFT"));val vm=ProfilesViewModel(repo,analytics,null,{});runCurrent();vm.onEvent(ProfileEvent.SetDirty(true));vm.onEvent(ProfileEvent.Save(ProfileEditorMutation.Appearance("ELEGANT_DARK")));runCurrent();assertTrue(vm.state.value.editorDirty);assertEquals(ProfileSaveState.FAILURE,vm.state.value.saveState);assertEquals("PROFILE_CONFLICT_REFRESHED",vm.state.value.errorCode);assertEquals("STALE_DRAFT",vm.state.value.debugErrorCode)}

    @Test fun `creation remains possible without category or template metadata`()=runTest(dispatcher){val repo=FakeProfilesRepository();val vm=ProfilesViewModel(repo,analytics,null,{});runCurrent();vm.onEvent(ProfileEvent.CreateProfile("My profile",ProfileBackendKind.PERSONAL));runCurrent();assertEquals("My profile",repo.createdName);assertEquals(ProfileSaveState.SUCCESS,vm.state.value.saveState)}
    @Test fun `add and archive use typed domain boundaries`()=runTest(dispatcher){val selected=mutableListOf<String>();val repo=FakeProfilesRepository();val vm=ProfilesViewModel(repo,analytics,null,selected::add);runCurrent();vm.onEvent(ProfileEvent.CreateProfile("Studio",ProfileBackendKind.BUSINESS));runCurrent();assertEquals("Studio",repo.createdName);assertEquals("profile-new",selected.last());vm.onEvent(ProfileEvent.ArchiveProfile("profile-2","profile-1"));runCurrent();assertEquals("profile-2" to "profile-1",repo.archived);assertNotEquals(ProfileSaveState.SAVING,vm.state.value.saveState)}

    @Test fun `publish readiness reasons replace a generic failure`()=runTest(dispatcher){val repo=FakeProfilesRepository(publishResult=ProfileMutationResult(1,ProfileCompletion(false,listOf("TEMPLATE_REQUIRED")),successful=false,errorCode="PROFILE_NOT_READY"));val vm=ProfilesViewModel(repo,analytics,null,{});runCurrent();vm.onEvent(ProfileEvent.PublishProfile("publish"));runCurrent();assertEquals(ProfileSaveState.FAILURE,vm.state.value.saveState);assertEquals("PROFILE_NOT_READY",vm.state.value.errorCode);assertEquals(listOf("TEMPLATE_REQUIRED"),vm.state.value.content?.summary?.completion?.blockingIssueCodes)}

    @Test fun `publish success updates lifecycle without another reload`()=runTest(dispatcher){val repo=FakeProfilesRepository(publishResult=ProfileMutationResult(1,ProfileCompletion(true),"PUBLISHED"));val vm=ProfilesViewModel(repo,analytics,null,{});runCurrent();vm.onEvent(ProfileEvent.PublishProfile("publish"));runCurrent();assertEquals(ProfileSaveState.SUCCESS,vm.state.value.saveState);assertEquals("PUBLISHED",vm.state.value.content?.summary?.lifecycle);assertTrue(vm.state.value.content!!.summary.completion.publishReady)}

    @Test fun `visible profile actions emit typed navigation`()=runTest(dispatcher){val vm=ProfilesViewModel(FakeProfilesRepository(),analytics,null,{});runCurrent();val effect=async(UnconfinedTestDispatcher(testScheduler),start=CoroutineStart.UNDISPATCHED){vm.effects.first()};vm.onEvent(ProfileEvent.OpenShare("profile-1"));assertEquals(ProfileEffect.Navigate(ProfileDestination.Share("profile-1")),effect.await())}

    @Test fun `latest rapid profile selection wins instead of being dropped`()=runTest(dispatcher){val gate=CompletableDeferred<Unit>();val repo=FakeProfilesRepository(profile2Gate=gate);val vm=ProfilesViewModel(repo,analytics,"profile-1",{});runCurrent();vm.onEvent(ProfileEvent.SelectProfile("profile-2"));runCurrent();vm.onEvent(ProfileEvent.SelectProfile("profile-1"));runCurrent();gate.complete(Unit);runCurrent();assertEquals("profile-1",vm.state.value.activeProfileId);assertEquals("profile-1",vm.state.value.content?.summary?.id)}

    @Test fun `template catalog is never mandatory during cached startup`()=runTest(dispatcher){
        val repo=FakeProfilesRepository();val vm=ProfilesViewModel(repo,analytics,"profile-1",{});runCurrent()
        assertEquals(0,repo.templateCalls)
        vm.onEvent(ProfileEvent.LoadTemplates);runCurrent();assertEquals(1,repo.templateCalls)
    }
    @Test fun `server snapshot template save advances draft and avoids a bootstrap reload`()=runTest(dispatcher){
        val editor=com.popwam.pop.data.api.ProfileEditorResponse(ok=true,profile=com.popwam.pop.data.api.EditorProfileDto(id="profile-1",draftRevision=8),appearance=com.popwam.pop.data.api.EditorAppearanceDto(templateId="selected",templateName="Sunrise"))
        val repo=FakeProfilesRepository(mutationResult=ProfileMutationResult(8,editor=editor));val vm=ProfilesViewModel(repo,analytics,"profile-1",{});runCurrent()
        vm.onEvent(ProfileEvent.Save(ProfileEditorMutation.TemplateSelect(com.popwam.pop.data.api.ProfileTemplateDto(id="selected"))));runCurrent()
        assertEquals(8,vm.state.value.content?.draftRevision);assertEquals("selected",vm.state.value.content?.templateId)
        assertEquals(ProfileSaveState.SUCCESS,vm.state.value.saveState);assertEquals(1,repo.loadCalls)
        assertEquals("DRAFT",vm.state.value.content?.summary?.lifecycle)
    }
    @Test fun `offline write preserves readable items and does not emit session expiry`()=runTest(dispatcher){
        val repo=FakeProfilesRepository(saveError=java.io.IOException("network unavailable"));val vm=ProfilesViewModel(repo,analytics,"profile-1",{});runCurrent()
        val before=vm.state.value.content
        vm.onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceDelete("item")));runCurrent()
        assertEquals(before,vm.state.value.content);assertEquals("PROFILE_OFFLINE",vm.state.value.errorCode)
        assertEquals(ProfileSaveState.FAILURE,vm.state.value.saveState);assertEquals(1,repo.loadCalls)
    }
    @Test fun `template type and entitlement failures retain the selected draft`()=runTest(dispatcher){
        for(code in listOf("PROFILE_TEMPLATE_INCOMPATIBLE","PROFILE_TEMPLATE_PLAN_REQUIRED")){
            val vm=ProfilesViewModel(FakeProfilesRepository(saveError=IllegalStateException(code)),analytics,"profile-1",{});runCurrent()
            val before=vm.state.value.content
            vm.onEvent(ProfileEvent.Save(ProfileEditorMutation.TemplateSelect(com.popwam.pop.data.api.ProfileTemplateDto(id="bad"))));runCurrent()
            assertEquals(before,vm.state.value.content);assertEquals(code,vm.state.value.errorCode)
        }
    }

}

private class FakeProfilesRepository(private val mutationResult:ProfileMutationResult?=null,private val saveError:Exception?=null,private val loadError:Exception?=null,private val publishResult:ProfileMutationResult?=null,private val profile2Gate:CompletableDeferred<Unit>?=null):ProfilesRepository{
    var templateCalls=0;var loadCalls=0
    override suspend fun templates():List<com.popwam.pop.data.api.ProfileTemplateDto>{templateCalls++;return emptyList()}
    var lastLoaded:String?=null;var saved:ProfileEditorMutation?=null;var createdName:String?=null;var archived:Pair<String,String?>?=null;var visibilityRevision:Int?=null
    override suspend fun load(activeProfileId:String?):ProfilesSnapshot{loadCalls++;loadError?.let{throw it};if(activeProfileId=="profile-2")profile2Gate?.await();lastLoaded=activeProfileId;val selected=activeProfileId?:"profile-1";val one=summary();val two=summary("profile-2",false);val created=summary("profile-new",false);val profiles=if(selected=="profile-new")listOf(one,two,created)else listOf(one,two);val selectedSummary=profiles.first{it.id==selected};return ProfilesSnapshot(profiles,selected,content().copy(summary=selectedSummary),ProfileQuota(2,5,3,true,setOf(ProfileBackendKind.PERSONAL,ProfileBackendKind.BUSINESS)),false)}
    override suspend fun mutate(profileId:String,revision:Int,mutation:ProfileEditorMutation):ProfileMutationResult{saveError?.let{throw it};saved=mutation;return mutationResult ?: ProfileMutationResult(revision+1,ProfileCompletion(false,listOf("VISIBILITY_REQUIRED")))}
    override suspend fun updateVisibility(profileId:String,revision:Int,access:String,slug:String?):ProfileMutationResult{saveError?.let{throw it};visibilityRevision=revision;return ProfileMutationResult(revision+1,ProfileCompletion(access!="PRIVATE",if(access=="PRIVATE")listOf("VISIBILITY_REQUIRED")else emptyList()))}
    override suspend fun publish(profileId:String,revision:Int,lifecycle:String,action:String):ProfileMutationResult{saveError?.let{throw it};return publishResult?:ProfileMutationResult(revision,ProfileCompletion(true),"PUBLISHED")}
    override suspend fun create(name:String,kind:ProfileBackendKind,creationKey:String):String{createdName=name;return "profile-new"}
    override suspend fun archive(profileId:String,replacementId:String?):String?{archived=profileId to replacementId;return replacementId}
    override suspend fun upload(profileId:String,revision:Int,media:ProfileMediaUpload)=ProfileMutationResult(revision+1)
    override suspend fun removeMedia(profileId:String,revision:Int,mediaId:String)=ProfileMutationResult(revision+1)
}
