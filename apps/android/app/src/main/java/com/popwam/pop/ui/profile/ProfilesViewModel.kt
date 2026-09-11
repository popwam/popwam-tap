package com.popwam.pop.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.popwam.pop.BuildConfig
import com.popwam.pop.data.api.AdditionalProfileCreateRequest
import com.popwam.pop.data.api.EditorProfileDto
import com.popwam.pop.data.api.ProfileEditorResponse
import com.popwam.pop.data.api.ProfileQuotaDto
import com.popwam.pop.data.api.ProfileRuntimeDiagnostics
import com.popwam.pop.data.api.ProfileSelectorItemDto
import com.popwam.pop.data.api.PublishingReadinessDto
import com.popwam.pop.data.auth.PopAnalytics
import com.popwam.pop.data.repository.PopwamRepository
import com.popwam.pop.data.repository.LocalFirstRepository
import java.io.IOException
import java.util.UUID
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.supervisorScope
import retrofit2.HttpException

data class ProfilesSnapshot(
    val profiles:List<OwnedProfile>,
    val activeProfileId:String?,
    val content:ProfileContent?,
    val quota:ProfileQuota,
    val partial:Boolean,
)

interface ProfilesRepository {
    suspend fun templates():List<com.popwam.pop.data.api.ProfileTemplateDto> = emptyList()
    suspend fun uploadItemImage(profileId:String,revision:Int,media:ProfileMediaUpload):Pair<String,ProfileMutationResult> = throw ProfileDataException("PROFILE_MEDIA_UPLOAD_FAILED")
    suspend fun load(activeProfileId:String?):ProfilesSnapshot
    suspend fun refresh(activeProfileId:String?):ProfilesSnapshot=load(activeProfileId)
    suspend fun refreshEditor(profileId:String):ProfilesSnapshot=load(profileId)
    suspend fun categories(kind:ProfileBackendKind):List<ProfileCategoryOption>
    suspend fun mutate(profileId:String,revision:Int,mutation:ProfileEditorMutation):ProfileMutationResult
    suspend fun updateVisibility(profileId:String,revision:Int,access:String,slug:String?):ProfileMutationResult
    suspend fun publish(profileId:String,revision:Int,lifecycle:String,action:String):ProfileMutationResult
    suspend fun create(name:String,kind:ProfileBackendKind,categorySlug:String?,templateId:String?,creationKey:String):String
    suspend fun archive(profileId:String,replacementId:String?):String?
    suspend fun upload(profileId:String,revision:Int,media:ProfileMediaUpload):ProfileMutationResult
    suspend fun uploadDocument(profileId:String,revision:Int,document:ProfileDocumentUpload):ProfileMutationResult=throw UnsupportedOperationException("PROFILE_DOCUMENT_UPLOAD_UNAVAILABLE")
    suspend fun removeMedia(profileId:String,revision:Int,mediaId:String):ProfileMutationResult
}

