package com.popwam.pop.data.auth

import android.util.Log
import com.popwam.pop.BuildConfig

enum class AuthRuntimeStage {
    START_PHONE_VERIFICATION,
    APP_VERIFICATION,
    CODE_SENT,
    CREDENTIAL_VERIFIED,
    FIREBASE_SIGN_IN,
    ID_TOKEN_FETCH,
    POP_EXCHANGE_REQUEST,
    POP_EXCHANGE_RESPONSE,
    POP_SESSION_SAVE,
    AUTH_SETUP_RESOLVE,
}

/**
 * Debug-only stage diagnostics. Callers may provide only a fixed outcome
 * category; phone numbers, codes, challenge IDs, tokens and credentials are
 * deliberately not accepted by this API.
 */
object AuthRuntimeDiagnostics {
    fun mark(stage:AuthRuntimeStage,outcome:String="started") {
        if(!BuildConfig.DEBUG)return
        val safeOutcome=outcome.lowercase().filter { it.isLetterOrDigit()||it=='_' }.take(32).ifBlank { "unknown" }
        runCatching { Log.d("PopAuthRuntime","stage=${stage.name} outcome=$safeOutcome") }
    }
}
