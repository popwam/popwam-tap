package com.popwam.pop.data.api

import com.google.gson.JsonObject
import com.google.gson.JsonElement

data class ApiResult(val ok:Boolean=false,val error:String?=null,val url:String?=null)
data class UserDto(val id:String="",val name:String?=null,val phone:String?=null,val email:String="",val role:String="USER",val locale:String?=null)
data class FirebasePhoneExchangeRequest(val deviceName:String)
data class AuthResponse(val ok:Boolean=false,val accessToken:String="",val refreshToken:String="",val accessExpiresIn:Int=0,val refreshExpiresIn:Int=0,val tokenType:String="Bearer",val user:UserDto?=null,val error:String?=null)
data class RefreshRequest(val refreshToken:String,val deviceName:String)
data class LogoutRequest(val refreshToken:String)
data class PasskeyAuthVerifyRequest(val assertion:JsonObject,val deviceName:String)
data class PushTokenRequest(val token:String,val platform:String="ANDROID")
data class LocalizationLocaleDto(
    val code:String="en",
    val name:String="English",
    val nativeName:String="English",
    val rtl:Boolean=false,
    val translations:Map<String,String> = emptyMap(),
)
data class LocalizationBootstrapResponse(
    val ok:Boolean=false,
    val defaultLocale:String="en",
    val translationVersion:Int=0,
    val availableLocales:List<LocalizationLocaleDto> = emptyList(),
    val error:String?=null,
)
data class PlatformPhoneCountryDto(
    val iso2:String="",
    val iso3:String?=null,
    val name:String="",
    val localizedNames:Map<String,String> = emptyMap(),
    val dialCode:String="",
    val flagEmoji:String?=null,
    val phonePlaceholder:String?=null,
    val displayOrder:Int=0,
)
data class PlatformBootstrapResponse(
    val ok:Boolean=false,
    val defaultLocale:String="en",
    val translationVersion:Int=0,
    val availableLocales:List<LocalizationLocaleDto> = emptyList(),
    val phoneCountries:List<PlatformPhoneCountryDto> = emptyList(),
)
data class QuotaRequestDto(
    val id:String="",
    val resource:String="",
    val requestedValue:String="0",
    val status:String="PENDING",
    val adminNote:String?=null,
    val createdAt:String="",
    val reviewedAt:String?=null,
)
data class StorageQuotaDto(val usedBytes:String="0",val limitBytes:String="0",val remainingBytes:String="0",val overridden:Boolean=false)
data class LinkQuotaDto(val used:Int=0,val limit:Int=0,val remaining:Int=0,val overridden:Boolean=false)
data class QuotaPlanDto(val slug:String="free",val source:String="PLATFORM_DEFAULT")
data class QuotaUsageResponse(
    val ok:Boolean=false,
    val plan:QuotaPlanDto=QuotaPlanDto(),
    val storage:StorageQuotaDto=StorageQuotaDto(),
    val links:LinkQuotaDto=LinkQuotaDto(),
    val requests:List<QuotaRequestDto> = emptyList(),
    val error:String?=null,
)
data class QuotaIncreaseRequest(val resource:String,val requestedValue:String,val reason:String?=null)
data class QuotaIncreaseResponse(val ok:Boolean=false,val request:QuotaRequestDto?=null,val idempotent:Boolean=false,val error:String?=null)
data class LegalDocumentDto(val id:String="",val documentType:String="",val version:String="",val title:String="",val path:String="")
data class LegalRequiredResponse(val ok:Boolean=false,val legalReady:Boolean=false,val legalAccepted:Boolean=false,val documents:List<LegalDocumentDto> = emptyList(),val error:String?=null)
data class LegalConsentRequest(val accepted:Boolean=true,val locale:String)
data class ProfileCategoryBootstrapDto(val id:String="",val slug:String="",val nameAr:String?=null,val nameEn:String?=null,val profileKind:String="",val defaultTemplateId:String?=null)
data class ProfileCategoriesBootstrapResponse(val ok:Boolean=false,val categories:List<ProfileCategoryBootstrapDto> = emptyList(),val error:String?=null)
data class ProfileBootstrapTemplateDto(val id:String="",val slug:String="",val nameAr:String?=null,val nameEn:String?=null)
data class ProfileTemplatesBootstrapResponse(val ok:Boolean=false,val templates:List<ProfileBootstrapTemplateDto> = emptyList(),val defaultTemplateId:String?=null,val error:String?=null)
data class ProfileBootstrapStatusResponse(val ok:Boolean=false,val isNewAccount:Boolean=false,val bootstrapComplete:Boolean=false,val hasPrimaryProfile:Boolean=false,val legalReady:Boolean=false,val legalAccepted:Boolean=false,val requiredDocuments:List<LegalDocumentDto> = emptyList(),val passkeyCount:Int=0,val legacyProfileCount:Int=0,val primaryProfileId:String?=null,val error:String?=null)
data class ProfileBootstrapRequest(val displayName:String,val profileKind:String,val categorySlug:String,val templateId:String?=null,val locale:String)
data class ProfileBootstrapResponse(val ok:Boolean=false,val error:String?=null)
data class OnboardingOptionDto(val key:String="",val label:String="")
data class OnboardingConditionDto(val sourceQuestionKey:String="",val operator:String="",val expectedValues:List<String> = emptyList())
data class OnboardingQuestionDto(
    val key:String="",
    val type:String="",
    val label:String="",
    val help:String?=null,
    val required:Boolean=false,
    val minLength:Int?=null,
    val maxLength:Int?=null,
    val minValue:Double?=null,
    val maxValue:Double?=null,
    val maxItems:Int?=null,
    val options:List<OnboardingOptionDto> = emptyList(),
    val conditions:List<OnboardingConditionDto> = emptyList(),
)
data class OnboardingStepDto(val key:String="",val title:String="",val description:String?=null,val required:Boolean=true,val moduleKey:String?=null,val questions:List<OnboardingQuestionDto> = emptyList())
data class OnboardingDefinitionDto(val id:String="",val key:String="",val version:Int=0,val profileKind:String="",val categoryKey:String?=null,val templateId:String?=null,val steps:List<OnboardingStepDto> = emptyList())
data class OnboardingCurrentResponse(
    val ok:Boolean=false,
    val state:String="",
    val revision:Int=0,
    val profileId:String?=null,
    val currentStepKey:String?=null,
    val answers:Map<String,JsonElement> = emptyMap(),
    val definition:OnboardingDefinitionDto?=null,
    val fields:Map<String,String> = emptyMap(),
    val error:String?=null,
)
data class OnboardingStartRequest(val locale:String)
data class OnboardingProgressRequest(val locale:String,val revision:Int,val stepKey:String,val direction:String,val answers:Map<String,JsonElement>)
data class OnboardingCompleteRequest(val locale:String,val revision:Int)

