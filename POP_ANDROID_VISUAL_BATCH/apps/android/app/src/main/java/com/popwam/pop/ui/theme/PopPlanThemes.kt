package com.popwam.pop.ui.theme

import androidx.compose.ui.text.font.FontWeight

enum class PopFontSize(val scale: Float) {
    SMALL(.92f),
    DEFAULT(1f),
    LARGE(1.12f),
}

enum class PopFontWeight(val minimumWeight: FontWeight?) {
    REGULAR(null),
    MEDIUM(FontWeight.Medium),
    SEMIBOLD(FontWeight.SemiBold),
}

data class PopFontPreference(
    val size: PopFontSize = PopFontSize.DEFAULT,
    val weight: PopFontWeight = PopFontWeight.REGULAR,
) {
    val encoded: String
        get() = if (weight == PopFontWeight.REGULAR) {
            size.name
        } else {
            "${size.name}_${weight.name}"
        }

    companion object {
        fun from(value: String?): PopFontPreference {
            val normalized = value.orEmpty().trim().uppercase()
            val size = when {
                "SMALL" in normalized -> PopFontSize.SMALL
                "LARGE" in normalized -> PopFontSize.LARGE
                else -> PopFontSize.DEFAULT
            }
            val weight = when {
                "SEMIBOLD" in normalized || "SEMI_BOLD" in normalized -> PopFontWeight.SEMIBOLD
                "MEDIUM" in normalized -> PopFontWeight.MEDIUM
                else -> PopFontWeight.REGULAR
            }
            return PopFontPreference(size, weight)
        }
    }
}