class AndroidProfilesRepository(
    private val repository:PopwamRepository,
    private val localFirst:LocalFirstRepository,
    private val localeProvider:()->String,
):ProfilesRepository {
    override suspend fun load(activeProfileId:String?):ProfilesSnapshot=loadInternal(activeProfileId,false)
    override suspend fun refresh(activeProfileId:String?):ProfilesSnapshot=loadInternal(activeProfileId,true)
    private suspend fun loadInternal(activeProfileId:String?,force:Boolean):ProfilesSnapshot {
        val cached=localFirst.core(activeProfileId,localeProvider(),force)
        val selector=cached.selector ?: throw ProfileDataException("PROFILE_LIST_UNAVAILABLE")
        if(!selector.ok) throw ProfileDataException(selector.error ?: "PROFILE_LIST_UNAVAILABLE")
        val selected=selector.selectedProfileId ?: selector.profiles.firstOrNull()?.id
        val legacy=cached.profiles?.profiles.orEmpty().associateBy { it.id }
        val profiles=selector.profiles.map { item ->
            val editor=cached.editors[item.id]
            val old=legacy[item.id]
            item.toOwnedProfile(editor,old?.avatarUrl ?: old?.logoUrl)
        }
        val active=profiles.firstOrNull { it.id==selected }
        val editor=selected?.let(cached.editors::get)
        return ProfilesSnapshot(
            profiles=profiles,
            activeProfileId=active?.id,
            content=if(active!=null && editor?.ok==true) editor.toContent(active,legacy[selected]?.slug.orEmpty()) else null,
            quota=selector.quota.toProfileQuota(),
            partial=legacy.isEmpty() || (selected!=null && editor?.ok!=true),
        )
    }

    override suspend fun refreshEditor(profileId:String):ProfilesSnapshot {
        val accountId=requireNotNull(localFirst.currentAccountId())
        val editor=repository.profileEditor(profileId,localeProvider())
        if(!editor.ok)throw ProfileDataException(editor.error ?: "PROFILE_CONTENT_UNAVAILABLE")
        localFirst.persistEditor(accountId,profileId,editor)
        return loadInternal(profileId,false)
    }

    override suspend fun categories(kind:ProfileBackendKind):List<ProfileCategoryOption> {
        val response=repository.profileCategories(kind.name,localeProvider())
        if(!response.ok) throw ProfileDataException(response.error ?: "PROFILE_CATEGORIES_UNAVAILABLE")
        val arabic=localeProvider().startsWith("ar")
        return response.categories.map { category ->
            ProfileCategoryOption(category.slug,if(arabic) category.nameAr ?: category.nameEn ?: category.slug else category.nameEn ?: category.nameAr ?: category.slug,kind,category.defaultTemplateId)
        }
    }

    override suspend fun templates()=localFirst.templateCatalog().templates

    override suspend fun uploadItemImage(profileId:String,revision:Int,media:ProfileMediaUpload):Pair<String,ProfileMutationResult> {
        val accountId=requireNotNull(localFirst.currentAccountId())
        val cached=localFirst.cachedEditor(profileId) ?: throw ProfileDataException("PROFILE_CONTENT_UNAVAILABLE")
        val result=repository.uploadMedia(profileId,"GALLERY",media.fileName,media.mimeType,media.bytes,revision)
        if(!result.ok || result.asset?.previewUrl==null) throw ProfileDataException(result.error ?: "PROFILE_MEDIA_UPLOAD_FAILED")
        val editor=cached.copy(profile=cached.profile.copy(draftRevision=result.draftRevision ?: revision+1),
            media=cached.media+com.popwam.pop.data.api.EditorMediaDto(result.asset.id,"GALLERY","ONLY_ME",0,result.asset.previewUrl))
        localFirst.persistEditor(accountId,profileId,editor)
        return result.asset.previewUrl to ProfileMutationResult(editor.profile.draftRevision,editor=editor)
    }

    override suspend fun mutate(profileId:String,revision:Int,mutation:ProfileEditorMutation):ProfileMutationResult {
        val accountId=requireNotNull(localFirst.currentAccountId())
        val result=repository.mutateProfileEditor(profileId,revision,mutation.toJson(),localeProvider())
        if(!result.ok) throw ProfileDataException(result.error ?: "PROFILE_SAVE_FAILED")
        if(result.editor?.ok==true) localFirst.persistEditor(accountId,profileId,result.editor)
        else localFirst.invalidateProfile(profileId)
        return result.toMutationResult(revision)
    }

    override suspend fun updateVisibility(profileId:String,revision:Int,access:String,slug:String?):ProfileMutationResult {
        ProfileRuntimeDiagnostics.start(ProfileRuntimeDiagnostics.Operation.VISIBILITY,profileId)
        try {
            val result=if(slug==null) repository.updatePublishingVisibility(profileId,revision,access)
            else repository.updatePublishingVisibilityAndSlug(profileId,revision,access,ProfilePolicy.normalizedSlug(slug))
            ProfileRuntimeDiagnostics.parsed(ProfileRuntimeDiagnostics.Operation.VISIBILITY,true,result.error,profileId)
            if(!result.ok) throw ProfileDataException(result.error ?: "PROFILE_VISIBILITY_FAILED")
            localFirst.invalidateProfile(profileId)
            val mapped=ProfileMutationResult(
                draftRevision=result.draftRevision ?: revision+1,
                completion=result.readiness.toCompletionOrNull(),
                lifecycle=result.lifecycle ?: result.readiness?.lifecycle,
            )
            if(mapped.successful)localFirst.invalidateProfile(profileId)
            ProfileRuntimeDiagnostics.success(ProfileRuntimeDiagnostics.Operation.VISIBILITY,profileId,mapped.draftRevision)
            return mapped
        } catch(error:HttpException) {
            ProfileRuntimeDiagnostics.failure(ProfileRuntimeDiagnostics.Operation.VISIBILITY,error.code(),"HTTP_${error.code()}",profileId)
            throw error
        } catch(error:Exception) {
            ProfileRuntimeDiagnostics.failure(ProfileRuntimeDiagnostics.Operation.VISIBILITY,error=error.message,profileId=profileId)
            throw error
        }
    }

    override suspend fun publish(profileId:String,revision:Int,lifecycle:String,action:String):ProfileMutationResult {
        ProfileRuntimeDiagnostics.start(ProfileRuntimeDiagnostics.Operation.PUBLISH,profileId)
        try {
            val result=repository.publishingAction(profileId,action,if(action=="publish")revision else null)
            ProfileRuntimeDiagnostics.parsed(ProfileRuntimeDiagnostics.Operation.PUBLISH,true,result.error,profileId)
            result.readiness?.let { ProfileRuntimeDiagnostics.readiness(it.ready,it.issues.filter { issue->issue.blocking }.map { issue->issue.code },it.draftRevision) }
            val mapped=ProfileMutationResult(
                draftRevision=result.draftRevision ?: result.readiness?.draftRevision ?: revision,
                completion=result.readiness.toCompletionOrNull(),
                lifecycle=result.lifecycle ?: when(action){"publish","resume"->if(result.ok)"PUBLISHED" else null;"pause"->if(result.ok)"PAUSED" else null;else->null},
                successful=result.ok,
                errorCode=result.error ?: if(result.ok)null else "PROFILE_NOT_READY",
            )
            if(mapped.successful)ProfileRuntimeDiagnostics.success(ProfileRuntimeDiagnostics.Operation.PUBLISH,profileId,mapped.draftRevision)
            else ProfileRuntimeDiagnostics.failure(ProfileRuntimeDiagnostics.Operation.PUBLISH,error=mapped.errorCode,profileId=profileId)
            return mapped
        } catch(error:HttpException) {
            ProfileRuntimeDiagnostics.failure(ProfileRuntimeDiagnostics.Operation.PUBLISH,error.code(),"HTTP_${error.code()}",profileId)
            throw error
        } catch(error:Exception) {
            ProfileRuntimeDiagnostics.failure(ProfileRuntimeDiagnostics.Operation.PUBLISH,error=error.message,profileId=profileId)
            throw error
        }
    }

    override suspend fun create(name:String,kind:ProfileBackendKind,categorySlug:String?,templateId:String?,creationKey:String):String {
        ProfileRuntimeDiagnostics.start(ProfileRuntimeDiagnostics.Operation.CREATE)
        try {
            val result=repository.createAdditionalProfile(AdditionalProfileCreateRequest(name,name,kind.name,categorySlug,templateId,if(localeProvider().startsWith("ar")) "ar" else "en",creationKey))
            ProfileRuntimeDiagnostics.parsed(ProfileRuntimeDiagnostics.Operation.CREATE,true,result.error,result.profileId)
            if(!result.ok || result.profileId.isNullOrBlank()) throw ProfileDataException(result.error ?: "PROFILE_CREATE_FAILED")
            localFirst.core(result.profileId,localeProvider(),force=true)
            ProfileRuntimeDiagnostics.success(ProfileRuntimeDiagnostics.Operation.CREATE,result.profileId)
            return result.profileId
        } catch(error:HttpException) {
            ProfileRuntimeDiagnostics.failure(ProfileRuntimeDiagnostics.Operation.CREATE,error.code(),"HTTP_${error.code()}")
            throw error
        } catch(error:Exception) {
            ProfileRuntimeDiagnostics.failure(ProfileRuntimeDiagnostics.Operation.CREATE,error=error.message)
            throw error
        }
    }

    override suspend fun archive(profileId:String,replacementId:String?):String? {
        val result=repository.archiveProfile(profileId,replacementId)
        if(!result.ok) throw ProfileDataException(result.error ?: "PROFILE_ARCHIVE_FAILED")
        localFirst.invalidateProfile(profileId)
        localFirst.core(result.activeProfileId ?: replacementId,localeProvider(),force=true)
        return result.activeProfileId
    }

    override suspend fun upload(profileId:String,revision:Int,media:ProfileMediaUpload):ProfileMutationResult {
        val result=repository.uploadMedia(profileId,media.purpose,media.fileName,media.mimeType,media.bytes,revision)
        if(!result.ok) throw ProfileDataException(result.error ?: "PROFILE_MEDIA_UPLOAD_FAILED")
        localFirst.invalidateProfile(profileId)
        return ProfileMutationResult(result.draftRevision ?: revision+1)
    }

    override suspend fun uploadDocument(profileId:String,revision:Int,document:ProfileDocumentUpload):ProfileMutationResult {
        val result=repository.uploadFile(profileId,document.titleAr,document.titleEn,document.fileName,document.mimeType,document.bytes)
        if(!result.ok || result.file==null)throw ProfileDataException(result.error ?: "PROFILE_DOCUMENT_UPLOAD_FAILED")
        localFirst.invalidateProfile(profileId)
        return ProfileMutationResult(revision)
    }

    override suspend fun removeMedia(profileId:String,revision:Int,mediaId:String):ProfileMutationResult {
        val result=repository.removeEditorMedia(profileId,mediaId,revision)
        if(!result.ok) throw ProfileDataException(result.error ?: "PROFILE_MEDIA_REMOVE_FAILED")
        localFirst.invalidateProfile(profileId)
        return result.toMutationResult(revision)
    }
}

