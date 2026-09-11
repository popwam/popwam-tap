package com.popwam.pop.ui.profile

import com.google.gson.JsonElement
import com.google.gson.JsonPrimitive

enum class ProfileLoadState { INITIAL_LOADING, CONTENT, EMPTY, ERROR }
enum class ProfileBackendKind { PERSONAL, BUSINESS }
enum class ProfileCategoryKind { PERSONAL, PROFESSIONAL, BUSINESS, RESTAURANT, CLINIC, SERVICES, CREATOR, OTHER }
enum class ProfileVerificationState { UNAVAILABLE, UNVERIFIED, PENDING, VERIFIED, REJECTED }
enum class ProfileEditorSection { BASIC_INFORMATION, ABOUT, CONTACT_LINKS, TYPE_DETAILS, MEDIA, APPEARANCE, VERIFICATION, VISIBILITY, SERVICES, LOCATIONS, TEMPLATE }
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
    val contentCompletion: ProfileContentCompletion? = null,
    val editor: com.popwam.pop.data.api.ProfileEditorResponse? = null,
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
    val itemType: String = "SERVICE",
    val imageUrl: String? = null,
    val price: String? = null,
    val currency: String? = null,
    val category: String? = null,
    val featured: Boolean = false,
    val sortOrder: Int = 0,
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

data class ProfileDocument(
    val id:String,
    val originalFilename:String,
    val publicUrl:String,
    val mimeType:String,
    val sizeBytes:Long,
    val title:String,
    val displayTitleAr:String,
    val displayTitleEn:String,
    val visibility:String,
    val sortOrder:Int,
)
data class ProfileDocumentCapability(
    val uploadSupported:Boolean=false,
    val uploadEndpoint:String="",
    val replaceSupported:Boolean=false,
    val deleteSupported:Boolean=false,
    val visibilitySupported:Boolean=false,
    val unavailableReason:String?=null,
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

enum class ProfileStructuredValueType { TEXT, LONG_TEXT, URL, EMAIL, INTEGER, STRING_LIST, EDUCATION, EXPERIENCE, PROJECT, WEEKLY_HOURS, UNKNOWN }
enum class ProfileDataClassification { PUBLIC_PROFILE, OWNER_PRIVATE, TRUST_VERIFICATION, UNKNOWN }

data class ProfileFieldCapability(
    val key:String,
    val moduleKey:String,
    val label:String,
    val valueType:ProfileStructuredValueType,
    val repeatable:Boolean,
    val requiredForCompletion:Boolean,
    val visibilitySupported:Boolean,
    val maxItems:Int,
    val classification:ProfileDataClassification=ProfileDataClassification.PUBLIC_PROFILE,
)

data class ProfileStructuredEntry(
    val id:String="",
    val fieldKey:String,
    val instanceKey:String="",
    val moduleKey:String,
    val value:JsonElement=JsonPrimitive(""),
    val visibility:String="ONLY_ME",
    val sortOrder:Int=0,
)

data class ProfileContentIssue(val code:String,val path:String,val fieldKey:String?,val messageKey:String)
data class ProfileContentCompletion(val complete:Boolean=false,val issues:List<ProfileContentIssue> = emptyList())
data class ProfileVerificationSignal(val kind:String,val status:String,val verifiedAt:String?,val expiresAt:String?,val reasonCode:String?,val publicBadge:Boolean)
data class ProfileVerification(val submissionSupported:Boolean=false,val overallStatus:String="NOT_STARTED",val signals:List<ProfileVerificationSignal> = emptyList())

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
    val fieldCapabilities: List<ProfileFieldCapability> = emptyList(),
    val structuredEntries: List<ProfileStructuredEntry> = emptyList(),
    val contentCompletion: ProfileContentCompletion = ProfileContentCompletion(),
    val verification: ProfileVerification = ProfileVerification(),
    val firstName: String = "",
    val lastName: String = "",
    val profession: String = "PERSONAL",
    val customProfession: String = "",
    val company: String = "",
    val industryAr: String = "",
    val industryEn: String = "",
    val documents: List<ProfileDocument> = emptyList(),
    val documentCapability: ProfileDocumentCapability = ProfileDocumentCapability(),
    val imageUploadMaxBytes: Long = 5L*1024*1024,
    val templateId: String? = null,
    val templateImageUrl: String? = null,
    val storefront: com.popwam.pop.data.api.StorefrontEntitlementsDto = com.popwam.pop.data.api.StorefrontEntitlementsDto(),
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
    val templates: List<com.popwam.pop.data.api.ProfileTemplateDto> = emptyList(),
    val templatesLoading: Boolean = false,
    val uploadedItemImage: String? = null,
)

