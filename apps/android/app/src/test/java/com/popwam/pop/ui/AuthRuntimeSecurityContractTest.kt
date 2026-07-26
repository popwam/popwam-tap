package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthRuntimeSecurityContractTest {
    private fun source(path:String)=File(path).readText()

    @Test fun `startup never creates anonymous Firebase Authentication users`() {
        val android=source("src/main/java/com/popwam/pop/TapApplication.kt")+
            source("src/main/java/com/popwam/pop/data/auth/FirebasePhoneAuthGateway.kt")
        assertFalse(android.contains("signInAnonymously"))
        assertFalse(android.contains("registerGuestOnStartup"))
    }

    @Test fun `Firebase SDK starts verification and supports all official callbacks`() {
        val gateway=source("src/main/java/com/popwam/pop/data/auth/FirebasePhoneAuthGateway.kt")
        assertTrue(gateway.contains("PhoneAuthProvider.verifyPhoneNumber"))
        assertTrue(gateway.contains("onVerificationCompleted"))
        assertTrue(gateway.contains("onVerificationFailed"))
        assertTrue(gateway.contains("onCodeSent"))
        assertTrue(gateway.contains("onCodeAutoRetrievalTimeOut"))
        assertTrue(gateway.contains("setForceResendingToken"))
        assertFalse(gateway.contains("setAppVerificationDisabledForTesting"))
    }

    @Test fun `manual code UI renders six slots and secure window is global`() {
        val app=source("src/main/java/com/popwam/pop/ui/PopwamApp.kt")
        val activity=source("src/main/java/com/popwam/pop/MainActivity.kt")
        assertTrue(app.contains("repeat(6)"))
        assertTrue(app.contains("KeyboardType.NumberPassword"))
        assertTrue(app.contains("take(6)"))
        assertTrue(activity.contains("WindowManager.LayoutParams.FLAG_SECURE"))
    }

    @Test fun `root destinations consume system Back while child routes retain pop navigation`() {
        val navigation=source("src/main/java/com/popwam/pop/ui/FigmaNavigation.kt")
        assertTrue(navigation.contains("BackHandler(enabled=currentRoute in topRoutes)"))
        assertTrue(navigation.contains("nav.popBackStack()"))
    }
}
