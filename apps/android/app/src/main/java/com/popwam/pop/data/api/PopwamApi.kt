package com.popwam.pop.data.api

import okhttp3.MultipartBody
import okhttp3.RequestBody
import com.google.gson.JsonObject
import retrofit2.http.*

interface AuthApi {
    @GET("api/localization/bootstrap") suspend fun localizationBootstrap():LocalizationBootstrapResponse
    @POST("api/mobile/auth/firebase/phone/exchange") suspend fun exchangeFirebasePhone(
        @Header("X-Firebase-Id-Token") firebaseIdToken:String,
        @Body body:FirebasePhoneExchangeRequest,
    ):AuthResponse
    @POST("api/mobile/auth/passkey/options") suspend fun passkeyAuthenticationOptions():JsonObject
    @POST("api/mobile/auth/passkey/verify") suspend fun verifyPasskey(@Body body:PasskeyAuthVerifyRequest):AuthResponse
    @POST("api/mobile/auth/refresh") suspend fun refresh(@Body body:RefreshRequest):AuthResponse
    @POST("api/mobile/auth/logout") suspend fun logout(@Body body:LogoutRequest):ApiResult
}

interface PopwamApi {
    @GET("api/settings/quota") suspend fun quotaUsage():QuotaUsageResponse
    @POST("api/settings/quota") suspend fun requestQuotaIncrease(@Body body:QuotaIncreaseRequest):QuotaIncreaseResponse
    @POST("api/mobile/push-tokens") suspend fun registerPushToken(@Body body:PushTokenRequest):ApiResult
    @GET("api/legal/required") suspend fun requiredLegal(@Query("locale") locale:String):LegalRequiredResponse
    @POST("api/legal/required") suspend fun acceptLegal(@Body body:LegalConsentRequest):ApiResult
    @GET("api/profile-bootstrap") suspend fun profileBootstrapStatus(@Query("locale") locale:String):ProfileBootstrapStatusResponse
    @POST("api/profile-bootstrap") suspend fun submitProfileBootstrap(@Body body:ProfileBootstrapRequest):ProfileBootstrapResponse
    @GET("api/onboarding/current") suspend fun currentOnboarding(@Query("locale") locale:String):OnboardingCurrentResponse
    @POST("api/onboarding/start") suspend fun startOnboarding(@Body body:OnboardingStartRequest):OnboardingCurrentResponse
    @POST("api/onboarding/progress") suspend fun saveOnboarding(@Body body:OnboardingProgressRequest):OnboardingCurrentResponse
    @POST("api/onboarding/complete") suspend fun completeOnboarding(@Body body:OnboardingCompleteRequest):OnboardingCurrentResponse
    @Multipart @POST("api/profiles/{id}/media") suspend fun uploadDraftMedia(@Path("id") id:String,@Part("purpose") purpose:RequestBody,@Part file:MultipartBody.Part):ProfileMediaUploadResponse
    @GET("api/profile-categories") suspend fun profileBootstrapCategories(@Query("profileKind") profileKind:String,@Query("locale") locale:String):ProfileCategoriesBootstrapResponse
    @GET("api/profile-templates") suspend fun profileBootstrapTemplates(@Query("categorySlug") categorySlug:String,@Query("profileKind") profileKind:String,@Query("locale") locale:String):ProfileTemplatesBootstrapResponse
    @POST("api/passkeys/register/options") suspend fun passkeyRegistrationOptions(@Header("X-POP-Step-Up") grant:String?=null):JsonObject
    @POST("api/passkeys/register/verify") suspend fun verifyPasskeyRegistration(@Body response:JsonObject):ApiResult
    @HTTP(method="DELETE",path="api/mobile/push-tokens",hasBody=true) suspend fun revokePushToken(@Body body:PushTokenRequest):ApiResult
    @GET("api/mobile/cards") suspend fun cards():CardsResponse
    @GET("api/mobile/cards/{id}") suspend fun card(@Path("id") id:String):CardDetailResponse
    @PATCH("api/mobile/cards/{id}") suspend fun updateCard(@Path("id") id:String,@Body body:CardUpdateRequest):ApiResult
    @GET("api/mobile/profiles") suspend fun profiles():ProfilesResponse
    @GET("api/profiles") suspend fun profileSelector(@Query("selected") selected:String?=null):ProfileSelectorResponse
    @GET("api/profiles/{id}/editor") suspend fun profileEditor(@Path("id") id:String,@Query("locale") locale:String):ProfileEditorResponse
    @PATCH("api/profiles/{id}/editor") suspend fun mutateProfileEditor(@Path("id") id:String,@Body body:ProfileEditorMutationRequest):ApiResult
    @GET("api/profiles/{id}/publishing") suspend fun publishingStatus(@Path("id") id:String,@Query("locale") locale:String):PublishingStatusResponse
    @POST("api/profiles/{id}/publishing") suspend fun publishingAction(@Path("id") id:String,@Body body:PublishingActionRequest):PublishingActionResponse
    @PATCH("api/profiles/{id}/visibility") suspend fun updatePublishingVisibility(@Path("id") id:String,@Body body:VisibilityUpdateRequest):PublishingActionResponse
    @POST("api/mobile/profiles") suspend fun createProfile(@Body body:ProfileWriteRequest):ProfileCreateResponse
    @POST("api/mobile/profiles") suspend fun createVirtualCard(@Body body:VirtualCardCreateRequest):ProfileCreateResponse
    @PATCH("api/mobile/profiles/{id}") suspend fun updateProfile(@Path("id") id:String,@Body body:ProfileWriteRequest):ApiResult
    @GET("api/mobile/templates") suspend fun templates():TemplatesResponse
    @PATCH("api/mobile/virtual-cards/{id}/template") suspend fun selectTemplate(@Path("id") id:String,@Body body:TemplateSelectionRequest):ApiResult
    @POST("api/mobile/virtual-cards/{id}/google-wallet") suspend fun googleWallet(@Path("id") id:String):GoogleWalletLinkResponse
    @Multipart @POST("api/profiles/{id}/media") suspend fun uploadMedia(@Path("id") id:String,@Part("purpose") purpose:RequestBody,@Part("expectedDraftRevision") expectedDraftRevision:RequestBody?=null,@Part file:MultipartBody.Part):ProfileMediaUploadResponse
    @DELETE("api/profiles/{profileId}/media/{mediaId}") suspend fun removeEditorMedia(@Path("profileId") profileId:String,@Path("mediaId") mediaId:String,@Query("expectedDraftRevision") expectedDraftRevision:Int):ApiResult
    @Multipart @POST("api/mobile/profiles/{id}/files") suspend fun uploadFile(@Path("id") id:String,@Part("titleAr") titleAr:RequestBody,@Part("titleEn") titleEn:RequestBody,@Part file:MultipartBody.Part):ApiResult
    @GET("api/mobile/profiles/{id}/destinations") suspend fun destinations(@Path("id") id:String):Map<String,Any>
    @POST("api/mobile/profiles/{id}/destinations") suspend fun createDestination(@Path("id") id:String,@Body body:DestinationWriteRequest):ApiResult
    @DELETE("api/mobile/destinations/{id}") suspend fun deleteDestination(@Path("id") id:String):ApiResult
    @POST("api/mobile/activation/inspect") suspend fun inspectActivation(@Body body:ActivationInspectRequest):ActivationInspectResponse
    @POST("api/mobile/activation/claim") suspend fun claim(@Body body:ClaimRequest):ClaimResponse
    @POST("api/mobile/nfc/verify") suspend fun verifyNfc(@Body body:VerifyNfcRequest):VerifyNfcResponse
    @GET("api/mobile/programming/cards") suspend fun programmingCards():ProgrammingCardsResponse
    @POST("api/mobile/programming/cards/{id}") suspend fun markProgrammed(@Path("id") id:String,@Body body:ProgramRequest):ApiResult
    @GET("api/profiles/{id}/share-targets") suspend fun shareTargets(@Path("id") id:String,@Query("locale") locale:String):ShareTargetsResponse
    @GET("api/share/products") suspend fun shareProducts():ShareProductsResponse
    @PATCH("api/share/products/{id}") suspend fun updateShareProduct(@Path("id") id:String,@Body body:ShareProductUpdateRequest):ShareProductUpdateResponse
    @POST("api/share/activation/inspect") suspend fun inspectScratchActivation(@Body body:ScratchActivationInspectRequest):ScratchActivationInspectResponse
    @POST("api/share/activation/claim") suspend fun claimScratchActivation(@Body body:ScratchActivationClaimRequest):ScratchActivationClaimResponse
    @GET("api/settings/preferences") suspend fun settingsPreferences():SettingsPreferencesResponse
    @PATCH("api/settings/preferences") suspend fun updateSettingsPreferences(@Body body:JsonObject):SettingsPreferencesResponse
    @GET("api/settings/notifications") suspend fun notificationPreferences():NotificationPreferencesResponse
    @PATCH("api/settings/notifications") suspend fun updateNotificationPreferences(@Body body:JsonObject):NotificationPreferencesResponse
    @GET("api/friends/settings") suspend fun friendsSettings(@Query("locale") locale:String):FriendsSettingsResponse
    @PATCH("api/friends/settings") suspend fun updateFriendsSettings(@Body body:FriendsSettingsPatchRequest):FriendsSettingsResponse
    @POST("api/friends/community-policy") suspend fun acceptFriendsPolicy(@Body body:LocaleRequest):FriendsPolicyResponse
    @GET("api/friends") suspend fun friends(@Query("locale") locale:String,@Query("cursor") cursor:String?=null):FriendsListResponse
    @GET("api/friends/requests") suspend fun friendRequests(@Query("locale") locale:String,@Query("cursor") cursor:String?=null):FriendRequestsResponse
    @GET("api/friends/search") suspend fun searchFriends(@Query("locale") locale:String,@Query("q") query:String,@Query("cursor") cursor:String?=null):FriendSearchResponse
    @POST("api/friends/requests") suspend fun createFriendRequest(@Body body:FriendRequestCreateRequest):FriendMutationResponse
    @POST("api/friends/requests/{id}/accept") suspend fun acceptFriendRequest(@Path("id") id:String,@Body body:LocaleRequest):FriendMutationResponse
    @POST("api/friends/requests/{id}/reject") suspend fun rejectFriendRequest(@Path("id") id:String,@Body body:LocaleRequest):FriendMutationResponse
    @DELETE("api/friends/requests/{id}") suspend fun cancelFriendRequest(@Path("id") id:String):FriendMutationResponse
    @PATCH("api/friends/{key}") suspend fun updateFriendPreference(@Path("key") key:String,@Body body:FriendPreferencePatchRequest):FriendPreferenceResponse
    @DELETE("api/friends/{key}") suspend fun removeFriend(@Path("key") key:String):FriendMutationResponse
    @GET("api/blocks") suspend fun blockedUsers(@Query("locale") locale:String):BlockedUsersResponse
    @POST("api/blocks") suspend fun blockUser(@Body body:BlockUserRequest):FriendMutationResponse
    @DELETE("api/blocks/{id}") suspend fun unblockUser(@Path("id") id:String):FriendMutationResponse
    @POST("api/reports") suspend fun reportUser(@Body body:ReportUserRequest):ReportUserResponse
    @GET("api/nearby/settings") suspend fun nearbySettings(@Query("locale") locale:String):NearbySettingsResponse
    @POST("api/nearby/consent") suspend fun acceptNearbyConsent(@Body body:NearbyConsentRequest):NearbyConsentResponse
    @POST("api/nearby/presence") suspend fun updateNearbyPresence(@Query("locale") locale:String,@Body body:NearbyPresenceRequest):NearbyPresenceResponse
    @DELETE("api/nearby/presence") suspend fun disableNearbyPresence():NearbyDisableResponse
    @GET("api/nearby") suspend fun nearbyResults(@Query("locale") locale:String):NearbyResultsResponse
    @GET("api/security/overview") suspend fun securityOverview():SecurityOverviewResponse
    @GET("api/security/devices") suspend fun securityDevices():SecurityDevicesResponse
    @GET("api/security/sessions") suspend fun securitySessions():SecuritySessionsResponse
    @GET("api/security/passkeys") suspend fun securityPasskeys():SecurityPasskeysResponse
    @POST("api/security/step-up/options") suspend fun stepUpOptions(@Body body:StepUpRequest):StepUpResponse
    @POST("api/security/step-up/verify") suspend fun verifyStepUp(@Body body:StepUpRequest):StepUpResponse
    @HTTP(method="DELETE",path="api/security/sessions/{id}",hasBody=false) suspend fun revokeSecuritySession(@Path("id") id:String,@Header("X-POP-Step-Up") grant:String):SecurityMutationResponse
    @POST("api/security/sessions/revoke-others") suspend fun revokeOtherSecuritySessions(@Header("X-POP-Step-Up") grant:String):SecurityMutationResponse
    @POST("api/security/sessions/revoke-all") suspend fun revokeAllSecuritySessions(@Header("X-POP-Step-Up") grant:String):SecurityMutationResponse
    @HTTP(method="DELETE",path="api/security/passkeys/{id}",hasBody=false) suspend fun removeSecurityPasskey(@Path("id") id:String,@Header("X-POP-Step-Up") grant:String):ApiResult
    @POST("api/security/products/{id}/lost") suspend fun reportProductLost(@Path("id") id:String,@Header("X-POP-Step-Up") grant:String):ApiResult
    @POST("api/security/account/phone/change/start") suspend fun startPhoneChange(@Body body:PhoneChangeStartRequest,@Header("X-POP-Step-Up") grant:String):PhoneChangeStartResponse
    @POST("api/security/account/phone/change/verify") suspend fun verifyPhoneChange(@Body body:PhoneChangeVerifyRequest):ApiResult
    @POST("api/security/account/deletion-request") suspend fun requestAccountDeletion(@Header("X-POP-Step-Up") grant:String):AccountDeletionResponse
}