internal fun ProfileSelectorItemDto.toOwnedProfile(editor:ProfileEditorResponse?,avatarUrl:String?):OwnedProfile {
    val p=editor?.profile
    val readiness=editor?.readiness
    val backend=if(profileKind=="BUSINESS") ProfileBackendKind.BUSINESS else ProfileBackendKind.PERSONAL
    return OwnedProfile(
        id=id,name=p?.displayName?.takeIf(String::isNotBlank) ?: publicName.ifBlank { label },
        subtitle=editor?.preview?.identity?.title,avatarUrl=(avatarUrl ?: editor?.preview?.identity?.imageUrl)?.let(::absoluteMediaUrl),
        backendKind=backend,categoryKind=ProfilePolicy.categoryKind(profileKind,categoryKey),categoryKey=categoryKey,
        lifecycle=p?.lifecycle ?: lifecycle,visibility=p?.access ?: if(lifecycle=="PUBLISHED") "PUBLIC" else "PRIVATE",isPrimary=isPrimary,
        verification=editor?.verification?.overallStatus.toVerificationState(),
        completion=ProfileCompletion(readiness?.ready==true,readiness?.issues.orEmpty().filter { it.blocking }.map { it.code }),
    )
}

internal fun ProfileEditorResponse.toContent(summary:OwnedProfile,slug:String)=ProfileContent(
    summary=summary,draftRevision=profile.draftRevision,primaryLanguage=profile.primaryLanguage,
    displayLabel=identity.displayLabel,displayName=identity.displayName,displayNameAr=identity.displayNameAr,displayNameEn=identity.displayNameEn,
    jobTitleAr=identity.jobTitleAr,jobTitleEn=identity.jobTitleEn,organizationNameAr=identity.organizationNameAr,organizationNameEn=identity.organizationNameEn,
    title=about.title,bio=about.bio,bioAr=about.bioAr,bioEn=about.bioEn,descriptionAr=about.descriptionAr,descriptionEn=about.descriptionEn,
    phone=contact.phone,alternatePhone=contact.alternatePhone,email=contact.email,website=contact.website,whatsappBusiness=contact.whatsappBusiness,
    whatsappPrivate=contact.whatsappPrivate,locationText=contact.locationText,addressAr=contact.addressAr,addressEn=contact.addressEn,contactVisibility=contact.visibility,
    slug=slug,theme=appearance.theme,templateName=appearance.templateName,templateId=appearance.templateId,templateImageUrl=appearance.previewImageUrl,storefront=storefront,imageUploadMaxBytes=imageUploadMaxBytes,
    links=links.map { ProfileLink(it.id,it.title,it.titleAr,it.titleEn,it.type,it.url,it.visibility,it.sortOrder) },
    services=services.map { ProfileService(it.id,it.name,it.nameAr.orEmpty(),it.nameEn.orEmpty(),it.descriptionAr.orEmpty(),it.descriptionEn.orEmpty(),it.url.orEmpty(),it.visibility,it.itemType,it.imageUrl,it.price,it.currency,it.category,it.featured,it.sortOrder) },
    locations=branches.map { ProfileLocation(it.id,it.name,it.nameAr.orEmpty(),it.nameEn.orEmpty(),it.addressAr.orEmpty(),it.addressEn.orEmpty(),it.phone.orEmpty(),it.mapUrl.orEmpty(),it.visibility) },
    media=media.map { ProfileMedia(it.id,it.purpose,absoluteMediaUrl(it.previewUrl),it.visibility,it.sortOrder) },
    modules=modules.map { ProfileModule(it.key,it.name,it.enabled,it.visibility,it.required,it.supported) },
    addableModules=addableModules.map { ProfileModuleOption(it.key,it.name) },
    pendingCapabilities=ProfilePolicy.pendingCapabilities(summary.categoryKind),
    fieldCapabilities=fieldCapabilities.map { ProfileFieldCapability(it.key,it.moduleKey,it.label,ProfileStructuredPolicy.valueType(it.valueType),it.repeatable,it.requiredForCompletion,it.visibilitySupported,it.maxItems,runCatching{ProfileDataClassification.valueOf(it.classification)}.getOrDefault(ProfileDataClassification.UNKNOWN)) },
    structuredEntries=structuredEntries.map { ProfileStructuredEntry(it.id,it.fieldKey,it.instanceKey,it.moduleKey,it.value.deepCopy(),it.visibility,it.sortOrder) },
    contentCompletion=completion.toContentCompletion(),
    verification=ProfileVerification(
        verification.submissionSupported,verification.overallStatus,
        verification.signals.map { ProfileVerificationSignal(it.kind,it.status,it.verifiedAt,it.expiresAt,it.reasonCode,it.publicBadge) },
    ),
    firstName=identity.firstName,lastName=identity.lastName,profession=identity.profession,customProfession=identity.customProfession,
    company=identity.company,industryAr=identity.industryAr,industryEn=identity.industryEn,
    documents=documents.map{ProfileDocument(it.id,it.originalFilename,it.publicUrl,it.mimeType,it.sizeBytes.toLongOrNull() ?: 0L,it.title.orEmpty(),it.displayTitleAr.orEmpty(),it.displayTitleEn.orEmpty(),it.visibility,it.sortOrder)},
    documentCapability=ProfileDocumentCapability(documentCapability.uploadSupported,documentCapability.uploadEndpoint,documentCapability.replaceSupported,documentCapability.deleteSupported,documentCapability.visibilitySupported,documentCapability.unavailableReason),
)