sealed interface ProfileEditorMutation {
    data class Identity(
        val displayName:String,
        val displayLabel:String,
        val displayNameAr:String,
        val displayNameEn:String,
        val jobTitleAr:String,
        val jobTitleEn:String,
        val organizationNameAr:String,
        val organizationNameEn:String,
        val primaryLanguage:String,
        val firstName:String="",
        val lastName:String="",
        val profession:String="PERSONAL",
        val customProfession:String="",
        val company:String="",
        val industryAr:String="",
        val industryEn:String="",
    ):ProfileEditorMutation
    data class About(val title:String,val bio:String,val bioAr:String,val bioEn:String,val descriptionAr:String,val descriptionEn:String):ProfileEditorMutation
    data class Contact(val phone:String,val alternatePhone:String,val email:String,val website:String,val whatsappBusiness:String,val whatsappPrivate:String,val locationText:String,val addressAr:String,val addressEn:String,val visibility:Map<String,String>):ProfileEditorMutation
    data class LinkUpsert(val link:ProfileLink):ProfileEditorMutation
    data class LinkDelete(val id:String):ProfileEditorMutation
    data class LinkReorder(val ids:List<String>):ProfileEditorMutation
    data class ServiceUpsert(val service:ProfileService):ProfileEditorMutation
    data class TemplateSelect(val template:com.popwam.pop.data.api.ProfileTemplateDto):ProfileEditorMutation
    data class ServiceReorder(val ids:List<String>):ProfileEditorMutation
    data class ServiceDelete(val id:String):ProfileEditorMutation
    data class LocationUpsert(val location:ProfileLocation):ProfileEditorMutation
    data class LocationDelete(val id:String):ProfileEditorMutation
    data class Appearance(val theme:String):ProfileEditorMutation
    data class AddModule(val key:String):ProfileEditorMutation
    data class UpdateModule(val key:String,val enabled:Boolean,val visibility:String):ProfileEditorMutation
    data class StructuredEntryUpsert(val entry:ProfileStructuredEntry):ProfileEditorMutation
    data class StructuredEntryDelete(val id:String):ProfileEditorMutation
    data class StructuredEntryReorder(val fieldKey:String,val ids:List<String>):ProfileEditorMutation
}

data class ProfileMediaUpload(val purpose:String,val fileName:String,val mimeType:String,val bytes:ByteArray)
data class ProfileDocumentUpload(val titleAr:String,val titleEn:String,val fileName:String,val mimeType:String,val bytes:ByteArray)

sealed interface ProfileEvent {
    data object LoadTemplates:ProfileEvent
    data object ClearItemImage:ProfileEvent
    data class UploadItemImage(val media:ProfileMediaUpload):ProfileEvent
    data object Refresh:ProfileEvent
    data object Retry:ProfileEvent
    data object OpenList:ProfileEvent
    data object OpenCreate:ProfileEvent
    data class SelectProfile(val id:String):ProfileEvent
    data class OpenProfile(val id:String):ProfileEvent
    data class OpenPublicPreview(val id:String):ProfileEvent
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
    data class UploadDocument(val document:ProfileDocumentUpload):ProfileEvent
    data class RemoveMedia(val mediaId:String):ProfileEvent
    data class OpenShare(val id:String):ProfileEvent
    data class OpenQr(val id:String):ProfileEvent
    data class OpenNfc(val id:String):ProfileEvent
}

sealed interface ProfileDestination {
    data object List:ProfileDestination
    data object Create:ProfileDestination
    data class View(val id:String):ProfileDestination
    data class PublicPreview(val id:String):ProfileDestination
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
