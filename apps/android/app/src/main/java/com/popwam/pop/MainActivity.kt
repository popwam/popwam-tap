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
import com.popwam.pop.ui.currentLocale
import com.popwam.pop.ui.auth.AuthenticationFlowFactory
import com.popwam.pop.ui.auth.AuthenticationFlowViewModel
import com.popwam.pop.ui.auth.AuthenticationHost
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
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
        appearanceStore = AppearanceStore(applicationContext)
        launchViewModel = ViewModelProvider(
            this,
            LaunchViewModelFactory(
                coordinator = LaunchCoordinator(app.container.launchState),
                migrator = app.container.launchMigrator,
                sessions = app.container.sessions,
                localization = app.container.localization,
                appearanceStore = appearanceStore,
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
            val appearance by appearanceStore.state.collectAsStateWithLifecycle()
            val localization by app.container.localization.state.collectAsStateWithLifecycle()
            LaunchExperience(launchViewModel,localization,popFontFamilies()) {
                val auth: AuthViewModel = viewModel(factory = AuthFactory(app.container.sessions, app.container.authSetup, app.container.analytics,app.container.firebasePhoneAuth))
                val authState by auth.state.collectAsStateWithLifecycle()
                val main: MainViewModel = viewModel(
                    factory = MainFactory(app.container.repository, app.container.sessions.role,app.container.analytics),
                )
                if(!authState.authenticated) {
                    Phase3OnboardingTheme(
                        ThemeMode.valueOf(appearance.theme),
                        IdentityPalette.valueOf(appearance.identity),
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
                } else PopwamTheme(appearance.theme,appearance.font,appearance.identity) {
                    PopwamApp(auth,main,NfcDeepLinkPolicy.route(intent?.dataString),appearanceStore,app.container.phoneCountries)
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
