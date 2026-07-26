package com.popwam.pop.data.auth

import android.content.Context
import com.popwam.pop.data.api.PopwamApi
import com.popwam.pop.data.api.PushTokenRequest

/** Keeps FCM ownership tied to the existing POP mobile session, never to a Firebase UID. */
class FcmTokenBridge(context: Context, private val api: PopwamApi, private val sessions: SessionRepository) {
    private val preferences = context.getSharedPreferences("pop_push", Context.MODE_PRIVATE)

    fun remember(token: String) {
        if (token.isNotBlank()) preferences.edit().putString("pending_fcm_token", token).apply()
    }

    suspend fun uploadPendingIfAuthenticated() {
        if (!FcmTokenLifecycle.shouldUpload(sessions.authenticated, preferences.getString("pending_fcm_token", null))) return
        val token = preferences.getString("pending_fcm_token", null) ?: return
        runCatching { api.registerPushToken(PushTokenRequest(token)) }
        // Keep the token locally after success so logout can revoke it and a later login can re-register it.
    }

    suspend fun revokeBeforeLogout() {
        if (!FcmTokenLifecycle.shouldRevoke(sessions.authenticated, preferences.getString("pending_fcm_token", null))) return
        val token = preferences.getString("pending_fcm_token", null) ?: return
        runCatching { api.revokePushToken(PushTokenRequest(token)) }
    }
}

internal object FcmTokenLifecycle {
    fun shouldUpload(authenticated:Boolean,token:String?)=authenticated&&!token.isNullOrBlank()
    fun shouldRevoke(authenticated:Boolean,token:String?)=authenticated&&!token.isNullOrBlank()
}
