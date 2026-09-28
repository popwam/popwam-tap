package com.popwam.pop.ui.auth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import com.popwam.pop.data.localization.popStringResource
import androidx.fragment.app.FragmentActivity
import com.popwam.pop.R
import com.popwam.pop.TapApplication
import com.popwam.pop.data.auth.BiometricCoordinator
import kotlinx.coroutines.launch

@Composable fun BiometricUnlockScreen(onUnlocked:()->Unit) {
    val context=LocalContext.current
    val container=(context.applicationContext as TapApplication).container
    val coordinator=remember{BiometricCoordinator(context as FragmentActivity,container.sessionStore)}
    val scope=rememberCoroutineScope()
    var busy by remember{mutableStateOf(false)}
    var failed by remember{mutableStateOf(false)}
    AuthStepLayout(popStringResource(R.string.p7_unlock),popStringResource(R.string.p7_biometric_help),Icons.Default.Fingerprint) {
        AuthPrimary(popStringResource(R.string.p7_unlock),!busy&&coordinator.available()){
            busy=true
            scope.launch{try{val result=com.popwam.pop.data.auth.runQuickUnlock(coordinator.available()){coordinator.authenticate(false)};if(result==com.popwam.pop.data.auth.QuickUnlockResult.SUCCESS){container.sessions.validateStoredSession();onUnlocked();container.sessionStore.finishUnlockGate()} else failed=true}finally{busy=false}}
        }
        if(failed||!coordinator.available())Text(popStringResource(R.string.p7_biometric_failed))
        TextButton({busy=true;scope.launch{container.sessions.logout();onUnlocked();busy=false}},enabled=!busy){Text(popStringResource(R.string.p7_other_login))}
    }
}
