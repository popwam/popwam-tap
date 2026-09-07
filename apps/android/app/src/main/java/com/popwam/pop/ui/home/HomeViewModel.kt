package com.popwam.pop.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.popwam.pop.data.auth.PopAnalytics
import com.popwam.pop.data.repository.LocalFirstRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import retrofit2.HttpException

data class HomeSnapshot(
    val profiles: List<HomeProfile>,
    val selectedProfileId: String?,
    val completionPercent: Int?,
    val profileReady: Boolean,
    val activeProductCount: Int,
    val totalOpenCount: Int,
    val partial: Boolean,
    val services: List<com.popwam.pop.data.api.DiscoveryServiceDto> = emptyList(),
)

fun interface HomeRepository {
    suspend fun load(selectedProfileId: String?): HomeSnapshot
    suspend fun search(query:String):com.popwam.pop.data.api.DiscoveryResponse = error("DISCOVERY_UNAVAILABLE")
    suspend fun refreshDiscovery():com.popwam.pop.data.api.DiscoveryResponse = error("DISCOVERY_UNAVAILABLE")
}

class AndroidHomeRepository(
    private val repository: LocalFirstRepository,
    private val localeProvider: () -> String,
) : HomeRepository {
    override suspend fun load(selectedProfileId: String?): HomeSnapshot {
        val locale = localeProvider()
        val local = repository.core(selectedProfileId, locale)
        val profilesResponse = local.profiles ?: throw homeFailure("HOME_CACHE_UNAVAILABLE")
        val cardsResponse = local.cards
        val selectorResponse = local.selector
        val selected = selectedProfileId
            ?: selectorResponse?.selectedProfileId
            ?: selectorResponse?.profiles?.firstOrNull { it.isPrimary }?.id
            ?: profilesResponse.profiles.firstOrNull()?.id
        val editor = selected?.let(local.editors::get)
        val selectorById = selectorResponse?.profiles.orEmpty().associateBy { it.id }
        val profiles = profilesResponse.profiles.map { profile ->
            val selector = selectorById[profile.id]
            HomeProfile(
                id = profile.id,
                name = when (locale) {
                    "ar" -> profile.displayNameAr ?: profile.displayNameEn
                    else -> profile.displayNameEn ?: profile.displayNameAr
                }?.takeIf(String::isNotBlank) ?: profile.displayName.ifBlank { "POP" },
                subtitle = when (locale) {
                    "ar" -> profile.jobTitleAr ?: profile.jobTitleEn
                    else -> profile.jobTitleEn ?: profile.jobTitleAr
                } ?: profile.company,
                avatarUrl = profile.avatarUrl ?: profile.logoUrl,
                lifecycle = selector?.lifecycle ?: profile.virtualCard?.status ?: "DRAFT",
                visibility = if (selector?.lifecycle == "PUBLISHED") "PUBLIC" else "PRIVATE",
                isPrimary = selector?.isPrimary == true,
            )
        }
        return HomeSnapshot(
            profiles = profiles,
            selectedProfileId = selected,
            completionPercent = editor?.takeIf { it.ok }?.let { if (it.completion.complete) 100 else null },
            profileReady = editor?.ok == true && editor.completion.complete,
            activeProductCount = cardsResponse?.cards.orEmpty().count { it.cardStatus == "ACTIVE" },
            totalOpenCount = cardsResponse?.cards.orEmpty().sumOf { it.openCount },
            partial = cardsResponse?.ok != true || selectorResponse?.ok != true || selected != null && editor?.ok != true,
            services = local.discovery?.services.orEmpty(),
        )
    }

    override suspend fun search(query:String)=repository.discovery(localeProvider(),query)
    override suspend fun refreshDiscovery()=repository.discovery(localeProvider(),force=true)
}

private class HomeDataException(message: String?) : IllegalStateException(message ?: "HOME_UNAVAILABLE")
private class HomeSessionExpiredException : IllegalStateException("SESSION_EXPIRED")

private fun homeFailure(code: String?): Exception = if (
    code.orEmpty().uppercase().let { "AUTH" in it || "SESSION" in it || "UNAUTHORIZED" in it }
) HomeSessionExpiredException() else HomeDataException(code)

private suspend fun <T> optionalHomeData(block: suspend () -> T): T? = try {
    block()
} catch (error: HttpException) {
    if (error.code() == 401) throw HomeSessionExpiredException()
    null
} catch (_: Exception) {
    null
}

