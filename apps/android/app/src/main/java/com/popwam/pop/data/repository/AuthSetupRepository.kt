package com.popwam.pop.data.repository

import com.google.gson.JsonObject
import com.popwam.pop.data.api.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

/** Server is authoritative for account setup; this repository contains no local business rules. */
class AuthSetupRepository(private val api:PopwamApi) {
    suspend fun status(locale:String)=api.profileBootstrapStatus(locale)
    suspend fun legal(locale:String)=api.requiredLegal(locale)
    suspend fun acceptLegal(locale:String)=api.acceptLegal(LegalConsentRequest(locale=locale))
    suspend fun categories(kind:String,locale:String)=api.profileBootstrapCategories(kind,locale)
    suspend fun templates(category:String,kind:String,locale:String)=api.profileBootstrapTemplates(category,kind,locale)
    suspend fun bootstrap(body:ProfileBootstrapRequest)=api.submitProfileBootstrap(body)
    suspend fun currentOnboarding(locale:String)=api.currentOnboarding(locale)
    suspend fun startOnboarding(locale:String)=api.startOnboarding(OnboardingStartRequest(locale))
    suspend fun saveOnboarding(body:OnboardingProgressRequest)=api.saveOnboarding(body)
    suspend fun completeOnboarding(locale:String,revision:Int)=api.completeOnboarding(OnboardingCompleteRequest(locale,revision))
    suspend fun uploadOnboardingImage(profileId:String,name:String,mime:String,bytes:ByteArray)=api.uploadDraftMedia(profileId,"ONBOARDING_IMAGE".toRequestBody("text/plain".toMediaTypeOrNull()),MultipartBody.Part.createFormData("file",name,bytes.toRequestBody(mime.toMediaTypeOrNull())))
    suspend fun passkeyOptions():JsonObject=api.passkeyRegistrationOptions()
    suspend fun verifyPasskey(response:JsonObject)=api.verifyPasskeyRegistration(response)
}
