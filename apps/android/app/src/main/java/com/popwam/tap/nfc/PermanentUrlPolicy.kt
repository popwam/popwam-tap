package com.popwam.tap.nfc

import java.net.URI

/** Allows only the permanent public card URL that may be written or exposed by HCE. */
object PermanentUrlPolicy {
    fun isValid(value: String): Boolean = runCatching {
        val uri = URI(value)
        val segments = uri.path.split('/').filter(String::isNotBlank)
        uri.scheme == "https" &&
            uri.host.equals("go.popwam.com", ignoreCase = true) &&
            uri.port == -1 &&
            uri.rawQuery == null &&
            uri.rawFragment == null &&
            uri.userInfo == null &&
            segments.size == 1 &&
            segments.single().matches(Regex("[A-Za-z0-9_-]{3,80}"))
    }.getOrDefault(false)
}
