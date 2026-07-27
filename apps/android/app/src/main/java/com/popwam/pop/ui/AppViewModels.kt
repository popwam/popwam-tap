package com.popwam.pop.ui

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.nfc.Tag
import androidx.activity.ComponentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.popwam.pop.data.api.ActivationInspectResponse
import com.popwam.pop.data.api.CardDetailDto
import com.popwam.pop.data.api.CardDto
import com.popwam.pop.data.api.DestinationDto
import com.popwam.pop.data.api.DestinationWriteRequest
import com.popwam.pop.data.api.ProfileDto
import com.popwam.pop.data.api.ProfileTemplateDto
import com.popwam.pop.data.api.ProfileWriteRequest
import com.popwam.pop.data.api.PublishingStatusResponse
import com.popwam.pop.data.api.ProfileSelectorResponse
import com.popwam.pop.data.api.ProfileEditorResponse
import com.popwam.pop.data.api.VirtualCardCreateRequest
import com.popwam.pop.data.api.WalletCapabilitiesDto
import com.popwam.pop.data.api.VerifyNfcResponse
import com.popwam.pop.data.api.ProfileBootstrapStatusResponse
import com.popwam.pop.data.api.ProfileBootstrapRequest
import com.popwam.pop.data.api.ProfileCategoryBootstrapDto
import com.popwam.pop.data.api.ProfileBootstrapTemplateDto
import com.popwam.pop.data.api.LegalDocumentDto
import com.popwam.pop.data.api.OnboardingCurrentResponse
import com.popwam.pop.data.api.OnboardingProgressRequest
import com.popwam.pop.data.api.ShareTargetsResponse
import com.popwam.pop.data.api.ShareProductDto
import com.popwam.pop.data.api.ShareProductUpdateRequest
import com.popwam.pop.data.api.ScratchActivationInspectResponse
import com.popwam.pop.data.api.SettingsPreferencesResponse
import com.popwam.pop.data.api.NotificationPreferencesDto
import com.popwam.pop.data.api.SecurityOverviewResponse
import com.popwam.pop.data.api.SecurityDeviceDto
import com.popwam.pop.data.api.SecuritySessionDto
import com.popwam.pop.data.api.SecurityPasskeyDto
import com.popwam.pop.data.api.StepUpResponse
import com.popwam.pop.data.api.FriendDto
import com.popwam.pop.data.api.FriendIdentityDto
import com.popwam.pop.data.api.FriendRequestDto
import com.popwam.pop.data.api.FriendSearchResultDto
import com.popwam.pop.data.api.FriendsSettingsResponse
import com.popwam.pop.data.api.FriendsSettingsPatchRequest
import com.popwam.pop.data.api.BlockedUserDto
import com.popwam.pop.data.api.NearbyResultDto
import com.popwam.pop.data.api.NearbySessionDto
import com.popwam.pop.data.api.NearbySettingsResponse
import com.popwam.pop.data.api.QuotaUsageResponse
import com.popwam.pop.data.auth.SessionRepository
import com.popwam.pop.data.auth.PopAnalytics
import com.popwam.pop.data.auth.FirebasePhoneAuthGateway
import com.popwam.pop.data.auth.FirebasePhoneEvent
import com.popwam.pop.data.auth.FirebasePhoneFailure
import com.popwam.pop.data.auth.PhoneIdentity
import com.popwam.pop.data.auth.PasskeyCoordinator
import com.popwam.pop.data.auth.AuthRuntimeDiagnostics
import com.popwam.pop.data.auth.AuthRuntimeStage
import com.popwam.pop.data.repository.AuthSetupRepository
import com.popwam.pop.data.repository.PasskeyOptionsHttpException
import com.popwam.pop.data.repository.PASSKEY_OPTIONS_FAILED
import com.popwam.pop.data.repository.STEP_UP_REQUIRED
import com.popwam.pop.data.repository.PopwamRepository
import com.popwam.pop.data.repository.AndroidUploadPolicy
import com.popwam.pop.nfc.NfcResult
import com.popwam.pop.nfc.NfcTagManager
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.ByteArrayOutputStream

data class AuthUiState(
    val authenticated: Boolean = false,
    val challengeId: String? = null,
    val maskedPhone: String? = null,
    val loading: Boolean = false,
    val error: String? = null,
    val phoneFailure: FirebasePhoneFailure? = null,
    val resendAfterSeconds: Int = 0,
    @Deprecated("Legacy server OTP UI compatibility only")
    val channels: List<String> = emptyList(),
    val setupStage: AuthSetupStage = AuthSetupStage.PUBLIC,
    val setupStatus: ProfileBootstrapStatusResponse? = null,
    val legalDocuments: List<LegalDocumentDto> = emptyList(),
    val profileName: String = "",
    val profileKind: String? = null,
    val categories: List<ProfileCategoryBootstrapDto> = emptyList(),
    val categorySlug: String? = null,
    val templates: List<ProfileBootstrapTemplateDto> = emptyList(),
    val templateId: String? = null,
    val passkeyLoading: Boolean = false,
    val passkeyError: PasskeyLoginError? = null,
    /** Ephemeral per authenticated setup journey; it never changes server passkey policy. */
    val passkeyOfferSkippedForCurrentSetup: Boolean = false,
    val passkeyExistingDecisionHandled: Boolean = false,
    val onboarding: OnboardingCurrentResponse? = null,
    val onboardingFieldErrors: Map<String,String> = emptyMap(),
)

enum class PasskeyLoginError { CANCELLED, UNAVAILABLE, NO_CREDENTIAL, NETWORK, STEP_UP_REQUIRED, AUTHENTICATION_FAILED, SERVER_UNAVAILABLE }
internal val returningAuthActionOrder=listOf("PASSKEY","PHONE")
internal fun passkeyPlatformSupported(sdkInt:Int)=sdkInt>=28
internal fun phoneFallbackAvailable(@Suppress("UNUSED_PARAMETER") error:PasskeyLoginError?)=true
internal fun passkeyLoginError(error:Throwable)=when {
    error::class.simpleName?.contains("Cancellation",true)==true -> PasskeyLoginError.CANCELLED
    error::class.simpleName?.contains("NoCredential",true)==true -> PasskeyLoginError.NO_CREDENTIAL
    error is java.io.IOException -> PasskeyLoginError.NETWORK
    error is PasskeyOptionsHttpException && error.safeCode==STEP_UP_REQUIRED -> PasskeyLoginError.STEP_UP_REQUIRED
    error is PasskeyOptionsHttpException && error.safeCode==PASSKEY_OPTIONS_FAILED -> PasskeyLoginError.SERVER_UNAVAILABLE
    error is PasskeyOptionsHttpException && error.statusCode>=500 -> PasskeyLoginError.SERVER_UNAVAILABLE
    error is retrofit2.HttpException && error.code()>=500 -> PasskeyLoginError.SERVER_UNAVAILABLE
    error is retrofit2.HttpException -> PasskeyLoginError.AUTHENTICATION_FAILED
    else -> PasskeyLoginError.UNAVAILABLE
}

