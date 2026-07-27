package com.popwam.pop.data.auth

import android.content.Context
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import androidx.activity.ComponentActivity

/** Credential Manager bridge. Options and responses always come from/go to POP's WebAuthn server. */
class PasskeyCoordinator(context:Context) {
    private val manager=CredentialManager.create(context)
    suspend fun register(context:Context,creationOptionsJson:String)=register(context.requireHostActivity(),creationOptionsJson)
    suspend fun register(activity:ComponentActivity,creationOptionsJson:String):String {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_CREATE_REQUEST)
        return try {
            val result=manager.createCredential(activity,CreatePublicKeyCredentialRequest(creationOptionsJson))
            val response=(result as CreatePublicKeyCredentialResponse).registrationResponseJson
            AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_CREATE_RESULT,"success")
            response
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

private fun Context.requireHostActivity()=this as? ComponentActivity ?: throw IllegalStateException("PASSKEY_ACTIVITY_UNAVAILABLE")
