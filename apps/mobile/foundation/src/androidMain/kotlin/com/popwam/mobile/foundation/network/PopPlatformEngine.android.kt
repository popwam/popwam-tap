package com.popwam.mobile.foundation.network

import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.okhttp.OkHttp

internal actual fun popPlatformEngine(): HttpClientEngine = OkHttp.create()

