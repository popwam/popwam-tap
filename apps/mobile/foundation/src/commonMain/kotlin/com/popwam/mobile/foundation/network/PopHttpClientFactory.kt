package com.popwam.mobile.foundation.network

import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.accept
import io.ktor.client.request.url
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

data class PopHttpClientConfiguration(
    val baseUrl: String,
    val requestTimeoutMillis: Long = 30_000,
    val connectTimeoutMillis: Long = 15_000,
) {
    init {
        require(baseUrl.startsWith("https://")) { "POP production clients require an HTTPS base URL" }
    }
}

/**
 * Foundation only. No endpoint group is owned by Ktor until its Retrofit owner is explicitly retired.
 */
object PopHttpClientFactory {
    fun create(configuration: PopHttpClientConfiguration): HttpClient = HttpClient(popPlatformEngine()) {
        expectSuccess = false
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                explicitNulls = false
            })
        }
        install(HttpTimeout) {
            requestTimeoutMillis = configuration.requestTimeoutMillis
            connectTimeoutMillis = configuration.connectTimeoutMillis
        }
        defaultRequest {
            url(configuration.baseUrl)
            contentType(ContentType.Application.Json)
            accept(ContentType.Application.Json)
        }
    }
}

internal expect fun popPlatformEngine(): HttpClientEngine