private fun ProfileQuotaDto.toProfileQuota()=ProfileQuota(
    used=used,limit=limit,remaining=remaining,canAdd=quotaAllowsAdditional,
    allowedKinds=allowedProfileKinds.mapNotNull { runCatching { ProfileBackendKind.valueOf(it) }.getOrNull() }.toSet().ifEmpty { setOf(ProfileBackendKind.PERSONAL) },
    canCustomizeSlug=customSlugAllowed,allowedThemes=allowedThemes,blocker=blocker,
)
private fun PublishingReadinessDto?.toCompletionOrNull()=this?.let { ProfileCompletion(it.ready,it.issues.filter { issue->issue.blocking }.map { issue->issue.code }) }
private fun com.popwam.pop.data.api.ProfileContentCompletionDto.toContentCompletion()=ProfileContentCompletion(complete,issues.map { ProfileContentIssue(it.code,it.path,it.fieldKey,it.messageKey) })
private fun String?.toVerificationState()=when(this){"VERIFIED"->ProfileVerificationState.VERIFIED;"PENDING","IN_PROGRESS","REQUIRED"->ProfileVerificationState.PENDING;"REJECTED","NEEDS_UPDATE","EXPIRED"->ProfileVerificationState.REJECTED;"NOT_STARTED"->ProfileVerificationState.UNVERIFIED;else->ProfileVerificationState.UNAVAILABLE}
private fun com.popwam.pop.data.api.ApiResult.toMutationResult(previousRevision:Int)=ProfileMutationResult(
    draftRevision=draftRevision ?: previousRevision+1,
    completion=readiness.toCompletionOrNull(),
    lifecycle=lifecycle ?: readiness?.lifecycle,
    contentCompletion=completion?.toContentCompletion(),
    editor=editor,
)
private fun absoluteMediaUrl(value:String)=if(value.startsWith("http")) value else BuildConfig.API_BASE_URL.trimEnd('/')+"/"+value.trimStart('/')

internal fun ProfileEditorMutation.toJson()=JsonObject().also { json ->
    fun JsonObject.str(name:String,value:String)=addProperty(name,value)
    when(this) {
        is ProfileEditorMutation.Identity->{json.str("type","IDENTITY_SAVE");json.str("displayName",displayName);json.str("displayLabel",displayLabel);json.str("firstName",firstName);json.str("lastName",lastName);json.str("profession",profession);json.str("customProfession",customProfession);json.str("displayNameAr",displayNameAr);json.str("displayNameEn",displayNameEn);json.str("jobTitleAr",jobTitleAr);json.str("jobTitleEn",jobTitleEn);json.str("company",company);json.str("industryAr",industryAr);json.str("industryEn",industryEn);json.str("organizationNameAr",organizationNameAr);json.str("organizationNameEn",organizationNameEn);json.str("primaryLanguage",primaryLanguage)}
        is ProfileEditorMutation.About->{json.str("type","ABOUT_SAVE");json.str("title",title);json.str("bio",bio);json.str("bioAr",bioAr);json.str("bioEn",bioEn);json.str("descriptionAr",descriptionAr);json.str("descriptionEn",descriptionEn)}
        is ProfileEditorMutation.Contact->{json.str("type","CONTACT_SAVE");json.str("phone",phone);json.str("alternatePhone",alternatePhone);json.str("email",email);json.str("website",website);json.str("whatsappBusiness",whatsappBusiness);json.str("whatsappPrivate",whatsappPrivate);json.str("locationText",locationText);json.str("addressAr",addressAr);json.str("addressEn",addressEn);json.add("visibility",JsonObject().also { v->visibility.forEach(v::addProperty) })}
        is ProfileEditorMutation.LinkUpsert->{json.str("type","LINK_UPSERT");if(link.id.isNotBlank())json.str("id",link.id);json.str("title",link.title);json.str("titleAr",link.titleAr);json.str("titleEn",link.titleEn);json.str("destinationType",link.type);json.str("url",link.url);json.str("visibility",link.visibility)}
        is ProfileEditorMutation.LinkDelete->{json.str("type","LINK_DELETE");json.str("id",id)}
        is ProfileEditorMutation.LinkReorder->{json.str("type","LINK_REORDER");json.add("ids",JsonArray().also { a->ids.forEach(a::add) })}
        is ProfileEditorMutation.ServiceUpsert->{json.str("type","SERVICE_UPSERT");if(service.id.isNotBlank())json.str("id",service.id);json.str("nameAr",service.nameAr);json.str("nameEn",service.nameEn);json.str("descriptionAr",service.descriptionAr);json.str("descriptionEn",service.descriptionEn);json.str("url",service.url);json.str("visibility",service.visibility);json.str("itemType",service.itemType);json.addProperty("imageUrl",service.imageUrl);json.addProperty("price",service.price);json.addProperty("currency",service.currency);json.addProperty("category",service.category);json.addProperty("featured",service.featured)}
        is ProfileEditorMutation.TemplateSelect->{json.str("type","TEMPLATE_SELECT");json.str("templateId",template.id)}
        is ProfileEditorMutation.ServiceReorder->{json.str("type","SERVICE_REORDER");json.add("ids",JsonArray().also{array->ids.forEach(array::add)})}
        is ProfileEditorMutation.ServiceDelete->{json.str("type","SERVICE_DELETE");json.str("id",id)}
        is ProfileEditorMutation.LocationUpsert->{json.str("type","BRANCH_UPSERT");if(location.id.isNotBlank())json.str("id",location.id);json.str("nameAr",location.nameAr);json.str("nameEn",location.nameEn);json.str("addressAr",location.addressAr);json.str("addressEn",location.addressEn);json.str("phone",location.phone);json.str("mapUrl",location.mapUrl);json.str("visibility",location.visibility)}
        is ProfileEditorMutation.LocationDelete->{json.str("type","BRANCH_DELETE");json.str("id",id)}
        is ProfileEditorMutation.Appearance->{json.str("type","APPEARANCE_SAVE");json.str("theme",theme)}
        is ProfileEditorMutation.AddModule->{json.str("type","MODULE_ADD");json.str("key",key)}
        is ProfileEditorMutation.UpdateModule->{json.str("type","MODULE_UPDATE");json.str("key",key);json.addProperty("enabled",enabled);json.str("visibility",visibility)}
        is ProfileEditorMutation.StructuredEntryUpsert->{json.str("type","SECTION_ENTRY_UPSERT");if(entry.id.isNotBlank())json.str("id",entry.id);json.str("fieldKey",entry.fieldKey);entry.instanceKey.takeIf(String::isNotBlank)?.let{json.str("instanceKey",it)};json.add("value",entry.value.deepCopy());json.str("visibility",entry.visibility)}
        is ProfileEditorMutation.StructuredEntryDelete->{json.str("type","SECTION_ENTRY_DELETE");json.str("id",id)}
        is ProfileEditorMutation.StructuredEntryReorder->{json.str("type","SECTION_ENTRY_REORDER");json.str("fieldKey",fieldKey);json.add("ids",JsonArray().also{array->ids.forEach(array::add)})}
    }
}

