package com.popwam.pop.data.auth

import android.content.Context
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential

/** Credential Manager bridge. Options and responses always come from/go to POP's WebAuthn server. */
class PasskeyCoordinator(context:Context) {
    private val manager=CredentialManager.create(context)
    suspend fun register(context:Context,creationOptionsJson:String):String { val result=manager.createCredential(context,CreatePublicKeyCredentialRequest(creationOptionsJson));return (result as CreatePublicKeyCredentialResponse).registrationResponseJson }
    suspend fun authenticate(context:Context,requestOptionsJson:String):String { val result=manager.getCredential(context,GetCredentialRequest(listOf(GetPublicKeyCredentialOption(requestOptionsJson))));return (result.credential as PublicKeyCredential).authenticationResponseJson }
}
