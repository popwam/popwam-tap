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

public val Icons.Filled.Factory: ImageVector
    get() {
        if (_factory != null) {
            return _factory!!
        }
        _factory = materialIcon(name = "Filled.Factory") {
            materialPath {
                moveTo(22.0f, 10.0f)
                verticalLineToRelative(12.0f)
                horizontalLineTo(2.0f)
                verticalLineTo(10.0f)
                lineToRelative(7.0f, -3.0f)
                verticalLineToRelative(2.0f)
                lineToRelative(5.0f, -2.0f)
                lineToRelative(0.0f, 0.0f)
                lineToRelative(0.0f, 3.0f)
                horizontalLineTo(22.0f)
                close()
                moveTo(17.2f, 8.5f)
                lineTo(18.0f, 2.0f)
                horizontalLineToRelative(3.0f)
                lineToRelative(0.8f, 6.5f)
                horizontalLineTo(17.2f)
                close()
                moveTo(11.0f, 18.0f)
                horizontalLineToRelative(2.0f)
                verticalLineToRelative(-4.0f)
                horizontalLineToRelative(-2.0f)
                verticalLineTo(18.0f)
                close()
                moveTo(7.0f, 18.0f)
                horizontalLineToRelative(2.0f)
                verticalLineToRelative(-4.0f)
                horizontalLineTo(7.0f)
                verticalLineTo(18.0f)
                close()
                moveTo(17.0f, 14.0f)
                horizontalLineToRelative(-2.0f)
                verticalLineToRelative(4.0f)
                horizontalLineToRelative(2.0f)
                verticalLineTo(14.0f)
                close()
            }
        }
        return _factory!!
    }

private var _factory: ImageVector? = null
