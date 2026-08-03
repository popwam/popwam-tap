package com.popwam.pop.ui.auth

import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.popwam.mobile.authentication.AuthenticationCoordinator
import com.popwam.mobile.authentication.AuthenticationError
import com.popwam.mobile.authentication.AuthenticationRemoteDataSource
import com.popwam.mobile.authentication.AuthenticationStage
import com.popwam.mobile.authentication.AuthenticationUiState
import com.popwam.mobile.foundation.auth.AuthenticationNextAction
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.platform.BiometricCapability
import com.popwam.mobile.foundation.platform.DeviceBindingResult
import com.popwam.pop.data.auth.AndroidDeviceBindingProvider
import com.popwam.pop.data.auth.FirebasePhoneAuthGateway
import com.popwam.pop.data.auth.FirebasePhoneEvent
import com.popwam.pop.data.auth.FirebasePhoneFailure
import com.popwam.pop.data.auth.PasskeyCoordinator
import com.popwam.pop.data.auth.PhoneIdentity
import com.popwam.pop.data.auth.PhoneParseResult
import com.popwam.pop.data.auth.SecureSessionStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject

class AuthenticationFlowViewModel(
    remote:AuthenticationRemoteDataSource,
    private val vault:SecureSessionStore,
    private val firebase:FirebasePhoneAuthGateway,
):ViewModel() {
    val coordinator=AuthenticationCoordinator(remote,vault)
    val state:StateFlow<AuthenticationUiState> = coordinator.state
    val overlays=coordinator.overlays.state
    private val mutableCountrySearch=MutableStateFlow("")
    val countrySearch:StateFlow<String> = mutableCountrySearch.asStateFlow()
    private var firebaseOperation=false

    init { viewModelScope.launch {
        val restored=vault.readRestoration()
        coordinator.restoreEnrollment()
        restored?.providerChallengeHandle?.let(firebase::restoreVerificationId)
    } }

    fun updatePhone(value:String)=coordinator.updatePhone(value)
    fun openCountry()=coordinator.openCountry()
    fun closeCountry()=coordinator.closeCountry()
    fun selectCountry(activity:FragmentActivity,iso2:String){PhoneIdentity.saveCountry(activity,iso2);coordinator.updateCountry(iso2);coordinator.closeCountry()}
    fun searchCountry(value:String){mutableCountrySearch.value=value}
    fun updateOtp(value:String)=coordinator.updateOtp(value)

    fun continuePhone(activity:FragmentActivity) {
        val snapshot=state.value
        val parsed=PhoneIdentity.parse(snapshot.phoneInput,snapshot.countryIso2)
        val normalized=(parsed as? PhoneParseResult.Valid)?.e164
        if(normalized==null){coordinator.reportError(when(parsed){
            PhoneParseResult.Empty->AuthenticationError.EMPTY_PHONE
            PhoneParseResult.Incomplete->AuthenticationError.INCOMPLETE_PHONE
            PhoneParseResult.InvalidCountry->AuthenticationError.INVALID_COUNTRY
            PhoneParseResult.Impossible->AuthenticationError.IMPOSSIBLE_NUMBER
            PhoneParseResult.InvalidLength->AuthenticationError.INVALID_LENGTH
            else->AuthenticationError.INVALID_PHONE
        });return}
        viewModelScope.launch {
            val credentialId=AndroidDeviceBindingProvider(activity).credentialId()
            val challenge=coordinator.startChallenge(normalized,PhoneIdentity.mask(normalized),credentialId) ?: return@launch
            when(challenge.nextAction) {
                AuthenticationNextAction.VERIFY_OTP -> startFirebase(activity,normalized,false)
                AuthenticationNextAction.AUTHENTICATE_BIOMETRIC -> refreshBiometric(activity)
                else -> Unit
            }
        }
    }

    fun resend(activity:FragmentActivity){if(coordinator.beginOtpResend())state.value.phoneE164?.let { startFirebase(activity,it,true) }}
    fun verifyOtp(){
        val value=state.value.otp.value
        val length=state.value.challenge?.otpConfiguration?.codeLength ?: return
        if(!state.value.otp.isComplete(length)){coordinator.reportError(AuthenticationError.OTP_INVALID);return}
        if(coordinator.beginOtpVerification())firebase.verifyCode(value,::handleFirebase)
    }
    fun changePhone(){firebase.reset();firebaseOperation=false;viewModelScope.launch { coordinator.resetPhone() }}

    fun usePhoneFallback(activity:FragmentActivity){
        if(coordinator.usePhoneFallback())state.value.phoneE164?.let { startFirebase(activity,it,false) }
    }
    fun usePasskeyFallback(){coordinator.usePasskeyFallback()}

    fun continueVerified()=coordinator.continueVerified()

    fun launchPasskey(activity:FragmentActivity) = viewModelScope.launch {
        val enrollment=state.value.challenge?.nextAction==AuthenticationNextAction.ENROLL_PASSKEY
        coordinator.markWaitingForNativeUi()
        val options=coordinator.passkeyOptions(enrollment) ?: return@launch
        runCatching { PasskeyCoordinator(activity).let { if(enrollment)it.register(activity,options.toString()) else it.authenticate(activity,options.toString()) } }
            .onSuccess { raw ->
                val response=runCatching { Json.parseToJsonElement(raw).jsonObject }.getOrNull()
                if(response==null)coordinator.reportError(AuthenticationError.PASSKEY_REJECTED)
                else if(enrollment) {
                    if(coordinator.acceptPasskeyEnrollment(response))refreshBiometric(activity)
                } else coordinator.acceptPasskeyAuthentication(response,android.os.Build.MODEL.take(120))
            }
            .onFailure { error -> coordinator.nativeCancelled(passkeyOperationError(error.javaClass.simpleName)) }
    }

    fun refreshBiometric(activity:FragmentActivity) {
        if(state.value.stage==AuthenticationStage.BIOMETRIC)coordinator.setBiometricCapability(AndroidDeviceBindingProvider(activity).capability())
    }

    fun launchBiometric(activity:FragmentActivity) = viewModelScope.launch {
        val challenge=state.value.challenge ?: return@launch
        val enrollment=challenge.nextAction==AuthenticationNextAction.ENROLL_BIOMETRIC || challenge.nextAction==AuthenticationNextAction.ACCOUNT_CREATED
        val provider=AndroidDeviceBindingProvider(activity)
        val capability=provider.capability()
        coordinator.setBiometricCapability(capability)
        if(capability==BiometricCapability.AVAILABLE_NOT_ENROLLED){coordinator.reportError(AuthenticationError.BIOMETRIC_NOT_ENROLLED);return@launch}
        if(capability==BiometricCapability.TEMPORARILY_LOCKED){coordinator.reportError(AuthenticationError.BIOMETRIC_TEMPORARILY_LOCKED);return@launch}
        if(capability==BiometricCapability.SECURITY_UPDATE_REQUIRED){coordinator.reportError(AuthenticationError.BIOMETRIC_SECURITY_UPDATE_REQUIRED);return@launch}
        val options=coordinator.deviceOptions(enrollment,provider.credentialId()) ?: return@launch
        val result=provider.createProof(options,requireBiometric=capability!=BiometricCapability.UNAVAILABLE)
        when(result) {
            is DeviceBindingResult.Success -> if(enrollment) {
                if(coordinator.acceptDeviceEnrollment(result.proof))coordinator.completeEnrollment(android.os.Build.MODEL.take(120))
            } else coordinator.acceptDeviceAuthentication(result.proof,android.os.Build.MODEL.take(120))
            DeviceBindingResult.NotEnrolled -> coordinator.reportError(AuthenticationError.BIOMETRIC_NOT_ENROLLED)
            DeviceBindingResult.TemporarilyLocked -> coordinator.reportError(AuthenticationError.BIOMETRIC_TEMPORARILY_LOCKED)
            DeviceBindingResult.PermanentlyLocked -> coordinator.reportError(AuthenticationError.BIOMETRIC_PERMANENTLY_LOCKED)
            DeviceBindingResult.KeyInvalidated -> coordinator.reportError(AuthenticationError.RECOVERY_REQUIRED)
            DeviceBindingResult.Cancelled -> coordinator.nativeCancelled(AuthenticationError.BIOMETRIC_CANCELLED)
            is DeviceBindingResult.Failed -> coordinator.reportError(AuthenticationError.DEVICE_BINDING_FAILED)
        }
    }

    fun accountCreatedDestination():PopDestination.ProfileSetup?=coordinator.profileSetupDestination()
    fun retry()=viewModelScope.launch { coordinator.restoreEnrollment() }

    private fun startFirebase(activity:FragmentActivity,phone:String,resend:Boolean) {
        if(firebaseOperation)return
        firebaseOperation=true
        firebase.start(activity,phone,resend,::handleFirebase)
    }

    private fun handleFirebase(event:FirebasePhoneEvent) {
        viewModelScope.launch {
            when(event) {
                is FirebasePhoneEvent.CodeSent -> {firebaseOperation=false;coordinator.phoneCodeSent(event.verificationId)}
                is FirebasePhoneEvent.Verified -> {firebaseOperation=false;coordinator.exchangeFirebaseProof(event.idToken,android.os.Build.MODEL.take(120))}
                is FirebasePhoneEvent.Failed -> {firebaseOperation=false;coordinator.reportError(event.reason.toAuthenticationError())}
                FirebasePhoneEvent.AutoRetrievalTimedOut -> firebaseOperation=false
            }
        }
    }
}