private class ProfileDataException(message:String):IllegalStateException(message)
private suspend fun <T> optionalProfileData(block:suspend()->T):T?=try{block()}catch(error:HttpException){if(error.code()==401)throw error;null}catch(_:Exception){null}

class ProfilesViewModel(
    private val repository:ProfilesRepository,
    private val analytics:PopAnalytics,
    private val initialProfileId:String?,
    private val onActiveProfileChanged:(String)->Unit,
):ViewModel(){
    private val _state=MutableStateFlow(ProfilesUiState(activeProfileId=initialProfileId))
    val state=_state.asStateFlow()
    private val _effects=MutableSharedFlow<ProfileEffect>(extraBufferCapacity=8)
    val effects=_effects.asSharedFlow()
    private var loadJob:Job?=null
    private var requestedProfileId:String?=initialProfileId

    init { load(initial=true,selected=initialProfileId) }

    fun onEvent(event:ProfileEvent){when(event){
        ProfileEvent.LoadTemplates->loadTemplates()
        ProfileEvent.ClearItemImage->_state.value=_state.value.copy(uploadedItemImage=null)
        is ProfileEvent.UploadItemImage->uploadItemImage(event.media)
        ProfileEvent.Refresh,ProfileEvent.Retry->load(initial=_state.value.profiles.isEmpty(),selected=_state.value.activeProfileId,force=true)
        ProfileEvent.OpenList->navigate(ProfileDestination.List)
        ProfileEvent.OpenCreate->navigate(ProfileDestination.Create)
        is ProfileEvent.SelectProfile->select(event.id,navigateToProfile=false)
        is ProfileEvent.OpenProfile->select(event.id,navigateToProfile=true)
        is ProfileEvent.OpenPublicPreview->navigate(ProfileDestination.PublicPreview(event.id))
        is ProfileEvent.OpenEditor->navigate(ProfileDestination.Editor(event.id))
        is ProfileEvent.OpenSection->navigate(ProfileDestination.Section(event.id,event.section))
        is ProfileEvent.SetDirty->_state.value=_state.value.copy(editorDirty=event.dirty,saveState=ProfileSaveState.IDLE,errorCode=null,debugErrorCode=null)
        is ProfileEvent.Save->save(event.mutation)
        is ProfileEvent.SaveVisibility->saveVisibility(event.access,event.slug)
        is ProfileEvent.PublishProfile->publish(event.action)
        is ProfileEvent.LoadCategories->loadCategories(event.kind)
        is ProfileEvent.CreateProfile->create(event)
        is ProfileEvent.ArchiveProfile->archive(event.id,event.replacementId)
        is ProfileEvent.UploadMedia->upload(event.media)
        is ProfileEvent.UploadDocument->uploadDocument(event.document)
        is ProfileEvent.RemoveMedia->removeMedia(event.mediaId)
        is ProfileEvent.OpenShare->navigate(ProfileDestination.Share(event.id))
        is ProfileEvent.OpenQr->navigate(ProfileDestination.Qr(event.id))
        is ProfileEvent.OpenNfc->navigate(ProfileDestination.Nfc(event.id))
    }}

    fun ensureProfile(id:String){if(id.isNotBlank() && (_state.value.activeProfileId!=id || _state.value.content?.summary?.id!=id))select(id,false)}

    private fun select(id:String,navigateToProfile:Boolean){
        if(navigateToProfile) navigate(ProfileDestination.View(id))
        if(id!=requestedProfileId || _state.value.content?.summary?.id!=id){
            requestedProfileId=id
            analytics.track("profile_switched",mapOf("source" to "profiles"))
            load(initial=_state.value.profiles.isEmpty(),selected=id,persist=true)
        }
    }

    private fun load(initial:Boolean,selected:String?,persist:Boolean=false,force:Boolean=false){
        loadJob?.cancel()
        loadJob=viewModelScope.launch {
            val previous=_state.value
            _state.value=previous.copy(loadState=if(initial)ProfileLoadState.INITIAL_LOADING else previous.loadState,refreshing=!initial,errorCode=null,debugErrorCode=null)
            try{
                val snapshot=if(force)repository.refresh(selected) else repository.load(selected)
                _state.value=previous.copy(loadState=if(snapshot.profiles.isEmpty())ProfileLoadState.EMPTY else ProfileLoadState.CONTENT,profiles=snapshot.profiles,activeProfileId=snapshot.activeProfileId,content=snapshot.content,quota=snapshot.quota,refreshing=false,partial=snapshot.partial,offline=false,saveState=ProfileSaveState.IDLE,errorCode=null,debugErrorCode=null)
                requestedProfileId=snapshot.activeProfileId
                snapshot.activeProfileId?.let { if(persist || it!=initialProfileId) onActiveProfileChanged(it) }
            }catch(error:HttpException){if(error.code()==401)_effects.emit(ProfileEffect.SessionExpired)else fail(previous,error.apiCode())}
            catch(error:IOException){_state.value=previous.copy(refreshing=false,offline=true,partial=previous.profiles.isNotEmpty(),loadState=if(previous.profiles.isEmpty())ProfileLoadState.ERROR else previous.loadState,errorCode="PROFILE_OFFLINE")}
            catch(error:Exception){fail(previous,error.message)}
        }
    }

    private fun loadCategories(kind:ProfileBackendKind)=viewModelScope.launch {
        _state.value=_state.value.copy(categoryKindLoading=kind,errorCode=null,debugErrorCode=null)
        try{_state.value=_state.value.copy(categories=repository.categories(kind),categoryKindLoading=null)}catch(error:Exception){_state.value=_state.value.copy(categoryKindLoading=null,errorCode=error.message ?: "PROFILE_CATEGORIES_UNAVAILABLE")}
    }

    private fun loadTemplates()=viewModelScope.launch {
        if(_state.value.templatesLoading)return@launch
        _state.value=_state.value.copy(templatesLoading=true,errorCode=null)
        try { val catalog=repository.templates();_state.value=_state.value.copy(templates=catalog,templatesLoading=false) }
        catch(error:Exception){_state.value=_state.value.copy(templatesLoading=false);handleMutationFailure(error,ProfileOperation.SAVE)}
    }

    private fun uploadItemImage(media:ProfileMediaUpload){val content=_state.value.content?:return
        if(_state.value.saveState==ProfileSaveState.SAVING)return
        viewModelScope.launch {
            _state.value=_state.value.copy(saveState=ProfileSaveState.SAVING,uploadedItemImage=null,errorCode=null)
            try { val (url,result)=repository.uploadItemImage(content.summary.id,content.draftRevision,media)
                if(_state.value.activeProfileId!=content.summary.id)return@launch
                acceptMutation(content,result);_state.value=_state.value.copy(uploadedItemImage=url)
            } catch(error:Exception){if(_state.value.activeProfileId==content.summary.id)handleMutationFailure(error,ProfileOperation.SAVE)}
        }
    }

    private fun save(mutation:ProfileEditorMutation){val content=_state.value.content?:return
        if(_state.value.saveState==ProfileSaveState.SAVING)return
        viewModelScope.launch{
        _state.value=_state.value.copy(saveState=ProfileSaveState.SAVING,errorCode=null,debugErrorCode=null)
        try{
            val result=repository.mutate(content.summary.id,content.draftRevision,mutation)
            analytics.track("profile_editor_saved",mapOf("profile_kind" to content.summary.backendKind.name))
            if(_state.value.activeProfileId!=content.summary.id)return@launch
            acceptMutation(content.applyMutation(mutation),result)
            if(result.editor==null && (result.completion==null || mutation.requiresProjectionRefresh()))refreshBestEffort(content.summary.id)
        } catch(error:HttpException){
            if(_state.value.activeProfileId!=content.summary.id)return@launch
            val code=error.apiCode()
            if(error.code()==401)_effects.emit(ProfileEffect.SessionExpired)
            else if(error.code()==409)recoverConflict(content.summary.id,mutation,code)
            else saveFailed(profileErrorFor(code,ProfileOperation.SAVE),code)
        } catch(error:Exception){if(_state.value.activeProfileId==content.summary.id)handleMutationFailure(error,ProfileOperation.SAVE)}
    }}

    private fun saveVisibility(access:String,slug:String){val content=_state.value.content?:return;viewModelScope.launch{
        _state.value=_state.value.copy(saveState=ProfileSaveState.SAVING,errorCode=null,debugErrorCode=null)
        val normalized=ProfilePolicy.normalizedSlug(slug)
        val changedSlug=normalized.takeIf { it!=content.slug }
        try{
            val result=repository.updateVisibility(content.summary.id,content.draftRevision,access,changedSlug)
            acceptMutation(content.copy(summary=content.summary.copy(visibility=access),slug=changedSlug ?: content.slug),result)
            if(result.completion==null)refreshBestEffort(content.summary.id)
        }catch(error:HttpException){
            if(error.code()==401)_effects.emit(ProfileEffect.SessionExpired)
            else if(error.code()==409)recoverConflict(content.summary.id,null,error.apiCode())
            else saveFailed(profileErrorFor(error.apiCode(),ProfileOperation.VISIBILITY),error.apiCode())
        }catch(error:Exception){saveFailed(profileErrorFor(error.message,ProfileOperation.VISIBILITY),error.message)}
    }}

    private fun publish(action:String){val content=_state.value.content?:return;viewModelScope.launch{
        _state.value=_state.value.copy(saveState=ProfileSaveState.SAVING,errorCode=null,debugErrorCode=null)
        try{
            val result=repository.publish(content.summary.id,content.draftRevision,content.summary.lifecycle,action)
            if(!result.successful){
                acceptReadiness(content,result)
                saveFailed("PROFILE_NOT_READY",result.errorCode ?: "PROFILE_NOT_READY")
                return@launch
            }
            analytics.track(if(action=="publish")"profile_published" else "profile_lifecycle_changed",mapOf("action" to action))
            acceptMutation(content,result)
            if(result.completion==null)refreshBestEffort(content.summary.id)
        }catch(error:HttpException){
            if(error.code()==401)_effects.emit(ProfileEffect.SessionExpired)
            else if(error.code()==409)recoverConflict(content.summary.id,null,error.apiCode())
            else saveFailed(profileErrorFor(error.apiCode(),ProfileOperation.PUBLISH),error.apiCode())
        }catch(error:Exception){saveFailed(profileErrorFor(error.message,ProfileOperation.PUBLISH),error.message)}
    }}

    private fun create(event:ProfileEvent.CreateProfile)=viewModelScope.launch{
        if(event.name.isBlank())return@launch saveFailed("PROFILE_NAME_REQUIRED")
        if(event.kind !in _state.value.quota.allowedKinds)return@launch saveFailed("PROFILE_TYPE_NOT_AVAILABLE","PROFILE_TYPE_NOT_AVAILABLE")
        if(event.categorySlug.isNullOrBlank())return@launch saveFailed("PROFILE_CATEGORY_REQUIRED","PROFILE_CATEGORY_REQUIRED")
        if(event.templateId.isNullOrBlank())return@launch saveFailed("PROFILE_TEMPLATE_UNAVAILABLE","PROFILE_TEMPLATE_REQUIRED")
        _state.value=_state.value.copy(saveState=ProfileSaveState.SAVING,errorCode=null,debugErrorCode=null)
        try{
            val id=repository.create(event.name,event.kind,event.categorySlug,event.templateId,UUID.randomUUID().toString())
            onActiveProfileChanged(id)
            val snapshot=repository.load(id)
            _state.value=_state.value.copy(loadState=ProfileLoadState.CONTENT,profiles=snapshot.profiles,activeProfileId=snapshot.activeProfileId,content=snapshot.content,quota=snapshot.quota,partial=snapshot.partial,refreshing=false,offline=false,editorDirty=false,saveState=ProfileSaveState.SUCCESS,errorCode=null,debugErrorCode=null)
            navigate(ProfileDestination.Editor(id))
        }catch(error:HttpException){
            if(error.code()==401)_effects.emit(ProfileEffect.SessionExpired)
            else saveFailed(profileErrorFor(error.apiCode(),ProfileOperation.CREATE),error.apiCode())
        }catch(error:Exception){saveFailed(profileErrorFor(error.message,ProfileOperation.CREATE),error.message)}
    }

    private fun archive(id:String,replacementId:String?)=viewModelScope.launch{
        _state.value=_state.value.copy(saveState=ProfileSaveState.SAVING,errorCode=null,debugErrorCode=null)
        try{val active=repository.archive(id,replacementId);active?.let(onActiveProfileChanged);load(false,active,persist=true);navigate(ProfileDestination.List)}catch(error:Exception){handleMutationFailure(error,ProfileOperation.SAVE)}
    }

    private fun upload(media:ProfileMediaUpload){val content=_state.value.content?:return;viewModelScope.launch{
        _state.value=_state.value.copy(saveState=ProfileSaveState.SAVING,uploadProgress=0f,errorCode=null,debugErrorCode=null)
        try{val result=repository.upload(content.summary.id,content.draftRevision,media);acceptMutation(content,result);_state.value=_state.value.copy(uploadProgress=1f);refreshBestEffort(content.summary.id)}catch(error:Exception){_state.value=_state.value.copy(uploadProgress=null);handleMutationFailure(error,ProfileOperation.SAVE)}
    }}

    private fun uploadDocument(document:ProfileDocumentUpload){val content=_state.value.content?:return;viewModelScope.launch{
        _state.value=_state.value.copy(saveState=ProfileSaveState.SAVING,uploadProgress=0f,errorCode=null,debugErrorCode=null)
        try{repository.uploadDocument(content.summary.id,content.draftRevision,document);_state.value=_state.value.copy(uploadProgress=1f);refreshBestEffort(content.summary.id)}catch(error:Exception){_state.value=_state.value.copy(uploadProgress=null);handleMutationFailure(error,ProfileOperation.SAVE)}
    }}

    private fun removeMedia(mediaId:String){val content=_state.value.content?:return;viewModelScope.launch{
        _state.value=_state.value.copy(saveState=ProfileSaveState.SAVING,errorCode=null,debugErrorCode=null)
        try{val result=repository.removeMedia(content.summary.id,content.draftRevision,mediaId);acceptMutation(content.copy(media=content.media.filterNot{it.id==mediaId}),result);if(result.completion==null)refreshBestEffort(content.summary.id)}catch(error:Exception){handleMutationFailure(error,ProfileOperation.SAVE)}
    }}

    private fun acceptMutation(previous:ProfileContent,result:ProfileMutationResult){
        if(_state.value.activeProfileId!=previous.summary.id)return
        val local=result.editor?.toContent(previous.summary,previous.slug) ?: previous
        val completion=result.completion ?: local.summary.completion
        val contentCompletion=result.contentCompletion ?: local.contentCompletion
        val lifecycle=result.lifecycle ?: local.summary.lifecycle
        val updated=local.copy(summary=local.summary.copy(completion=completion,lifecycle=lifecycle),contentCompletion=contentCompletion,draftRevision=result.editor?.profile?.draftRevision ?: result.draftRevision)
        _state.value=_state.value.copy(
            profiles=_state.value.profiles.map{if(it.id==updated.summary.id)updated.summary else it},
            content=updated,editorDirty=false,saveState=ProfileSaveState.SUCCESS,errorCode=null,debugErrorCode=null,uploadProgress=null,
        )
    }
    private fun acceptReadiness(content:ProfileContent,result:ProfileMutationResult){
        val completion=result.completion ?: content.summary.completion
        val contentCompletion=result.contentCompletion ?: content.contentCompletion
        val updated=content.copy(summary=content.summary.copy(completion=completion),contentCompletion=contentCompletion,draftRevision=result.draftRevision)
        _state.value=_state.value.copy(content=updated,profiles=_state.value.profiles.map{if(it.id==updated.summary.id)updated.summary else it})
    }
    private suspend fun refreshBestEffort(id:String){
        runCatching{repository.load(id)}.onSuccess{snapshot->_state.value=_state.value.copy(profiles=snapshot.profiles,activeProfileId=snapshot.activeProfileId,content=snapshot.content,quota=snapshot.quota,partial=snapshot.partial,refreshing=false,offline=false,uploadProgress=null)}
            .onFailure{_state.value=_state.value.copy(partial=true,uploadProgress=null)}
    }
    private suspend fun recoverConflict(id:String,pending:ProfileEditorMutation?,rawCode:String){
        val refreshed=runCatching{repository.refreshEditor(id)}.getOrNull()
        val compatible=refreshed?.content?.let{server->pending?.let(server::applyMutation) ?: server}
        if(refreshed!=null)_state.value=_state.value.copy(profiles=refreshed.profiles,activeProfileId=refreshed.activeProfileId,content=compatible,quota=refreshed.quota,partial=refreshed.partial,refreshing=false,offline=false,editorDirty=pending!=null,saveState=ProfileSaveState.FAILURE,errorCode="PROFILE_CONFLICT_REFRESHED",debugErrorCode=rawCode)
        else saveFailed("PROFILE_CONFLICT_REFRESH_FAILED",rawCode)
    }
    private fun fail(previous:ProfilesUiState,message:String?){_state.value=previous.copy(refreshing=false,loadState=if(previous.profiles.isEmpty())ProfileLoadState.ERROR else previous.loadState,partial=previous.profiles.isNotEmpty(),errorCode=message ?: "PROFILE_UNAVAILABLE")}
    private fun saveFailed(message:String?,debug:String?=message){_state.value=_state.value.copy(saveState=ProfileSaveState.FAILURE,errorCode=message ?: "PROFILE_SAVE_FAILED",debugErrorCode=debug)}
    private suspend fun handleMutationFailure(error:Exception,operation:ProfileOperation){if(error is HttpException&&error.code()==401)_effects.emit(ProfileEffect.SessionExpired)else{val raw=if(error is HttpException)error.apiCode() else if(error is IOException)"PROFILE_OFFLINE" else error.message;saveFailed(profileErrorFor(raw,operation),raw)}}
    private fun navigate(destination:ProfileDestination){_effects.tryEmit(ProfileEffect.Navigate(destination))}
}