data class DestinationDto(val id:String="",val profileId:String?=null,val title:String="",val titleAr:String?=null,val titleEn:String?=null,val type:String="WEBSITE",val url:String="",val iconKey:String?=null,val isActive:Boolean=true)
data class ProfileSummaryDto(val id:String="",val displayName:String="",val type:String="PERSONAL")
data class CardDto(val id:String="",val displayLabel:String?=null,val serialNumber:String="",val publicSlug:String="",val cardType:String="",val assignmentStatus:String="",val cardStatus:String="",val programmedAt:String?=null,val lockedAt:String?=null,val openCount:Int=0,val lastOpenedAt:String?=null,val permanentUrl:String="",val profile:ProfileSummaryDto?=null,val activeDestination:DestinationDto?=null)
data class DailyOpenDto(val date:String="",val openCount:Int=0)
data class CardDetailDto(val id:String="",val serialNumber:String="",val publicSlug:String="",val cardType:String="",val assignmentStatus:String="",val cardStatus:String="",val programmedAt:String?=null,val lockedAt:String?=null,val openCount:Int=0,val lastOpenedAt:String?=null,val permanentUrl:String="",val profile:ProfileSummaryDto?=null,val activeDestination:DestinationDto?=null,val dailyOpens:List<DailyOpenDto> = emptyList())
data class CardsResponse(val ok:Boolean=false,val cards:List<CardDto> = emptyList(),val error:String?=null)
data class CardDetailResponse(val ok:Boolean=false,val card:CardDetailDto?=null,val destinations:List<DestinationDto> = emptyList(),val error:String?=null)
data class CardUpdateRequest(val cardStatus:String?=null,val activeDestinationId:String?=null)

