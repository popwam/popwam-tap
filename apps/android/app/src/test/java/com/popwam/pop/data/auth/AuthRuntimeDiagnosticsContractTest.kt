package com.popwam.pop.data.auth

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthRuntimeDiagnosticsContractTest {
    @Test fun `diagnostics expose only fixed stages and safe outcome categories`() {
        val source=File("src/main/java/com/popwam/pop/data/auth/AuthRuntimeDiagnostics.kt").readText()
        AuthRuntimeStage.entries.forEach { assertTrue(source.contains(it.name)) }
        assertTrue(source.contains("BuildConfig.DEBUG"))
        assertFalse(source.contains("idToken:String"))
        assertFalse(source.contains("phoneE164:String"))
        assertFalse(source.contains("verificationId:String"))
        assertFalse(source.contains("refreshToken:String"))
        assertFalse(source.contains("code:String"))
    }
}
