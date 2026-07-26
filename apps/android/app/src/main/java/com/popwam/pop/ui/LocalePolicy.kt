package com.popwam.pop.ui

object LocalePolicy {
    fun resolve(explicitLanguage: String?, deviceLanguage: String): String =
        when (explicitLanguage) {
            "ar" -> "ar"
            "en" -> "en"
            "fr" -> "fr"
            else -> when {
                deviceLanguage.startsWith("ar") -> "ar"
                deviceLanguage.startsWith("fr") -> "fr"
                else -> "en"
            }
        }

    fun isRtl(language: String) = language == "ar"
}
