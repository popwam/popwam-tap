package com.popwam.pop.ui.home

enum class HomeLoadState { INITIAL_LOADING, CONTENT, EMPTY, ERROR }

data class HomeProfile(
    val id: String,
    val name: String,
    val subtitle: String?,
    val avatarUrl: String?,
    val lifecycle: String,
    val visibility: String,
    val isPrimary: Boolean,
)

data class HomeUiState(
    val loadState: HomeLoadState = HomeLoadState.INITIAL_LOADING,
    val profiles: List<HomeProfile> = emptyList(),
    val activeProfileId: String? = null,
    val completionPercent: Int? = null,
    val profileReady: Boolean = false,
    val activeProductCount: Int = 0,
    val totalOpenCount: Int = 0,
    val isRefreshing: Boolean = false,
    val isPartial: Boolean = false,
    val isOffline: Boolean = false,
    val discoveryAvailable: Boolean = false,
    val servicesAvailable: Boolean = false,
    val errorCode: String? = null,
) {
    val activeProfile get() = profiles.firstOrNull { it.id == activeProfileId } ?: profiles.firstOrNull()
}

sealed interface HomeEvent {
    data object Refresh : HomeEvent
    data object Retry : HomeEvent
    data object Search : HomeEvent
    data object Notifications : HomeEvent
    data object AddProfile : HomeEvent
    data object Share : HomeEvent
    data object Menu : HomeEvent
    data class SelectProfile(val id: String) : HomeEvent
    data class OpenProfile(val id: String) : HomeEvent
}

sealed interface HomeDestination {
    data object Search : HomeDestination
    data object Notifications : HomeDestination
    data object AddProfile : HomeDestination
    data object Share : HomeDestination
    data object Menu : HomeDestination
    data class Profile(val id: String) : HomeDestination
}

sealed interface HomeEffect {
    data class Navigate(val destination: HomeDestination) : HomeEffect
    data object SessionExpired : HomeEffect
}

enum class HomePrimaryTab { HOME, PROFILE, MENU }

fun selectedHomeTab(route: String?): HomePrimaryTab = when (route) {
    "my-profile" -> HomePrimaryTab.PROFILE
    "menu" -> HomePrimaryTab.MENU
    else -> HomePrimaryTab.HOME
}
