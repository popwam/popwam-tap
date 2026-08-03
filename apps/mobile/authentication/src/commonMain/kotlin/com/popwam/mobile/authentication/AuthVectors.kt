package com.popwam.mobile.authentication

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics

/** Exact POP mark path exported from the approved Figma logo node. */
@Composable
fun PopAuthenticationMark(color: Color, description: String, modifier: Modifier = Modifier) {
    val path = remember { PathParser().parsePathString(POP_MARK_PATH).toPath(Path()) }
    Canvas(modifier.semantics { contentDescription = description }) {
        val scale = minOf(size.width / 212.62f, size.height / 240.94f)
        withTransform({
            translate((size.width - 212.62f * scale) / 2f, (size.height - 240.94f * scale) / 2f)
            scale(scale, scale, Offset.Zero)
            translate(0.76f, 239.6f)
            scale(1f, -1f, Offset.Zero)
        }) { drawPath(path, color) }
    }
}

@Composable
internal fun AuthSecurityGlyph(kind: SecurityGlyph, color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val stroke = Stroke(width = size.minDimension * .065f)
        val c = Offset(size.width / 2f, size.height / 2f)
        when (kind) {
            SecurityGlyph.KEY -> {
                drawCircle(color, size.minDimension * .19f, Offset(size.width * .34f, c.y), style = stroke)
                drawLine(color, Offset(size.width * .49f, c.y), Offset(size.width * .82f, c.y), stroke.width)
                drawLine(color, Offset(size.width * .68f, c.y), Offset(size.width * .68f, size.height * .68f), stroke.width)
                drawLine(color, Offset(size.width * .79f, c.y), Offset(size.width * .79f, size.height * .62f), stroke.width)
            }
            SecurityGlyph.BIOMETRIC -> {
                drawArc(color, 205f, 130f, false, Offset(size.width * .18f, size.height * .14f), androidx.compose.ui.geometry.Size(size.width * .64f, size.height * .72f), style = stroke)
                drawArc(color, 210f, 120f, false, Offset(size.width * .30f, size.height * .24f), androidx.compose.ui.geometry.Size(size.width * .40f, size.height * .55f), style = stroke)
                drawArc(color, 225f, 90f, false, Offset(size.width * .40f, size.height * .36f), androidx.compose.ui.geometry.Size(size.width * .20f, size.height * .34f), style = stroke)
            }
            SecurityGlyph.CHECK -> {
                drawCircle(color, size.minDimension * .42f, c, style = stroke)
                drawLine(color, Offset(size.width * .28f, size.height * .52f), Offset(size.width * .44f, size.height * .68f), stroke.width)
                drawLine(color, Offset(size.width * .44f, size.height * .68f), Offset(size.width * .74f, size.height * .34f), stroke.width)
            }
            SecurityGlyph.BACK -> {
                drawLine(color, Offset(size.width * .66f, size.height * .20f), Offset(size.width * .34f, size.height * .50f), stroke.width)
                drawLine(color, Offset(size.width * .34f, size.height * .50f), Offset(size.width * .66f, size.height * .80f), stroke.width)
            }
        }
    }
}

internal enum class SecurityGlyph { KEY, BIOMETRIC, CHECK, BACK }

private const val POP_MARK_PATH = "M110.63 237.54C77.97 234.17 49.8 212.82 37.87 182.39C34.98 175.06 0.46 37.73 0.07 31.92C-0.76 20.73 5.99 8.96 16.26 3.73C21.1 1.29 22.66 0.8 27.26 0.22C39.58 -1.35 52.73 5.74 58.26 16.97C60.02 20.59 60.27 21.47 67.06 49.02C70.49 62.94 73.66 73.98 74.45 74.86C74.54 74.96 75.33 74.52 76.11 73.98C80.61 70.76 92.98 66.12 101.39 64.41C121.98 60.21 140.56 62.65 158.8 71.83C169.61 77.26 180.37 85.81 187.5 94.7C206.18 117.85 211.86 148.83 202.71 177.5C196.45 197.09 184.42 212.82 167.11 224.06C150.68 234.66 130.19 239.6 110.63 237.54ZM129.46 216.34C136.55 215.27 142.27 213.46 149.26 209.99C159.14 205.15 166.33 199.15 172.83 190.45C176.6 185.47 180.85 177.41 182.76 171.64C184.96 165.09 185.74 160.36 186.04 152.34C186.28 145.6 186.14 143.75 185.26 139.01C182.57 125.04 176.84 113.7 167.5 103.98C159.63 95.72 150.49 89.86 140.22 86.44C125.94 81.7 110.05 82.09 96.21 87.56C90.39 89.86 84.03 93.23 83.69 94.21C83.15 95.63 90.83 107.2 98.21 116.05C104.37 123.42 124.18 143.01 124.77 142.28C124.81 142.18 124.18 138.47 123.25 134.02C121.24 124.16 121.24 120.93 123.3 117.95C124.23 116.68 125.6 115.51 127.36 114.68C133.81 111.5 141.15 115.26 142.66 122.45C142.96 123.86 145.3 135.54 147.85 148.44C153.08 174.52 153.27 176.72 150.98 180.14C147.94 184.54 144.28 185.61 136.4 184.29C115.87 180.87 91.22 176.38 89.51 175.74C85.84 174.38 83 170.03 83 165.73C83 163.34 85.06 159.28 87.01 157.82C90.19 155.37 92.15 155.23 100.36 156.69C104.42 157.42 108.33 158.11 109.07 158.26C110.14 158.5 107.65 155.71 97.58 145.65C77.53 125.72 68.38 113.31 59.73 94.36C53.96 81.75 52.44 76.96 45.6 49.51C42.76 38.08 40.17 28.11 39.87 27.28C39.19 25.47 36.79 22.79 34.98 21.86C33.03 20.83 28.58 20.98 26.28 22.15C22.86 23.91 20.46 28.55 21.15 32.07C22.47 38.61 55.82 170.66 56.79 173.25C63 189.62 75.57 203.35 91.02 210.67C96.06 213.07 103.49 215.46 108.63 216.29C113.96 217.22 123.74 217.22 129.46 216.34Z"
