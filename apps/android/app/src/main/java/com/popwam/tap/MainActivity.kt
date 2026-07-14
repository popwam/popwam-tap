package com.popwam.tap

import android.content.ComponentName
import android.nfc.NfcAdapter
import android.nfc.cardemulation.CardEmulation
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.popwam.tap.hce.HceConfig
import com.popwam.tap.hce.PopwamHostApduService
import com.popwam.tap.nfc.NfcCoordinator
import com.popwam.tap.nfc.NfcDeepLinkPolicy
import com.popwam.tap.ui.AuthFactory
import com.popwam.tap.ui.AuthViewModel
import com.popwam.tap.ui.MainFactory
import com.popwam.tap.ui.MainViewModel
import com.popwam.tap.ui.PopwamApp
import com.popwam.tap.ui.theme.PopwamTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val adapter by lazy { NfcAdapter.getDefaultAdapter(this) }
    private var resumed = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                NfcCoordinator.active.collect(::updateNfcMode)
            }
        }
        setContent {
            val app = application as TapApplication
            val auth: AuthViewModel = viewModel(factory = AuthFactory(app.container.sessions))
            val main: MainViewModel = viewModel(
                factory = MainFactory(app.container.repository, app.container.sessions.role),
            )
            PopwamTheme {
                PopwamApp(auth, main, NfcDeepLinkPolicy.route(intent?.dataString))
            }
        }
    }

    override fun onResume() {
        super.onResume()
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
