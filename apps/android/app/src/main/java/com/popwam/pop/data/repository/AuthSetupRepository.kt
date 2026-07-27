package com.popwam.pop.data.repository

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.popwam.pop.data.api.*
import com.popwam.pop.data.auth.AuthRuntimeDiagnostics
import com.popwam.pop.data.auth.AuthRuntimeStage
import com.popwam.pop.data.auth.validatePasskeyCreationOptions
import com.popwam.pop.BuildConfig
import java.net.URI
import retrofit2.HttpException
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

internal const val STEP_UP_REQUIRED="STEP_UP_REQUIRED"
internal const val PASSKEY_OPTIONS_FAILED="PASSKEY_OPTIONS_FAILED"

internal class PasskeyOptionsHttpException(
    val statusCode:Int,
    val safeCode:String?,
    cause:HttpException,
):RuntimeException(cause)

/** Parses only the fixed, public error field; callers never log an HTTP body. */
internal fun safePasskeyOptionsErrorCode(body:String?):String? = runCatching {
    JsonParser.parseString(body).asJsonObject.get("error")?.asString
}.getOrNull()?.takeIf { it==STEP_UP_REQUIRED || it==PASSKEY_OPTIONS_FAILED }
internal fun safeOnboardingErrorCode(body:String?):String? = runCatching { JsonParser.parseString(body).asJsonObject.get("error")?.asString }.getOrNull()
    ?.filter { it.isLetterOrDigit()||it=='_'||it=='-' }?.take(48)

/** Server is authoritative for account setup; this repository contains no local business rules. */
class AuthSetupRepository(private val api:PopwamApi) {
    suspend fun status(locale:String)=api.profileBootstrapStatus(locale)
    suspend fun legal(locale:String)=api.requiredLegal(locale)
    suspend fun acceptLegal(locale:String)=api.acceptLegal(LegalConsentRequest(locale=locale))
    suspend fun categories(kind:String,locale:String)=api.profileBootstrapCategories(kind,locale)
    suspend fun templates(category:String,kind:String,locale:String)=api.profileBootstrapTemplates(category,kind,locale)
    suspend fun bootstrap(body:ProfileBootstrapRequest)=api.submitProfileBootstrap(body)
    suspend fun currentOnboarding(locale:String):OnboardingCurrentResponse {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.ONBOARDING_CURRENT_REQUEST)
        return try { api.currentOnboarding(locale).also { AuthRuntimeDiagnostics.mark(AuthRuntimeStage.ONBOARDING_CURRENT_RESPONSE,"success_http_200") } }
        catch(error:HttpException) { AuthRuntimeDiagnostics.failure(AuthRuntimeStage.ONBOARDING_CURRENT_RESPONSE,error,error.code(),safeOnboardingErrorCode(error.response()?.errorBody()?.string()));throw error }
    }
    suspend fun startOnboarding(locale:String):OnboardingCurrentResponse {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.ONBOARDING_START_REQUEST)
        return try { api.startOnboarding(OnboardingStartRequest(locale)).also { AuthRuntimeDiagnostics.mark(AuthRuntimeStage.ONBOARDING_START_RESPONSE,"success") } }
        catch(error:HttpException) { AuthRuntimeDiagnostics.failure(AuthRuntimeStage.ONBOARDING_START_RESPONSE,error,error.code(),safeOnboardingErrorCode(error.response()?.errorBody()?.string()));throw error }
    }
    suspend fun existingPasskeyAssertionOptions()=api.stepUpOptions(StepUpRequest("ADD_PASSKEY","PASSKEY")).options ?: throw IllegalStateException("PASSKEY_OPTIONS_INVALID")
    suspend fun verifyExistingPasskeyAssertion(assertion:JsonObject)=api.verifyStepUp(StepUpRequest("ADD_PASSKEY","PASSKEY",assertion=assertion))
    suspend fun saveOnboarding(body:OnboardingProgressRequest)=api.saveOnboarding(body)
    suspend fun completeOnboarding(locale:String,revision:Int)=api.completeOnboarding(OnboardingCompleteRequest(locale,revision))
    suspend fun uploadOnboardingImage(profileId:String,name:String,mime:String,bytes:ByteArray)=api.uploadDraftMedia(profileId,"ONBOARDING_IMAGE".toRequestBody("text/plain".toMediaTypeOrNull()),MultipartBody.Part.createFormData("file",name,bytes.toRequestBody(mime.toMediaTypeOrNull())))
    suspend fun passkeyOptions():JsonObject {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_REGISTER_OPTIONS_REQUEST)
        return try {
            api.passkeyRegistrationOptions().also { options->
                if(!passkeyRegistrationOptionsValid(options)) throw IllegalStateException("PASSKEY_OPTIONS_INVALID")
                AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_REGISTER_OPTIONS_RESPONSE,"success")
            }
        } catch(error:HttpException) {
            val safeCode=safePasskeyOptionsErrorCode(error.response()?.errorBody()?.string())
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_REGISTER_OPTIONS_RESPONSE,error,error.code(),safeCode)
            throw PasskeyOptionsHttpException(error.code(),safeCode,error)
        } catch(error:Throwable) {
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_REGISTER_OPTIONS_RESPONSE,error)
            throw error
        }
    }
    suspend fun verifyPasskey(response:JsonObject):ApiResult {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_REGISTER_VERIFY_REQUEST)
        return try {
            api.verifyPasskeyRegistration(response).also { result->
                if(result.ok) AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_REGISTER_VERIFY_RESPONSE,"success")
                else AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_REGISTER_VERIFY_RESPONSE,safeError=result.error)
            }
        } catch(error:Throwable) {
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_REGISTER_VERIFY_RESPONSE,error,(error as? HttpException)?.code())
            throw error
        }
    }
}

fun passkeyRegistrationOptionsValid(options:JsonObject)=validatePasskeyCreationOptions(options,URI(BuildConfig.API_BASE_URL).host).valid