internal fun passkeyOperationError(className:String)=when {
    className.contains("Cancellation",true) || className.contains("Interrupted",true) -> AuthenticationError.PASSKEY_CANCELLED
    className.contains("NoCredential",true) || className.contains("Unsupported",true) -> AuthenticationError.PASSKEY_UNAVAILABLE
    className.contains("Configuration",true) -> AuthenticationError.CONFIGURATION
    else -> AuthenticationError.PASSKEY_REJECTED
}

private fun FirebasePhoneFailure.toAuthenticationError()=when(this) {
    FirebasePhoneFailure.INVALID_PHONE -> AuthenticationError.INVALID_PHONE
    FirebasePhoneFailure.INVALID_CODE -> AuthenticationError.OTP_INVALID
    FirebasePhoneFailure.SESSION_EXPIRED -> AuthenticationError.OTP_EXPIRED
    FirebasePhoneFailure.TOO_MANY_REQUESTS,
    FirebasePhoneFailure.QUOTA -> AuthenticationError.RATE_LIMITED
    FirebasePhoneFailure.NETWORK -> AuthenticationError.OFFLINE
    FirebasePhoneFailure.CONFIGURATION -> AuthenticationError.CONFIGURATION
    else -> AuthenticationError.SERVER_FAILURE
}

class AuthenticationFlowFactory(
    private val remote:AuthenticationRemoteDataSource,
    private val vault:SecureSessionStore,
    private val firebase:FirebasePhoneAuthGateway,
):ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T:ViewModel> create(modelClass:Class<T>):T=AuthenticationFlowViewModel(remote,vault,firebase) as T
}
