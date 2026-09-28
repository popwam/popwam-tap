package com.popwam.pop.ui.components

import android.graphics.Color as AndroidColor
import android.provider.Settings
import android.view.ViewGroup
import android.webkit.WebView
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.popwam.pop.R

@Composable
fun PopOfficialLogo(
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
) {
    Image(
        painter = painterResource(R.drawable.pop_logo_official),
        contentDescription = contentDescription,
        modifier = modifier,
    )
}

@Composable
fun PopBrandedLoading(
    modifier: Modifier = Modifier,
    size: Dp = 220.dp,
    reducedMotion: Boolean = rememberPopReducedMotion(),
    animationReady: Boolean = true,
) {
    val description = "POP loading"

    Box(
        modifier = modifier
            .fillMaxSize()
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        when {
            reducedMotion -> {
                PopOfficialLogo(
                    modifier = Modifier.size(size),
                    contentDescription = null,
                )
            }

            animationReady -> {
                PopLoadingSvg(
                    modifier = Modifier.size(size),
                )
            }

            else -> Unit
        }
    }
}

/**
 * Renders the approved pop_loading.svg directly.
 *
 * The SVG owns the logo path, reveal mask, route and the 2-second SMIL animation.
 * Keeping the animation in the source asset avoids duplicating Figma/SVG geometry
 * inside Kotlin.
 */
@Composable
private fun PopLoadingSvg(
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current

    val svg = remember(context) {
        context.resources
            .openRawResource(R.raw.pop_loading)
            .bufferedReader()
            .use { it.readText() }
    }

    val webView = remember(context, svg) {
        WebView(context).apply {
            setBackgroundColor(AndroidColor.TRANSPARENT)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = WebView.OVER_SCROLL_NEVER

            settings.javaScriptEnabled = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false

            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )

            loadDataWithBaseURL(
                null,
                svg,
                "image/svg+xml",
                "UTF-8",
                null,
            )
        }
    }

    DisposableEffect(webView) {
        onDispose {
            webView.stopLoading()
            webView.destroy()
        }
    }

    AndroidView(
        modifier = modifier,
        factory = { webView },
    )
}

@Composable
private fun rememberPopReducedMotion(): Boolean {
    val context = LocalContext.current

    return remember(context) {
        runCatching {
            Settings.Global.getFloat(
                context.contentResolver,
                Settings.Global.ANIMATOR_DURATION_SCALE,
                1f,
            ) == 0f
        }.getOrDefault(false)
    }
}
