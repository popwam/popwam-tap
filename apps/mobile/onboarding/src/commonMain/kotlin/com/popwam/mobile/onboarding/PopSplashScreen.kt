package com.popwam.mobile.onboarding

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import com.popwam.mobile.designsystem.LocalPopSemanticColors
import com.popwam.mobile.onboarding.generated.resources.Res
import com.popwam.mobile.onboarding.generated.resources.pop_logo_description
import org.jetbrains.compose.resources.stringResource

/** The only in-app startup frame: the POP mark itself is the loading cue. */
@Composable
fun PopSplashScreen(
    progress: Float,
    reducedMotion: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = LocalPopSemanticColors.current
    val transition = rememberInfiniteTransition(label = "pop-loading-pulse")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 920),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pop-loading-pulse-phase",
    )
    val frame = loadingPulseFrame(if (progress >= 1f) 1f else phase, reducedMotion)
    Box(
        modifier = modifier.fillMaxSize().background(colors.backgroundPrimary),
        contentAlignment = Alignment.Center,
    ) {
        PopMarkVector(
            color = colors.logoPrimary,
            contentDescription = stringResource(Res.string.pop_logo_description),
            modifier = Modifier
                .size(width = 106.dp, height = 120.dp)
                .graphicsLayer {
                    scaleX = frame.scale
                    scaleY = frame.scale
                    alpha = frame.alpha
                },
        )
    }
}

internal data class LoadingPulseFrame(val scale: Float, val alpha: Float)

internal fun loadingPulseFrame(phase: Float, reducedMotion: Boolean): LoadingPulseFrame {
    if (reducedMotion) return LoadingPulseFrame(scale = 1f, alpha = 1f)
    val value = phase.coerceIn(0f, 1f)
    return LoadingPulseFrame(
        scale = 1f + (.035f * value),
        alpha = .86f + (.14f * value),
    )
}
