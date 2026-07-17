package com.popwam.pop.ui

object LocalePolicy {
    fun resolve(explicitLanguage: String?, deviceLanguage: String): String =
        when (explicitLanguage) { "ar" -> "ar"; "en" -> "en"; else -> if (deviceLanguage.startsWith("ar")) "ar" else "en" }

    fun isRtl(language: String) = language == "ar"
}
