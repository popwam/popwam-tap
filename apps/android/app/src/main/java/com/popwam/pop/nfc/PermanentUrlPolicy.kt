package com.popwam.pop.nfc

import java.net.URI

/** Allows only approved public POP share URLs. No query, fragment, token or
 * activation secret can be written to a physical tag or exposed by HCE. */
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
            when {
                segments.size == 1 -> segments.single().matches(Regex("[A-Za-z0-9_-]{3,80}"))
                segments.size == 2 && segments.first() in setOf("p","s") -> segments[1].matches(Regex("[A-Za-z0-9_-]{3,120}"))
                segments.size == 3 && segments.first() == "p" && segments.last() == "contact.vcf" -> segments[1].matches(Regex("[A-Za-z0-9_-]{3,120}"))
                else -> false
            }
    }.getOrDefault(false)
}