class AuthViewModel(
    private val sessions: SessionRepository,
    private val setup: AuthSetupRepository,
    private val analytics: PopAnalytics,
    private val firebasePhoneAuth:FirebasePhoneAuthGateway,
) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState(authenticated = sessions.authenticated))
    val state = _state.asStateFlow()
    private var bootstrapInFlight=false
    private var firebaseExchangeInFlight=false
    private var setupResolutionInFlight=false

    init { if (sessions.authenticated) refreshSetup("en") }

    fun startPhoneVerification(
        activity:ComponentActivity,
        phoneE164:String,
        locale:String,
        resend:Boolean=false,
    ) {
        if(_state.value.loading)return
        _state.value=_state.value.copy(
            loading=true,
            error=null,
            phoneFailure=null,
            maskedPhone=PhoneIdentity.mask(phoneE164),
        )
        analytics.track(
            if(resend)"phone_auth_resend" else "phone_auth_started",
            mapOf("platform" to "android","provider" to "firebase"),
        )
        runCatching {
            firebasePhoneAuth.start(activity,phoneE164,resend) { event -> handleFirebasePhoneEvent(event,locale) }
        }.onFailure {
            handleFirebasePhoneEvent(FirebasePhoneEvent.Failed(FirebasePhoneFailure.UNAVAILABLE),locale)
        }
    }

    fun verifyPhoneCode(code:String,locale:String="en") {
        if(!canSubmitOtp(code,_state.value.loading))return
        _state.value=_state.value.copy(loading=true,error=null,phoneFailure=null)
        firebasePhoneAuth.verifyCode(code) { event -> handleFirebasePhoneEvent(event,locale) }
    }

    private fun handleFirebasePhoneEvent(event:FirebasePhoneEvent,locale:String) {
        when(event) {
            is FirebasePhoneEvent.CodeSent -> {
                _state.value=_state.value.copy(
                    challengeId=event.verificationId,
                    loading=false,
                    error=null,
                    phoneFailure=null,
                    resendAfterSeconds=event.resendAfterSeconds,
                    setupStage=AuthSetupStage.OTP_REQUIRED,
                )
                analytics.track("phone_auth_code_sent",mapOf("platform" to "android","provider" to "firebase"))
            }
            is FirebasePhoneEvent.Verified -> exchangeFirebaseProof(event,locale)
            is FirebasePhoneEvent.Failed -> {
                _state.value=_state.value.copy(
                    loading=false,
                    error="PHONE_AUTH_${event.reason.name}",
                    phoneFailure=event.reason,
                )
                analytics.track("phone_auth_failed",mapOf("platform" to "android","provider" to "firebase","outcome" to event.reason.name.lowercase()))
            }
            FirebasePhoneEvent.AutoRetrievalTimedOut -> {
                _state.value=_state.value.copy(loading=false)
            }
        }
    }

    private fun exchangeFirebaseProof(event:FirebasePhoneEvent.Verified,locale:String)=viewModelScope.launch {
        if(firebaseExchangeInFlight||_state.value.authenticated)return@launch
        firebaseExchangeInFlight=true
        _state.value=_state.value.copy(loading=true,error=null,phoneFailure=null)
        try {
            val attempt=runCatching { sessions.exchangeFirebasePhone(event.idToken) }
            val result=attempt.getOrNull()
            if(result?.ok==true&&result.user!=null) {
                analytics.track("phone_auth_verified",mapOf("platform" to "android","provider" to "firebase","outcome" to if(event.automatic)"automatic" else "manual"))
                _state.value=_state.value.copy(authenticated=true,loading=false,setupStage=AuthSetupStage.AUTHENTICATED_CHECKING,error=null,passkeyExistingDecisionHandled=false,passkeyOfferSkippedForCurrentSetup=false)
                refreshSetup(locale)
            } else {
                val conflict=result?.error?.contains("CONFLICT")==true||
                    result?.error?.contains("REVOKED")==true||
                    (attempt.exceptionOrNull() as? HttpException)?.code()==409
                val failure=if(conflict)FirebasePhoneFailure.IDENTITY_CONFLICT else FirebasePhoneFailure.EXCHANGE
                handleFirebasePhoneEvent(FirebasePhoneEvent.Failed(failure),locale)
            }
        } finally {
            firebaseExchangeInFlight=false
        }
    }

    suspend fun passkeyAuthenticationOptions()=sessions.passkeyAuthenticationOptions()
    fun beginPasskeyAuthentication(){
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_SIGNIN_UI_CLICK)
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_CAPABILITY_CHECK,"supported")
        _state.value=_state.value.copy(passkeyLoading=true,passkeyError=null)
    }
    fun passkeyClientFailure(error:Throwable){
        AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_GET_CREDENTIAL_RESULT,error)
        _state.value=_state.value.copy(passkeyLoading=false,passkeyError=passkeyLoginError(error))
    }
    fun verifyPasskey(assertion:com.google.gson.JsonObject,locale:String="en")=viewModelScope.launch {
        try{
            val result=sessions.verifyPasskey(assertion)
            if(result.ok&&result.user!=null){
                _state.value=_state.value.copy(authenticated=true,passkeyLoading=false,passkeyError=null,setupStage=AuthSetupStage.AUTHENTICATED_CHECKING)
                refreshSetup(locale)
            }else _state.value=_state.value.copy(passkeyLoading=false,passkeyError=PasskeyLoginError.AUTHENTICATION_FAILED)
        }catch(error:Throwable){passkeyClientFailure(error)}
    }

    fun refreshSetup(locale:String) {
        if (!sessions.authenticated || setupResolutionInFlight) return
        setupResolutionInFlight=true
        viewModelScope.launch { try {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.AUTH_SETUP_RESOLVE,"started")
        _state.value = _state.value.copy(setupStage = AuthSetupStage.AUTHENTICATED_CHECKING, error = null)
        runCatching { setup.status(locale) }.onSuccess { status ->
            if(!status.ok) {
                AuthRuntimeDiagnostics.failure(AuthRuntimeStage.AUTH_SETUP_RESOLVE,safeError=status.error ?: "response_not_ok")
                if(_state.value.passkeyOfferSkippedForCurrentSetup) {
                    passkeySkipRouteFailure(safeError=status.error ?: "response_not_ok")
                    return@onSuccess
                }
                _state.value=_state.value.copy(error="SETUP_STATUS_UNAVAILABLE",setupStage=AuthSetupStage.SETUP_UNAVAILABLE)
                return@onSuccess
            }
            val skipRouteResolve=_state.value.passkeyOfferSkippedForCurrentSetup
            val stage=resolveAuthSetupStage(true,status,skipRouteResolve,_state.value.passkeyExistingDecisionHandled)
            _state.value = _state.value.copy(setupStatus = status, legalDocuments = status.requiredDocuments, setupStage = stage, error = null)
            AuthRuntimeDiagnostics.mark(AuthRuntimeStage.AUTH_SETUP_RESOLVE,"endpoint_api_profile_bootstrap_http_200_${stage.name.lowercase()}_new_${status.isNewAccount}_legal_ready_${status.legalReady}_legal_accepted_${status.legalAccepted}")
            if(stage==AuthSetupStage.READY)refreshDynamicOnboarding(locale,skipRouteResolve)
            else if(skipRouteResolve) completePasskeySkipRouteResolve(stage)
        }.onFailure { error ->
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.AUTH_SETUP_RESOLVE,error,(error as? retrofit2.HttpException)?.code())
            if(_state.value.passkeyOfferSkippedForCurrentSetup)passkeySkipRouteFailure(error,(error as? retrofit2.HttpException)?.code())
            else _state.value = _state.value.copy(error = "SETUP_STATUS_UNAVAILABLE", setupStage = AuthSetupStage.SETUP_UNAVAILABLE)
        }
        } finally { setupResolutionInFlight=false } }
    }

    private fun refreshDynamicOnboarding(locale:String,fromPasskeySkip:Boolean=false)=viewModelScope.launch {
        runCatching { setup.currentOnboarding(locale) }.onSuccess { current->
            when(current.state) {
                "BYPASSED","ONBOARDING_COMPLETE" -> {
                    _state.value=_state.value.copy(setupStage=AuthSetupStage.READY,onboarding=current,error=null)
                    if(fromPasskeySkip)completePasskeySkipRouteResolve(AuthSetupStage.READY)
                }
                "ONBOARDING_REQUIRED" -> runCatching { setup.startOnboarding(locale) }.onSuccess { started->
                    analytics.track("onboarding_started",mapOf("platform" to "android","profile_kind" to (started.definition?.profileKind ?: ""),"category_key" to (started.definition?.categoryKey ?: "fallback"),"definition_version" to (started.definition?.version?.toString() ?: "0")))
                    _state.value=_state.value.copy(setupStage=AuthSetupStage.DYNAMIC_ONBOARDING,onboarding=started,error=null)
                    if(fromPasskeySkip)completePasskeySkipRouteResolve(AuthSetupStage.DYNAMIC_ONBOARDING)
                }.onFailure { error->
                    if(fromPasskeySkip)passkeySkipRouteFailure(error,(error as? HttpException)?.code())
                    else _state.value=_state.value.copy(setupStage=AuthSetupStage.AUTHENTICATED_CHECKING,error="ONBOARDING_START_FAILED")
                }
                "ONBOARDING_IN_PROGRESS" -> {
                    analytics.track("onboarding_resumed",mapOf("platform" to "android","definition_version" to (current.definition?.version?.toString() ?: "0")))
                    _state.value=_state.value.copy(setupStage=AuthSetupStage.DYNAMIC_ONBOARDING,onboarding=current,error=null)
                    if(fromPasskeySkip)completePasskeySkipRouteResolve(AuthSetupStage.DYNAMIC_ONBOARDING)
                }
                "BOOTSTRAP_REQUIRED" -> {
                    _state.value=_state.value.copy(setupStage=AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED,error=null)
                    if(fromPasskeySkip)completePasskeySkipRouteResolve(AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED)
                }
                else -> {
                    if(fromPasskeySkip)passkeySkipRouteFailure(safeError="ONBOARDING_STATUS_UNAVAILABLE")
                    else _state.value=_state.value.copy(setupStage=AuthSetupStage.AUTHENTICATED_CHECKING,error="ONBOARDING_STATUS_UNAVAILABLE")
                }
            }
        }.onFailure { error->
            if(fromPasskeySkip)passkeySkipRouteFailure(error,(error as? HttpException)?.code())
            else _state.value=_state.value.copy(setupStage=AuthSetupStage.AUTHENTICATED_CHECKING,error="ONBOARDING_STATUS_UNAVAILABLE")
        }
    }

    fun setOnboardingAnswer(key:String,value:com.google.gson.JsonElement) {
        val current=_state.value.onboarding ?: return
        _state.value=_state.value.copy(onboarding=current.copy(answers=current.answers+mapOf(key to value)),onboardingFieldErrors=_state.value.onboardingFieldErrors-key)
    }

    fun uploadOnboardingImage(questionKey:String,name:String,mime:String,bytes:ByteArray)=viewModelScope.launch { working {
        val profileId=_state.value.onboarding?.profileId ?: run { _state.value=_state.value.copy(error="ONBOARDING_PROFILE_UNAVAILABLE");return@working }
        val result=setup.uploadOnboardingImage(profileId,name,mime,bytes)
        val assetId=result.asset?.id
        if(result.ok&&assetId!=null)setOnboardingAnswer(questionKey,com.google.gson.JsonArray().apply{add(assetId)})
        else _state.value=_state.value.copy(error=result.error ?: "ONBOARDING_MEDIA_INVALID")
    } }

    fun onboardingStepViewed(stepKey:String) {
        val definition=_state.value.onboarding?.definition ?: return
        analytics.track("onboarding_step_viewed",mapOf("platform" to "android","profile_kind" to definition.profileKind,"category_key" to (definition.categoryKey ?: "fallback"),"step_key" to stepKey,"definition_version" to definition.version.toString()))
    }

    fun saveOnboarding(direction:String,locale:String)=viewModelScope.launch { working {
        val current=_state.value.onboarding ?: return@working
        val definition=current.definition ?: return@working
        val step=visibleOnboardingSteps(definition,current.answers).find { it.key==current.currentStepKey }
            ?: visibleOnboardingSteps(definition,current.answers).firstOrNull() ?: return@working
        if(direction=="CONTINUE") {
            val missing=missingRequiredOnboardingQuestions(step,current.answers)
            if(missing.isNotEmpty()) {
                _state.value=_state.value.copy(onboardingFieldErrors=missing.associateWith { "REQUIRED" },error="ONBOARDING_VALIDATION_FAILED")
                return@working
            }
        }
        val visibleBefore=visibleOnboardingSteps(definition,current.answers)
        val wasLast=visibleBefore.indexOfFirst { it.key==step.key }==visibleBefore.lastIndex
        val saved=setup.saveOnboarding(OnboardingProgressRequest(locale,current.revision,step.key,direction,onboardingStepAnswerSubset(step,current.answers)))
        _state.value=_state.value.copy(onboarding=saved,onboardingFieldErrors=saved.fields,error=saved.error,setupStage=AuthSetupStage.DYNAMIC_ONBOARDING)
        if(!saved.ok)return@working
        if(direction!="STAY")analytics.track("onboarding_step_completed",mapOf("platform" to "android","step_key" to step.key,"definition_version" to definition.version.toString()))
        if(direction=="CONTINUE"&&wasLast) {
            val completed=setup.completeOnboarding(locale,saved.revision)
            if(completed.ok) {
                analytics.track("onboarding_completed",mapOf("platform" to "android","profile_kind" to definition.profileKind,"category_key" to (definition.categoryKey ?: "fallback"),"definition_version" to definition.version.toString(),"outcome" to "success"))
                _state.value=_state.value.copy(onboarding=completed,setupStage=AuthSetupStage.READY,error=null,onboardingFieldErrors=emptyMap())
            } else _state.value=_state.value.copy(error=completed.error ?: "ONBOARDING_COMPLETE_FAILED",onboardingFieldErrors=completed.fields)
        }
    } }

    fun acceptLegal(locale:String) = viewModelScope.launch { working {
        val result = setup.acceptLegal(locale)
        if (!result.ok) { _state.value = _state.value.copy(error = result.error ?: "LEGAL_CONSENT_FAILED"); return@working }
        analytics.track("legal_consent_completed", mapOf("platform" to "android"))
        refreshSetup(locale)
    } }

    fun selectProfileKind(kind:String,locale:String) = viewModelScope.launch { working {
        analytics.track("profile_kind_selected", mapOf("platform" to "android", "profile_kind" to kind.lowercase()))
        val result = setup.categories(kind,locale)
        if (!result.ok) { _state.value = _state.value.copy(error = result.error ?: "PROFILE_CATEGORIES_UNAVAILABLE"); return@working }
        _state.value = _state.value.copy(profileKind=kind,categories=result.categories,categorySlug=null,templates=emptyList(),templateId=null,error=null)
    } }

    fun selectCategory(category:String,locale:String) = viewModelScope.launch { working {
        val kind = _state.value.profileKind ?: return@working
        analytics.track("profile_category_selected", mapOf("platform" to "android", "category_key" to category))
        val result = setup.templates(category,kind,locale)
        if (!result.ok) { _state.value = _state.value.copy(error = result.error ?: "PROFILE_TEMPLATES_UNAVAILABLE"); return@working }
        val automatic = result.defaultTemplateId?.takeIf { id -> result.templates.any { it.id == id } } ?: result.templates.singleOrNull()?.id
        _state.value = _state.value.copy(categorySlug=category,templates=result.templates,templateId=automatic,error=null)
    } }

    fun selectTemplate(templateId:String?) { _state.value = _state.value.copy(templateId=templateId) }
    fun setProfileName(value:String) { _state.value = _state.value.copy(profileName=value) }

    fun submitBootstrap(locale:String) = viewModelScope.launch { working {
        val snapshot = _state.value
        val kind=snapshot.profileKind ?: return@working
        val category=snapshot.categorySlug ?: return@working
        if (bootstrapInFlight) return@working
        bootstrapValidationError(snapshot.profileName,kind,category,snapshot.templates,snapshot.templateId)?.let { _state.value=_state.value.copy(error=it);return@working }
        bootstrapInFlight=true
        try {
        analytics.track("profile_bootstrap_started", mapOf("platform" to "android", "profile_kind" to kind.lowercase(), "category_key" to category))
        val result=setup.bootstrap(ProfileBootstrapRequest(snapshot.profileName,kind,category,snapshot.templateId,locale))
        if (!result.ok) { _state.value = _state.value.copy(error = result.error ?: "PROFILE_BOOTSTRAP_FAILED"); refreshSetup(locale); return@working }
        analytics.track("profile_bootstrap_completed", mapOf("platform" to "android", "profile_kind" to kind.lowercase(), "category_key" to category))
        refreshSetup(locale)
        } finally { bootstrapInFlight=false }
    } }

    fun passkeyPromptShown() { analytics.track("passkey_enrollment_shown", mapOf("platform" to "android")) }
    fun completePasskeyRegistration(response:com.google.gson.JsonObject,locale:String) = viewModelScope.launch { working {
        val result=setup.verifyPasskey(response)
        if (result.ok) analytics.track("passkey_enrollment_completed",mapOf("platform" to "android")) else _state.value=_state.value.copy(error=result.error ?: "PASSKEY_ENROLLMENT_FAILED")
        refreshSetup(locale)
    } }
    /** Registration always proves possession through Credential Manager and server verification;
     * no local flag can mark a passkey as registered. */
    fun registerPasskey(activity:ComponentActivity?,locale:String) {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_UI_CLICK)
        if(activity==null) {
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_CAPABILITY_CHECK,safeError="ACTIVITY_UNAVAILABLE")
            _state.value=_state.value.copy(passkeyLoading=false,passkeyError=PasskeyLoginError.UNAVAILABLE)
            return
        }
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_CAPABILITY_CHECK,"supported")
        _state.value=_state.value.copy(passkeyLoading=true,passkeyError=null)
        viewModelScope.launch {
            try {
                val options=setup.passkeyOptions()
                val response=PasskeyCoordinator(activity).register(activity,options.toString())
                val result=setup.verifyPasskey(JsonParser.parseString(response).asJsonObject)
                if(!result.ok) {
                    _state.value=passkeyOfferFailure(_state.value,PasskeyLoginError.AUTHENTICATION_FAILED)
                    return@launch
                }
                analytics.track("passkey_enrollment_completed",mapOf("platform" to "android"))
                _state.value=_state.value.copy(passkeyLoading=false,passkeyError=null,error=null,passkeyExistingDecisionHandled=true)
                refreshSetup(locale)
            } catch(error:Throwable) {
                _state.value=passkeyOfferFailure(_state.value,passkeyLoginError(error))
            }
        }
    }
    suspend fun passkeyRegistrationOptions()=setup.passkeyOptions()
    fun useExistingPasskey(activity:ComponentActivity?,locale:String) {
        if(activity==null) { _state.value=passkeyOfferFailure(_state.value,PasskeyLoginError.UNAVAILABLE);return }
        _state.value=_state.value.copy(passkeyLoading=true,passkeyError=null)
        viewModelScope.launch {
            try {
                val options=setup.existingPasskeyAssertionOptions()
                val assertion=PasskeyCoordinator(activity).authenticate(activity,options.toString())
                val verified=setup.verifyExistingPasskeyAssertion(JsonParser.parseString(assertion).asJsonObject)
                if(!verified.ok) { _state.value=passkeyOfferFailure(_state.value,PasskeyLoginError.AUTHENTICATION_FAILED);return@launch }
                _state.value=_state.value.copy(passkeyLoading=false,passkeyError=null,passkeyExistingDecisionHandled=true)
                refreshSetup(locale)
            } catch(error:Throwable) { _state.value=passkeyOfferFailure(_state.value,passkeyLoginError(error)) }
        }
    }
    fun createReplacementPasskey(activity:ComponentActivity?,locale:String) {
        _state.value=_state.value.copy(passkeyExistingDecisionHandled=true)
        registerPasskey(activity,locale)
    }
    fun skipPasskey(locale:String) {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_SKIP_UI_CLICK)
        if(!_state.value.authenticated)return
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_SKIP,"accepted")
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_SKIP_ROUTE_RESOLVE,"started")
        _state.value=passkeyOfferSkipped(_state.value)
        refreshSetup(locale)
    }
    private fun completePasskeySkipRouteResolve(stage:AuthSetupStage) {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_SKIP_ROUTE_RESOLVE,stage.name.lowercase())
    }
    private fun passkeySkipRouteFailure(error:Throwable?=null,http:Int?=null,safeError:String?=null) {
        AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_SKIP_ROUTE_RESOLVE,error,http,safeError)
        _state.value=_state.value.copy(
            setupStage=AuthSetupStage.PASSKEY_OFFER,
            passkeyLoading=false,
            passkeyError=PasskeyLoginError.SERVER_UNAVAILABLE,
            error=null,
        )
    }
    fun continueLegacyCompatibility() { _state.value=_state.value.copy(setupStage=AuthSetupStage.READY) }

    fun logout() = viewModelScope.launch {
        sessions.logout()
        firebasePhoneAuth.signOut()
        _state.value = AuthUiState()
    }

    fun changePhone() {
        firebasePhoneAuth.reset()
        _state.value = _state.value.copy(challengeId = null, maskedPhone = null, error = null, phoneFailure=null,resendAfterSeconds=0)
    }

    private suspend fun working(block: suspend () -> Unit) {
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            block()
        } catch (_: Exception) {
            _state.value = _state.value.copy(error = "REQUEST_FAILED")
        } finally {
            _state.value = _state.value.copy(loading = false)
        }
    }
}