class HomeViewModel(
    private val repository: HomeRepository,
    private val analytics: PopAnalytics,
    private val initialProfileId: String? = null,
    private val onActiveProfileChanged: (String) -> Unit = {},
) : ViewModel() {
    private val _state = MutableStateFlow(HomeUiState(activeProfileId = initialProfileId))
    val state = _state.asStateFlow()
    private val _effects = MutableSharedFlow<HomeEffect>(extraBufferCapacity = 8)
    val effects = _effects.asSharedFlow()
    private var searchJob:Job?=null
    private var loadJob:Job?=null
    private var requestedProfileId:String?=initialProfileId

    init { load(initial = true, selectedProfileId = initialProfileId) }

    fun selectActiveProfile(id: String) {
        if (id.isNotBlank() && id != requestedProfileId) { requestedProfileId=id;load(initial = false, selectedProfileId = id, persistSelection = true) }
    }

    fun onEvent(event: HomeEvent) {
        when (event) {
            HomeEvent.Refresh -> { load(initial = _state.value.profiles.isEmpty()); refreshDiscovery() }
            HomeEvent.Retry -> load(initial = _state.value.profiles.isEmpty())
            HomeEvent.Search -> navigate(HomeDestination.Search)
            is HomeEvent.SearchChanged -> search(event.query)
            HomeEvent.Notifications -> navigate(HomeDestination.Notifications)
            HomeEvent.AddProfile -> navigate(HomeDestination.AddProfile)
            HomeEvent.Share -> navigate(HomeDestination.Share)
            HomeEvent.Menu -> navigate(HomeDestination.Menu)
            is HomeEvent.OpenProfile -> navigate(HomeDestination.Profile(event.id))
            is HomeEvent.OpenPublicProfile -> navigate(HomeDestination.PublicProfile(event.slug))
            is HomeEvent.SelectProfile -> {
                if (event.id != requestedProfileId) {
                    requestedProfileId=event.id
                    analytics.track("profile_switched", mapOf("platform" to "android"))
                    load(initial = false, selectedProfileId = event.id, persistSelection = true)
                }
            }
        }
    }

    private fun navigate(destination: HomeDestination) {
        _effects.tryEmit(HomeEffect.Navigate(destination))
    }

    private fun load(initial: Boolean, selectedProfileId: String? = _state.value.activeProfileId, persistSelection: Boolean = false) {
        loadJob?.cancel()
        loadJob=viewModelScope.launch {
            _state.value = _state.value.copy(
                loadState = if (initial) HomeLoadState.INITIAL_LOADING else _state.value.loadState,
                isRefreshing = !initial,
                errorCode = null,
            )
            try {
                val snapshot = repository.load(selectedProfileId)
                _state.value = HomeUiState(
                    loadState = if (snapshot.profiles.isEmpty()) HomeLoadState.EMPTY else HomeLoadState.CONTENT,
                    profiles = snapshot.profiles,
                    activeProfileId = snapshot.selectedProfileId,
                    completionPercent = snapshot.completionPercent,
                    profileReady = snapshot.profileReady,
                    activeProductCount = snapshot.activeProductCount,
                    totalOpenCount = snapshot.totalOpenCount,
                    services = snapshot.services,
                    servicesAvailable = snapshot.services.isNotEmpty(),
                    isPartial = snapshot.partial,
                )
                requestedProfileId=snapshot.selectedProfileId
                if (persistSelection) snapshot.selectedProfileId?.let(onActiveProfileChanged)
                analytics.track("home_viewed", mapOf("platform" to "android", "outcome" to if (snapshot.partial) "partial" else "loaded"))
            } catch (error: HttpException) {
                if (error.code() == 401) _effects.emit(HomeEffect.SessionExpired)
                else showError()
            } catch (_: HomeSessionExpiredException) {
                _effects.emit(HomeEffect.SessionExpired)
            } catch (_: Exception) {
                showError()
            }
        }
    }

    private fun refreshDiscovery()=viewModelScope.launch {
        runCatching { repository.refreshDiscovery() }.getOrNull()?.let { result ->
            _state.value=_state.value.copy(services=result.services,servicesAvailable=result.services.isNotEmpty())
        }
    }

    private fun search(value:String){
        val query=value.take(80)
        searchJob?.cancel()
        _state.value=_state.value.copy(searchQuery=query,searchProfiles=if(query.isBlank()) emptyList() else _state.value.searchProfiles,searchServices=if(query.isBlank()) emptyList() else _state.value.searchServices,searchLoading=false,searchAttempted=false,searchError=null)
        if(query.trim().length<2)return
        searchJob=viewModelScope.launch {
            delay(350)
            _state.value=_state.value.copy(searchLoading=true,searchError=null)
            runCatching { repository.search(query.trim()) }
                .onSuccess { result->_state.value=_state.value.copy(searchProfiles=result.profiles,searchServices=result.services,searchLoading=false,searchAttempted=true,searchError=null) }
                .onFailure { _state.value=_state.value.copy(searchProfiles=emptyList(),searchServices=emptyList(),searchLoading=false,searchAttempted=true,searchError="DISCOVERY_UNAVAILABLE") }
        }
    }

    private fun showError() {
        _state.value = if (_state.value.profiles.isEmpty()) {
            HomeUiState(loadState = HomeLoadState.ERROR, errorCode = "HOME_UNAVAILABLE")
        } else _state.value.copy(isRefreshing = false, isPartial = true, errorCode = "HOME_UNAVAILABLE")
    }
}

class HomeViewModelFactory(
    private val repository: HomeRepository,
    private val analytics: PopAnalytics,
    private val initialProfileId: String? = null,
    private val onActiveProfileChanged: (String) -> Unit = {},
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = HomeViewModel(repository, analytics, initialProfileId, onActiveProfileChanged) as T
}
