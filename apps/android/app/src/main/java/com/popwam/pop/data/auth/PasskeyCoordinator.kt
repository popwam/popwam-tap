package com.popwam.pop.data.auth

import android.content.Context
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import androidx.activity.ComponentActivity
import androidx.credentials.exceptions.publickeycredential.CreatePublicKeyCredentialDomException
import com.google.gson.JsonParser
import com.popwam.pop.BuildConfig
import java.net.URI

/** Credential Manager bridge. Options and responses always come from/go to POP's WebAuthn server. */
class PasskeyCoordinator(context:Context) {
    private val manager=CredentialManager.create(context)
    suspend fun register(context:Context,creationOptionsJson:String)=register(context.requireHostActivity(),creationOptionsJson)
    suspend fun register(activity:ComponentActivity,creationOptionsJson:String):String {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_CREATE_REQUEST)
        return try {
            val options=JsonParser.parseString(creationOptionsJson).asJsonObject
            val validation=validatePasskeyCreationOptions(options,URI(BuildConfig.API_BASE_URL).host)
            AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_OPTIONS_VALIDATION,passkeyOptionsValidationOutcome(options,validation.valid))
            AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_CREATE_ENVIRONMENT,passkeyCreateEnvironmentOutcome(activity,options))
            check(validation.valid) { "PASSKEY_CREATION_OPTIONS_INVALID" }
            val result=manager.createCredential(activity,CreatePublicKeyCredentialRequest(creationOptionsJson))
            val response=(result as CreatePublicKeyCredentialResponse).registrationResponseJson
            AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_CREATE_RESULT,"success")
            response
        } catch(error:CreatePublicKeyCredentialDomException) {
            val domError=error.domError.javaClass.simpleName
            AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_CREATE_ENVIRONMENT,"provider_available_response_received")
            AuthRuntimeDiagnostics.domFailure(AuthRuntimeStage.PASSKEY_CREATE_RESULT,error,domError,passkeyDomErrorClassification(domError))
            throw error
        } catch(error:Throwable) {
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_CREATE_RESULT,error)
            throw error
        }
    }
    suspend fun authenticate(activity:ComponentActivity,requestOptionsJson:String):String {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_GET_CREDENTIAL_REQUEST)
        return try {
            val result=manager.getCredential(activity,GetCredentialRequest(listOf(GetPublicKeyCredentialOption(requestOptionsJson))))
            val response=(result.credential as PublicKeyCredential).authenticationResponseJson
            AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_GET_CREDENTIAL_RESULT,"success")
            response
        } catch(error:Throwable) {
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_GET_CREDENTIAL_RESULT,error)
            throw error
        }
    }
    suspend fun authenticate(context:Context,requestOptionsJson:String)=authenticate(context.requireHostActivity(),requestOptionsJson)
}

internal fun passkeyDomErrorClassification(domError:String)=when(domError) {
    "DataError" -> "data_error"
    "SecurityError" -> "security_error"
    "NotAllowedError" -> "not_allowed"
    "InvalidStateError" -> "invalid_state"
    "NotSupportedError" -> "not_supported"
    "UnknownError" -> "unknown_error"
    else -> "other_dom_error"
}

/** Safe, local-only facts. DAL network verification stays external because the app must not trust a self-check. */
internal fun passkeyCreateEnvironmentOutcome(context:Context,options:com.google.gson.JsonObject):String {
    val manifestAssociationPresent=context.resources.getIdentifier("asset_statements","string",context.packageName)!=0
    val extensions=options.getAsJsonObject("extensions")
    val selection=options.getAsJsonObject("authenticatorSelection")
    val eddsa=options.getAsJsonArray("pubKeyCredParams")?.any { it.asJsonObject.get("alg")?.asInt == -8 } ?: false
    return "manifest_association_present_${manifestAssociationPresent}_dal_configuration_not_runtime_verified_credential_manager_version_${BuildConfig.CREDENTIAL_MANAGER_VERSION}_provider_available_pending_request_credprops_${extensions?.has("credProps")==true}_timeout_${options.has("timeout")}_require_resident_${selection?.has("requireResidentKey")==true}_eddsa_${eddsa}"
}

internal fun passkeyOptionsValidationOutcome(options:com.google.gson.JsonObject,valid:Boolean):String {
    fun bytes(name:String)=runCatching { java.util.Base64.getUrlDecoder().decode(options.get(name)?.asString).size }.getOrDefault(0)
    val user=options.getAsJsonObject("user")
    val selection=options.getAsJsonObject("authenticatorSelection")
    val algs=options.getAsJsonArray("pubKeyCredParams")?.mapNotNull { it.asJsonObject.get("alg")?.asInt } ?: emptyList()
    val extensions=options.getAsJsonObject("extensions")
    return "valid_${valid}_rpid_${options.getAsJsonObject("rp")?.get("id")?.asString==URI(BuildConfig.API_BASE_URL).host}_rpname_${!options.getAsJsonObject("rp")?.get("name")?.asString.isNullOrBlank()}_challenge_${bytes("challenge")}_userid_${runCatching{java.util.Base64.getUrlDecoder().decode(user?.get("id")?.asString).size}.getOrDefault(0)}_username_${!user?.get("name")?.asString.isNullOrBlank()}_display_${!user?.get("displayName")?.asString.isNullOrBlank()}_alg_${algs.size}_es256_${algs.contains(-7)}_rs256_${algs.contains(-257)}_eddsa_${algs.contains(-8)}_exclude_${options.getAsJsonArray("excludeCredentials")?.size()?:0}_resident_${selection?.get("residentKey")?.asString?:"none"}_require_${selection?.get("requireResidentKey")?.asBoolean?:false}_uv_${selection?.get("userVerification")?.asString?:"none"}_attestation_${options.get("attestation")?.asString?:"none"}_credprops_${extensions?.has("credProps")==true}_otherext_${extensions?.entrySet()?.any{it.key!="credProps"}==true}"
}

private fun Context.requireHostActivity()=this as? ComponentActivity ?: throw IllegalStateException("PASSKEY_ACTIVITY_UNAVAILABLE")
