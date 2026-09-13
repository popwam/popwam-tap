/*
 * Copyright 2025 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package androidx.compose.material.icons.filled

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.materialIcon
import androidx.compose.material.icons.materialPath
import androidx.compose.ui.graphics.vector.ImageVector

public val Icons.Filled.LockClock: ImageVector
    get() {
        if (_lockClock != null) {
            return _lockClock!!
        }
        _lockClock = materialIcon(name = "Filled.LockClock") {
            materialPath {
                moveTo(14.5f, 14.2f)
                lineToRelative(2.9f, 1.7f)
                lineToRelative(-0.8f, 1.3f)
                lineTo(13.0f, 15.0f)
                verticalLineToRelative(-5.0f)
                horizontalLineToRelative(1.5f)
                verticalLineToRelative(4.2f)
                close()
                moveTo(22.0f, 14.0f)
                curveToRelative(0.0f, 4.41f, -3.59f, 8.0f, -8.0f, 8.0f)
                curveToRelative(-2.02f, 0.0f, -3.86f, -0.76f, -5.27f, -2.0f)
                lineTo(4.0f, 20.0f)
                curveToRelative(-1.15f, 0.0f, -2.0f, -0.85f, -2.0f, -2.0f)
                lineTo(2.0f, 9.0f)
                curveToRelative(0.0f, -1.12f, 0.89f, -1.96f, 2.0f, -2.0f)
                verticalLineToRelative(-0.5f)
                curveTo(4.0f, 4.01f, 6.01f, 2.0f, 8.5f, 2.0f)
                curveToRelative(2.34f, 0.0f, 4.24f, 1.79f, 4.46f, 4.08f)
                curveToRelative(0.34f, -0.05f, 0.69f, -0.08f, 1.04f, -0.08f)
                curveToRelative(4.41f, 0.0f, 8.0f, 3.59f, 8.0f, 8.0f)
                close()
                moveTo(6.0f, 7.0f)
                horizontalLineToRelative(5.0f)
                verticalLineToRelative(-0.74f)
                curveTo(10.88f, 4.99f, 9.8f, 4.0f, 8.5f, 4.0f)
                curveTo(7.12f, 4.0f, 6.0f, 5.12f, 6.0f, 6.5f)
                lineTo(6.0f, 7.0f)
                close()
                moveTo(20.0f, 14.0f)
                curveToRelative(0.0f, -3.31f, -2.69f, -6.0f, -6.0f, -6.0f)
                reflectiveCurveToRelative(-6.0f, 2.69f, -6.0f, 6.0f)
                reflectiveCurveToRelative(2.69f, 6.0f, 6.0f, 6.0f)
                reflectiveCurveToRelative(6.0f, -2.69f, 6.0f, -6.0f)
                close()
            }
        }
        return _lockClock!!
    }

private var _lockClock: ImageVector? = null
