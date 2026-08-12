package com.popwam.pop.ui.home

import com.popwam.pop.data.auth.PopAnalytics
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val analytics = object : PopAnalytics {
        override fun track(event: String, properties: Map<String, String>) = Unit
    }

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun `loading transitions to current profile content`() = runTest(dispatcher) {
        val response = CompletableDeferred<HomeSnapshot>()
        val viewModel = HomeViewModel(HomeRepository { response.await() }, analytics)
        runCurrent()
        assertEquals(HomeLoadState.INITIAL_LOADING, viewModel.state.value.loadState)

        response.complete(snapshot())
        runCurrent()

        assertEquals(HomeLoadState.CONTENT, viewModel.state.value.loadState)
        assertEquals("profile-1", viewModel.state.value.activeProfile?.id)
        assertFalse(viewModel.state.value.isRefreshing)
    }

    @Test fun `recoverable failure preserves loaded content during refresh`() = runTest(dispatcher) {
        var calls = 0
        val viewModel = HomeViewModel(HomeRepository {
            if (calls++ == 0) snapshot() else throw IOException("offline")
        }, analytics)
        runCurrent()
        viewModel.onEvent(HomeEvent.Refresh)
        runCurrent()

        assertEquals(HomeLoadState.CONTENT, viewModel.state.value.loadState)
        assertTrue(viewModel.state.value.isPartial)
        assertEquals("HOME_UNAVAILABLE", viewModel.state.value.errorCode)
    }

    @Test fun `primary visible actions emit typed destinations`() = runTest(dispatcher) {
        val viewModel = HomeViewModel(HomeRepository { snapshot() }, analytics)
        runCurrent()
        val search = async(UnconfinedTestDispatcher(testScheduler), start = CoroutineStart.UNDISPATCHED) { viewModel.effects.first() }
        viewModel.onEvent(HomeEvent.Search)
        assertEquals(HomeEffect.Navigate(HomeDestination.Search), search.await())

        val profile = async(UnconfinedTestDispatcher(testScheduler), start = CoroutineStart.UNDISPATCHED) { viewModel.effects.first() }
        viewModel.onEvent(HomeEvent.OpenProfile("profile-1"))
        assertEquals(HomeEffect.Navigate(HomeDestination.Profile("profile-1")), profile.await())
    }

    @Test fun `bottom navigation has one deterministic selected tab`() {
        assertEquals(HomePrimaryTab.HOME, selectedHomeTab("home"))
        assertEquals(HomePrimaryTab.PROFILE, selectedHomeTab("my-profile"))
        assertEquals(HomePrimaryTab.MENU, selectedHomeTab("menu"))
    }

    @Test fun `profile feature switch refreshes Home without recreation`() = runTest(dispatcher) {
        var selected:String?=null
        val viewModel=HomeViewModel(HomeRepository { id->snapshot().copy(selectedProfileId=id?:"profile-1",profiles=listOf(HomeProfile(id?:"profile-1",id?:"profile-1",null,null,"PUBLISHED","PUBLIC",true))) },analytics,null){selected=it}
        runCurrent()
        viewModel.selectActiveProfile("profile-2")
        runCurrent()
        assertEquals("profile-2",viewModel.state.value.activeProfileId)
        assertEquals("profile-2",selected)
    }

    @Test fun `expired session emits the authenticated root handoff`() = runTest(dispatcher) {
        val viewModel = HomeViewModel(HomeRepository {
            throw HttpException(Response.error<Unit>(401, "expired".toResponseBody()))
        }, analytics)
        val effect = async(UnconfinedTestDispatcher(testScheduler), start = CoroutineStart.UNDISPATCHED) { viewModel.effects.first() }
        runCurrent()
        assertEquals(HomeEffect.SessionExpired, effect.await())
    }

    private fun snapshot() = HomeSnapshot(
        profiles = listOf(HomeProfile("profile-1", "Sarah", "Designer", null, "PUBLISHED", "PUBLIC", true)),
        selectedProfileId = "profile-1",
        completionPercent = 100,
        profileReady = true,
        activeProductCount = 2,
        totalOpenCount = 12,
        partial = false,
    )
}
