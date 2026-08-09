package com.popwam.pop.ui.profile

enum class ProfileLoadState { INITIAL_LOADING, CONTENT, EMPTY, ERROR }
enum class ProfileBackendKind { PERSONAL, BUSINESS }
enum class ProfileCategoryKind { PERSONAL, PROFESSIONAL, BUSINESS, RESTAURANT, CLINIC, SERVICES, CREATOR, OTHER }
enum class ProfileVerificationState { UNAVAILABLE, UNVERIFIED, PENDING, VERIFIED, REJECTED }
enum class ProfileEditorSection { BASIC_INFORMATION, ABOUT, CONTACT_LINKS, MEDIA, APPEARANCE, VERIFICATION, VISIBILITY, SERVICES, LOCATIONS }
enum class ProfileSaveState { IDLE, SAVING, SUCCESS, FAILURE }
enum class ProfilePendingCapability { WORKING_HOURS, TEAM, EDUCATION, EXPERIENCE, SKILLS, PROJECTS, CERTIFICATES, MENU, DELIVERY_RESERVATION, DOCTORS, BOOKING, LICENSE_VERIFICATION }

data class ProfileCompletion(
    val publishReady: Boolean = false,
    val blockingIssueCodes: List<String> = emptyList(),
)

data class ProfileMutationResult(
    val draftRevision: Int,
    val completion: ProfileCompletion? = null,
    val lifecycle: String? = null,
    val successful: Boolean = true,
    val errorCode: String? = null,
)

data class OwnedProfile(
    val id: String,
    val name: String,
    val subtitle: String? = null,
    val avatarUrl: String? = null,
    val backendKind: ProfileBackendKind,
    val categoryKind: ProfileCategoryKind,
    val categoryKey: String? = null,
    val lifecycle: String,
    val visibility: String,
    val isPrimary: Boolean,
    val verification: ProfileVerificationState = ProfileVerificationState.UNAVAILABLE,
    val completion: ProfileCompletion = ProfileCompletion(),
)

data class ProfileLink(
    val id: String = "",
    val title: String = "",
    val titleAr: String = "",
    val titleEn: String = "",
    val type: String = "WEBSITE",
    val url: String = "",
    val visibility: String = "ONLY_ME",
    val sortOrder: Int = 0,
)

data class ProfileService(
    val id: String = "",
    val name: String = "",
    val nameAr: String = "",
    val nameEn: String = "",
    val descriptionAr: String = "",
    val descriptionEn: String = "",
    val url: String = "",
    val visibility: String = "ONLY_ME",
)

data class ProfileLocation(
    val id: String = "",
    val name: String = "",
    val nameAr: String = "",
    val nameEn: String = "",
    val addressAr: String = "",
    val addressEn: String = "",
    val phone: String = "",
    val mapUrl: String = "",
    val visibility: String = "ONLY_ME",
)

data class ProfileMedia(
    val id: String,
    val purpose: String,
    val previewUrl: String,
    val visibility: String,
    val sortOrder: Int,
)

data class ProfileModule(
    val key: String,
    val name: String,
    val enabled: Boolean,
    val visibility: String,
    val required: Boolean,
    val supported: Boolean,
)
data class ProfileModuleOption(val key:String,val name:String)

data class ProfileContent(
    val summary: OwnedProfile,
    val draftRevision: Int,
    val primaryLanguage: String,
    val displayLabel: String,
    val displayName: String,
    val displayNameAr: String,
    val displayNameEn: String,
    val jobTitleAr: String,
    val jobTitleEn: String,
    val organizationNameAr: String,
    val organizationNameEn: String,
    val title: String,
    val bio: String,
    val bioAr: String,
    val bioEn: String,
    val descriptionAr: String,
    val descriptionEn: String,
    val phone: String,
    val alternatePhone: String,
    val email: String,
    val website: String,
    val whatsappBusiness: String,
    val whatsappPrivate: String,
    val locationText: String,
    val addressAr: String,
    val addressEn: String,
    val contactVisibility: Map<String, String>,
    val slug: String,
    val theme: String,
    val templateName: String,
    val links: List<ProfileLink>,
    val services: List<ProfileService>,
    val locations: List<ProfileLocation>,
    val media: List<ProfileMedia>,
    val modules: List<ProfileModule>,
    val addableModules: List<ProfileModuleOption> = emptyList(),
    val pendingCapabilities: Set<ProfilePendingCapability> = emptySet(),
)

data class ProfileCategoryOption(
    val slug: String,
    val name: String,
    val backendKind: ProfileBackendKind,
    val defaultTemplateId: String?,
)

