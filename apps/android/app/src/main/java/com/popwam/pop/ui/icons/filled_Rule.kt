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
import kotlin.Deprecated

@Deprecated(
    "Use the AutoMirrored version at Icons.AutoMirrored.Filled.Rule",
    ReplaceWith( "Icons.AutoMirrored.Filled.Rule",
            "androidx.compose.material.icons.automirrored.filled.Rule"),
)
public val Icons.Filled.Rule: ImageVector
    get() {
        if (_rule != null) {
            return _rule!!
        }
        _rule = materialIcon(name = "Filled.Rule") {
            materialPath {
                moveTo(16.54f, 11.0f)
                lineTo(13.0f, 7.46f)
                lineToRelative(1.41f, -1.41f)
                lineToRelative(2.12f, 2.12f)
                lineToRelative(4.24f, -4.24f)
                lineToRelative(1.41f, 1.41f)
                lineTo(16.54f, 11.0f)
                close()
                moveTo(11.0f, 7.0f)
                horizontalLineTo(2.0f)
                verticalLineToRelative(2.0f)
                horizontalLineToRelative(9.0f)
                verticalLineTo(7.0f)
                close()
                moveTo(21.0f, 13.41f)
                lineTo(19.59f, 12.0f)
                lineTo(17.0f, 14.59f)
                lineTo(14.41f, 12.0f)
                lineTo(13.0f, 13.41f)
                lineTo(15.59f, 16.0f)
                lineTo(13.0f, 18.59f)
                lineTo(14.41f, 20.0f)
                lineTo(17.0f, 17.41f)
                lineTo(19.59f, 20.0f)
                lineTo(21.0f, 18.59f)
                lineTo(18.41f, 16.0f)
                lineTo(21.0f, 13.41f)
                close()
                moveTo(11.0f, 15.0f)
                horizontalLineTo(2.0f)
                verticalLineToRelative(2.0f)
                horizontalLineToRelative(9.0f)
                verticalLineTo(15.0f)
                close()
            }
        }
        return _rule!!
    }

private var _rule: ImageVector? = null
