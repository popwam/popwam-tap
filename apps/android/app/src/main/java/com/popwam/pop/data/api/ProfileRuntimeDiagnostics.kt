package com.popwam.pop.data.api

import android.util.Log
import com.google.gson.JsonParser
import com.popwam.pop.BuildConfig
import okhttp3.Interceptor

/** Debug-only, content-free diagnostics for the three profile runtime mutations. */
object ProfileRuntimeDiagnostics {
    private const val TAG = "PopProfileRuntime"

    enum class Operation(val marker:String,val endpoint:String,val method:String,val requestType:String) {
        CREATE("PROFILE_CREATE", "/api/profiles", "POST", "AdditionalProfileCreateRequest"),
        VISIBILITY("PROFILE_VISIBILITY", "/api/profiles/{id}/visibility", "PATCH", "VisibilityUpdateRequest"),
        PUBLISH("PROFILE_PUBLISH", "/api/profiles/{id}/publishing", "POST", "PublishingActionRequest"),
    }

    fun start(operation:Operation,profileId:String?=null) = mark(
        "${operation.marker}_START",
        "endpoint=${operation.endpoint} method=${operation.method} request_type=${operation.requestType}${shortProfile(profileId)}",
    )

    fun parsed(operation:Operation,ok:Boolean,error:String?=null,profileId:String?=null) = mark(
        "${operation.marker}_RESPONSE",
        "parse_ok=$ok safe_error=${safe(error)}${shortProfile(profileId)}",
    )

    fun parseError(operation:Operation,error:Throwable) = mark(
        "${operation.marker}_PARSE_ERROR",
        "class=${error::class.java.simpleName}",
    )

    fun success(operation:Operation,profileId:String?=null,revision:Int?=null) = mark(
        "${operation.marker}_SUCCESS",
        "revision=${revision ?: -1}${shortProfile(profileId)}",
    )

    fun failure(operation:Operation,status:Int?=null,error:String?=null,profileId:String?=null) = mark(
        "${operation.marker}_FAILURE",
        "http=${status ?: 0} safe_error=${safe(error)}${shortProfile(profileId)}",
    )

    fun readiness(ready:Boolean,issues:List<String>,revision:Int) = mark(
        "PROFILE_PUBLISH_READINESS",
        "ready=$ready revision=$revision issues=${issues.joinToString(",").ifBlank { "none" }}",
    )

    fun httpInterceptor() = Interceptor { chain ->
        val request=chain.request()
        val operation=operation(request.method,request.url.encodedPath)
        val response=chain.proceed(request)
        if(operation!=null && BuildConfig.DEBUG){
            val parsed=runCatching {
                val text=response.peekBody(64L*1024L).string()
                if(text.isBlank()) null else JsonParser.parseString(text).asJsonObject
            }.getOrNull()
            val error=parsed?.get("error")?.takeIf { !it.isJsonNull }?.asString
            mark("${operation.marker}_HTTP","endpoint=${operation.endpoint} method=${request.method} status=${response.code} safe_error=${safe(error)}")
            mark("${operation.marker}_RESPONSE","parse_ok=${parsed!=null} safe_error=${safe(error)}")
        }
        response
    }

    private fun operation(method:String,path:String)=when {
        method=="POST" && path=="/api/profiles" -> Operation.CREATE
        method=="PATCH" && path.matches(Regex("/api/profiles/[^/]+/visibility")) -> Operation.VISIBILITY
        method=="POST" && path.matches(Regex("/api/profiles/[^/]+/publishing")) -> Operation.PUBLISH
        else -> null
    }

    private fun mark(marker:String,details:String){if(BuildConfig.DEBUG)Log.d(TAG,"$marker $details")}
    private fun safe(value:String?)=value?.take(80)?.replace(Regex("[^A-Za-z0-9_.:-]"),"_") ?: "none"
    private fun shortProfile(value:String?)=value?.takeIf(String::isNotBlank)?.let{" profile=${it.take(6)}…"}.orEmpty()
}
