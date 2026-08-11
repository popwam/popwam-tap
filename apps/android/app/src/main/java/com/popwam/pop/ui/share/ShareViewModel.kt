package com.popwam.pop.ui.share

import android.app.Application
import android.content.Context
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.nfc.Tag
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.popwam.pop.data.api.ScratchActivationInspectResponse
import com.popwam.pop.data.api.ShareProductDto
import com.popwam.pop.data.api.ShareProductUpdateRequest
import com.popwam.pop.data.api.ShareTargetDto
import com.popwam.pop.data.auth.PopAnalytics
import com.popwam.pop.data.repository.PopwamRepository
import com.popwam.pop.hce.HceConfig
import com.popwam.pop.nfc.NfcCoordinator
import com.popwam.pop.nfc.NfcFailure
import com.popwam.pop.nfc.NfcResult
import com.popwam.pop.nfc.NfcTagManager
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException

data class ShareSnapshot(
    val selector: com.popwam.pop.data.api.ProfileSelectorResponse,
    val serverProfileName: String,
    val serverLifecycle: String,
    val serverShareable: Boolean,
    val serverReason: String?,
    val targets: List<ShareTargetDto>,
    val products: List<ShareProductDto>,
    val partial: Boolean,
)

interface ShareRepository {
    suspend fun load(profileId: String): ShareSnapshot
    suspend fun updateProduct(id: String, request: ShareProductUpdateRequest): ShareProductDto
    suspend fun inspectActivation(identifier: String): ScratchActivationInspectResponse
    suspend fun claimActivation(identifier: String, scratch: String, profileId: String, targetId: String): ShareProductDto?
}

class AndroidShareRepository(
    private val repository: PopwamRepository,
    private val localeProvider: () -> String,
) : ShareRepository {
    override suspend fun load(profileId: String): ShareSnapshot {
        val selector = repository.profileSelector(profileId)
        if (!selector.ok) throw ShareDataException(selector.error ?: "SHARE_PROFILES_FAILED")
        val selected = selector.profiles.firstOrNull { it.id == profileId }
            ?: throw ShareDataException("PROFILE_NOT_FOUND")
        val targets = repository.shareTargets(profileId, localeProvider())
        if (!targets.ok) throw ShareDataException(targets.error ?: "SHARE_TARGETS_FAILED")
        val productsResult = runCatching { repository.shareProducts() }.getOrNull()
        return ShareSnapshot(
            selector = selector,
            serverProfileName = targets.profile.label.ifBlank { selected.label },
            serverLifecycle = targets.profile.lifecycle.ifBlank { selected.lifecycle },
            serverShareable = targets.shareable,
            serverReason = targets.reason,
            targets = targets.targets,
            products = productsResult?.takeIf { it.ok }?.products.orEmpty(),
            partial = productsResult?.ok != true,
        )
    }

    override suspend fun updateProduct(id: String, request: ShareProductUpdateRequest): ShareProductDto {
        val response = repository.updateShareProduct(id, request)
        return response.product?.takeIf { response.ok } ?: throw ShareDataException(response.error ?: "PRODUCT_UPDATE_FAILED")
    }

    override suspend fun inspectActivation(identifier: String): ScratchActivationInspectResponse =
        repository.inspectScratchActivation(identifier)

    override suspend fun claimActivation(identifier: String, scratch: String, profileId: String, targetId: String): ShareProductDto? {
        val response = repository.claimScratchActivation(identifier, scratch, profileId, targetId, localeProvider())
        if (!response.ok) throw ShareDataException(response.error ?: "ACTIVATION_UNAVAILABLE")
        return response.product
    }
}

private class ShareDataException(message: String) : IllegalStateException(message)

