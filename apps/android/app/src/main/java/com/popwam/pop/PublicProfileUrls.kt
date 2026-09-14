package com.popwam.pop

import android.net.Uri
import java.net.URI

/** Public links, previews and native sharing use the same build environment. */
object PublicProfileUrls {
    val publicHost:String get()=URI(BuildConfig.PUBLIC_BASE_URL).host
    val appHost:String get()=URI(BuildConfig.API_BASE_URL).host
    fun profile(slug:String)=BuildConfig.PUBLIC_BASE_URL.trimEnd('/')+"/"+Uri.encode(slug)
}
