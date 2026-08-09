package com.popwam.mobile.onboarding

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.popwam.mobile.designsystem.LocalPopSemanticColors
import com.popwam.mobile.onboarding.generated.resources.Res
import com.popwam.mobile.onboarding.generated.resources.pop_logo_description
import com.popwam.mobile.onboarding.generated.resources.splash_go_ahead
import org.jetbrains.compose.resources.stringResource

@Composable
fun PopSplashScreen(
    progress: Float,
    showGoAhead: Boolean,
    onGoAhead: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalPopSemanticColors.current
    val frame = splashFrame(progress)
    ReferenceFrame(modifier.background(colors.backgroundPrimary)) {
        Canvas(Modifier.fillMaxSize()) {
            drawSplashShape(frame, colors.brandPrimary, colors.logoPrimary.copy(alpha = .14f))
        }
        PopMarkVector(
            color = lerp(colors.logoPrimary, colors.logoOnPrimary, frame.logoOnPrimaryAlpha),
            contentDescription = stringResource(Res.string.pop_logo_description),
            modifier = Modifier
                .offset(frame.logoX.dp, frame.logoY.dp)
                .size(119.dp, 135.dp)
                .graphicsLayer(alpha = frame.logoAlpha),
        )
        if (showGoAhead) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .offset(41.dp, 712.dp)
                    .size(312.dp, 81.dp)
                    .background(colors.primaryAction, RoundedCornerShape(12.dp))
                    .semantics { role = Role.Button }
                    .clickable(onClick = onGoAhead),
            ) {
                Text(
                    text = stringResource(Res.string.splash_go_ahead),
                    color = colors.onPrimaryAction,
                    fontSize = 35.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

internal data class SplashFrame(
    val circleCenterY: Float,
    val circleRadius: Float,
    val logoX: Float,
    val logoY: Float,
    val logoAlpha: Float,
    val logoOnPrimaryAlpha: Float,
    val shapeBrandAlpha: Float,
)

/** Pure keyframe interpolation makes the movement testable without Compose. */
internal fun splashFrame(progress: Float): SplashFrame {
    val p = FastOutSlowInEasing.transform(progress.coerceIn(0f, 1f))
    fun between(start: Float, end: Float, from: Float, to: Float): Float =
        ((p - start) / (end - start)).coerceIn(0f, 1f).let { from + (to - from) * it }
    return when {
        p < .22f -> SplashFrame(between(0f, .22f, -26f, 426f), 50f, 137f, 358.5f, 1f, 0f, between(0f, .22f, 0f, 1f))
        p < .48f -> SplashFrame(between(.22f, .48f, 426f, 420f), between(.22f, .48f, 50f, 127f), 137f, 358.5f, 1f, 0f, 1f)
        p < .75f -> SplashFrame(between(.48f, .75f, 420f, 420f), between(.48f, .75f, 127f, 487f), 137f, between(.48f, .75f, 358.5f, 378.5f), 1f, between(.48f, .62f, 0f, 1f), 1f)
        else -> SplashFrame(420f, between(.75f, 1f, 487f, 487f), 137f, between(.75f, 1f, 378.5f, 239.5f), 1f, 1f, 1f)
    }
}

private fun DrawScope.drawSplashShape(frame: SplashFrame, brand: Color, soft: Color) {
    if (frame.circleRadius < 487f) {
        drawCircle(
            lerp(soft, brand, frame.shapeBrandAlpha),
            radius = frame.circleRadius.dp.toPx(),
            center = androidx.compose.ui.geometry.Offset(196.dp.toPx(), frame.circleCenterY.dp.toPx()),
        )
    } else {
        drawOval(
            brand,
            topLeft = androidx.compose.ui.geometry.Offset((-291).dp.toPx(), (-67).dp.toPx()),
            size = androidx.compose.ui.geometry.Size(974.dp.toPx(), 722.dp.toPx()),
        )
    }
}