data class MainUiState(
    val cards: List<CardDto> = emptyList(),
    val profiles: List<ProfileDto> = emptyList(),
    val templates: List<ProfileTemplateDto> = emptyList(),
    val planSlug: String = "free",
    val wallet: WalletCapabilitiesDto = WalletCapabilitiesDto(),
    val selectedCard: CardDetailDto? = null,
    val destinations: List<DestinationDto> = emptyList(),
    val programmingCards: List<CardDto> = emptyList(),
    val activation: ActivationInspectResponse? = null,
    val nfcUri: String? = null,
    val nfcVerification: VerifyNfcResponse? = null,
    val publishing: PublishingStatusResponse? = null,
    val profileSelector: ProfileSelectorResponse? = null,
    val profileEditor: ProfileEditorResponse? = null,
    val selectedProfileId: String? = null,
    val editorSaveState: String = "IDLE",
    val shareTargets: ShareTargetsResponse? = null,
    val shareProducts: List<ShareProductDto> = emptyList(),
    val shareActivation: ScratchActivationInspectResponse? = null,
    val selectedShareProfileId: String? = null,
    val settingsPreferences: SettingsPreferencesResponse? = null,
    val notificationPreferences: NotificationPreferencesDto? = null,
    val securityOverview: SecurityOverviewResponse? = null,
    val securityDevices: List<SecurityDeviceDto> = emptyList(),
    val securitySessions: List<SecuritySessionDto> = emptyList(),
    val securityPasskeys: List<SecurityPasskeyDto> = emptyList(),
    val quotaUsage: QuotaUsageResponse? = null,
    val friendsSettings: FriendsSettingsResponse? = null,
    val friendsStage: FriendsStage = FriendsStage.LOADING,
    val friends: List<FriendDto> = emptyList(),
    val friendRequests: List<FriendRequestDto> = emptyList(),
    val friendSearchResults: List<FriendSearchResultDto> = emptyList(),
    val blockedUsers: List<BlockedUserDto> = emptyList(),
    val incomingFriendRequestCount: Int = 0,
    val nearbySettings: NearbySettingsResponse? = null,
    val nearbyStage: NearbyStage = NearbyStage.LOADING,
    val nearbyResults: List<NearbyResultDto> = emptyList(),
    val nearbyPermissionState: NearbyPermissionState = NearbyPermissionState.NOT_REQUESTED,
    val nearbyClientSessionActive: Boolean = false,
    val loading: Boolean = false,
    val uploadProgress: Int? = null,
    val uploadedUrl: String? = null,
    val message: String? = null,
    val error: String? = null,
)