data class FileDto(val id:String="",val originalFilename:String="",val displayTitleAr:String?=null,val displayTitleEn:String?=null,val publicUrl:String="",val mimeType:String="",val sizeBytes:String="0",val isVisible:Boolean=true)
data class TemplateConfigurationDto(val templateVariant:String="personal-free-links",val background:String="#000000",val panel:String="#000000",val text:String="#ffffff",val muted:String="#888888",val accent:String="#825bdd",val accentText:String="#ffffff",val radius:String="24px",val itemRadius:String="16px",val buttonRadius:String="99px",val spacing:String="12px",val linkLayout:String="list",val avatarPosition:String="center",val headerAlign:String="center",val coverStyle:String="minimal",val contactLayout:String="list",val desktopLayout:String="narrow")
data class ProfileTemplateDto(val id:String="",val nameAr:String="",val nameEn:String="",val slug:String="",val category:String="",val minimumPlan:String="free",val previewImageUrl:String?=null,val configuration:TemplateConfigurationDto=TemplateConfigurationDto(),val allowed:Boolean=true)
data class VirtualCardDto(val id:String="",val name:String="",val type:String="PERSONAL",val themeId:String?=null,val isDefault:Boolean=false,val status:String="ACTIVE",val template:ProfileTemplateDto?=null)
data class WalletCapabilitiesDto(val googleConfigured:Boolean=false,val googleAvailable:Boolean=false)
data class ProfileDto(val id:String="",val slug:String?=null,val type:String="PERSONAL",val primaryLanguage:String="ar",val displayName:String="",val displayNameAr:String?=null,val displayNameEn:String?=null,val firstName:String?=null,val lastName:String?=null,val jobTitleAr:String?=null,val jobTitleEn:String?=null,val company:String?=null,val bioAr:String?=null,val bioEn:String?=null,val organizationNameAr:String?=null,val organizationNameEn:String?=null,val industryAr:String?=null,val industryEn:String?=null,val descriptionAr:String?=null,val descriptionEn:String?=null,val avatarUrl:String?=null,val logoUrl:String?=null,val coverUrl:String?=null,val phone:String?=null,val alternatePhone:String?=null,val whatsappBusiness:String?=null,val email:String?=null,val website:String?=null,val locationText:String?=null,val addressAr:String?=null,val addressEn:String?=null,val theme:String="CLASSIC_DARK",val destinations:List<DestinationDto> = emptyList(),val uploads:List<FileDto> = emptyList(),val virtualCard:VirtualCardDto?=null)
data class ProfilesResponse(val ok:Boolean=false,val profiles:List<ProfileDto> = emptyList(),val wallet:WalletCapabilitiesDto=WalletCapabilitiesDto(),val error:String?=null)
data class PublishingIssueDto(val code:String="",val path:String="",val module:String?=null,val messageKey:String="",val blocking:Boolean=true)
data class PublishingReadinessDto(val ready:Boolean=false,val draftRevision:Int=0,val lifecycle:String="DRAFT",val access:String="PRIVATE",val issues:List<PublishingIssueDto> = emptyList())
data class PreviewIdentityDto(val name:String="",val title:String?=null,val bio:String?=null,val imageUrl:String?=null,val coverUrl:String?=null)
data class PreviewModuleDto(val key:String="",val visibility:String="PUBLIC",val enabled:Boolean=true,val sortOrder:Int=0)
data class PreviewLinkDto(val id:String="",val title:String="",val url:String="")
data class PreviewMediaDto(val id:String="",val purpose:String="",val visibility:String="ONLY_ME",val previewUrl:String="")
data class ProfilePreviewDto(val profileId:String="",val draftRevision:Int=0,val lifecycle:String="DRAFT",val access:String="PRIVATE",val slug:String?=null,val identity:PreviewIdentityDto=PreviewIdentityDto(),val modules:List<PreviewModuleDto> = emptyList(),val fieldVisibility:Map<String,Boolean> = emptyMap(),val links:List<PreviewLinkDto> = emptyList(),val media:List<PreviewMediaDto> = emptyList())
data class PublishedRevisionDto(val revisionNumber:Int=0,val sourceDraftRevision:Int=0)
data class PublishingStatusResponse(val ok:Boolean=false,val readiness:PublishingReadinessDto=PublishingReadinessDto(),val preview:ProfilePreviewDto=ProfilePreviewDto(),val publishedRevision:PublishedRevisionDto?=null,val error:String?=null)
data class PublishingActionRequest(val action:String,val draftRevision:Int?=null)
data class MediaVisibilityRequest(val id:String,val visibility:String)
data class ModuleVisibilityRequest(val key:String,val visibility:String)
data class VisibilityUpdateRequest(val expectedDraftRevision:Int,val access:String?=null,val slug:String?=null,val media:MediaVisibilityRequest?=null,val module:ModuleVisibilityRequest?=null)
data class PublishingActionResponse(val ok:Boolean=false,val lifecycle:String?=null,val revisionNumber:Int?=null,val idempotent:Boolean?=null,val readiness:PublishingReadinessDto?=null,val error:String?=null)
data class ProfileMediaAssetDto(val id:String="",val purpose:String="",val state:String="",val previewUrl:String?=null)
data class ProfileMediaUploadResponse(val ok:Boolean=false,val asset:ProfileMediaAssetDto?=null,val error:String?=null)
data class ProfileSelectorItemDto(val id:String="",val label:String="",val publicName:String="",val profileKind:String="PERSONAL",val categoryKey:String?=null,val lifecycle:String="DRAFT",val isPrimary:Boolean=false)
data class ProfileQuotaDto(val used:Int=0,val limit:Int=1,val remaining:Int=0,val planSlug:String="free",val quotaAllowsAdditional:Boolean=false,val onboardingSupported:Boolean=false,val blocker:String?=null)
data class ProfileSelectorResponse(val ok:Boolean=false,val profiles:List<ProfileSelectorItemDto> = emptyList(),val selectedProfileId:String?=null,val quota:ProfileQuotaDto=ProfileQuotaDto(),val error:String?=null)
data class EditorProfileDto(val id:String="",val label:String="",val displayLabel:String="",val displayName:String="",val profileKind:String="PERSONAL",val categoryKey:String?=null,val lifecycle:String="DRAFT",val access:String="PRIVATE",val isPrimary:Boolean=false,val draftRevision:Int=0,val publishedRevision:Int?=null,val draftChanged:Boolean=false,val changedSections:List<String> = emptyList(),val primaryLanguage:String="ar")
data class EditorModuleDto(val id:String="",val key:String="",val name:String="",val enabled:Boolean=true,val visibility:String="ONLY_ME",val sortOrder:Int=0,val required:Boolean=false,val supported:Boolean=false,val modified:Boolean=false)
data class EditorAddableModuleDto(val key:String="",val name:String="")
data class EditorIdentityDto(val displayLabel:String="",val displayName:String="",val displayNameAr:String="",val displayNameEn:String="",val jobTitleAr:String="",val jobTitleEn:String="",val organizationNameAr:String="",val organizationNameEn:String="",val primaryLanguage:String="ar")
data class EditorAboutDto(val title:String="",val bio:String="",val bioAr:String="",val bioEn:String="",val descriptionAr:String="",val descriptionEn:String="")
data class EditorContactDto(val phone:String="",val alternatePhone:String="",val email:String="",val website:String="",val whatsappBusiness:String="",val whatsappPrivate:String="",val locationText:String="",val addressAr:String="",val addressEn:String="",val visibility:Map<String,String> = emptyMap())
data class EditorLinkDto(val id:String="",val title:String="",val titleAr:String="",val titleEn:String="",val type:String="WEBSITE",val url:String="",val visibility:String="ONLY_ME",val sortOrder:Int=0)
data class EditorServiceDto(val id:String="",val name:String="",val nameAr:String?=null,val nameEn:String?=null,val descriptionAr:String?=null,val descriptionEn:String?=null,val url:String?=null,val visibility:String="ONLY_ME")
data class EditorBranchDto(val id:String="",val name:String="",val nameAr:String?=null,val nameEn:String?=null,val addressAr:String?=null,val addressEn:String?=null,val phone:String?=null,val mapUrl:String?=null,val visibility:String="ONLY_ME")
data class EditorMediaDto(val id:String="",val purpose:String="",val visibility:String="ONLY_ME",val sortOrder:Int=0,val previewUrl:String="")
data class EditorPreviewDto(val identity:PreviewIdentityDto=PreviewIdentityDto(),val links:List<PreviewLinkDto> = emptyList(),val services:List<EditorServiceDto> = emptyList(),val branches:List<EditorBranchDto> = emptyList(),val media:List<EditorMediaDto> = emptyList())
data class ProfileEditorResponse(val ok:Boolean=false,val profile:EditorProfileDto=EditorProfileDto(),val readiness:PublishingReadinessDto=PublishingReadinessDto(),val preview:EditorPreviewDto=EditorPreviewDto(),val identity:EditorIdentityDto=EditorIdentityDto(),val about:EditorAboutDto=EditorAboutDto(),val contact:EditorContactDto=EditorContactDto(),val links:List<EditorLinkDto> = emptyList(),val services:List<EditorServiceDto> = emptyList(),val branches:List<EditorBranchDto> = emptyList(),val media:List<EditorMediaDto> = emptyList(),val modules:List<EditorModuleDto> = emptyList(),val addableModules:List<EditorAddableModuleDto> = emptyList(),val error:String?=null)
data class ProfileEditorMutationRequest(val expectedDraftRevision:Int,val action:JsonObject)
data class ProfileWriteRequest(val type:String,val primaryLanguage:String="ar",val displayNameAr:String?=null,val displayNameEn:String?=null,val firstName:String?=null,val lastName:String?=null,val jobTitleAr:String?=null,val jobTitleEn:String?=null,val company:String?=null,val bioAr:String?=null,val bioEn:String?=null,val industryAr:String?=null,val industryEn:String?=null,val descriptionAr:String?=null,val descriptionEn:String?=null,val phone:String?=null,val alternatePhone:String?=null,val whatsapp:String?=null,val email:String?=null,val website:String?=null,val addressAr:String?=null,val addressEn:String?=null,val theme:String="CLASSIC_DARK",val cardName:String?=null,val location:String?=null)
data class ProfileCreateResponse(val ok:Boolean=false,val profile:ProfileDto?=null,val error:String?=null)
data class CardLinkWriteRequest(val type:String="CUSTOM_URL",val url:String,val titleAr:String?=null,val titleEn:String?=null,val iconKey:String?="link")
data class VirtualCardCreateRequest(val cardName:String,val cardType:String,val primaryLanguage:String,val displayNameAr:String?=null,val displayNameEn:String?=null,val jobTitleAr:String?=null,val jobTitleEn:String?=null,val company:String?=null,val bioAr:String?=null,val bioEn:String?=null,val phone:String?=null,val email:String?=null,val website:String?=null,val location:String?=null,val templateId:String,val links:List<CardLinkWriteRequest> = emptyList())
data class TemplatesResponse(val ok:Boolean=false,val planSlug:String="free",val templates:List<ProfileTemplateDto> = emptyList(),val error:String?=null)
data class TemplateSelectionRequest(val templateId:String)
data class GoogleWalletLinkResponse(val ok:Boolean=false,val url:String?=null,val error:String?=null)

