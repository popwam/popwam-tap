package com.popwam.mobile.foundation.network

import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.darwin.Darwin

internal actual fun popPlatformEngine(): HttpClientEngine = Darwin.create()

