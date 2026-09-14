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
import com.popwam.pop.data.api.ProfileEditorResponse
import com.popwam.pop.data.api.WalletCapabilitiesDto
import com.popwam.pop.data.api.VerifyNfcResponse
import com.popwam.pop.data.api.ProfileBootstrapStatusResponse
import com.popwam.pop.data.api.ProfileBootstrapRequest
import com.popwam.pop.data.api.LegalDocumentDto
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
    val authenticated:Boolean=false, val loading:Boolean=false, val error:String?=null,
    val setupStage:AuthSetupStage=AuthSetupStage.PUBLIC,
    val setupStatus:ProfileBootstrapStatusResponse?=null,
    val legalDocuments:List<LegalDocumentDto> = emptyList(),
    val accountName:String="", val profileName:String="", val profileKind:String?=null,
    val templates:List<ProfileTemplateDto> = emptyList(), val templateId:String?=null,
    val catalogUnavailable:Boolean=false,
    val passkeyLoading:Boolean=false, val passkeyError:PasskeyLoginError?=null,
    val passkeyRegistered:Boolean=false,
)
enum class PasskeyLoginError { CANCELLED, UNAVAILABLE, UNSUPPORTED, NO_CREDENTIAL, NETWORK, STEP_UP_REQUIRED, AUTHENTICATION_FAILED, SERVER_UNAVAILABLE }
internal fun passkeyPlatformSupported(sdkInt:Int)=sdkInt>=28
internal fun passkeyLoginError(error:Throwable)=when {
    error::class.simpleName?.contains("Unsupported",true)==true ||
        (error as? androidx.credentials.exceptions.publickeycredential.CreatePublicKeyCredentialDomException)?.domError?.javaClass?.simpleName=="NotSupportedError" -> PasskeyLoginError.UNSUPPORTED
    error::class.simpleName?.contains("Cancellation",true)==true -> PasskeyLoginError.CANCELLED
    error::class.simpleName?.contains("NoCredential",true)==true -> PasskeyLoginError.NO_CREDENTIAL
    error is java.io.IOException -> PasskeyLoginError.NETWORK
    error is PasskeyOptionsHttpException && error.safeCode==STEP_UP_REQUIRED -> PasskeyLoginError.STEP_UP_REQUIRED
    error is PasskeyOptionsHttpException && error.safeCode==PASSKEY_OPTIONS_FAILED -> PasskeyLoginError.SERVER_UNAVAILABLE
    error is HttpException -> PasskeyLoginError.AUTHENTICATION_FAILED
    else -> PasskeyLoginError.UNAVAILABLE
}
internal fun passkeyErrorResource(error:PasskeyLoginError,creating:Boolean=false)=when(error) {
    PasskeyLoginError.CANCELLED->com.popwam.pop.R.string.p7a_passkey_cancelled
    PasskeyLoginError.UNSUPPORTED->com.popwam.pop.R.string.p7a_passkey_unsupported
    PasskeyLoginError.NO_CREDENTIAL->com.popwam.pop.R.string.p7a_passkey_missing
    PasskeyLoginError.STEP_UP_REQUIRED->com.popwam.pop.R.string.p7a_passkey_reauthenticate
    PasskeyLoginError.NETWORK->com.popwam.pop.R.string.wa_auth_offline
    PasskeyLoginError.UNAVAILABLE,PasskeyLoginError.SERVER_UNAVAILABLE->com.popwam.pop.R.string.p7a_passkey_unavailable
    else->if(creating)com.popwam.pop.R.string.p7a_passkey_setup_failed else com.popwam.pop.R.string.p7a_passkey_login_failed
}
class AuthViewModel(private val sessions:SessionRepository,private val setup:AuthSetupRepository,private val analytics:PopAnalytics):ViewModel() {
    private val _state=MutableStateFlow(AuthUiState(authenticated=sessions.authenticated,setupStage=if(sessions.needsOnboarding)AuthSetupStage.AUTHENTICATED_CHECKING else AuthSetupStage.PUBLIC))
    val state=_state.asStateFlow()
    init { if(sessions.needsOnboarding)refreshSetup(currentLocale()) }
    fun restoreUnlockedSession() {
        _state.value=AuthUiState(authenticated=sessions.authenticated,setupStage=if(sessions.needsOnboarding)AuthSetupStage.AUTHENTICATED_CHECKING else AuthSetupStage.PUBLIC)
        if(sessions.needsOnboarding)refreshSetup(currentLocale())
    }
    fun adoptOtpSession() {
        if(!sessions.authenticated)return
        _state.value=AuthUiState(authenticated=true,setupStage=AuthSetupStage.AUTHENTICATED_CHECKING)
        refreshSetup(currentLocale())
    }
    fun refreshSetup(locale:String)=operate {
        val status=setup.status(locale)
        check(status.ok)
        val stage=resolveAuthSetupStage(true,status)
        _state.value=_state.value.copy(setupStatus=status,legalDocuments=status.requiredDocuments,
            accountName=status.accountName,profileName=status.profileName.ifBlank{status.accountName},
            profileKind=status.accountKind,templateId=status.templateId,setupStage=stage)
        if(stage==AuthSetupStage.TEMPLATE_CHOICE)loadTemplates()
        if(stage==AuthSetupStage.READY)sessions.completeOnboarding(refreshSnapshot=false)
    }
    fun setAccountName(value:String){_state.value=_state.value.copy(accountName=value.take(160))}
    fun setProfileName(value:String){_state.value=_state.value.copy(profileName=value.take(160))}
    fun selectProfileKind(kind:String){if(_state.value.setupStatus?.accountTypes?.any{it.key==kind&&it.enabled}==true)_state.value=_state.value.copy(profileKind=kind)}
    fun saveName(locale:String)=operate {
        check(_state.value.accountName.isNotBlank())
        check(setup.saveSetup("NAME",_state.value.accountName).ok)
        _state.value=_state.value.copy(profileName=_state.value.accountName,setupStage=AuthSetupStage.ACCOUNT_TYPE)
    }
    fun saveKind(locale:String)=operate {
        check(setup.saveSetup("ACCOUNT_TYPE",_state.value.profileKind).ok)
        _state.value=_state.value.copy(setupStage=AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED)
    }
    fun acceptLegal(locale:String)=operate {
        check(setup.acceptLegal(locale).ok)
        val status=setup.status(locale);check(status.ok)
        _state.value=_state.value.copy(setupStatus=status,setupStage=resolveAuthSetupStage(true,status))
    }
    fun submitBootstrap(locale:String)=operate {
        val before=_state.value
        check(bootstrapValidationError(before.profileName,before.profileKind)==null)
        val result=setup.bootstrap(ProfileBootstrapRequest(before.profileName,before.profileKind!!,locale=locale))
        check(result.ok)
        val status=setup.status(locale);check(status.ok)
        _state.value=_state.value.copy(setupStatus=status,templateId=status.templateId,setupStage=AuthSetupStage.TEMPLATE_CHOICE)
        loadTemplates()
    }
    private suspend fun loadTemplates() {
        val catalog=runCatching { setup.templates() }.getOrNull()
        _state.value=_state.value.copy(templates=catalog?.templates.orEmpty().filter{it.profileKind==_state.value.profileKind},catalogUnavailable=catalog?.ok!=true)
    }
    fun selectTemplate(id:String,locale:String)=operate {
        check(_state.value.templates.any{it.id==id&&it.allowed&&it.isActive})
        val profileId=_state.value.setupStatus?.primaryProfileId ?: error("PROFILE_REQUIRED")
        check(setup.selectTemplate(profileId,id,locale).ok)
        _state.value=_state.value.copy(templateId=id)
    }
    fun continueToSecurity()=operate {
        check(setup.saveSetup("SECURITY").ok)
        _state.value=_state.value.copy(setupStage=AuthSetupStage.SECURITY_SETUP)
    }
    fun registerPasskey(activity:ComponentActivity?,locale:String) {
        if(_state.value.passkeyLoading||activity==null)return
        _state.value=_state.value.copy(passkeyLoading=true,passkeyError=null)
        viewModelScope.launch {
            try {
                check(com.popwam.pop.data.auth.registerServerPasskey(
                    options={setup.passkeyOptions().toString()},
                    create={PasskeyCoordinator(activity).register(activity,it)},
                    verify={setup.verifyPasskey(JsonParser.parseString(it).asJsonObject).ok},
                ))
                _state.value=_state.value.copy(passkeyRegistered=true)
            } catch(error:Throwable) {
                if(error is kotlinx.coroutines.CancellationException)throw error
                _state.value=_state.value.copy(passkeyError=passkeyLoginError(error))
            } finally {_state.value=_state.value.copy(passkeyLoading=false)}
        }
    }
    fun ready(){_state.value=_state.value.copy(setupStage=AuthSetupStage.COMPLETION)}
    fun enterApp()=operate {
        check(setup.saveSetup("COMPLETE").ok)
        sessions.completeOnboarding()
        _state.value=_state.value.copy(setupStage=AuthSetupStage.READY)
    }
    fun back() {
        if(_state.value.loading||_state.value.passkeyLoading)return
        val previous=when(_state.value.setupStage){
            AuthSetupStage.ACCOUNT_TYPE->AuthSetupStage.IDENTITY
            AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED->AuthSetupStage.ACCOUNT_TYPE
            AuthSetupStage.COMPLETION->AuthSetupStage.SECURITY_SETUP
            else->null
        }
        previous?.let{_state.value=_state.value.copy(setupStage=it,error=null)}
    }
    fun logout()=viewModelScope.launch{sessions.logout();_state.value=AuthUiState()}
    private fun operate(block:suspend()->Unit) {
        if(_state.value.loading)return
        _state.value=_state.value.copy(loading=true,error=null)
        viewModelScope.launch{try{block()}catch(error:Exception){
            if(error is kotlinx.coroutines.CancellationException)throw error
            _state.value=_state.value.copy(error="SETUP_FAILED")
        }finally{_state.value=_state.value.copy(loading=false)}}
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

class AuthFactory(private val sessions: SessionRepository,private val setup: AuthSetupRepository,private val analytics: PopAnalytics) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        AuthViewModel(sessions,setup,analytics) as T
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