class ShareViewModel(
    application: Application,
    private val repository: ShareRepository,
    private val analytics: PopAnalytics,
    private val nfcTagManager: NfcTagManager = NfcTagManager(),
) : AndroidViewModel(application) {
    private val appContext = application.applicationContext
    private val _state = MutableStateFlow(ShareUiState())
    val state = _state.asStateFlow()
    private val _effects = MutableSharedFlow<ShareEffect>(extraBufferCapacity = 4)
    val effects = _effects.asSharedFlow()
    private var loadGeneration = 0L

    fun activateProfile(profile: ActiveShareProfile, force: Boolean = false) {
        val previous = _state.value.activeProfile
        if (!force && previous == profile && (_state.value.loadState == ShareLoadState.READY || _state.value.loadState == ShareLoadState.INITIAL_LOADING || _state.value.refreshing)) {
            refreshDeviceCapabilities()
            return
        }
        val generation = ++loadGeneration
        NfcCoordinator.clear()
        HceConfig.invalidateForProfile(appContext, profile.id)
        _state.value = _state.value.copy(
            loadState = if (_state.value.payload == null) ShareLoadState.INITIAL_LOADING else _state.value.loadState,
            activeProfile = profile,
            availability = if (profile.access == ShareProfileAccess.PRIVATE) ShareAvailability.PRIVATE else ShareAvailability.UNAVAILABLE,
            payload = null,
            productTargets = emptyList(),
            refreshing = _state.value.loadState != ShareLoadState.INITIAL_LOADING,
            qrVisible = false,
            nfc = currentNfcState(),
            hce = currentHceState(profile.id),
            errorCode = null,
        )
        viewModelScope.launch {
            try {
                val snapshot = repository.load(profile.id)
                if (generation != loadGeneration) return@launch
                val resolved = profile.copy(
                    name = profile.name?.takeIf(String::isNotBlank) ?: snapshot.serverProfileName,
                    lifecycle = profile.lifecycle ?: snapshot.serverLifecycle,
                )
                val payload = SharePayloadPolicy.payload(resolved, snapshot.serverProfileName, snapshot.targets)
                val availability = SharePayloadPolicy.availability(resolved, snapshot.serverShareable, payload)
                val safePayload = payload.takeIf { availability in setOf(ShareAvailability.PUBLIC, ShareAvailability.UNLISTED) }
                HceConfig.reconcileProfile(appContext, resolved.id, safePayload?.canonicalUrl)
                _state.value = _state.value.copy(
                    loadState = ShareLoadState.READY,
                    activeProfile = resolved,
                    availability = availability,
                    payload = safePayload,
                    profileSelector = snapshot.selector,
                    productTargets = snapshot.targets,
                    products = if (snapshot.partial && _state.value.products.isNotEmpty()) _state.value.products else snapshot.products,
                    partial = snapshot.partial,
                    refreshing = false,
                    nfc = currentNfcState(),
                    hce = currentHceState(resolved.id, safePayload?.canonicalUrl),
                    errorCode = null,
                )
                analytics.track("share_center_viewed", mapOf("platform" to "android", "outcome" to availability.name.lowercase()))
            } catch (error: HttpException) {
                if (generation != loadGeneration) return@launch
                if (error.code() == 401) _effects.emit(ShareEffect.SessionExpired) else loadFailed(error.message())
            } catch (error: Exception) {
                if (generation != loadGeneration) return@launch
                loadFailed(error.message)
            }
        }
    }

    fun clearActiveProfile() {
        ++loadGeneration
        NfcCoordinator.clear()
        HceConfig.clearProfilePayload(appContext)
        _state.value = ShareUiState(loadState = ShareLoadState.EMPTY, nfc = currentNfcState(), hce = currentHceState(null))
    }

    fun clearForLogout() {
        ++loadGeneration
        NfcCoordinator.clear()
        HceConfig.clearForLogout(appContext)
        _state.value = ShareUiState(
            loadState = ShareLoadState.EMPTY,
            nfc = currentNfcState(),
            hce = currentHceState(null),
        )
    }

    fun refresh() = _state.value.activeProfile?.let { activateProfile(it, force = true) }

    fun showQr() {
        if (_state.value.shareable) {
            _state.value = _state.value.copy(qrVisible = true)
            analytics.track("share_qr_opened", mapOf("platform" to "android", "method" to "qr"))
        }
    }

    fun hideQr() { _state.value = _state.value.copy(qrVisible = false) }
    fun linkCopied() { feedback(ShareFeedback.LINK_COPIED); analytics.track("share_link_copied", mapOf("platform" to "android", "method" to "copy")) }
    fun nativeShareOpened() { feedback(ShareFeedback.SHARE_OPENED); analytics.track("native_share_opened", mapOf("platform" to "android", "method" to "native_share")) }
    fun qrSaved() = feedback(ShareFeedback.QR_SAVED)
    fun qrShared() = feedback(ShareFeedback.QR_SHARED)
    fun qrFailed() = feedback(ShareFeedback.QR_FAILED)
    fun consumeFeedback() { _state.value = _state.value.copy(feedback = null) }

    fun refreshDeviceCapabilities() {
        val profileId = _state.value.activeProfile?.id
        _state.value = _state.value.copy(nfc = currentNfcState(_state.value.nfc), hce = currentHceState(profileId))
    }

    fun setHce(context: Context, enable: Boolean) {
        val profile = _state.value.activeProfile ?: return
        val payload = _state.value.payload
        if (enable && (!_state.value.shareable || payload == null || _state.value.hce.availability != HceAvailability.READY)) return
        HceConfig.selectProfile(context, enable, profile.id, payload?.canonicalUrl)
        _state.value = _state.value.copy(hce = currentHceState(profile.id))
        if (enable) analytics.track("hce_target_selected", mapOf("platform" to "android", "method" to "nfc"))
    }

    fun startNfcWrite() {
        val payload = _state.value.payload ?: return
        val capability = nfcAvailability()
        if (!_state.value.shareable || capability != NfcAvailability.READY) {
            _state.value = _state.value.copy(nfc = ShareNfcState(availability = capability))
            return
        }
        _state.value = _state.value.copy(nfc = ShareNfcState(capability, NfcOperation.WRITE, NfcStage.WAITING_FOR_TAG))
        NfcCoordinator.register { tag -> writeTag(tag, payload, lock = false) }
    }

    fun requestNfcLock() {
        val payload = _state.value.payload ?: return
        if (!_state.value.shareable || nfcAvailability() != NfcAvailability.READY) return
        _state.value = _state.value.copy(nfc = ShareNfcState(NfcAvailability.READY, NfcOperation.LOCK, NfcStage.WAITING_FOR_TAG))
        NfcCoordinator.register { tag -> writeTag(tag, payload, lock = true) }
    }

    fun cancelNfcOperation() {
        NfcCoordinator.clear()
        _state.value = _state.value.copy(nfc = ShareNfcState(availability = nfcAvailability()))
    }

    private fun writeTag(tag: Tag, payload: CanonicalSharePayload, lock: Boolean) {
        if (_state.value.payload != payload || !_state.value.shareable) return
        _state.value = _state.value.copy(nfc = ShareNfcState(NfcAvailability.READY, if (lock) NfcOperation.LOCK else NfcOperation.WRITE, NfcStage.WRITING))
        viewModelScope.launch {
            val result = if (lock) nfcTagManager.verifyAndLock(tag, payload.canonicalUrl) else nfcTagManager.writeAndVerify(tag, payload.canonicalUrl)
            if (_state.value.payload != payload) return@launch
            _state.value = _state.value.copy(nfc = when (result) {
                is NfcResult.Success -> ShareNfcState(NfcAvailability.READY, if (lock) NfcOperation.LOCK else NfcOperation.WRITE, NfcStage.SUCCESS, locked = result.locked)
                is NfcResult.Failure -> ShareNfcState(NfcAvailability.READY, if (lock) NfcOperation.LOCK else NfcOperation.WRITE, NfcStage.ERROR, failureCode = result.reason.name)
            })
        }
    }

    fun updateProduct(id: String, profileId: String, targetId: String?, status: String?) = viewModelScope.launch {
        val action = if (targetId != null) "TARGET_CHANGE" else "STATUS_CHANGE"
        mutate {
            val product = repository.updateProduct(id, ShareProductUpdateRequest(action, profileId.takeIf { action == "TARGET_CHANGE" }, targetId, status))
            _state.value = _state.value.copy(products = _state.value.products.map { if (it.id == product.id) product else it }, feedback = ShareFeedback.PRODUCT_UPDATED)
            analytics.track("physical_product_target_updated", mapOf("platform" to "android", "outcome" to "success"))
        }
    }

    fun inspectActivation(identifier: String) = viewModelScope.launch { mutate {
        val result = repository.inspectActivation(identifier.trim().take(512))
        _state.value = _state.value.copy(activation = result)
        if (!result.ok) throw ShareDataException(result.error ?: "ACTIVATION_UNAVAILABLE")
    } }

    fun inspectActivationTag(tag: Tag) = viewModelScope.launch { mutate {
        when (val read = nfcTagManager.read(tag)) {
            is NfcResult.Success -> {
                val result = repository.inspectActivation(read.uri)
                _state.value = _state.value.copy(activation = result)
                if (!result.ok) throw ShareDataException(result.error ?: "ACTIVATION_UNAVAILABLE")
            }
            is NfcResult.Failure -> throw ShareDataException("NFC_${read.reason.name}")
        }
    } }

    fun claimActivation(scratch: String, targetId: String, onSuccess: () -> Unit) = viewModelScope.launch {
        val activation = _state.value.activation?.identifier ?: return@launch
        val profile = _state.value.activeProfile ?: return@launch
        mutate {
            val product = repository.claimActivation(activation, scratch, profile.id, targetId)
            if (product != null) _state.value = _state.value.copy(products = listOf(product) + _state.value.products.filterNot { it.id == product.id })
            _state.value = _state.value.copy(activation = null, feedback = ShareFeedback.PRODUCT_ACTIVATED)
            onSuccess()
        }
    }

    fun clearActivation() { _state.value = _state.value.copy(activation = null) }

    override fun onCleared() {
        NfcCoordinator.clear()
        super.onCleared()
    }

    private fun nfcAvailability(): NfcAvailability {
        val adapter = NfcAdapter.getDefaultAdapter(appContext) ?: return NfcAvailability.UNAVAILABLE
        return if (adapter.isEnabled) NfcAvailability.READY else NfcAvailability.DISABLED
    }

    private fun hceAvailability(): HceAvailability {
        val adapter = NfcAdapter.getDefaultAdapter(appContext) ?: return HceAvailability.UNAVAILABLE
        if (!adapter.isEnabled) return HceAvailability.DISABLED
        return if (appContext.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)) HceAvailability.READY else HceAvailability.UNSUPPORTED
    }

    private fun currentNfcState(previous: ShareNfcState? = null): ShareNfcState {
        val capability = nfcAvailability()
        val retained = previous?.takeIf { it.stage in setOf(NfcStage.WAITING_FOR_TAG, NfcStage.WRITING, NfcStage.SUCCESS, NfcStage.ERROR) }
        return if (capability == NfcAvailability.READY && retained != null) retained.copy(availability = capability)
        else ShareNfcState(availability = capability)
    }

    private fun currentHceState(profileId: String?, expectedUrl: String? = _state.value.payload?.canonicalUrl): ShareHceState {
        val selection = HceConfig.profileSelection(appContext)
        return ShareHceState(
            availability = hceAvailability(),
            requested = HceConfig.requested(appContext),
            activeForProfile = profileId != null && expectedUrl != null && HceConfig.enabled(appContext) && selection?.profileId == profileId && selection.canonicalUrl == expectedUrl,
        )
    }

    private suspend fun mutate(block: suspend () -> Unit) {
        if (_state.value.busy) return
        _state.value = _state.value.copy(busy = true, errorCode = null)
        try { block() }
        catch (error: HttpException) { if (error.code() == 401) _effects.emit(ShareEffect.SessionExpired) else mutationFailed(error.message()) }
        catch (error: Exception) { mutationFailed(error.message) }
        finally { _state.value = _state.value.copy(busy = false) }
    }

    private fun feedback(value: ShareFeedback) { _state.value = _state.value.copy(feedback = value) }
    private fun mutationFailed(code: String?) { _state.value = _state.value.copy(errorCode = code ?: "SHARE_ACTION_FAILED") }
    private fun loadFailed(code: String?) {
        HceConfig.reconcileProfile(appContext, _state.value.activeProfile?.id ?: return, null)
        _state.value = _state.value.copy(loadState = ShareLoadState.ERROR, payload = null, availability = ShareAvailability.UNAVAILABLE, refreshing = false, errorCode = code ?: "SHARE_UNAVAILABLE", hce = currentHceState(_state.value.activeProfile?.id))
    }
}

class ShareViewModelFactory(
    private val application: Application,
    private val repository: ShareRepository,
    private val analytics: PopAnalytics,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = ShareViewModel(application, repository, analytics) as T
}
