package com.popwam.pop.data.auth

import android.util.Log
import com.popwam.pop.BuildConfig

enum class AuthRuntimeStage {
    OTP_PROVIDER_SUCCESS,
    PHONE_EXCHANGE_STARTED,
    PHONE_EXCHANGE_HTTP_STATUS,
    PHONE_EXCHANGE_PARSED,
    RESTRICTED_SESSION_STORED,
    NEXT_ACTION_RECEIVED,
    OTP_FLOW_NAVIGATED,
    START_PHONE_VERIFICATION,
    APP_VERIFICATION,
    CODE_SENT,
    CREDENTIAL_VERIFIED,
    ID_TOKEN_FETCH,
    POP_EXCHANGE_REQUEST,
    POP_EXCHANGE_RESPONSE,
    POP_SESSION_SAVE,
    AUTH_SETUP_RESOLVE,
    PASSKEY_UI_CLICK,
    PASSKEY_CAPABILITY_CHECK,
    PASSKEY_REGISTER_OPTIONS_REQUEST,
    PASSKEY_REGISTER_OPTIONS_RESPONSE,
    PASSKEY_CREATE_REQUEST,
    PASSKEY_CREATE_RESULT,
    PASSKEY_SKIP_UI_CLICK,
    PASSKEY_SKIP,
    PASSKEY_SKIP_ROUTE_RESOLVE,
    PASSKEY_OPTIONS_VALIDATION,
    PASSKEY_EFFECTIVE_OPTIONS,
    PASSKEY_CREATE_ENVIRONMENT,
    ONBOARDING_CURRENT_REQUEST,
    ONBOARDING_CURRENT_RESPONSE,
    ONBOARDING_START_REQUEST,
    ONBOARDING_START_RESPONSE,
    ONBOARDING_COMPLETE_REQUEST,
    ONBOARDING_COMPLETE_RESPONSE,
    PASSKEY_REGISTER_VERIFY_REQUEST,
    PASSKEY_REGISTER_VERIFY_RESPONSE,
    PASSKEY_SIGNIN_UI_CLICK,
    PASSKEY_AUTH_OPTIONS_REQUEST,
    PASSKEY_AUTH_OPTIONS_RESPONSE,
    PASSKEY_GET_CREDENTIAL_REQUEST,
    PASSKEY_GET_CREDENTIAL_RESULT,
    PASSKEY_AUTH_VERIFY_REQUEST,
    PASSKEY_AUTH_VERIFY_RESPONSE,
    PASSKEY_SESSION_SAVE,
    BIOMETRIC_UI_CLICK,
    BIOMETRIC_ELIGIBILITY,
    BIOMETRIC_PROMPT_SHOW,
    BIOMETRIC_PROMPT_RESULT,
    BIOMETRIC_LOCAL_CREDENTIAL_UNLOCK,
    BIOMETRIC_SESSION_RESOLVE,
}

/**
 * Debug-only stage diagnostics. Callers may provide only a fixed outcome
 * category; phone numbers, codes, challenge IDs, tokens and credentials are
 * deliberately not accepted by this API.
 */
object AuthRuntimeDiagnostics {
    fun mark(stage:AuthRuntimeStage,outcome:String="started") {
        if(!BuildConfig.DEBUG)return
        val safeOutcome=outcome.lowercase().filter { it.isLetterOrDigit()||it=='_' }.take(180).ifBlank { "unknown" }
        runCatching { Log.d("PopAuthRuntime","stage=${stage.name} outcome=$safeOutcome") }
    }
    fun failure(stage:AuthRuntimeStage,error:Throwable?=null,http:Int?=null,safeError:String?=null) {
        if(!BuildConfig.DEBUG)return
        val safeCode=(safeError ?: "").filter { it.isLetterOrDigit()||it=='_'||it=='-' }.take(48)
        val safeException=error?.javaClass?.simpleName.orEmpty().take(48)
        runCatching { Log.d("PopAuthRuntime","stage=${stage.name} result=failed http=${http ?: 0} code=$safeCode exception=$safeException") }
    }
    /** DOM errors are platform-defined categories. Never include their message or ceremony JSON. */
    fun domFailure(stage:AuthRuntimeStage,error:Throwable,domError:String,classification:String) {
        if(!BuildConfig.DEBUG)return
        val safeDomError=domError.filter { it.isLetterOrDigit()||it=='_' }.take(48).ifBlank { "unknown" }
        val safeClassification=classification.filter { it.isLetterOrDigit()||it=='_' }.take(48).ifBlank { "unknown" }
        val safeException=error.javaClass.simpleName.take(48)
        runCatching { Log.d("PopAuthRuntime","stage=${stage.name} result=failed http=0 code= exception=$safeException domError=$safeDomError classification=$safeClassification") }
    }
}