data class ProfileQuota(
    val used: Int = 0,
    val limit: Int = 1,
    val remaining: Int = 0,
    val canAdd: Boolean = false,
    val allowedKinds: Set<ProfileBackendKind> = setOf(ProfileBackendKind.PERSONAL),
    val canCustomizeSlug: Boolean = false,
    val allowedThemes: List<String> = emptyList(),
    val blocker: String? = null,
)

data class ProfilesUiState(
    val loadState: ProfileLoadState = ProfileLoadState.INITIAL_LOADING,
    val profiles: List<OwnedProfile> = emptyList(),
    val activeProfileId: String? = null,
    val content: ProfileContent? = null,
    val quota: ProfileQuota = ProfileQuota(),
    val categories: List<ProfileCategoryOption> = emptyList(),
    val categoryKindLoading: ProfileBackendKind? = null,
    val refreshing: Boolean = false,
    val partial: Boolean = false,
    val offline: Boolean = false,
    val editorDirty: Boolean = false,
    val saveState: ProfileSaveState = ProfileSaveState.IDLE,
    val uploadProgress: Float? = null,
    val errorCode: String? = null,
    val debugErrorCode: String? = null,
)

sealed interface ProfileEditorMutation {
    data class Identity(val displayName:String,val displayLabel:String,val displayNameAr:String,val displayNameEn:String,val jobTitleAr:String,val jobTitleEn:String,val organizationNameAr:String,val organizationNameEn:String,val primaryLanguage:String):ProfileEditorMutation
    data class About(val title:String,val bio:String,val bioAr:String,val bioEn:String,val descriptionAr:String,val descriptionEn:String):ProfileEditorMutation
    data class Contact(val phone:String,val alternatePhone:String,val email:String,val website:String,val whatsappBusiness:String,val whatsappPrivate:String,val locationText:String,val addressAr:String,val addressEn:String,val visibility:Map<String,String>):ProfileEditorMutation
    data class LinkUpsert(val link:ProfileLink):ProfileEditorMutation
    data class LinkDelete(val id:String):ProfileEditorMutation
    data class LinkReorder(val ids:List<String>):ProfileEditorMutation
    data class ServiceUpsert(val service:ProfileService):ProfileEditorMutation
    data class ServiceDelete(val id:String):ProfileEditorMutation
    data class LocationUpsert(val location:ProfileLocation):ProfileEditorMutation
    data class LocationDelete(val id:String):ProfileEditorMutation
    data class Appearance(val theme:String):ProfileEditorMutation
    data class AddModule(val key:String):ProfileEditorMutation
    data class UpdateModule(val key:String,val enabled:Boolean,val visibility:String):ProfileEditorMutation
}

data class ProfileMediaUpload(val purpose:String,val fileName:String,val mimeType:String,val bytes:ByteArray)

sealed interface ProfileEvent {
    data object Refresh:ProfileEvent
    data object Retry:ProfileEvent
    data object OpenList:ProfileEvent
    data object OpenCreate:ProfileEvent
    data class SelectProfile(val id:String):ProfileEvent
    data class OpenProfile(val id:String):ProfileEvent
    data class OpenEditor(val id:String):ProfileEvent
    data class OpenSection(val id:String,val section:ProfileEditorSection):ProfileEvent
    data class SetDirty(val dirty:Boolean):ProfileEvent
    data class Save(val mutation:ProfileEditorMutation):ProfileEvent
    data class SaveVisibility(val access:String,val slug:String):ProfileEvent
    data class PublishProfile(val action:String):ProfileEvent
    data class LoadCategories(val kind:ProfileBackendKind):ProfileEvent
    data class CreateProfile(val name:String,val kind:ProfileBackendKind,val categorySlug:String?,val templateId:String?):ProfileEvent
    data class ArchiveProfile(val id:String,val replacementId:String?):ProfileEvent
    data class UploadMedia(val media:ProfileMediaUpload):ProfileEvent
    data class RemoveMedia(val mediaId:String):ProfileEvent
    data class OpenShare(val id:String):ProfileEvent
    data class OpenQr(val id:String):ProfileEvent
    data class OpenNfc(val id:String):ProfileEvent
}

sealed interface ProfileDestination {
    data object List:ProfileDestination
    data object Create:ProfileDestination
    data class View(val id:String):ProfileDestination
    data class Editor(val id:String):ProfileDestination
    data class Section(val id:String,val section:ProfileEditorSection):ProfileDestination
    data class Share(val id:String):ProfileDestination
    data class Qr(val id:String):ProfileDestination
    data class Nfc(val id:String):ProfileDestination
}

sealed interface ProfileEffect {
    data class Navigate(val destination:ProfileDestination):ProfileEffect
    data object SessionExpired:ProfileEffect
    data object ConfirmDiscard:ProfileEffect
}
