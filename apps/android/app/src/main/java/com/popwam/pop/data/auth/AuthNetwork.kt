package com.popwam.pop.data.auth

import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import okhttp3.HttpUrl.Companion.toHttpUrl

class AccessTokenInterceptor(
    private val store: SecureSessionStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val trusted = com.popwam.pop.BuildConfig.API_BASE_URL.toHttpUrl()
        if (request.url.scheme != trusted.scheme || request.url.host != trusted.host || request.url.port != trusted.port) return chain.proceed(request.newBuilder().removeHeader("Authorization").build())
        if (request.header("Authorization") != null) return chain.proceed(request)

        val token = store.snapshot()?.accessToken
        val authenticated = if (token == null) {
            request
        } else {
            request.newBuilder().header("Authorization", "Bearer $token").build()
        }
        return chain.proceed(authenticated)
    }
}

class RefreshAuthenticator(
    private val sessions: SessionRepository,
) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        val trusted = com.popwam.pop.BuildConfig.API_BASE_URL.toHttpUrl()
        val url = response.request.url
        if (url.scheme != trusted.scheme || url.host != trusted.host || url.port != trusted.port || response.request.header("Authorization") == null) return null
        if (responseCount(response) >= 2) return null
        val rejectedToken=response.request.header("Authorization")?.removePrefix("Bearer ")
        val token = runBlocking { sessions.refresh(rejectedToken) } ?: return null
        return response.request.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
    }

    private fun responseCount(response: Response): Int {
        var current: Response? = response
        var count = 1
        while (current?.priorResponse != null) {
            count++
            current = current.priorResponse
        }
        return count
    }
}
