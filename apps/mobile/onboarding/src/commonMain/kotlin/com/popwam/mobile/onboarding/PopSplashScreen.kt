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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.popwam.mobile.designsystem.PopIdentityStyle
import com.popwam.mobile.designsystem.popSemanticColors
import com.popwam.mobile.onboarding.generated.resources.Res
import com.popwam.mobile.onboarding.generated.resources.pop_logo_description
import com.popwam.mobile.onboarding.generated.resources.splash_go_ahead
import org.jetbrains.compose.resources.stringResource

@Composable
fun PopSplashScreen(
    stage: SplashStage,
    onGoAhead: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = popSemanticColors(PopIdentityStyle.MINT, dark = false)
    ReferenceFrame(modifier.background(colors.backgroundPrimary)) {
        Canvas(Modifier.fillMaxSize()) {
            drawSplashCircle(stage, colors.brandPrimary, PopIdentityStyle.MINT.soft)
        }
        val logoBounds = when (stage) {
            SplashStage.ONE, SplashStage.TWO -> SplashLogoBounds(93, 307, 207, 238)
            SplashStage.THREE -> SplashLogoBounds(93, 301, 207, 238)
            SplashStage.FOUR -> SplashLogoBounds(92, 327, 207, 238)
            SplashStage.FIVE -> SplashLogoBounds(93, 188, 207, 238)
        }
        PopMarkVector(
            color = if (stage >= SplashStage.THREE) colors.textInverse else colors.brandPrimary,
            contentDescription = stringResource(Res.string.pop_logo_description),
            modifier = Modifier
                .offset(logoBounds.x.dp, logoBounds.y.dp)
                .size(logoBounds.width.dp, logoBounds.height.dp),
        )
        if (stage == SplashStage.FIVE) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .offset(41.dp, 712.dp)
                    .size(312.dp, 81.dp)
                    .background(colors.brandPrimary, RoundedCornerShape(12.dp))
                    .semantics { role = Role.Button }
                    .clickable(onClick = onGoAhead),
            ) {
                Text(
                    text = stringResource(Res.string.splash_go_ahead),
                    color = colors.textInverse,
                    fontSize = 35.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

private fun DrawScope.drawSplashCircle(stage: SplashStage, brand: androidx.compose.ui.graphics.Color, soft: androidx.compose.ui.graphics.Color) {
    when (stage) {
        SplashStage.ONE -> drawCircle(soft, radius = 50.dp.toPx(), center = androidx.compose.ui.geometry.Offset(196.dp.toPx(), (-26).dp.toPx()))
        SplashStage.TWO -> drawCircle(brand, radius = 50.dp.toPx(), center = androidx.compose.ui.geometry.Offset(196.dp.toPx(), 426.dp.toPx()))
        SplashStage.THREE -> drawCircle(brand, radius = 127.dp.toPx(), center = androidx.compose.ui.geometry.Offset(196.dp.toPx(), 420.dp.toPx()))
        SplashStage.FOUR -> drawCircle(brand, radius = 487.dp.toPx(), center = androidx.compose.ui.geometry.Offset(196.dp.toPx(), 420.dp.toPx()))
        SplashStage.FIVE -> drawOval(
            brand,
            topLeft = androidx.compose.ui.geometry.Offset((-291).dp.toPx(), (-67).dp.toPx()),
            size = androidx.compose.ui.geometry.Size(974.dp.toPx(), 722.dp.toPx()),
        )
    }
}

private data class SplashLogoBounds(val x: Int, val y: Int, val width: Int, val height: Int)