class MainViewModel(
    private val repo: PopwamRepository,
    val role: String?,
    private val analytics:PopAnalytics,
) : ViewModel() {
    private val nfc = NfcTagManager()
    private val _state = MutableStateFlow(MainUiState())
    val state = _state.asStateFlow()
    private var nearbySession:NearbySessionDto?=null

    init {
        reload()
    }

    fun reload() {
        if (_state.value.loading) return
        viewModelScope.launch { working {
            val cards = repo.cards()
            val profiles = repo.profiles()
            val templates = repo.templates()
            _state.value = _state.value.copy(cards = cards.cards, profiles = profiles.profiles, templates = templates.templates, planSlug = templates.planSlug, wallet = profiles.wallet)
        } }
    }

    fun loadSecuritySettings() = viewModelScope.launch {
        working {
            val preferences=repo.settingsPreferences()
            val notifications=repo.notificationPreferences()
            val overview=repo.securityOverview()
            val devices=repo.securityDevices()
            val sessions=repo.securitySessions()
            val passkeys=repo.securityPasskeys()
            val quota=repo.quotaUsage()
            _state.value=_state.value.copy(
                settingsPreferences=preferences,
                notificationPreferences=notifications.preferences,
                securityOverview=overview,
                securityDevices=devices.devices,
                securitySessions=sessions.sessions,
                securityPasskeys=passkeys.passkeys,
                quotaUsage=quota,
            )
            if(!preferences.ok||!notifications.ok||!overview.ok||!devices.ok||!sessions.ok||!passkeys.ok||!quota.ok)fail("SECURITY_SETTINGS_UNAVAILABLE")
        }
    }

    fun settingsViewed(section:String) {
        val event=settingsAnalyticsEvent(section)
        analytics.track(event,mapOf("platform" to "android","setting_category" to section))
    }

    fun passkeyManagementEnrollmentShown()=analytics.track("passkey_enrollment_shown",mapOf("platform" to "android"))

    fun updateAppearancePreference(key:String,value:String)=viewModelScope.launch {
        working {
            val result=repo.updateSettingsPreference(key,value)
            if(result.ok){
                _state.value=_state.value.copy(settingsPreferences=result)
                analytics.track("appearance_changed",mapOf("platform" to "android","setting_category" to key,"outcome" to "success"))
            }else fail(result.error)
        }
    }

    fun updatePrivacyPreference(key:String,value:Boolean)=viewModelScope.launch {
        working {
            val result=repo.updatePrivacyPreference(key,value)
            if(result.ok)_state.value=_state.value.copy(settingsPreferences=result) else fail(result.error)
        }
    }

    fun updateNotificationPreference(key:String,value:Boolean)=viewModelScope.launch {
        working {
            val result=repo.updateNotificationPreference(key,value)
            if(result.ok){
                _state.value=_state.value.copy(notificationPreferences=result.preferences)
                analytics.track("notification_preference_changed",mapOf("platform" to "android","setting_category" to key,"outcome" to "success"))
            }else fail(result.error)
        }
    }

    fun requestQuotaIncrease(resource:String,requestedValue:String)=viewModelScope.launch {
        working {
            val result=repo.requestQuotaIncrease(resource,requestedValue)
            if(result.ok) {
                _state.value=_state.value.copy(quotaUsage=repo.quotaUsage(),message="QUOTA_REQUESTED")
            } else fail(result.error)
        }
    }

    private suspend fun refreshFriends(locale:String) {
        val settings=repo.friendsSettings(locale)
        val stage=FriendsPolicy.resolve(settings)
        if(!settings.ok){
            _state.value=_state.value.copy(friendsSettings=settings,friendsStage=stage)
            fail(settings.error)
            return
        }
        if(stage!=FriendsStage.READY){
            _state.value=_state.value.copy(
                friendsSettings=settings,
                friendsStage=stage,
                friends=emptyList(),
                friendRequests=emptyList(),
                friendSearchResults=emptyList(),
                blockedUsers=emptyList(),
                incomingFriendRequestCount=0,
            )
            return
        }
        val friends=repo.friends(locale)
        val requests=repo.friendRequests(locale)
        val blocks=repo.blockedUsers(locale)
        if(!friends.ok||!requests.ok||!blocks.ok){
            fail(friends.error ?: requests.error ?: blocks.error)
            return
        }
        _state.value=_state.value.copy(
            friendsSettings=settings,
            friendsStage=FriendsStage.READY,
            friends=friends.friends,
            friendRequests=requests.requests,
            blockedUsers=blocks.blocks,
            incomingFriendRequestCount=requests.incomingPendingCount,
        )
    }

    fun loadFriends(locale:String)=viewModelScope.launch { working { refreshFriends(locale) } }

    fun friendsViewed()=analytics.track("friends_viewed",mapOf("platform" to "android"))

    fun acceptFriendsPolicy(locale:String)=viewModelScope.launch { working {
        val result=repo.acceptFriendsPolicy(locale)
        if(result.ok)refreshFriends(locale) else fail(result.error)
    } }

    fun updateFriendsSettings(locale:String,socialProfileSlug:String?=null,allowRequests:Boolean?=null,discoverable:Boolean?=null)=viewModelScope.launch { working {
        val result=repo.updateFriendsSettings(FriendsSettingsPatchRequest(locale,socialProfileSlug,allowRequests,discoverable))
        if(result.ok)refreshFriends(locale) else fail(result.error)
    } }

    fun searchFriends(query:String,locale:String)=viewModelScope.launch { working {
        val normalized=FriendsPolicy.normalizeSearch(query)
        if(normalized==null){fail("SEARCH_QUERY_INVALID");return@working}
        val result=repo.searchFriends(locale,normalized)
        if(result.ok){
            _state.value=_state.value.copy(friendSearchResults=result.results)
            analytics.track("friend_search_used",mapOf("platform" to "android","outcome" to if(result.results.isEmpty())"empty" else "results"))
        }else fail(result.error)
    } }

    fun sendFriendRequest(key:String,locale:String,source:String="SEARCH")=viewModelScope.launch { working {
        val result=repo.createFriendRequest(key,source,locale)
        if(result.ok){
            _state.value=_state.value.copy(friendSearchResults=_state.value.friendSearchResults.map { if(it.key==key)it.copy(relationshipState=result.state ?: "OUTGOING_PENDING") else it })
            analytics.track("friend_request_sent",mapOf("platform" to "android","outcome" to if(result.idempotent)"idempotent" else "success","relationship_state" to (result.state ?: "OUTGOING_PENDING")))
        }else fail(result.error)
    } }

    fun respondFriendRequest(request:FriendRequestDto,accept:Boolean,locale:String)=viewModelScope.launch { working {
        val result=if(accept)repo.acceptFriendRequest(request.id,locale) else repo.rejectFriendRequest(request.id,locale)
        if(result.ok){
            analytics.track(if(accept)"friend_request_accepted" else "friend_request_rejected",mapOf("platform" to "android","outcome" to "success"))
            refreshFriends(locale)
        }else fail(result.error)
    } }

    fun cancelFriendRequest(request:FriendRequestDto,locale:String)=viewModelScope.launch { working {
        val result=repo.cancelFriendRequest(request.id)
        if(result.ok)refreshFriends(locale) else fail(result.error)
    } }

    fun updateFriendPreference(friend:FriendDto,favorite:Boolean?=null,muted:Boolean?=null,locale:String)=viewModelScope.launch { working {
        val result=repo.updateFriendPreference(friend.key,favorite,muted)
        if(result.ok){
            analytics.track(if(favorite!=null)"friend_favorited" else "friend_muted",mapOf("platform" to "android","outcome" to if(favorite ?: muted ?: false)"enabled" else "disabled"))
            refreshFriends(locale)
        }else fail(result.error)
    } }

    fun removeFriend(friend:FriendIdentityDto,locale:String)=viewModelScope.launch { working {
        val result=repo.removeFriend(friend.key)
        if(result.ok){
            analytics.track("friend_removed",mapOf("platform" to "android","outcome" to "success"))
            refreshFriends(locale)
        }else fail(result.error)
    } }

    fun blockUser(person:FriendIdentityDto,locale:String,source:String="FRIENDS",category:String?=null)=viewModelScope.launch { working {
        val result=repo.blockUser(person.key,source,category)
        if(result.ok){
            analytics.track("user_blocked",mapOf("platform" to "android","outcome" to "success"))
            refreshFriends(locale)
        }else fail(result.error)
    } }

    fun unblockUser(block:BlockedUserDto,locale:String)=viewModelScope.launch { working {
        val result=repo.unblockUser(block.id)
        if(result.ok){
            analytics.track("user_unblocked",mapOf("platform" to "android","outcome" to "success"))
            refreshFriends(locale)
        }else fail(result.error)
    } }

    fun reportUser(person:FriendIdentityDto,category:String,details:String,locale:String,onComplete:()->Unit={})=viewModelScope.launch { working {
        if(!FriendsPolicy.validReport(category,details)){fail("REPORT_INVALID");return@working}
        val result=repo.reportUser(person.key,category,details.trim().ifBlank{null},locale)
        if(result.ok){
            _state.value=_state.value.copy(message="REPORT_RECEIVED")
            analytics.track("report_submitted",mapOf("platform" to "android","outcome" to "received","report_category" to category))
            onComplete()
        }else fail(result.error)
    } }

    private suspend fun refreshNearbyStatus(locale:String,loadResults:Boolean=false) {
        val settings=repo.nearbySettings(locale)
        val stage=NearbyPolicy.resolve(settings,nearbySession!=null)
        _state.value=_state.value.copy(
            nearbySettings=settings,
            nearbyStage=stage,
            nearbyClientSessionActive=nearbySession!=null,
            nearbyResults=if(stage==NearbyStage.ACTIVE)_state.value.nearbyResults else emptyList(),
        )
        if(stage==NearbyStage.ACTIVE&&loadResults)refreshNearbyResults(locale)
    }

    private suspend fun refreshNearbyResults(locale:String) {
        val result=repo.nearbyResults(locale)
        if(result.ok){
            _state.value=_state.value.copy(nearbyResults=result.results)
            analytics.track("nearby_results_loaded",mapOf("platform" to "android","outcome" to if(result.results.isEmpty())"empty" else "available"))
        }else fail(result.error)
    }

    fun loadNearby(locale:String)=viewModelScope.launch { working {
        refreshNearbyStatus(locale,loadResults=true)
        val settings=_state.value.nearbySettings
        analytics.track("nearby_viewed",mapOf("platform" to "android","feature_state" to (settings?.feature?.state ?: "UNAVAILABLE")))
        if(settings?.feature?.available!=true)analytics.track("nearby_unavailable",mapOf("platform" to "android","feature_state" to (settings?.feature?.state ?: "UNAVAILABLE")))
    } }

    fun nearbyConsentViewed()=analytics.track("nearby_consent_viewed",mapOf("platform" to "android"))

    fun acceptNearbyConsent(locale:String)=viewModelScope.launch { working {
        val result=repo.acceptNearbyConsent(locale)
        if(result.ok){
            analytics.track("nearby_consent_accepted",mapOf("platform" to "android","outcome" to "success"))
            refreshNearbyStatus(locale)
        }else fail(result.error)
    } }

    fun nearbyPermissionResult(state:NearbyPermissionState) {
        _state.value=_state.value.copy(nearbyPermissionState=state)
        analytics.track("nearby_permission_result",mapOf("platform" to "android","permission_state" to when(state){
            NearbyPermissionState.APPROXIMATE->"granted"
            NearbyPermissionState.DENIED->"denied"
            NearbyPermissionState.SERVICES_OFF->"services_off"
            else->"unavailable"
        }))
    }

    fun observeNearbyPermissionState(state:NearbyPermissionState) {
        _state.value=_state.value.copy(nearbyPermissionState=state)
    }

    fun enableNearby(coordinate:NearbyCoordinate,locale:String)=viewModelScope.launch { working {
        val result=try{repo.enableNearby(coordinate.latitude,coordinate.longitude,locale)}
        catch(error:Exception){
            nearbySession=null
            runCatching{refreshNearbyStatus(locale)}
            throw error
        }
        val session=result.session
        if(result.ok&&session!=null&&session.generation>0&&session.sessionToken.isNotBlank()){
            nearbySession=session
            _state.value=_state.value.copy(nearbyClientSessionActive=true)
            analytics.track("nearby_enabled",mapOf("platform" to "android","outcome" to "success"))
            refreshNearbyStatus(locale,loadResults=true)
        }else{
            nearbySession=null
            refreshNearbyStatus(locale)
            fail(result.error)
        }
    } }

    fun refreshNearbyPresence(coordinate:NearbyCoordinate,locale:String)=viewModelScope.launch {
        val session=nearbySession ?: return@launch
        try{
            val result=repo.refreshNearby(coordinate.latitude,coordinate.longitude,session.generation,session.sessionToken,locale)
            if(!result.ok)throw IllegalStateException(result.error ?: "NEARBY_REQUEST_FAILED")
        }catch(error:Exception){
            val stale=error.message=="NEARBY_SESSION_STALE"||(error is HttpException&&error.code()==409)
            if(stale){
                nearbySession=null
                _state.value=_state.value.copy(nearbyClientSessionActive=false,nearbyResults=emptyList())
                runCatching { refreshNearbyStatus(locale) }
            }
        }
    }

    fun refreshNearbyPeople(locale:String)=viewModelScope.launch { working { refreshNearbyResults(locale) } }

    fun pauseNearbyCollection() {
        nearbySession=null
        val settings=_state.value.nearbySettings
        _state.value=_state.value.copy(
            nearbyClientSessionActive=false,
            nearbyResults=emptyList(),
            nearbyStage=if(settings?.preference?.enabled==true)NearbyStage.READY_TO_RESUME else NearbyPolicy.resolve(settings,false),
        )
    }

    fun disableNearby(locale:String)=viewModelScope.launch { working {
        nearbySession=null
        _state.value=_state.value.copy(nearbyClientSessionActive=false,nearbyResults=emptyList())
        val result=try{repo.disableNearby()}catch(error:Exception){runCatching{refreshNearbyStatus(locale)};throw error}
        if(result.ok){
            analytics.track("nearby_disabled",mapOf("platform" to "android","outcome" to "success"))
            refreshNearbyStatus(locale)
        }else{
            refreshNearbyStatus(locale)
            fail(result.error)
        }
    } }

    fun sendNearbyFriendRequest(result:NearbyResultDto,locale:String)=viewModelScope.launch { working {
        analytics.track("nearby_friend_request_started",mapOf("platform" to "android","relationship_state" to result.relationshipState))
        val response=repo.createFriendRequest(result.key,"NEARBY",locale)
        if(response.ok)refreshNearbyResults(locale) else fail(response.error)
    } }

    fun cancelNearbyFriendRequest(result:NearbyResultDto,locale:String)=viewModelScope.launch { working {
        val requestId=result.requestId
        if(requestId.isNullOrBlank()){refreshNearbyResults(locale);return@working}
        val response=repo.cancelFriendRequest(requestId)
        if(response.ok)refreshNearbyResults(locale) else fail(response.error)
    } }

    fun blockNearby(result:NearbyResultDto,locale:String)=viewModelScope.launch {
        _state.value=_state.value.copy(nearbyResults=_state.value.nearbyResults.filterNot{it.key==result.key})
        runCatching { repo.blockUser(result.key,"NEARBY") }
            .onSuccess { response->
                if(response.ok)analytics.track("user_blocked",mapOf("platform" to "android","outcome" to "success"))
                else runCatching { refreshNearbyResults(locale) }
            }
            .onFailure { runCatching { refreshNearbyResults(locale) } }
    }

    fun reportNearby(result:NearbyResultDto,category:String,details:String,locale:String,onComplete:()->Unit={})=viewModelScope.launch { working {
        if(!FriendsPolicy.validReport(category,details)){fail("REPORT_INVALID");return@working}
        val response=repo.reportUser(result.key,category,details.trim().ifBlank{null},locale,"NEARBY")
        if(response.ok){
            _state.value=_state.value.copy(message="REPORT_RECEIVED")
            analytics.track("report_submitted",mapOf("platform" to "android","outcome" to "received","report_category" to category))
            onComplete()
        }else fail(response.error)
    } }

    fun nearbyResultOpened(result:NearbyResultDto)=analytics.track("nearby_result_opened",mapOf("platform" to "android","proximity_band" to result.proximityBand))

    suspend fun stepUpOptions(purpose:String,method:String?=null,locale:String?=null):StepUpResponse=repo.stepUpOptions(purpose,method,locale)
    suspend fun verifyPasskeyStepUp(purpose:String,assertion:JsonObject):StepUpResponse=repo.verifyPasskeyStepUp(purpose,assertion)
    suspend fun verifyOtpStepUp(purpose:String,challengeId:String,code:String):StepUpResponse=repo.verifyOtpStepUp(purpose,challengeId,code)
    suspend fun startPhoneChange(phone:String,locale:String,grant:String)=repo.startPhoneChange(phone,locale,grant)
    suspend fun verifyPhoneChange(challengeId:String,code:String)=repo.verifyPhoneChange(challengeId,code)
    suspend fun requestAccountDeletion(grant:String)=repo.requestAccountDeletion(grant)
    suspend fun passkeyRegistrationOptions(grant:String):JsonObject {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_REGISTER_OPTIONS_REQUEST)
        return try {
            repo.passkeyRegistrationOptions(grant).also { options->
                if(!options.has("challenge")||!options.has("rp")||!options.has("user")) throw IllegalStateException("PASSKEY_OPTIONS_INVALID")
                AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_REGISTER_OPTIONS_RESPONSE,"success")
            }
        } catch(error:Throwable) {
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_REGISTER_OPTIONS_RESPONSE,error,(error as? HttpException)?.code())
            throw error
        }
    }
    suspend fun verifyPasskeyRegistration(response:JsonObject):Boolean {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_REGISTER_VERIFY_REQUEST)
        val result=try { repo.verifyPasskeyRegistration(response) } catch(error:Throwable) {
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_REGISTER_VERIFY_RESPONSE,error,(error as? HttpException)?.code())
            throw error
        }
        if(result.ok)AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_REGISTER_VERIFY_RESPONSE,"success") else AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_REGISTER_VERIFY_RESPONSE,safeError=result.error)
        if(result.ok){
            analytics.track("passkey_enrollment_completed",mapOf("platform" to "android"))
            loadSecuritySettings()
        }
        return result.ok
    }

    fun revokeSecuritySession(id:String,grant:String,onCurrent:()->Unit={})=viewModelScope.launch {
        working {
            val result=repo.revokeSecuritySession(id,grant)
            if(result.ok){
                analytics.track("session_revoked",mapOf("platform" to "android","outcome" to "success"))
                if(result.current)onCurrent() else loadSecuritySettings()
            }else fail(result.error)
        }
    }

    fun revokeOtherSecuritySessions(grant:String)=viewModelScope.launch {
        working {
            val result=repo.revokeOtherSecuritySessions(grant)
            if(result.ok)loadSecuritySettings() else fail(result.error)
        }
    }

    fun revokeAllSecuritySessions(grant:String,onComplete:()->Unit)=viewModelScope.launch {
        working {
            val result=repo.revokeAllSecuritySessions(grant)
            if(result.ok)onComplete() else fail(result.error)
        }
    }

    fun removeSecurityPasskey(id:String,grant:String)=viewModelScope.launch {
        working {
            val result=repo.removeSecurityPasskey(id,grant)
            if(result.ok)loadSecuritySettings() else fail(result.error)
        }
    }

    fun reportProductLost(id:String,grant:String)=viewModelScope.launch {
        working {
            val result=repo.reportProductLost(id,grant)
            if(result.ok){card(id);reload()}else fail(result.error)
        }
    }

    fun loadPublishing(profileId:String,locale:String) = viewModelScope.launch {
        working {
            val result=repo.publishingStatus(profileId,locale)
            if(result.ok){_state.value=_state.value.copy(publishing=result);analytics.track("profile_preview_viewed",mapOf("platform" to "android"));analytics.track("publish_readiness_viewed",mapOf("platform" to "android","outcome" to if(result.readiness.ready)"ready" else "blocked"))} else fail(result.error)
        }
    }

    fun loadProfileHome(locale:String,selected:String?=null) = viewModelScope.launch {
        working {
            val selector=repo.profileSelector(selected ?: _state.value.selectedProfileId)
            if(!selector.ok){fail(selector.error);return@working}
            val profileId=selector.selectedProfileId
            if(profileId==null){_state.value=_state.value.copy(profileSelector=selector,profileEditor=null,selectedProfileId=null);return@working}
            val editor=repo.profileEditor(profileId,locale)
            if(!editor.ok){fail(editor.error);return@working}
            _state.value=_state.value.copy(profileSelector=selector,profileEditor=editor,selectedProfileId=profileId,editorSaveState="IDLE")
            analytics.track("home_viewed",mapOf("platform" to "android","profile_kind" to editor.profile.profileKind))
        }
    }

    fun switchEditorProfile(profileId:String,locale:String) {
        analytics.track("profile_switched",mapOf("platform" to "android"))
        loadProfileHome(locale,profileId)
    }

    fun loadShareCenter(locale:String,selectedProfileId:String?=null)=viewModelScope.launch {
        working {
            val selector=repo.profileSelector(selectedProfileId ?: _state.value.selectedShareProfileId)
            if(!selector.ok){fail(selector.error);return@working}
            val profileId=selector.selectedProfileId
            val products=repo.shareProducts()
            if(!products.ok){fail(products.error);return@working}
            val targets=profileId?.let{repo.shareTargets(it,locale)}
            if(targets!=null&&!targets.ok){fail(targets.error);return@working}
            _state.value=_state.value.copy(profileSelector=selector,selectedShareProfileId=profileId,shareTargets=targets,shareProducts=products.products)
            analytics.track("share_center_viewed",mapOf("platform" to "android"))
        }
    }

    fun switchShareProfile(profileId:String,locale:String)=viewModelScope.launch {
        working {
            val targets=repo.shareTargets(profileId,locale)
            if(!targets.ok){fail(targets.error);return@working}
            _state.value=_state.value.copy(selectedShareProfileId=profileId,shareTargets=targets)
            analytics.track("share_profile_selected",mapOf("platform" to "android"))
        }
    }

    fun trackShareTargetSelected(){analytics.track("share_target_selected",mapOf("platform" to "android"))}
    fun trackShareQrOpened(){analytics.track("share_qr_opened",mapOf("platform" to "android","method" to "qr"))}
    fun trackShareLinkCopied(){analytics.track("share_link_copied",mapOf("platform" to "android","method" to "copy"))}
    fun trackNativeShareOpened(){analytics.track("native_share_opened",mapOf("platform" to "android","method" to "native_share"))}
    fun trackHceTargetSelected(){analytics.track("hce_target_selected",mapOf("platform" to "android","method" to "nfc"))}
    fun trackActivationStarted(){analytics.track("activation_started",mapOf("platform" to "android","method" to "manual"))}

    fun updateShareProduct(id:String,body:ShareProductUpdateRequest)=viewModelScope.launch {
        working {
            val result=repo.updateShareProduct(id,body)
            val product=result.product
            if(!result.ok||product==null){fail(result.error);return@working}
            _state.value=_state.value.copy(shareProducts=_state.value.shareProducts.map{if(it.id==product.id)product else it},message=if(body.action=="TARGET_CHANGE")"SHARE_TARGET_UPDATED" else "PRODUCT_STATUS_UPDATED")
            analytics.track("physical_product_target_updated",mapOf("platform" to "android","outcome" to "success"))
        }
    }

    fun inspectScratchActivation(identifier:String)=viewModelScope.launch {
        working {
            val result=repo.inspectScratchActivation(identifier)
            _state.value=_state.value.copy(shareActivation=result)
            analytics.track("activation_scanned",mapOf("platform" to "android","method" to "qr","outcome" to if(result.eligible)"eligible" else "unavailable"))
            if(!result.ok)fail(result.error)
        }
    }

    fun claimScratchActivation(scratch:String,targetId:String,locale:String,onSuccess:()->Unit={})=viewModelScope.launch {
        val identifier=_state.value.shareActivation?.identifier ?: return@launch
        val profileId=_state.value.selectedShareProfileId ?: return@launch
        working {
            val result=repo.claimScratchActivation(identifier,scratch,profileId,targetId,locale)
            if(!result.ok){analytics.track("activation_failed",mapOf("platform" to "android","method" to "manual","outcome" to if(result.error=="ACTIVATION_COOLDOWN")"cooldown" else "rejected"));fail(result.error);return@working}
            val product=result.product
            _state.value=_state.value.copy(shareActivation=null,shareProducts=if(product==null)_state.value.shareProducts else listOf(product)+_state.value.shareProducts.filterNot{it.id==product.id},message="PRODUCT_ACTIVATED")
            analytics.track("activation_completed",mapOf("platform" to "android","method" to "manual","outcome" to "success"))
            onSuccess()
        }
    }

    fun clearShareActivation(){_state.value=_state.value.copy(shareActivation=null)}

    fun inspectActivationTag(tag:Tag)=viewModelScope.launch {
        working {
            when(val result=nfc.read(tag)){
                is NfcResult.Success->{
                    val inspected=repo.inspectScratchActivation(result.uri)
                    _state.value=_state.value.copy(shareActivation=inspected)
                    analytics.track("activation_scanned",mapOf("platform" to "android","method" to "nfc","outcome" to if(inspected.eligible)"eligible" else "unavailable"))
                    if(!inspected.ok)fail(inspected.error)
                }
                is NfcResult.Failure->fail("NFC_${result.reason}")
            }
        }
    }

    fun mutateProfileEditor(action:JsonObject,locale:String,onSaved:()->Unit={}) = viewModelScope.launch {
        val editor=_state.value.profileEditor ?: return@launch
        _state.value=_state.value.copy(editorSaveState="SAVING",error=null)
        try {
            val result=repo.mutateProfileEditor(editor.profile.id,editor.profile.draftRevision,action)
            if(!result.ok){_state.value=_state.value.copy(editorSaveState="FAILED");fail(result.error);return@launch}
            _state.value=_state.value.copy(editorSaveState="SAVED")
            analytics.track("profile_section_saved",mapOf("platform" to "android","module_type" to (action.get("type")?.asString?.substringBefore('_') ?: "UNKNOWN"),"outcome" to "success"))
            val refreshed=repo.profileEditor(editor.profile.id,locale)
            if(refreshed.ok)_state.value=_state.value.copy(profileEditor=refreshed,editorSaveState="SAVED")
            onSaved()
        } catch(error:HttpException) {
            if(error.code()==409)_state.value=_state.value.copy(editorSaveState="CONFLICT",error="STALE_DRAFT")
            else {_state.value=_state.value.copy(editorSaveState="FAILED");fail("REQUEST_FAILED")}
        }
    }

    fun uploadEditorMedia(context:Context,uri:Uri,locale:String)=viewModelScope.launch {
        val editor=_state.value.profileEditor ?: return@launch
        working {
            val resolver=context.contentResolver
            val mime=resolver.getType(uri) ?: "application/octet-stream"
            var name=uri.lastPathSegment?.substringAfterLast('/') ?: "gallery.jpg"
            var size=0L
            resolver.query(uri,arrayOf(OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE),null,null,null)?.use{cursor->if(cursor.moveToFirst()){cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME).takeIf{it>=0}?.let{name=cursor.getString(it)};cursor.getColumnIndex(OpenableColumns.SIZE).takeIf{it>=0}?.let{size=cursor.getLong(it)}}}
            AndroidUploadPolicy.validate(mime,size,false)?.let{fail(it);return@working}
            val bytes=resolver.openInputStream(uri)?.use{it.readBytes()} ?: throw IllegalArgumentException("FILE_READ_FAILED")
            val result=repo.uploadMedia(editor.profile.id,"gallery",name,mime,bytes,editor.profile.draftRevision)
            if(!result.ok){fail(result.error);return@working}
            analytics.track("draft_media_uploaded",mapOf("platform" to "android","module_type" to "GALLERY","outcome" to "success"))
            val refreshed=repo.profileEditor(editor.profile.id,locale)
            if(refreshed.ok)_state.value=_state.value.copy(profileEditor=refreshed,editorSaveState="SAVED")
        }
    }

    fun removeEditorMedia(mediaId:String,locale:String)=viewModelScope.launch {
        val editor=_state.value.profileEditor ?: return@launch
        try {
            val result=repo.removeEditorMedia(editor.profile.id,mediaId,editor.profile.draftRevision)
            if(!result.ok){fail(result.error);return@launch}
            val refreshed=repo.profileEditor(editor.profile.id,locale)
            if(refreshed.ok)_state.value=_state.value.copy(profileEditor=refreshed,editorSaveState="SAVED")
        } catch(error:HttpException) {
            if(error.code()==409)_state.value=_state.value.copy(editorSaveState="CONFLICT",error="STALE_DRAFT") else fail("REQUEST_FAILED")
        }
    }

    fun setPublishingVisibility(profileId:String,access:String,locale:String) = viewModelScope.launch {
        val revision=_state.value.publishing?.readiness?.draftRevision ?: return@launch
        working {
            val result=repo.updatePublishingVisibility(profileId,revision,access)
            if(result.ok){analytics.track("visibility_changed",mapOf("platform" to "android","visibility" to access));loadPublishing(profileId,locale)} else fail(result.error)
        }
    }

    fun setPublishingSlug(profileId:String,slug:String,locale:String)=viewModelScope.launch {
        val revision=_state.value.publishing?.readiness?.draftRevision ?: return@launch
        working {
            val result=repo.updatePublishingSlug(profileId,revision,slug)
            if(result.ok)loadPublishing(profileId,locale) else fail(result.error)
        }
    }

    fun setMediaVisibility(profileId:String,mediaId:String,visibility:String,locale:String)=viewModelScope.launch {
        val revision=_state.value.publishing?.readiness?.draftRevision ?: return@launch
        working {
            val result=repo.updateMediaVisibility(profileId,revision,mediaId,visibility)
            if(result.ok){analytics.track("visibility_changed",mapOf("platform" to "android","visibility" to visibility,"module_type" to "MEDIA"));loadPublishing(profileId,locale)}else fail(result.error)
        }
    }

    fun setModuleVisibility(profileId:String,key:String,visibility:String,locale:String)=viewModelScope.launch {
        val revision=_state.value.publishing?.readiness?.draftRevision ?: return@launch
        working {
            val result=repo.updateModuleVisibility(profileId,revision,key,visibility)
            if(result.ok){analytics.track("visibility_changed",mapOf("platform" to "android","visibility" to visibility,"module_type" to key));loadPublishing(profileId,locale)}else fail(result.error)
        }
    }

    fun publishingAction(profileId:String,action:String,locale:String) = viewModelScope.launch {
        val revision=_state.value.publishing?.readiness?.draftRevision
        working {
            if(action=="publish")analytics.track("profile_publish_started",mapOf("platform" to "android"))
            val result=repo.publishingAction(profileId,action,if(action=="publish")revision else null)
            if(result.ok) {
                analytics.track(if(action=="publish")"profile_published" else "profile_paused",mapOf("platform" to "android","outcome" to "success"))
                loadPublishing(profileId,locale)
                reload()
            } else {
                if(result.readiness!=null)_state.value=_state.value.copy(publishing=_state.value.publishing?.copy(readiness=result.readiness))
                fail(result.error ?: "PUBLISH_FAILED")
            }
        }
    }

    fun card(id: String) = viewModelScope.launch {
        working {
            val result = repo.card(id)
            _state.value = _state.value.copy(
                selectedCard = result.card,
                destinations = result.destinations,
            )
        }
    }

    fun updateCard(id: String, status: String? = null, destinationId: String? = null) =
        viewModelScope.launch {
            working {
                val result = repo.updateCard(id, status, destinationId)
                if (result.ok) {
                    card(id)
                    reload()
                } else {
                    fail(result.error)
                }
            }
        }

    fun inspectActivation(value: String) = viewModelScope.launch {
        working {
            val result = repo.inspectActivation(value)
            _state.value = _state.value.copy(activation = result)
            if (!result.ok) fail(result.error)
        }
    }

    fun claim(profileId: String) = viewModelScope.launch {
        val token = _state.value.activation?.claimToken ?: return@launch
        working {
            val result = repo.claim(token, profileId)
            if (result.ok) {
                _state.value = _state.value.copy(message = "CARD_CLAIMED", activation = null)
                reload()
            } else {
                fail(result.error)
            }
        }
    }

    fun saveProfile(id: String?, body: ProfileWriteRequest) = viewModelScope.launch {
        working {
            val result = if (id == null) {
                val created = repo.createProfile(body)
                val createdId = created.profile?.id
                if (!created.ok || createdId == null) {
                    fail(created.error ?: "PROFILE_SAVE_FAILED")
                    return@working
                }
                repo.updateProfile(createdId, body)
            } else {
                repo.updateProfile(id, body)
            }
            if (result.ok) {
                _state.value = _state.value.copy(message = "PROFILE_SAVED")
                reload()
            } else {
                fail(result.error ?: "PROFILE_SAVE_FAILED")
            }
        }
    }

    fun createVirtualCard(
        context: Context,
        body: VirtualCardCreateRequest,
        avatarUri: Uri?,
        logoUri: Uri?,
        onCreated: (String) -> Unit,
    ) = viewModelScope.launch {
        working {
            val created = repo.createVirtualCard(body)
            val profile = created.profile
            if (!created.ok || profile == null) {
                fail(created.error ?: "PROFILE_SAVE_FAILED")
                return@working
            }
            suspend fun upload(uri: Uri, kind: String) {
                val resolver = context.contentResolver
                val mime = resolver.getType(uri) ?: "image/jpeg"
                val name = uri.lastPathSegment?.substringAfterLast('/') ?: "$kind.jpg"
                val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return
                val result = repo.uploadMedia(profile.id, kind, name, mime, bytes)
                if (!result.ok) throw IllegalStateException(result.error ?: "UPLOAD_FAILED")
            }
            avatarUri?.let { upload(it, "avatar") }
            logoUri?.let { upload(it, "logo") }
            _state.value = _state.value.copy(message = "PROFILE_SAVED")
            reload()
            onCreated(profile.id)
        }
    }

    fun selectTemplate(virtualCardId: String, templateId: String, onComplete: () -> Unit = {}) = viewModelScope.launch {
        working {
            val result = repo.selectTemplate(virtualCardId, templateId)
            if (!result.ok) {
                fail(result.error)
                return@working
            }
            reload()
            onComplete()
        }
    }

    fun openGoogleWallet(virtualCardId: String, onReady: (String) -> Unit) = viewModelScope.launch {
        working {
            val result = repo.googleWallet(virtualCardId)
            if (!result.ok || result.url.isNullOrBlank()) fail(result.error) else onReady(result.url)
        }
    }

    fun loadProgramming() = viewModelScope.launch {
        working {
            val result = repo.programmingCards()
            _state.value = _state.value.copy(programmingCards = result.cards)
            if (!result.ok) fail(result.error)
        }
    }

    fun readAndVerify(tag: Tag) = viewModelScope.launch {
        working {
            when (val result = nfc.read(tag)) {
                is NfcResult.Success -> {
                    val verification = repo.verifyNfc(result.uri)
                    _state.value = _state.value.copy(
                        nfcUri = result.uri,
                        nfcVerification = verification,
                    )
                }
                is NfcResult.Failure -> fail("NFC_${result.reason}")
            }
        }
    }

    fun write(tag: Tag, card: CardDto) = viewModelScope.launch {
        working {
            when (val result = nfc.writeAndVerify(tag, card.permanentUrl)) {
                is NfcResult.Success -> {
                    val marked = repo.markProgrammed(card.id, result.uri)
                    if (marked.ok) {
                        _state.value = _state.value.copy(message = "NFC_PROGRAMMED")
                    } else {
                        fail(marked.error)
                    }
                }
                is NfcResult.Failure -> fail("NFC_${result.reason}")
            }
        }
    }

    fun lock(tag: Tag, card: CardDto) = viewModelScope.launch {
        working {
            when (val result = nfc.verifyAndLock(tag, card.permanentUrl)) {
                is NfcResult.Success -> {
                    val marked = repo.markLocked(card.id, result.uri)
                    if (marked.ok) {
                        _state.value = _state.value.copy(message = "NFC_LOCKED")
                    } else {
                        fail(marked.error)
                    }
                }
                is NfcResult.Failure -> fail("NFC_${result.reason}")
            }
        }
    }

    fun upload(
        context: Context,
        profileId: String,
        uri: Uri,
        kind: String,
        file: Boolean = false,
    ) = viewModelScope.launch {
        working {
            val resolver = context.contentResolver
            val mime = resolver.getType(uri) ?: "application/octet-stream"
            var name = uri.lastPathSegment?.substringAfterLast('/') ?: "upload"
            var size = -1L
            resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE), null, null, null)?.use { cursor -> if(cursor.moveToFirst()){cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME).takeIf{it>=0}?.let{name=cursor.getString(it)};cursor.getColumnIndex(OpenableColumns.SIZE).takeIf{it>=0}?.let{size=cursor.getLong(it)}} }
            AndroidUploadPolicy.validate(mime,size.coerceAtLeast(0),file)?.let { fail(it);return@working }
            val max = if(file) AndroidUploadPolicy.MAX_FILE_BYTES else AndroidUploadPolicy.MAX_IMAGE_BYTES
            _state.value=_state.value.copy(uploadProgress=0,uploadedUrl=null)
            val bytes = resolver.openInputStream(uri)?.use { input ->
                val output=ByteArrayOutputStream();val buffer=ByteArray(64*1024);var total=0L
                while(true){val read=input.read(buffer);if(read<0)break;total+=read;if(total>max)throw IllegalArgumentException("UPLOAD_TOO_LARGE");output.write(buffer,0,read);if(size>0)_state.value=_state.value.copy(uploadProgress=((total*100/size).coerceIn(0,99)).toInt())};output.toByteArray()
            } ?: throw IllegalArgumentException("FILE_READ_FAILED")
            try {
                if(file){
                    val result=repo.uploadFile(profileId,"","",name,mime,bytes)
                    if(result.ok){_state.value=_state.value.copy(message="UPLOAD_COMPLETE",uploadProgress=100,uploadedUrl=result.url);reload()}else fail(result.error)
                }else{
                    val result=repo.uploadMedia(profileId,kind,name,mime,bytes)
                    if(result.ok){analytics.track("draft_media_uploaded",mapOf("platform" to "android","outcome" to "success"));_state.value=_state.value.copy(message="UPLOAD_COMPLETE",uploadProgress=100,uploadedUrl=result.asset?.previewUrl);reload()}else fail(result.error)
                }
            } catch (error: HttpException) {
                fail(when(error.code()){401->"AUTH_EXPIRED";403->"UPLOAD_FORBIDDEN";413->"UPLOAD_TOO_LARGE";415->"UPLOAD_TYPE_NOT_ALLOWED";else->"UPLOAD_FAILED_${error.code()}"})
            } finally {
                _state.value=_state.value.copy(uploadProgress=null)
            }
        }
    }

    fun addDestination(profileId: String, body: DestinationWriteRequest) = viewModelScope.launch {
        working {
            val result = repo.createDestination(profileId, body)
            if (result.ok) {
                _state.value = _state.value.copy(message = "DESTINATION_SAVED")
                reload()
            } else {
                fail(result.error)
            }
        }
    }

    fun deleteDestination(id: String) = viewModelScope.launch {
        working {
            val result = repo.deleteDestination(id)
            if (result.ok) reload() else fail(result.error)
        }
    }

    fun clearFeedback() {
        _state.value = _state.value.copy(
            message = null,
            error = null,
            nfcUri = null,
            nfcVerification = null,
        )
    }

    private fun fail(value: String?) {
        _state.value = _state.value.copy(error = value ?: "REQUEST_FAILED")
    }

    private suspend fun working(block: suspend () -> Unit) {
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            block()
        } catch (error: Exception) {
            fail(error.message?.takeIf { it in setOf("UPLOAD_TOO_LARGE","UPLOAD_TYPE_NOT_ALLOWED","FILE_READ_FAILED") } ?: "REQUEST_FAILED")
        } finally {
            _state.value = _state.value.copy(loading = false)
        }
    }
}

class AuthFactory(private val sessions: SessionRepository,private val setup: AuthSetupRepository,private val analytics: PopAnalytics,private val firebasePhoneAuth:FirebasePhoneAuthGateway) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        AuthViewModel(sessions,setup,analytics,firebasePhoneAuth) as T
}

class MainFactory(
    private val repo: PopwamRepository,
    private val role: String?,
    private val analytics:PopAnalytics,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        MainViewModel(repo, role,analytics) as T
}
