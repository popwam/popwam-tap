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

public val Icons.Filled.Wallet: ImageVector
    get() {
        if (_wallet != null) {
            return _wallet!!
        }
        _wallet = materialIcon(name = "Filled.Wallet") {
            materialPath {
                moveTo(18.0f, 4.0f)
                horizontalLineTo(6.0f)
                curveTo(3.79f, 4.0f, 2.0f, 5.79f, 2.0f, 8.0f)
                verticalLineToRelative(8.0f)
                curveToRelative(0.0f, 2.21f, 1.79f, 4.0f, 4.0f, 4.0f)
                horizontalLineToRelative(12.0f)
                curveToRelative(2.21f, 0.0f, 4.0f, -1.79f, 4.0f, -4.0f)
                verticalLineTo(8.0f)
                curveTo(22.0f, 5.79f, 20.21f, 4.0f, 18.0f, 4.0f)
                close()
                moveTo(16.14f, 13.77f)
                curveToRelative(-0.24f, 0.2f, -0.57f, 0.28f, -0.88f, 0.2f)
                lineTo(4.15f, 11.25f)
                curveTo(4.45f, 10.52f, 5.16f, 10.0f, 6.0f, 10.0f)
                horizontalLineToRelative(12.0f)
                curveToRelative(0.67f, 0.0f, 1.26f, 0.34f, 1.63f, 0.84f)
                lineTo(16.14f, 13.77f)
                close()
                moveTo(6.0f, 6.0f)
                horizontalLineToRelative(12.0f)
                curveToRelative(1.1f, 0.0f, 2.0f, 0.9f, 2.0f, 2.0f)
                verticalLineToRelative(0.55f)
                curveTo(19.41f, 8.21f, 18.73f, 8.0f, 18.0f, 8.0f)
                horizontalLineTo(6.0f)
                curveTo(5.27f, 8.0f, 4.59f, 8.21f, 4.0f, 8.55f)
                verticalLineTo(8.0f)
                curveTo(4.0f, 6.9f, 4.9f, 6.0f, 6.0f, 6.0f)
                close()
            }
        }
        return _wallet!!
    }

private var _wallet: ImageVector? = null
