package com.popwam.pop.data.auth

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import androidx.core.content.ContextCompat
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import com.popwam.pop.R

class BiometricCoordinator(private val activity:FragmentActivity,private val store:SecureSessionStore) {
    fun available()=BiometricManager.from(activity).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)==BiometricManager.BIOMETRIC_SUCCESS
    suspend fun authenticate(enabling:Boolean) {
        val cipher=store.biometricCipher(enabling)
        val authorized=suspendCancellableCoroutine<javax.crypto.Cipher> { continuation ->
            val prompt=BiometricPrompt(activity,ContextCompat.getMainExecutor(activity),object:BiometricPrompt.AuthenticationCallback(){
                override fun onAuthenticationSucceeded(result:BiometricPrompt.AuthenticationResult){
                    if(continuation.isActive)continuation.resume(result.cryptoObject?.cipher ?: return)
                }
                override fun onAuthenticationError(code:Int,message:CharSequence){
                    if(continuation.isActive)continuation.resumeWithException(IllegalStateException("BIOMETRIC_$code"))
                }
            })
            continuation.invokeOnCancellation{prompt.cancelAuthentication()}
            prompt.authenticate(BiometricPrompt.PromptInfo.Builder().setTitle(activity.getString(R.string.p7_biometric_title))
                .setSubtitle(activity.getString(R.string.p7_biometric_help)).setNegativeButtonText(activity.getString(R.string.p7_not_now))
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG).build(),BiometricPrompt.CryptoObject(cipher))
        }
        store.finishBiometric(authorized,enabling)
    }
}
