package com.popwam.pop.data.auth

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.popwam.mobile.foundation.platform.BiometricCapability
import com.popwam.mobile.foundation.platform.DeviceBindingOptions
import com.popwam.mobile.foundation.platform.DeviceBindingProof
import com.popwam.mobile.foundation.platform.DeviceBindingProvider
import com.popwam.mobile.foundation.platform.DeviceBindingResult
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

class AndroidDeviceBindingProvider(private val activity:FragmentActivity):DeviceBindingProvider {
    private val manager=BiometricManager.from(activity)

    fun capability():BiometricCapability=androidBiometricCapability(
        manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG),
        activity.packageManager.hasSystemFeature("android.hardware.fingerprint"),
        activity.packageManager.hasSystemFeature("android.hardware.biometrics.face"),
    )

    override suspend fun credentialId():String? = listOf(BIOMETRIC_ALIAS,FALLBACK_ALIAS).firstNotNullOfOrNull { alias ->
        keyPair(alias)?.public?.encoded?.let(::credentialId)
    }

    override suspend fun createProof(options:DeviceBindingOptions,requireBiometric:Boolean):DeviceBindingResult {
        val capability=capability()
        if(requireBiometric&&capability==BiometricCapability.AVAILABLE_NOT_ENROLLED)return DeviceBindingResult.NotEnrolled
        if(requireBiometric&&capability==BiometricCapability.UNAVAILABLE)return DeviceBindingResult.Failed(false)
        if(requireBiometric&&capability==BiometricCapability.SECURITY_UPDATE_REQUIRED)return DeviceBindingResult.Failed(false)
        val alias=if(requireBiometric)BIOMETRIC_ALIAS else FALLBACK_ALIAS
        val pair=runCatching { keyPair(alias) ?: createKey(alias,requireBiometric) }.getOrElse {
            return if(it is KeyPermanentlyInvalidatedException)DeviceBindingResult.KeyInvalidated else DeviceBindingResult.Failed(false)
        }
        val signature=runCatching { Signature.getInstance("SHA256withECDSA").apply { initSign(pair.private) } }.getOrElse {
            return if(it is KeyPermanentlyInvalidatedException)DeviceBindingResult.KeyInvalidated else DeviceBindingResult.Failed(false)
        }
        val signed=if(requireBiometric)when(val authenticated=authenticateAndSign(signature,options.challenge.toByteArray())) {
            is SignResult.Signed -> authenticated.value
            SignResult.Cancelled -> return DeviceBindingResult.Cancelled
            SignResult.NotEnrolled -> return DeviceBindingResult.NotEnrolled
            SignResult.TemporarilyLocked -> return DeviceBindingResult.TemporarilyLocked
            SignResult.PermanentlyLocked -> return DeviceBindingResult.PermanentlyLocked
            SignResult.Failed -> return DeviceBindingResult.Failed(true)
        } else runCatching {
            signature.update(options.challenge.toByteArray());signature.sign()
        }.fold({it},{return DeviceBindingResult.Failed(false)})
        val publicKey=encode(pair.public.encoded)
        return DeviceBindingResult.Success(DeviceBindingProof(
            challenge=options.challenge,
            credentialId=credentialId(pair.public.encoded),
            publicKey=publicKey,
            signature=encode(signed),
            biometricType=if(requireBiometric)capability else BiometricCapability.UNAVAILABLE,
        ))
    }

    override suspend fun invalidate() {
        val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
        listOf(BIOMETRIC_ALIAS,FALLBACK_ALIAS).forEach { if(store.containsAlias(it))store.deleteEntry(it) }
    }

    private sealed interface SignResult {
        data class Signed(val value:ByteArray):SignResult
        data object Cancelled:SignResult
        data object NotEnrolled:SignResult
        data object TemporarilyLocked:SignResult
        data object PermanentlyLocked:SignResult
        data object Failed:SignResult
    }

    private suspend fun authenticateAndSign(signature:Signature,payload:ByteArray):SignResult=suspendCancellableCoroutine { continuation ->
        val prompt=BiometricPrompt(activity,ContextCompat.getMainExecutor(activity),object:BiometricPrompt.AuthenticationCallback(){
            override fun onAuthenticationSucceeded(result:BiometricPrompt.AuthenticationResult){
                val unlocked=result.cryptoObject?.signature
                if(unlocked==null)continuation.resume(SignResult.Failed) else runCatching { unlocked.update(payload);unlocked.sign() }
                    .fold({continuation.resume(SignResult.Signed(it))},{continuation.resume(SignResult.Failed)})
            }
            override fun onAuthenticationError(errorCode:Int,errString:CharSequence){
                val result=when(errorCode) {
                    BiometricPrompt.ERROR_LOCKOUT -> SignResult.TemporarilyLocked
                    BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> SignResult.PermanentlyLocked
                    BiometricPrompt.ERROR_NO_BIOMETRICS -> SignResult.NotEnrolled
                    BiometricPrompt.ERROR_NEGATIVE_BUTTON,
                    BiometricPrompt.ERROR_USER_CANCELED,
                    BiometricPrompt.ERROR_CANCELED -> SignResult.Cancelled
                    else -> SignResult.Failed
                }
                if(continuation.isActive)continuation.resume(result)
            }
        })
        val info=BiometricPrompt.PromptInfo.Builder()
            .setTitle("Authorize POP")
            .setSubtitle("Unlock this device credential")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .setNegativeButtonText("Cancel")
            .setConfirmationRequired(true)
            .build()
        prompt.authenticate(info,BiometricPrompt.CryptoObject(signature))
        continuation.invokeOnCancellation { prompt.cancelAuthentication() }
    }

    private fun createKey(alias:String,requiresBiometric:Boolean):KeyPair {
        val builder=KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_SIGN)
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setInvalidatedByBiometricEnrollment(requiresBiometric)
        if(requiresBiometric) {
            builder.setUserAuthenticationRequired(true)
            if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.R)builder.setUserAuthenticationParameters(0,KeyProperties.AUTH_BIOMETRIC_STRONG)
            else @Suppress("DEPRECATION") builder.setUserAuthenticationValidityDurationSeconds(-1)
        }
        return KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC,"AndroidKeyStore").run { initialize(builder.build());generateKeyPair() }
    }

    private fun keyPair(alias:String):KeyPair? {
        val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
        val entry=store.getEntry(alias,null) as? KeyStore.PrivateKeyEntry ?: return null
        return KeyPair(entry.certificate.publicKey,entry.privateKey)
    }

    private fun credentialId(encoded:ByteArray)=encode(MessageDigest.getInstance("SHA-256").digest(encoded))
    private fun encode(value:ByteArray)=android.util.Base64.encodeToString(value,android.util.Base64.URL_SAFE or android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING)

    companion object {
        private const val BIOMETRIC_ALIAS="popwam_mobile_device_binding_biometric_v1"
        private const val FALLBACK_ALIAS="popwam_mobile_device_binding_fallback_v1"
    }
}

internal fun androidBiometricCapability(status:Int,hasFingerprint:Boolean,hasFace:Boolean)=when(status) {
    BiometricManager.BIOMETRIC_SUCCESS -> when {
        hasFingerprint -> BiometricCapability.FINGERPRINT
        hasFace -> BiometricCapability.FACE
        else -> BiometricCapability.GENERIC_BIOMETRIC
    }
    BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricCapability.AVAILABLE_NOT_ENROLLED
    BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
    BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> BiometricCapability.UNAVAILABLE
    BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> BiometricCapability.SECURITY_UPDATE_REQUIRED
    else -> BiometricCapability.TEMPORARILY_LOCKED
}
