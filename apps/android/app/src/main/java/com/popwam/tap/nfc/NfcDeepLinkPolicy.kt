package com.popwam.tap.nfc

import java.net.URI

object NfcDeepLinkPolicy {
    fun route(value: String?): String {
        val uri = runCatching { URI(value ?: "") }.getOrNull() ?: return "home"
        val segments = uri.path.split('/').filter(String::isNotBlank)
        return when {
            uri.scheme != "popwamtap" -> "home"
            uri.host == "write-tag" && segments.size == 1 -> "programming"
            uri.host == "test-tag" && segments.size == 1 -> "nfc"
            else -> "home"
        }
    }
}
