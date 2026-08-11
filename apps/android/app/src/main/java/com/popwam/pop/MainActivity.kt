package com.popwam.pop

import android.content.ComponentName
import android.nfc.NfcAdapter
import android.nfc.cardemulation.CardEmulation
import android.os.Bundle
import android.content.Intent
import android.view.WindowManager
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.ViewModelProvider
import com.popwam.pop.hce.HceConfig
import com.popwam.pop.hce.PopwamHostApduService
import com.popwam.pop.nfc.NfcCoordinator
import com.popwam.pop.nfc.NfcDeepLinkPolicy
import com.popwam.pop.ui.AuthFactory
import com.popwam.pop.ui.AuthViewModel
import com.popwam.pop.ui.MainFactory
import com.popwam.pop.ui.MainViewModel
import com.popwam.pop.ui.PopwamApp
import com.popwam.pop.ui.launch.LaunchExperience
import com.popwam.pop.ui.launch.LaunchViewModel
import com.popwam.pop.ui.launch.LaunchViewModelFactory
import com.popwam.pop.ui.launch.reducedMotionEnabled
import com.popwam.pop.ui.theme.PopwamTheme
import com.popwam.pop.ui.theme.AppearanceStore
import com.popwam.pop.ui.theme.popFontFamilies
import com.popwam.pop.ui.home.AndroidHomeRepository
import com.popwam.pop.ui.home.HomeViewModel
import com.popwam.pop.ui.home.HomeViewModelFactory
import com.popwam.pop.ui.profile.AndroidProfilesRepository
import com.popwam.pop.ui.profile.ProfilesViewModel
import com.popwam.pop.ui.profile.ProfilesViewModelFactory
import com.popwam.pop.ui.share.AndroidShareRepository
import com.popwam.pop.ui.share.ShareViewModel
import com.popwam.pop.ui.share.ShareViewModelFactory
import com.popwam.pop.ui.currentLocale
import com.popwam.pop.ui.auth.AuthenticationFlowFactory
import com.popwam.pop.ui.auth.AuthenticationFlowViewModel
import com.popwam.pop.ui.auth.AuthenticationHost
import com.popwam.mobile.onboarding.Phase3OnboardingTheme
import androidx.compose.foundation.isSystemInDarkTheme
import com.popwam.mobile.onboarding.LaunchCoordinator
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private val adapter by lazy { NfcAdapter.getDefaultAdapter(this) }
    private var resumed = false
    private lateinit var appearanceStore: AppearanceStore
    private lateinit var launchViewModel: LaunchViewModel
    private lateinit var authenticationViewModel: AuthenticationFlowViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE,
        )
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.auto(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
        )
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                NfcCoordinator.active.collect(::updateNfcMode)
            }
        }
        val app = application as TapApplication
        appearanceStore = AppearanceStore()
        launchViewModel = ViewModelProvider(
            this,
            LaunchViewModelFactory(
                coordinator = LaunchCoordinator(app.container.launchState),
                migrator = app.container.launchMigrator,
                sessions = app.container.sessions,
                localization = app.container.localization,
                reducedMotion = reducedMotionEnabled(this),
                afterSessionInitialized = { app.container.pushTokens.uploadPendingIfAuthenticated() },
            ),
        )[LaunchViewModel::class.java]
        launchViewModel.acceptDeepLink(intent?.dataString)
        authenticationViewModel = ViewModelProvider(
            this,
            AuthenticationFlowFactory(app.container.authenticationRemote,app.container.sessionStore,app.container.firebasePhoneAuth),
        )[AuthenticationFlowViewModel::class.java]
        setContent {
            val launchState by launchViewModel.state.collectAsStateWithLifecycle()
            val localization by app.container.localization.state.collectAsStateWithLifecycle()
            androidx.compose.runtime.LaunchedEffect(launchState.persisted.selectedBaseTheme, launchState.persisted.selectedPopStyle) {
                appearanceStore.synchronize(launchState.persisted.selectedBaseTheme.name, launchState.persisted.selectedPopStyle.name)
            }
            LaunchExperience(launchViewModel,localization,popFontFamilies()) {
                val auth: AuthViewModel = viewModel(factory = AuthFactory(app.container.sessions, app.container.authSetup, app.container.analytics,app.container.firebasePhoneAuth))
                val authState by auth.state.collectAsStateWithLifecycle()
                if(!authState.authenticated) {
                    Phase3OnboardingTheme(
                        launchState.persisted.selectedBaseTheme,
                        launchState.persisted.selectedPopStyle,
                        isSystemInDarkTheme(),
                        currentLocale(),
                        popFontFamilies(),
                    ) {
                        AuthenticationHost(
                            authenticationViewModel,
                            app.container.phoneCountries,
                            onAuthenticated=auth::adoptPhase4Session,
                            onProfileSetup={ destination -> launchViewModel.acceptProfileSetupHandoff(destination) },
                        )
                    }
                } else {
                    val main: MainViewModel = viewModel(factory = MainFactory(app.container.repository, app.container.sessions.role,app.container.analytics))
                    val home: HomeViewModel = viewModel(factory = HomeViewModelFactory(AndroidHomeRepository(app.container.repository, ::currentLocale),app.container.analytics,launchState.persisted.activeProfileId,launchViewModel::selectActiveProfile))
                    val profiles: ProfilesViewModel = viewModel(factory = ProfilesViewModelFactory(AndroidProfilesRepository(app.container.repository, ::currentLocale),app.container.analytics,launchState.persisted.activeProfileId){profileId->launchViewModel.selectActiveProfile(profileId);home.selectActiveProfile(profileId)})
                    val share: ShareViewModel = viewModel(factory = ShareViewModelFactory(app,AndroidShareRepository(app.container.repository,::currentLocale),app.container.analytics))
                    PopwamTheme(launchState.persisted.selectedBaseTheme.name,"DEFAULT",launchState.persisted.selectedPopStyle.name) {
                    PopwamApp(
                        auth, main, home, profiles, share, NfcDeepLinkPolicy.route(intent?.dataString), appearanceStore, app.container.phoneCountries,
                        onThemeModeSelected = launchViewModel::selectBaseTheme,
                        onPaletteSelected = launchViewModel::selectPopStyle,
                    )
                }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        launchViewModel.acceptDeepLink(intent.dataString)
    }

    override fun onStart() {
        super.onStart()
        if (::launchViewModel.isInitialized) launchViewModel.setForeground(true)
    }

    override fun onStop() {
        if (::launchViewModel.isInitialized) launchViewModel.setForeground(false)
        super.onStop()
    }

    override fun onResume() {
        super.onResume()
        if(::authenticationViewModel.isInitialized)authenticationViewModel.refreshBiometric(this)
        resumed = true
        updateNfcMode(NfcCoordinator.active.value)
    }

    override fun onPause() {
        resumed = false
        adapter?.disableReaderMode(this)
        runCatching {
            adapter?.let { CardEmulation.getInstance(it).unsetPreferredService(this) }
        }
        super.onPause()
    }

    private fun updateNfcMode(reading: Boolean) {
        val nfcAdapter = adapter ?: return
        if (!resumed) return

        if (reading) {
            runCatching { CardEmulation.getInstance(nfcAdapter).unsetPreferredService(this) }
            nfcAdapter.enableReaderMode(
                this,
                { tag -> runOnUiThread { NfcCoordinator.dispatch(tag) } },
                NfcAdapter.FLAG_READER_NFC_A or
                    NfcAdapter.FLAG_READER_NFC_B or
                    NfcAdapter.FLAG_READER_NFC_F or
                    NfcAdapter.FLAG_READER_NFC_V,
                null,
            )
        } else {
            nfcAdapter.disableReaderMode(this)
            if (HceConfig.enabled(this) && packageManager.hasSystemFeature("android.hardware.nfc.hce")) {
                runCatching {
                    CardEmulation.getInstance(nfcAdapter).setPreferredService(
                        this,
                        ComponentName(this, PopwamHostApduService::class.java),
                    )
                }
            }
        }
    }
}
