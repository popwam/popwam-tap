package com.popwam.pop.ui.profile

import android.annotation.SuppressLint
import android.webkit.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import com.popwam.pop.TapApplication
import okhttp3.Request
import okhttp3.HttpUrl.Companion.toHttpUrl
import java.io.ByteArrayInputStream

/** No JS bridge and no session headers handed to WebView. Only the exact owner document
 * and that profile's private media are fetched by the authenticated client. Redirects
 * are refused; static resources use WebView without credentials. */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun DraftTemplatePreview(profileId:String,templateId:String,dismiss:()->Unit) {
    val context=LocalContext.current
    val locale=LocalConfiguration.current.locales[0].toLanguageTag()
    val application=context.applicationContext as TapApplication
    val accountId=application.container.sessionStore.snapshot()?.userId
    val base=BuildConfig.API_BASE_URL
    val url=remember(profileId,templateId){base.toHttpUrl().newBuilder().addPathSegment("mobile-preview").addPathSegment(profileId).addQueryParameter("templateId",templateId).build().toString()}
    val client=remember{application.container.apiClient.newBuilder().followRedirects(false).followSslRedirects(false).cache(null).build()}
    var loading by remember{mutableStateOf(true)}
    var failed by remember{mutableStateOf(false)}
    var webView by remember{mutableStateOf<WebView?>(null)}
    DisposableEffect(Unit){onDispose{webView?.apply{stopLoading();clearHistory();clearCache(true);removeAllViews();destroy()};webView=null}}
    Dialog(dismiss,DialogProperties(usePlatformDefaultWidth=false)) {
        Surface(Modifier.fillMaxSize()) { Column {
            Row(Modifier.fillMaxWidth().padding(12.dp),horizontalArrangement=Arrangement.SpaceBetween) {
                Text(stringResource(R.string.pass6_draft_preview),style=MaterialTheme.typography.titleMedium)
                TextButton(dismiss){Text(stringResource(R.string.pass6_close))}
            }
            Text(stringResource(R.string.pass6_draft_only),Modifier.padding(horizontal=16.dp))
            if(loading)LinearProgressIndicator(Modifier.fillMaxWidth())
            if(failed)Text(stringResource(R.string.pass6_preview_failed),Modifier.padding(16.dp),color=MaterialTheme.colorScheme.error)
            AndroidView(modifier=Modifier.fillMaxWidth().weight(1f),factory={ctx->WebView(ctx).apply {
                webView=this
                settings.javaScriptEnabled=true // Required by the trusted Next renderer's streamed HTML.
                settings.domStorageEnabled=false
                settings.allowFileAccess=false;settings.allowContentAccess=false
                settings.mixedContentMode=WebSettings.MIXED_CONTENT_NEVER_ALLOW
                settings.cacheMode=WebSettings.LOAD_NO_CACHE
                settings.javaScriptCanOpenWindowsAutomatically=false
                settings.setSupportMultipleWindows(false)
                CookieManager.getInstance().setAcceptThirdPartyCookies(this,false)
                webViewClient=object:WebViewClient() {
                    override fun shouldOverrideUrlLoading(view:WebView,request:WebResourceRequest)=true
                    override fun onReceivedSslError(view:WebView,handler:SslErrorHandler,error:android.net.http.SslError){handler.cancel();view.post{failed=true;loading=false}}
                    override fun onReceivedError(view:WebView,request:WebResourceRequest,error:WebResourceError){if(request.isForMainFrame)view.post{failed=true;loading=false}}
                    override fun onPageFinished(view:WebView,loadedUrl:String){loading=false}
                    override fun shouldInterceptRequest(view:WebView,request:WebResourceRequest):WebResourceResponse? {
                        fun blocked()=WebResourceResponse("text/plain","utf-8",403,"Blocked",emptyMap(),ByteArrayInputStream(ByteArray(0)))
                        val target=request.url.toString()
                        if(request.method!="GET" || application.container.sessionStore.snapshot()?.userId!=accountId)return blocked()
                        if(DraftPreviewPolicy.authenticatedPath(target,base,profileId)) {
                            return try {
                                client.newCall(Request.Builder().url(target).header("Cache-Control","no-store").header("Accept-Language",locale).build()).execute().use{response->
                                    if(!response.isSuccessful){view.post{failed=true;loading=false};return blocked()}
                                    val body=response.body ?: return blocked()
                                    val type=body.contentType()
                                    WebResourceResponse(type?.let{"${it.type}/${it.subtype}"} ?: "text/html","utf-8",response.code,response.message.ifBlank{"OK"},response.headers.toMap(),ByteArrayInputStream(body.bytes()))
                                }
                            }catch(_:Exception){view.post{failed=true;loading=false};blocked()}
                        }
                        // Never forward authorization to assets or external image origins.
                        if(request.isForMainFrame)return blocked()
                        if(DraftPreviewPolicy.sameOrigin(target,base) && request.url.path?.startsWith("/_next/static/")==true)return null
                        val path=request.url.path.orEmpty().lowercase()
                        if(request.url.scheme=="https" && listOf(".png",".jpg",".jpeg",".webp",".svg",".gif").any(path::endsWith))return null
                        return blocked()
                    }
                }
                if(DraftPreviewPolicy.sameOrigin(url,base))loadUrl(url) else {failed=true;loading=false}
            }})
        } }
    }
}
