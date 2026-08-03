package com.popwam.mobile.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.popwam.mobile.designsystem.LocalPopSemanticColors
import com.popwam.mobile.onboarding.generated.resources.Res
import com.popwam.mobile.onboarding.generated.resources.language_arabic
import com.popwam.mobile.onboarding.generated.resources.language_english
import com.popwam.mobile.onboarding.generated.resources.language_french
import com.popwam.mobile.onboarding.generated.resources.language_selected
import com.popwam.mobile.onboarding.generated.resources.language_title_ar
import com.popwam.mobile.onboarding.generated.resources.language_title_en
import com.popwam.mobile.onboarding.generated.resources.pop_logo_description
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

@Composable
fun LanguageScreen(
    availableLanguageTags: List<String>,
    selectedLanguageTag: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalPopSemanticColors.current
    val supported = listOf("en", "ar", "fr").filter { it in availableLanguageTags }
        .ifEmpty { listOf("en", "ar") }
    ReferenceFrame(modifier.background(colors.backgroundPrimary)) {
        PopMarkVector(
            color = colors.brandPrimary,
            contentDescription = stringResource(Res.string.pop_logo_description),
            modifier = Modifier.offset(102.dp, 95.dp).size(190.dp, 218.dp),
        )
        Column(
            modifier = Modifier.offset(27.dp, 363.dp).size(342.dp, 93.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(
                stringResource(Res.string.language_title_en),
                color = colors.textPrimary,
                fontSize = 28.sp,
                lineHeight = 33.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                stringResource(Res.string.language_title_ar),
                color = colors.textPrimary,
                fontSize = 28.sp,
                lineHeight = 33.sp,
                fontWeight = FontWeight.Bold,
            )
        }
        Column(
            modifier = Modifier
                .offset(74.dp, if (supported.size > 2) 516.dp else 580.dp)
                .size(246.3158.dp, (64 * supported.size + 22 * (supported.size - 1)).dp),
            verticalArrangement = Arrangement.spacedBy(22.dp),
        ) {
            supported.forEach { language ->
                val label = languageLabel(language)
                val labelText = stringResource(label)
                val isSelected = selectedLanguageTag?.substringBefore('-') == language
                val selectedDescription = if (isSelected) stringResource(Res.string.language_selected, labelText) else null
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(246.3158.dp, 63.9474.dp)
                        .background(colors.surfacePrimary, RoundedCornerShape(12.dp))
                        .semantics {
                            role = Role.RadioButton
                            selected = isSelected
                            selectedDescription?.let { stateDescription = it }
                        }
                        .clickable { onSelect(language) }
                        .padding(horizontal = 8.dp),
                ) {
                    Text(
                        labelText,
                        color = colors.brandPrimary,
                        fontSize = 24.sp,
                        lineHeight = 34.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

private fun languageLabel(language: String): StringResource = when (language) {
    "ar" -> Res.string.language_arabic
    "fr" -> Res.string.language_french
    else -> Res.string.language_english
}
