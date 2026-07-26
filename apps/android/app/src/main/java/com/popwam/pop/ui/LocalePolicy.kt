package com.popwam.pop.ui

object LocalePolicy {
    @Volatile private var defaultLocale="en"
    @Volatile private var available=listOf("en")
    @Volatile private var rtlLocales=emptySet<String>()

    fun configure(default:String,locales:List<String>,rtl:Set<String>) {
        val safe=locales.distinct().ifEmpty { listOf("en") }
        available=safe
        defaultLocale=default.takeIf { it in safe } ?: "en"
        rtlLocales=rtl.intersect(safe.toSet())
    }

    fun resolve(explicitLanguage: String?, @Suppress("UNUSED_PARAMETER") deviceLanguage: String): String =
        explicitLanguage?.takeIf { it in available } ?: defaultLocale

    fun availableLocales()=available.toList()
    fun isRtl(language: String) = language in rtlLocales
}