data class ActivationInspectRequest(val activationValue:String)
data class ActivationInspectResponse(val ok:Boolean=false,val claimToken:String="",val card:CardDto?=null,val error:String?=null)
data class ClaimRequest(val claimToken:String,val profileId:String)
data class ClaimResponse(val ok:Boolean=false,val cardId:String?=null,val error:String?=null)
data class VerifyNfcRequest(val uri:String)
data class VerifyNfcResponse(val ok:Boolean=false,val exactMatch:Boolean=false,val card:CardDto?=null,val error:String?=null)
data class ProgramRequest(val action:String,val uri:String,val verified:Boolean=true,val permanentConfirmation:String?=null)
data class ProgrammingCardsResponse(val ok:Boolean=false,val cards:List<CardDto> = emptyList(),val error:String?=null)
data class DestinationWriteRequest(val type:String,val url:String,val titleAr:String?=null,val titleEn:String?=null,val iconKey:String?=null)

data class ShareTargetDto(
    val id:String="",
    val type:String="PROFILE",
    val label:String="",
    val canonicalUrl:String="",
    val hceCompatible:Boolean=false,
    val destinationType:String?=null,
)
data class ShareProfileSummaryDto(val id:String="",val label:String="",val lifecycle:String="DRAFT")
data class ShareTargetsResponse(
    val ok:Boolean=false,
    val profile:ShareProfileSummaryDto=ShareProfileSummaryDto(),
    val shareable:Boolean=false,
    val reason:String?=null,
    val targets:List<ShareTargetDto> = emptyList(),
    val error:String?=null,
)
data class ShareProductProfileDto(val id:String="",val label:String="",val profileKind:String="PERSONAL",val lifecycle:String="DRAFT")
data class ShareProductTargetDto(val id:String="",val label:String="",val type:String="")
data class ShareProductCapabilitiesDto(val targetChange:Boolean=false,val pause:Boolean=false,val resume:Boolean=false,val lostAndTransferInProductDetails:Boolean=true)
data class ShareProductDto(
    val id:String="",
    val label:String="",
    val maskedSerial:String="",
    val productType:String="NFC_CARD",
    val status:String="CREATED",
    val assignmentStatus:String="UNASSIGNED",
    val activationState:String="LEGACY",
    val permanentUrl:String="",
    val profile:ShareProductProfileDto?=null,
    val shareTarget:ShareProductTargetDto?=null,
    val capabilities:ShareProductCapabilitiesDto=ShareProductCapabilitiesDto(),
    val openCount:Int=0,
    val lastOpenedAt:String?=null,
)
data class ShareProductsResponse(val ok:Boolean=false,val products:List<ShareProductDto> = emptyList(),val error:String?=null)
data class ShareProductUpdateRequest(val action:String,val profileId:String?=null,val targetId:String?=null,val status:String?=null,val locale:String="en")
data class ShareProductUpdateResponse(val ok:Boolean=false,val product:ShareProductDto?=null,val error:String?=null)
data class SafeActivationProductDto(val label:String="",val maskedSerial:String="",val productType:String="NFC_CARD")
data class ScratchActivationInspectRequest(val identifier:String)
data class ScratchActivationInspectResponse(
    val ok:Boolean=false,
    val eligible:Boolean=false,
    val nextAction:String?=null,
    val identifier:String?=null,
    val retryAt:String?=null,
    val legacyUrl:String?=null,
    val product:SafeActivationProductDto?=null,
    val error:String?=null,
)
data class ScratchActivationClaimRequest(val identifier:String,val scratchSecret:String,val profileId:String,val targetId:String,val locale:String)
data class ScratchActivationClaimResponse(val ok:Boolean=false,val idempotent:Boolean=false,val product:ShareProductDto?=null,val error:String?=null)

