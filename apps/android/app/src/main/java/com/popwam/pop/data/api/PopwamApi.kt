package com.popwam.pop.data.api

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.*

interface AuthApi {
    @GET("api/otp/channels") suspend fun otpChannels(@Query("countryIso2") countryIso2:String):OtpChannelsResponse
    @POST("api/mobile/auth/otp/send") suspend fun sendOtp(@Body body:OtpSendRequest):OtpSendResponse
    @POST("api/mobile/auth/otp/verify") suspend fun verifyOtp(@Body body:OtpVerifyRequest):AuthResponse
    @POST("api/mobile/auth/refresh") suspend fun refresh(@Body body:RefreshRequest):AuthResponse
    @POST("api/mobile/auth/logout") suspend fun logout(@Body body:LogoutRequest):ApiResult
}

interface PopwamApi {
    @GET("api/mobile/cards") suspend fun cards():CardsResponse
    @GET("api/mobile/cards/{id}") suspend fun card(@Path("id") id:String):CardDetailResponse
    @PATCH("api/mobile/cards/{id}") suspend fun updateCard(@Path("id") id:String,@Body body:CardUpdateRequest):ApiResult
    @GET("api/mobile/profiles") suspend fun profiles():ProfilesResponse
    @POST("api/mobile/profiles") suspend fun createProfile(@Body body:ProfileWriteRequest):ProfileCreateResponse
    @POST("api/mobile/profiles") suspend fun createVirtualCard(@Body body:VirtualCardCreateRequest):ProfileCreateResponse
    @PATCH("api/mobile/profiles/{id}") suspend fun updateProfile(@Path("id") id:String,@Body body:ProfileWriteRequest):ApiResult
    @GET("api/mobile/templates") suspend fun templates():TemplatesResponse
    @PATCH("api/mobile/virtual-cards/{id}/template") suspend fun selectTemplate(@Path("id") id:String,@Body body:TemplateSelectionRequest):ApiResult
    @POST("api/mobile/virtual-cards/{id}/google-wallet") suspend fun googleWallet(@Path("id") id:String):GoogleWalletLinkResponse
    @Multipart @POST("api/mobile/profiles/{id}/media") suspend fun uploadMedia(@Path("id") id:String,@Part("kind") kind:RequestBody,@Part file:MultipartBody.Part):ApiResult
    @Multipart @POST("api/mobile/profiles/{id}/files") suspend fun uploadFile(@Path("id") id:String,@Part("titleAr") titleAr:RequestBody,@Part("titleEn") titleEn:RequestBody,@Part file:MultipartBody.Part):ApiResult
    @GET("api/mobile/profiles/{id}/destinations") suspend fun destinations(@Path("id") id:String):Map<String,Any>
    @POST("api/mobile/profiles/{id}/destinations") suspend fun createDestination(@Path("id") id:String,@Body body:DestinationWriteRequest):ApiResult
    @DELETE("api/mobile/destinations/{id}") suspend fun deleteDestination(@Path("id") id:String):ApiResult
    @POST("api/mobile/activation/inspect") suspend fun inspectActivation(@Body body:ActivationInspectRequest):ActivationInspectResponse
    @POST("api/mobile/activation/claim") suspend fun claim(@Body body:ClaimRequest):ClaimResponse
    @POST("api/mobile/nfc/verify") suspend fun verifyNfc(@Body body:VerifyNfcRequest):VerifyNfcResponse
    @GET("api/mobile/programming/cards") suspend fun programmingCards():ProgrammingCardsResponse
    @POST("api/mobile/programming/cards/{id}") suspend fun markProgrammed(@Path("id") id:String,@Body body:ProgramRequest):ApiResult
}