internal enum class ProfileOperation { CREATE, SAVE, VISIBILITY, PUBLISH }

internal fun profileErrorFor(raw:String?,operation:ProfileOperation)=when {
    raw=="PROFILE_OFFLINE" -> "PROFILE_OFFLINE"
    raw in setOf("PROFILE_TEMPLATE_INCOMPATIBLE","PROFILE_TEMPLATE_PLAN_REQUIRED","TEMPLATE_STOREFRONT_REQUIRED","STOREFRONT_PLAN_REQUIRED","STOREFRONT_LIMIT_REACHED","SHOWCASE_PRICE_INVALID","SHOWCASE_CURRENCY_INVALID","SHOWCASE_IMAGE_INVALID","PROFILE_MEDIA_UPLOAD_FAILED") -> raw!!
    raw=="STALE_DRAFT" -> "PROFILE_CONFLICT_REFRESHED"
    raw=="SLUG_TAKEN" -> "PROFILE_SLUG_TAKEN"
    raw=="PROFILE_NAME_REQUIRED" || raw=="FIELD_REQUIRED" || raw=="PROFILE_CATEGORY_INCOMPATIBLE" -> "PROFILE_REQUIRED_DATA_INCOMPLETE"
    raw=="PROFILE_TEMPLATE_REQUIRED" || raw=="PROFILE_TEMPLATE_NOT_FOUND" -> "PROFILE_TEMPLATE_UNAVAILABLE"
    raw=="PROFILE_LIMIT_REACHED" || raw=="BUSINESS_PROFILES_NOT_ALLOWED" || raw=="PROFILE_TYPE_NOT_AVAILABLE" -> "PROFILE_TYPE_NOT_AVAILABLE"
    raw=="HTTP_405" && operation==ProfileOperation.CREATE -> "PROFILE_CREATE_ENDPOINT_UNAVAILABLE"
    raw=="PROFILE_OFFLINE" || raw=="PROFILE_CREATE_DATABASE_ERROR" || raw=="PUBLISHING_FAILED" || raw?.startsWith("HTTP_5")==true -> "PROFILE_SERVER_UNAVAILABLE"
    operation==ProfileOperation.CREATE -> "PROFILE_CREATE_FAILED"
    operation==ProfileOperation.VISIBILITY -> "PROFILE_VISIBILITY_FAILED"
    operation==ProfileOperation.PUBLISH -> "PROFILE_PUBLISH_FAILED"
    else -> "PROFILE_SAVE_FAILED"
}

