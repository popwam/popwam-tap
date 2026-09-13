package com.popwam.pop.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import com.popwam.pop.R
import com.popwam.pop.TapApplication
import com.popwam.pop.data.auth.BiometricCoordinator
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

/** Existing accounts can opt in here without restarting first-user onboarding. */
@Composable fun BiometricSetupCard() {
    val context = LocalContext.current
    val store = (context.applicationContext as TapApplication).container.sessionStore
    val coordinator = remember { (context as? FragmentActivity)?.let { BiometricCoordinator(it, store) } }
    val scope = rememberCoroutineScope()
    var enabled by remember { mutableStateOf(store.biometricEnabled) }
    var busy by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(Icons.Default.Fingerprint, null, Modifier.size(32.dp))
            Text(stringResource(R.string.p7_biometric_title), style = MaterialTheme.typography.titleLarge)
            Text(stringResource(R.string.p7_biometric_help))
            when {
                enabled -> Text(stringResource(R.string.p7_enabled))
                coordinator?.available() == true -> OutlinedButton(onClick = {
                    busy = true
                    scope.launch {
                        try {
                            coordinator.authenticate(true)
                            enabled = true
                            failed = false
                        } catch (error: Exception) {
                            if (error is CancellationException) throw error
                            failed = true
                        } finally { busy = false }
                    }
                }, enabled = !busy) { Text(stringResource(R.string.p7_enable)) }
                else -> Text(stringResource(R.string.p7_biometric_unavailable))
            }
            if (failed) Text(stringResource(R.string.p7_biometric_failed))
        }
    }
}
