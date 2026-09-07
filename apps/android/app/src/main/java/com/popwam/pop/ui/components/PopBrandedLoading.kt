package com.popwam.pop.ui.components

import android.graphics.PathMeasure
import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asAndroidPath
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.graphics.drawable.toBitmap
import com.popwam.pop.R
import kotlinx.coroutines.isActive

private const val POP_LOADING_DURATION_MILLIS = 2_000
private const val POP_LOADING_VIEWPORT = 1_024f
private const val POP_LOADING_STROKE_WIDTH = 72f
// Verbatim ORIGINAL_LOGO path from pop-logo-official.svg/pop-loading.svg.
private const val POP_OFFICIAL_LOGO_PATH =
    "M5195 7669 c-668 -69 -1244 -506 -1488 -1129 -59 -150 -765 -2961 -773 -3080 -17 -229 121 -470 331 -577 99 -50 131 -60 225 -72 252 -32 521 113 634 343 36 74 41 92 180 656 70 285 135 511 151 529 2 2 18 -7 34 -18 92 -66 345 -161 517 -196 421 -86 801 -36 1174 152 221 111 441 286 587 468 382 474 498 1108 311 1695 -128 401 -374 723 -728 953 -336 217 -755 318 -1155 276z m385 -434 c145 -22 262 -59 405 -130 202 -99 349 -222 482 -400 77 -102 164 -267 203 -385 45 -134 61 -231 67 -395 5 -138 2 -176 -16 -273 -55 -286 -172 -518 -363 -717 -161 -169 -348 -289 -558 -359 -292 -97 -617 -89 -900 23 -119 47 -249 116 -256 136 -11 29 146 266 297 447 126 151 531 552 543 537 1 -2 -12 -78 -31 -169 -41 -202 -41 -268 1 -329 19 -26 47 -50 83 -67 132 -65 282 12 313 159 6 29 54 268 106 532 107 534 111 579 64 649 -62 90 -137 112 -298 85 -420 -70 -924 -162 -959 -175 -75 -28 -133 -117 -133 -205 0 -49 42 -132 82 -162 65 -50 105 -53 273 -23 83 15 163 29 178 32 22 5 -29 -52 -235 -258 -410 -408 -597 -662 -774 -1050 -118 -258 -149 -356 -289 -918 -58 -234 -111 -438 -117 -455 -14 -37 -63 -92 -100 -111 -40 -21 -131 -18 -178 6 -70 36 -119 131 -105 203 27 134 709 2837 729 2890 127 335 384 616 700 766 103 49 255 98 360 115 109 19 309 19 426 1z"

// Verbatim CENTER_PATH_1_TO_14 from the supplied pop-loading.svg.
private const val POP_LOADING_CENTER_PATH =
    "M 467.00 577.00 L 489.00 586.00 L 529.00 593.00 L 558.00 592.00 L 586.00 586.00 L 619.00 571.00 L 637.00 558.00 L 661.00 534.00 L 676.00 511.00 L 688.00 481.00 L 693.00 451.00 L 693.00 420.00 L 687.00 386.00 L 674.00 356.00 L 659.00 334.00 L 638.00 313.00 L 611.00 295.00 L 567.00 280.00 L 527.00 278.00 L 497.00 282.00 L 476.00 289.00 L 443.00 308.00 L 419.00 330.00 L 408.00 344.00 L 391.00 374.00 L 384.00 396.00 L 318.00 658.00 L 316.00 684.00 L 319.00 698.00 L 325.00 708.00 L 340.00 717.00 L 361.00 719.00 L 377.00 715.00 L 387.00 707.00 L 396.00 688.00 L 427.00 574.00 L 441.00 566.00 L 449.00 530.00 L 485.00 482.00 L 569.00 399.00 L 553.00 415.00 L 537.00 397.00 L 486.00 403.00 L 537.00 397.00 L 553.00 413.00 L 569.00 434.00 L 563.00 489.00 L 569.00 434.00 L 553.00 414.00 L 574.00 395.00"

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
        modifier = modifier.fillMaxSize().semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        if (reducedMotion) {
            PopOfficialLogo(Modifier.size(size))
        } else {
            PopLoadingAnimation(
                modifier = Modifier.size(size),
                animationReady = animationReady,
            )
        }
    }
}

@Composable
private fun PopLoadingAnimation(modifier: Modifier, animationReady: Boolean) {
    val context = LocalContext.current
    val progress = remember { Animatable(0f) }
    val centerPath = remember {
        PathParser().parsePathString(POP_LOADING_CENTER_PATH).toPath(Path())
    }
    val logo = remember(context) {
        requireNotNull(AppCompatResources.getDrawable(context, R.drawable.pop_logo_official))
            .toBitmap(1024, 1024)
            .asImageBitmap()
    }
    val measure = remember(centerPath) {
        PathMeasure(centerPath.asAndroidPath(), false)
    }
    LaunchedEffect(animationReady) {
        progress.snapTo(0f)
        if (!animationReady) return@LaunchedEffect
        // Begin after the first app-owned frame so Android's system splash cannot
        // consume the supplied in-app draw animation while covering the window.
        withFrameNanos { }
        withFrameNanos { }
        while (isActive) {
            progress.snapTo(0f)
            progress.animateTo(
                targetValue = 1f,
                animationSpec = tween(
                    durationMillis = POP_LOADING_DURATION_MILLIS,
                    easing = LinearEasing,
                ),
            )
        }
    }
    Canvas(modifier) {
        drawContext.canvas.saveLayer(Rect(Offset.Zero, size), Paint())
        val revealedPath = Path()
        measure.getSegment(
            0f,
            measure.length * progress.value,
            revealedPath.asAndroidPath(),
            true,
        )
        val scale = minOf(size.width, size.height) / POP_LOADING_VIEWPORT
        withTransform({ scale(scale, scale, Offset.Zero) }) {
            drawPath(
                path = revealedPath,
                color = Color.White,
                style = Stroke(
                    width = POP_LOADING_STROKE_WIDTH,
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round,
                ),
            )
        }
        drawImage(
            image = logo,
            srcOffset = IntOffset.Zero,
            srcSize = IntSize(logo.width, logo.height),
            dstOffset = IntOffset.Zero,
            dstSize = IntSize(size.width.toInt(), size.height.toInt()),
            filterQuality = FilterQuality.High,
            blendMode = BlendMode.SrcIn,
        )
        drawContext.canvas.restore()
    }
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