private fun ProfileEditorMutation.requiresProjectionRefresh()=when(this){
    is ProfileEditorMutation.LinkUpsert->link.id.isBlank()
    is ProfileEditorMutation.ServiceUpsert->service.id.isBlank()
    is ProfileEditorMutation.LocationUpsert->location.id.isBlank()
    is ProfileEditorMutation.AddModule->true
    is ProfileEditorMutation.StructuredEntryUpsert->entry.id.isBlank()
    else->false
}

private fun ProfileContent.applyMutation(mutation:ProfileEditorMutation)=when(mutation){
    is ProfileEditorMutation.Identity->copy(displayName=mutation.displayName,displayLabel=mutation.displayLabel,displayNameAr=mutation.displayNameAr,displayNameEn=mutation.displayNameEn,jobTitleAr=mutation.jobTitleAr,jobTitleEn=mutation.jobTitleEn,organizationNameAr=mutation.organizationNameAr,organizationNameEn=mutation.organizationNameEn,primaryLanguage=mutation.primaryLanguage,firstName=mutation.firstName,lastName=mutation.lastName,profession=mutation.profession,customProfession=mutation.customProfession,company=mutation.company,industryAr=mutation.industryAr,industryEn=mutation.industryEn,summary=summary.copy(name=mutation.displayName))
    is ProfileEditorMutation.About->copy(title=mutation.title,bio=mutation.bio,bioAr=mutation.bioAr,bioEn=mutation.bioEn,descriptionAr=mutation.descriptionAr,descriptionEn=mutation.descriptionEn)
    is ProfileEditorMutation.Contact->copy(phone=mutation.phone,alternatePhone=mutation.alternatePhone,email=mutation.email,website=mutation.website,whatsappBusiness=mutation.whatsappBusiness,whatsappPrivate=mutation.whatsappPrivate,locationText=mutation.locationText,addressAr=mutation.addressAr,addressEn=mutation.addressEn,contactVisibility=mutation.visibility)
    is ProfileEditorMutation.LinkUpsert->if(mutation.link.id.isBlank())this else copy(links=links.filterNot{it.id==mutation.link.id}+mutation.link)
    is ProfileEditorMutation.LinkDelete->copy(links=links.filterNot{it.id==mutation.id})
    is ProfileEditorMutation.LinkReorder->copy(links=links.sortedBy{mutation.ids.indexOf(it.id).let{i->if(i<0)Int.MAX_VALUE else i}}.mapIndexed{i,item->item.copy(sortOrder=i*10)})
    is ProfileEditorMutation.ServiceUpsert->if(mutation.service.id.isBlank())this else copy(services=services.filterNot{it.id==mutation.service.id}+mutation.service)
    is ProfileEditorMutation.TemplateSelect->copy(templateId=mutation.template.id,templateName=mutation.template.nameEn,templateImageUrl=mutation.template.previewImageUrl)
    is ProfileEditorMutation.ServiceReorder->copy(services=services.sortedBy{mutation.ids.indexOf(it.id)}.mapIndexed{index,item->item.copy(sortOrder=index*10)})
    is ProfileEditorMutation.ServiceDelete->copy(services=services.filterNot{it.id==mutation.id})
    is ProfileEditorMutation.LocationUpsert->if(mutation.location.id.isBlank())this else copy(locations=locations.filterNot{it.id==mutation.location.id}+mutation.location)
    is ProfileEditorMutation.LocationDelete->copy(locations=locations.filterNot{it.id==mutation.id})
    is ProfileEditorMutation.Appearance->copy(theme=mutation.theme)
    is ProfileEditorMutation.AddModule->this
    is ProfileEditorMutation.UpdateModule->copy(modules=modules.map{if(it.key==mutation.key)it.copy(enabled=mutation.enabled,visibility=mutation.visibility)else it})
    is ProfileEditorMutation.StructuredEntryUpsert->if(mutation.entry.id.isBlank())this else copy(structuredEntries=structuredEntries.filterNot{it.id==mutation.entry.id}+mutation.entry)
    is ProfileEditorMutation.StructuredEntryDelete->copy(structuredEntries=structuredEntries.filterNot{it.id==mutation.id})
    is ProfileEditorMutation.StructuredEntryReorder->copy(
        structuredEntries=structuredEntries.map{entry->
            if(entry.fieldKey!=mutation.fieldKey)entry else mutation.ids.indexOf(entry.id)
                .takeIf{it>=0}
                ?.let{entry.copy(sortOrder=it*10)}
                ?: entry
        },
    )
}

private fun HttpException.apiCode()=runCatching{JsonParser.parseString(response()?.errorBody()?.string()).asJsonObject.get("error")?.asString}.getOrNull()?:"HTTP_${code()}"

class ProfilesViewModelFactory(private val repository:ProfilesRepository,private val analytics:PopAnalytics,private val initialProfileId:String?,private val onActiveProfileChanged:(String)->Unit):ViewModelProvider.Factory{
    @Suppress("UNCHECKED_CAST") override fun <T:ViewModel> create(modelClass:Class<T>):T=ProfilesViewModel(repository,analytics,initialProfileId,onActiveProfileChanged) as T
}
