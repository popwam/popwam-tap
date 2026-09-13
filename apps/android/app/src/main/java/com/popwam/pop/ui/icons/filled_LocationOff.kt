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

public val Icons.Filled.LocationOff: ImageVector
    get() {
        if (_locationOff != null) {
            return _locationOff!!
        }
        _locationOff = materialIcon(name = "Filled.LocationOff") {
            materialPath {
                moveTo(12.0f, 6.5f)
                curveToRelative(1.38f, 0.0f, 2.5f, 1.12f, 2.5f, 2.5f)
                curveToRelative(0.0f, 0.74f, -0.33f, 1.39f, -0.83f, 1.85f)
                lineToRelative(3.63f, 3.63f)
                curveToRelative(0.98f, -1.86f, 1.7f, -3.8f, 1.7f, -5.48f)
                curveToRelative(0.0f, -3.87f, -3.13f, -7.0f, -7.0f, -7.0f)
                curveToRelative(-1.98f, 0.0f, -3.76f, 0.83f, -5.04f, 2.15f)
                lineToRelative(3.19f, 3.19f)
                curveToRelative(0.46f, -0.52f, 1.11f, -0.84f, 1.85f, -0.84f)
                close()
                moveTo(16.37f, 16.1f)
                lineToRelative(-4.63f, -4.63f)
                lineToRelative(-0.11f, -0.11f)
                lineTo(3.27f, 3.0f)
                lineTo(2.0f, 4.27f)
                lineToRelative(3.18f, 3.18f)
                curveTo(5.07f, 7.95f, 5.0f, 8.47f, 5.0f, 9.0f)
                curveToRelative(0.0f, 5.25f, 7.0f, 13.0f, 7.0f, 13.0f)
                reflectiveCurveToRelative(1.67f, -1.85f, 3.38f, -4.35f)
                lineTo(18.73f, 21.0f)
                lineTo(20.0f, 19.73f)
                lineToRelative(-3.63f, -3.63f)
                close()
            }
        }
        return _locationOff!!
    }

private var _locationOff: ImageVector? = null
