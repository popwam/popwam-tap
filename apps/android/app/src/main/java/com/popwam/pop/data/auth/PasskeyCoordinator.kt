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
            if(BuildConfig.DEBUG) AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_EFFECTIVE_OPTIONS,passkeyEffectiveOptionsOutcome(options))
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

/** Temporary debug-only, field-level dump. Never emits challenge, user handle, credential IDs, or user text. */
internal fun passkeyEffectiveOptionsOutcome(options:com.google.gson.JsonObject):String {
    fun type(value:com.google.gson.JsonElement?)=when {
        value==null || value.isJsonNull -> "null"
        value.isJsonObject -> "object"
        value.isJsonArray -> "array"
        value.isJsonPrimitive && value.asJsonPrimitive.isString -> "string"
        value.isJsonPrimitive && value.asJsonPrimitive.isBoolean -> "boolean"
        value.isJsonPrimitive && value.asJsonPrimitive.isNumber -> "number"
        else -> "other"
    }
    fun bytes(value:com.google.gson.JsonElement?)=runCatching { java.util.Base64.getUrlDecoder().decode(value?.asString).size }.getOrDefault(0)
    fun nameFacts(value:String?,display:Boolean):String {
        val kind=when {
            value.isNullOrEmpty() -> "unexpected"
            display && value=="POP user" -> "fallback_pop_user"
            value.contains('@') -> "fallback"
            value.all { it.isLetterOrDigit() || it.isWhitespace() || it in "._-'" } -> "account_name"
            else -> "synthetic_identifier"
        }
        return "${kind}_len_${value?.length?:0}_ws_${value?.any(Char::isWhitespace)==true}_at_${value?.contains('@')==true}_empty_${value.isNullOrEmpty()}_nonascii_${value?.any{it.code>127}==true}"
    }
    val rp=options.getAsJsonObject("rp")
    val user=options.getAsJsonObject("user")
    val selection=options.getAsJsonObject("authenticatorSelection")
    val algs=options.getAsJsonArray("pubKeyCredParams")?.mapNotNull { it.asJsonObject.get("alg")?.asInt }?.joinToString(",") ?: "none"
    val excludes=options.getAsJsonArray("excludeCredentials")
    val transports=excludes?.flatMap { it.asJsonObject.getAsJsonArray("transports")?.mapNotNull { transport->transport.asString } ?: emptyList() }?.distinct()?.joinToString(",") ?: "none"
    val extensions=options.getAsJsonObject("extensions")?.keySet()?.sorted()?.joinToString(",") ?: "none"
    return "rp_id_${rp?.get("id")?.asString?:"missing"}_rp_name_${rp?.get("name")?.asString?:"missing"}_types_rpid_${type(rp?.get("id"))}_rpname_${type(rp?.get("name"))}_userid_${type(user?.get("id"))}_username_${type(user?.get("name"))}_display_${type(user?.get("displayName"))}_challenge_${type(options.get("challenge"))}_params_${type(options.get("pubKeyCredParams"))}_timeout_${type(options.get("timeout"))}_require_${type(selection?.get("requireResidentKey"))}_extensions_${type(options.get("extensions"))}_user_id_redacted_bytes_${bytes(user?.get("id"))}_challenge_redacted_bytes_${bytes(options.get("challenge"))}_user_name_${nameFacts(user?.get("name")?.asString,false)}_display_name_${nameFacts(user?.get("displayName")?.asString,true)}_algorithms_${algs}_timeout_value_${options.get("timeout")?.asString?:"missing"}_exclude_count_${excludes?.size()?:0}_exclude_transports_${transports}_resident_${selection?.get("residentKey")?.asString?:"missing"}_require_value_${selection?.get("requireResidentKey")?.asBoolean?:false}_uv_${selection?.get("userVerification")?.asString?:"missing"}_attachment_${selection?.get("authenticatorAttachment")?.asString?:"omitted"}_attestation_${options.get("attestation")?.asString?:"missing"}_extension_names_${extensions}"
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
