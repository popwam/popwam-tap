package com.popwam.pop.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.popwam.pop.data.auth.PopAnalytics
import com.popwam.pop.data.repository.PopwamRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException

data class HomeSnapshot(
    val profiles: List<HomeProfile>,
    val selectedProfileId: String?,
    val completionPercent: Int?,
    val profileReady: Boolean,
    val activeProductCount: Int,
    val totalOpenCount: Int,
    val partial: Boolean,
)

fun interface HomeRepository {
    suspend fun load(selectedProfileId: String?): HomeSnapshot
}

class AndroidHomeRepository(
    private val repository: PopwamRepository,
    private val localeProvider: () -> String,
) : HomeRepository {
    override suspend fun load(selectedProfileId: String?): HomeSnapshot = supervisorScope {
        val profilesRequest = async { repository.profiles() }
        val cardsRequest = async { repository.cards() }
        val selectorRequest = async { repository.profileSelector(selectedProfileId) }
        val profilesResponse = profilesRequest.await()
        if (!profilesResponse.ok) throw homeFailure(profilesResponse.error)
        val cardsResponse = optionalHomeData { cardsRequest.await() }
        val selectorResponse = optionalHomeData { selectorRequest.await() }
        val selected = selectedProfileId
            ?: selectorResponse?.selectedProfileId
            ?: selectorResponse?.profiles?.firstOrNull { it.isPrimary }?.id
            ?: profilesResponse.profiles.firstOrNull()?.id
        val locale = localeProvider()
        val editor = selected?.let { id -> optionalHomeData { repository.profileEditor(id, locale) } }
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
        HomeSnapshot(
            profiles = profiles,
            selectedProfileId = selected,
            completionPercent = editor?.takeIf { it.ok }?.let { if (it.completion.complete) 100 else null },
            profileReady = editor?.ok == true && editor.completion.complete,
            activeProductCount = cardsResponse?.cards.orEmpty().count { it.cardStatus == "ACTIVE" },
            totalOpenCount = cardsResponse?.cards.orEmpty().sumOf { it.openCount },
            partial = cardsResponse?.ok != true || selectorResponse?.ok != true || selected != null && editor?.ok != true,
        )
    }
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

    init { load(initial = true, selectedProfileId = initialProfileId) }

    fun selectActiveProfile(id: String) {
        if (id.isNotBlank() && id != _state.value.activeProfileId) load(initial = false, selectedProfileId = id, persistSelection = true)
    }

    fun onEvent(event: HomeEvent) {
        when (event) {
            HomeEvent.Refresh, HomeEvent.Retry -> load(initial = _state.value.profiles.isEmpty())
            HomeEvent.Search -> navigate(HomeDestination.Search)
            HomeEvent.Notifications -> navigate(HomeDestination.Notifications)
            HomeEvent.AddProfile -> navigate(HomeDestination.AddProfile)
            HomeEvent.Share -> navigate(HomeDestination.Share)
            HomeEvent.Menu -> navigate(HomeDestination.Menu)
            is HomeEvent.OpenProfile -> navigate(HomeDestination.Profile(event.id))
            is HomeEvent.SelectProfile -> {
                if (event.id != _state.value.activeProfileId) {
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
        if (_state.value.isRefreshing) return
        viewModelScope.launch {
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
                    isPartial = snapshot.partial,
                )
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