data class SettingsNearbyDto(val enabled:Boolean=false,val available:Boolean=false,val stage:String="UNAVAILABLE")
data class SettingsPrivacyDto(val shareActivityIdentity:Boolean=false,val profileVisibility:String="PRIVATE",val blockedUsers:Int=0,val nearby:SettingsNearbyDto=SettingsNearbyDto())
data class SettingsPreferencesResponse(
    val ok:Boolean=false,
    val theme:String="SYSTEM",
    val language:String="SYSTEM",
    val font:String="DEFAULT",
    val privacy:SettingsPrivacyDto=SettingsPrivacyDto(),
    val error:String?=null,
)
data class NotificationPreferencesDto(
    val generalEnabled:Boolean=true,
    val securityEnabled:Boolean=true,
    val productsEnabled:Boolean=true,
    val socialEnabled:Boolean=true,
    val marketingEnabled:Boolean=false,
    val osPermission:String="DEVICE_OWNED",
    val deliveryConfigured:Boolean=false,
)
data class NotificationPreferencesResponse(val ok:Boolean=false,val preferences:NotificationPreferencesDto=NotificationPreferencesDto(),val error:String?=null)

data class LocaleRequest(val locale:String="en")
data class FriendProfileIdentityDto(val slug:String="",val name:String="",val title:String?=null,val avatarUrl:String?=null)
data class FriendIdentityDto(val key:String="",val profile:FriendProfileIdentityDto=FriendProfileIdentityDto())
data class FriendDto(
    val key:String="",
    val profile:FriendProfileIdentityDto=FriendProfileIdentityDto(),
    val relationshipState:String="FRIENDS",
    val favorite:Boolean=false,
    val muted:Boolean=false,
)
data class FriendRequestDto(
    val id:String="",
    val direction:String="INCOMING",
    val createdAt:String="",
    val person:FriendIdentityDto=FriendIdentityDto(),
)
data class FriendSearchResultDto(
    val key:String="",
    val profile:FriendProfileIdentityDto=FriendProfileIdentityDto(),
    val relationshipState:String="NONE",
)
data class FriendsPolicyDto(val available:Boolean=false,val accepted:Boolean=false,val version:String?=null,val path:String="/community-guidelines")
data class FriendsPreferenceDto(
    val socialProfileSlug:String?=null,
    val allowFriendRequests:Boolean=true,
    val discoverableByProfileSearch:Boolean=false,
    val profileConfigured:Boolean=false,
    val privacyConfigured:Boolean=false,
    val configured:Boolean=false,
)
data class FriendsSocialProfileDto(
    val slug:String="",
    val name:String="",
    val title:String?=null,
    val access:String="PRIVATE",
    val primary:Boolean=false,
)
data class FriendsSettingsResponse(
    val ok:Boolean=false,
    val policy:FriendsPolicyDto=FriendsPolicyDto(),
    val preference:FriendsPreferenceDto=FriendsPreferenceDto(),
    val profiles:List<FriendsSocialProfileDto> = emptyList(),
    val error:String?=null,
)
data class FriendsSettingsPatchRequest(
    val locale:String="en",
    val socialProfileSlug:String?=null,
    val allowFriendRequests:Boolean?=null,
    val discoverableByProfileSearch:Boolean?=null,
)
data class FriendsPolicyResponse(val ok:Boolean=false,val policy:FriendsPolicyDto=FriendsPolicyDto(),val error:String?=null)
data class FriendsListResponse(val ok:Boolean=false,val friends:List<FriendDto> = emptyList(),val nextCursor:String?=null,val error:String?=null)
data class FriendRequestsResponse(val ok:Boolean=false,val requests:List<FriendRequestDto> = emptyList(),val incomingPendingCount:Int=0,val nextCursor:String?=null,val error:String?=null)
data class FriendSearchResponse(val ok:Boolean=false,val results:List<FriendSearchResultDto> = emptyList(),val nextCursor:String?=null,val error:String?=null)
data class FriendRequestCreateRequest(val targetKey:String,val source:String="SEARCH",val locale:String="en")
data class FriendPreferencePatchRequest(val favorite:Boolean?=null,val muted:Boolean?=null)
data class FriendPreferenceDto(val favorite:Boolean=false,val muted:Boolean=false)
data class FriendPreferenceResponse(val ok:Boolean=false,val preference:FriendPreferenceDto=FriendPreferenceDto(),val error:String?=null)
data class FriendMutationResponse(
    val ok:Boolean=false,
    val state:String?=null,
    val idempotent:Boolean=false,
    val removed:Boolean=false,
    val unblocked:Boolean=false,
    val error:String?=null,
)
data class BlockedUserDto(val id:String="",val person:FriendIdentityDto?=null,val createdAt:String="")
data class BlockedUsersResponse(val ok:Boolean=false,val blocks:List<BlockedUserDto> = emptyList(),val error:String?=null)
data class BlockUserRequest(
    val targetKey:String,
    val source:String="FRIENDS",
    val category:String?=null,
)
data class ReportUserRequest(val targetKey:String,val category:String,val details:String?=null,val locale:String="en",val source:String="FRIENDS")
data class ReportUserResponse(val ok:Boolean=false,val received:Boolean=false,val idempotent:Boolean=false,val error:String?=null)
data class NearbyFeatureDto(
    val state:String="UNAVAILABLE",
    val available:Boolean=false,
    val presenceEnabled:Boolean=false,
    val discoveryEnabled:Boolean=false,
)
data class NearbyConsentDto(val available:Boolean=false,val accepted:Boolean=false,val version:String?=null,val path:String="/nearby-privacy")
data class NearbyPreferenceDto(val enabled:Boolean=false,val discoverable:Boolean=false)
data class NearbyPresenceStatusDto(val active:Boolean=false)
data class NearbySocialProfileDto(val eligible:Boolean=false,val path:String="/dashboard/friends?tab=privacy")
data class NearbySettingsResponse(
    val ok:Boolean=false,
    val feature:NearbyFeatureDto=NearbyFeatureDto(),
    val community:FriendsPolicyDto=FriendsPolicyDto(),
    val consent:NearbyConsentDto=NearbyConsentDto(),
    val preference:NearbyPreferenceDto=NearbyPreferenceDto(),
    val presence:NearbyPresenceStatusDto=NearbyPresenceStatusDto(),
    val socialProfile:NearbySocialProfileDto=NearbySocialProfileDto(),
    val stage:String="UNAVAILABLE",
    val error:String?=null,
)
data class NearbyConsentRequest(val locale:String="en")
data class NearbyConsentResponse(val ok:Boolean=false,val consent:NearbyConsentDto=NearbyConsentDto(),val error:String?=null)
data class NearbyPresenceRequest(
    val action:String,
    val latitude:Double,
    val longitude:Double,
    val generation:Int?=null,
    val sessionToken:String?=null,
)
data class NearbySessionDto(val generation:Int=0,val sessionToken:String="",val expiresInSeconds:Int=0,val unchanged:Boolean=false)
data class NearbyPresenceResponse(val ok:Boolean=false,val session:NearbySessionDto?=null,val error:String?=null)
data class NearbyDisableResponse(val ok:Boolean=false,val disabled:Boolean=false,val idempotent:Boolean=false,val error:String?=null)
data class NearbyCapabilitiesDto(
    val canViewProfile:Boolean=false,
    val canSendFriendRequest:Boolean=false,
    val canAcceptRequest:Boolean=false,
    val canCancelRequest:Boolean=false,
    val canBlock:Boolean=false,
    val canReport:Boolean=false,
)
data class NearbyResultDto(
    val key:String="",
    val profile:FriendProfileIdentityDto=FriendProfileIdentityDto(),
    val proximityBand:String="AROUND_THIS_AREA",
    val relationshipState:String="NONE",
    val requestId:String?=null,
    val capabilities:NearbyCapabilitiesDto=NearbyCapabilitiesDto(),
)
data class NearbyResultsResponse(val ok:Boolean=false,val results:List<NearbyResultDto> = emptyList(),val error:String?=null)
data class SecurityCountDto(val active:Int=0)
data class SecurityPasskeyCountDto(val configured:Boolean=false,val count:Int=0)
data class SecurityRecoveryDto(val phoneVerified:Boolean=false)
data class SecurityOverviewResponse(
    val ok:Boolean=false,
    val passkey:SecurityPasskeyCountDto=SecurityPasskeyCountDto(),
    val devices:SecurityCountDto=SecurityCountDto(),
    val sessions:SecurityCountDto=SecurityCountDto(),
    val recovery:SecurityRecoveryDto=SecurityRecoveryDto(),
    val currentSessionContext:String="UPGRADE_REQUIRED",
    val error:String?=null,
)
data class SecurityDeviceDto(
    val id:String="",
    val type:String="MOBILE_APP",
    val label:String="",
    val platform:String="Android",
    val appName:String="POP Android",
    val appVersion:String?=null,
    val createdAt:String="",
    val lastActiveAt:String="",
    val lastAuthenticatedAt:String?=null,
    val authMethod:String="LEGACY",
    val current:Boolean=false,
    val status:String="ACTIVE",
    val activeSessionCount:Int=0,
    val pushEnabled:Boolean=false,
    val passkeyCount:Int=0,
)
data class SecurityDevicesResponse(val ok:Boolean=false,val devices:List<SecurityDeviceDto> = emptyList(),val error:String?=null)
data class SecuritySessionDto(
    val id:String="",
    val authority:String="ANDROID",
    val deviceId:String?=null,
    val label:String="",
    val platform:String="Android",
    val appName:String="POP Android",
    val createdAt:String="",
    val lastActiveAt:String="",
    val expiresAt:String="",
    val authMethod:String="LEGACY",
    val current:Boolean=false,
    val status:String="ACTIVE",
    val legacy:Boolean=false,
)
data class SecuritySessionsResponse(val ok:Boolean=false,val sessions:List<SecuritySessionDto> = emptyList(),val error:String?=null)
data class SecurityPasskeyDto(
    val id:String="",
    val name:String="Passkey",
    val deviceType:String?=null,
    val backedUp:Boolean=false,
    val createdAt:String="",
    val lastUsedAt:String?=null,
)
data class SecurityPasskeysResponse(val ok:Boolean=false,val passkeys:List<SecurityPasskeyDto> = emptyList(),val error:String?=null)
data class StepUpRequest(
    val purpose:String,
    val method:String?=null,
    val locale:String?=null,
    val assertion:JsonObject?=null,
    val challengeId:String?=null,
    val code:String?=null,
)
data class StepUpResponse(
    val ok:Boolean=false,
    val purpose:String?=null,
    val methods:List<String> = emptyList(),
    val preferred:String?=null,
    val method:String?=null,
    val options:JsonObject?=null,
    val challengeId:String?=null,
    val maskedPhone:String?=null,
    val grantToken:String?=null,
    val error:String?=null,
)
data class SecurityMutationResponse(val ok:Boolean=false,val current:Boolean=false,val fcmCleanup:String?=null,val error:String?=null)
data class PhoneChangeStartRequest(val phone:String,val locale:String,val countryIso2:String?=null,val channel:String="sms")
data class PhoneChangeStartResponse(val ok:Boolean=false,val challengeId:String="",val maskedPhone:String="",val expiresIn:Int=0,val error:String?=null)
data class PhoneChangeVerifyRequest(val challengeId:String,val code:String)
data class AccountDeletionResponse(val ok:Boolean=false,val status:String?=null,val idempotent:Boolean=false,val error:String?=null)
