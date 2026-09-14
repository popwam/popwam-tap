package com.popwam.pop.data.auth

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import java.util.Base64

/**
 * Structural validation only. It neither logs nor changes ceremony values; server policy remains
 * authoritative. It prevents a response envelope or malformed JSON reaching Credential Manager.
 */
internal data class PasskeyCreationOptionsValidation(val valid:Boolean,val classification:String)

internal fun validatePasskeyCreationOptions(options:JsonObject,expectedRpId:String):PasskeyCreationOptionsValidation {
    fun invalid(value:String)=PasskeyCreationOptionsValidation(false,value)
    val rp=options.objectAt("rp") ?: return invalid("rp_missing")
    if(rp.stringAt("id")!=expectedRpId)return invalid("rp_id_invalid")
    if(rp.stringAt("name").isNullOrBlank())return invalid("rp_name_missing")
    val user=options.objectAt("user") ?: return invalid("user_missing")
    if(!user.stringAt("id").isValidWebAuthnBase64Url())return invalid("user_id_invalid")
    if(user.stringAt("name").isNullOrBlank())return invalid("user_name_missing")
    if(user.stringAt("displayName").isNullOrBlank())return invalid("user_display_name_missing")
    if(!options.stringAt("challenge").isValidWebAuthnBase64Url())return invalid("challenge_invalid")
    val parameters=options.arrayAt("pubKeyCredParams") ?: return invalid("pub_key_cred_params_missing")
    if(parameters.size()==0||parameters.any { item->
        val parameter=item.asObjectOrNull()
        parameter?.stringAt("type")!="public-key"||parameter.get("alg")?.isJsonPrimitive!=true||!parameter.get("alg").asJsonPrimitive.isNumber
    })return invalid("pub_key_cred_params_invalid")
    options.get("timeout")?.let { timeout->
        if(!timeout.isJsonPrimitive||!timeout.asJsonPrimitive.isNumber)return invalid("timeout_invalid")
        val milliseconds=timeout.asDouble
        if(!milliseconds.isFinite()||milliseconds<0||milliseconds!=milliseconds.toLong().toDouble())return invalid("timeout_invalid")
    }
    val selection=options.objectAt("authenticatorSelection") ?: return invalid("authenticator_selection_missing")
    selection.let {
        val resident=selection.stringAt("residentKey")
        if(resident!=null&&resident !in setOf("required","preferred","discouraged"))return invalid("resident_key_invalid")
        val requireResident=selection.get("requireResidentKey")
        if(requireResident!=null&&(!requireResident.isJsonPrimitive||!requireResident.asJsonPrimitive.isBoolean))return invalid("require_resident_key_invalid")
        if(resident!="required"||requireResident?.asBoolean!=true)return invalid("discoverable_passkey_required")
        val verification=selection.stringAt("userVerification")
        if(verification!="required")return invalid("user_verification_required")
        val attachment=selection.stringAt("authenticatorAttachment")
        if(attachment!=null&&attachment!="platform")return invalid("authenticator_attachment_invalid")
    }
    options.stringAt("attestation")?.let { if(it !in setOf("none","indirect","direct","enterprise"))return invalid("attestation_invalid") }
    options.arrayAt("excludeCredentials")?.let { credentials->if(credentials.any { credential->
        val item=credential.asObjectOrNull()
        item?.stringAt("type")!="public-key"||!item.stringAt("id").isValidWebAuthnBase64Url()||!item.transportsValid()
    })return invalid("exclude_credentials_invalid") }
    return PasskeyCreationOptionsValidation(true,"valid")
}

private fun JsonObject.objectAt(name:String)=get(name)?.asObjectOrNull()
private fun JsonObject.arrayAt(name:String)=get(name)?.takeIf(JsonElement::isJsonArray)?.asJsonArray
private fun JsonObject.stringAt(name:String)=get(name)?.takeIf(JsonElement::isJsonPrimitive)?.asJsonPrimitive?.takeIf { it.isString }?.asString
private fun JsonElement.asObjectOrNull()=takeIf(JsonElement::isJsonObject)?.asJsonObject
private fun String?.isValidWebAuthnBase64Url()=this?.matches(Regex("[A-Za-z0-9_-]+"))==true&&runCatching { Base64.getUrlDecoder().decode(this) }.isSuccess
private fun JsonObject.transportsValid():Boolean {
    val transports=get("transports")?:return true
    return transports.isJsonArray&&transports.asJsonArray.all { value->
        value.isJsonPrimitive&&value.asJsonPrimitive.isString&&value.asString in setOf("usb","nfc","ble","internal","hybrid")
    }
}
