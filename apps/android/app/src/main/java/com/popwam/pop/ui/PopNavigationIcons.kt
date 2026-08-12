package com.popwam.pop.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

/** POP navigation glyphs traced as a coherent rounded outline set. */
object PopNavigationIcons {
    val Home: ImageVector by lazy {
        ImageVector.Builder("PopHome", 24.dp, 24.dp, 24f, 24f).apply {
            path(
                fill = null,
                stroke = SolidColor(Color.Black),
                strokeLineWidth = 1.8f,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round,
            ) {
                moveTo(3.5f, 10.3f); lineTo(12f, 3.4f); lineTo(20.5f, 10.3f)
                moveTo(5.7f, 8.8f); lineTo(5.7f, 19.7f); lineTo(10f, 19.7f); lineTo(10f, 14.2f); lineTo(14f, 14.2f); lineTo(14f, 19.7f); lineTo(18.3f, 19.7f); lineTo(18.3f, 8.8f)
            }
        }.build()
    }

    val Profile: ImageVector by lazy {
        ImageVector.Builder("PopProfile", 24.dp, 24.dp, 24f, 24f).apply {
            path(
                fill = null,
                stroke = SolidColor(Color.Black),
                strokeLineWidth = 1.8f,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round,
            ) {
                moveTo(12f, 11f)
                curveTo(14.2f, 11f, 16f, 9.2f, 16f, 7f)
                curveTo(16f, 4.8f, 14.2f, 3f, 12f, 3f)
                curveTo(9.8f, 3f, 8f, 4.8f, 8f, 7f)
                curveTo(8f, 9.2f, 9.8f, 11f, 12f, 11f)
                moveTo(4.5f, 20.5f)
                curveTo(4.8f, 15.9f, 7.5f, 13.5f, 12f, 13.5f)
                curveTo(16.5f, 13.5f, 19.2f, 15.9f, 19.5f, 20.5f)
            }
        }.build()
    }

    val Menu: ImageVector by lazy {
        ImageVector.Builder("PopMenu", 24.dp, 24.dp, 24f, 24f).apply {
            path(fill = SolidColor(Color.Black)) {
                moveTo(4f, 4f); lineTo(10f, 4f); lineTo(10f, 10f); lineTo(4f, 10f); close()
                moveTo(14f, 4f); lineTo(20f, 4f); lineTo(20f, 10f); lineTo(14f, 10f); close()
                moveTo(4f, 14f); lineTo(10f, 14f); lineTo(10f, 20f); lineTo(4f, 20f); close()
                moveTo(14f, 14f); lineTo(20f, 14f); lineTo(20f, 20f); lineTo(14f, 20f); close()
            }
        }.build()
    }
}
