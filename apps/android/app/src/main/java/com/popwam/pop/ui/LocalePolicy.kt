package com.popwam.pop.ui

data class LocaleDescriptor(
    val code:String,
    val name:String,
    val nativeName:String,
    val rtl:Boolean,
    val revision:Int=0,
)

object LocalePolicy {
    private const val ENGLISH_FALLBACK="en"
    @Volatile private var defaultLocale=ENGLISH_FALLBACK
    @Volatile private var available=emptyList<LocaleDescriptor>()
    @Volatile private var cached=emptyMap<String,LocaleDescriptor>()

    fun configure(
        default:String,
        selectable:List<LocaleDescriptor>,
        cachedLocales:List<LocaleDescriptor> = selectable,
    ) {
        available=selectable.distinctBy { it.code }
        cached=(cachedLocales+available).distinctBy { it.code }.associateBy { it.code }
        defaultLocale=default.takeIf { it in cached || it==ENGLISH_FALLBACK } ?: ENGLISH_FALLBACK
    }

    fun configure(default:String,locales:List<String>,rtl:Set<String>) = configure(
        default,
        locales.distinct().map { LocaleDescriptor(it,it,it,it in rtl) },
    )

    fun resolve(explicitLanguage:String?,@Suppress("UNUSED_PARAMETER") deviceLanguage:String):String =
        explicitLanguage?.takeIf(::canRender) ?: defaultLocale.takeIf(::canRender) ?: ENGLISH_FALLBACK

    fun availableLocales()=available.map { it.code }
    fun availableLocaleMetadata()=available.toList()
    fun canRender(language:String)=language==ENGLISH_FALLBACK || language in cached
    fun isRtl(language:String)=cached[language]?.rtl==true
}
