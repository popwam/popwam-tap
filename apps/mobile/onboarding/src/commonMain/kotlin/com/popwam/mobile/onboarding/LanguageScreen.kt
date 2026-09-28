package com.popwam.mobile.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.popwam.mobile.designsystem.LocalPopSemanticColors
import com.popwam.mobile.onboarding.generated.resources.Res
import com.popwam.mobile.onboarding.generated.resources.language_selected
import com.popwam.mobile.onboarding.generated.resources.language_title_ar
import com.popwam.mobile.onboarding.generated.resources.language_title_en
import com.popwam.mobile.onboarding.generated.resources.pop_logo_description
import org.jetbrains.compose.resources.stringResource

data class LanguageChoice(val tag:String,val label:String)
data class LanguageScreenCopy(
    val logoDescription:String,
    val titlePrimary:String,
    val titleSecondary:String,
    val selectedDescription:String,
)
@Composable
private fun defaultLanguageScreenCopy()=LanguageScreenCopy(
    logoDescription=stringResource(Res.string.pop_logo_description),
    titlePrimary=stringResource(Res.string.language_title_en),
    titleSecondary=stringResource(Res.string.language_title_ar),
    selectedDescription=stringResource(Res.string.language_selected,"%s"),
)

@Composable
fun LanguageScreen(
    availableLanguages: List<LanguageChoice>,
    selectedLanguageTag: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    copy:LanguageScreenCopy?=null,
) {
    val colors = LocalPopSemanticColors.current
    val resolvedCopy=copy ?: defaultLanguageScreenCopy()
    val supported=availableLanguages.distinctBy { it.tag }
    ReferenceFrame(modifier.background(colors.backgroundPrimary)) {
        PopMarkVector(
            color = colors.brandPrimary,
            contentDescription = resolvedCopy.logoDescription,
            modifier = Modifier.offset(102.dp, 248.dp).size(190.dp, 218.dp),
        )
        Column(
            modifier = Modifier.offset(27.dp, 474.dp).size(342.dp, 93.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(
                resolvedCopy.titlePrimary,
                color = colors.textPrimary,
                fontSize = 28.sp,
                lineHeight = 33.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                resolvedCopy.titleSecondary,
                color = colors.textPrimary,
                fontSize = 28.sp,
                lineHeight = 33.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Column(
            modifier = Modifier
                .offset(74.dp, 664.dp)
                .size(246.3158.dp, maxOf(0, 64 * supported.size + 22 * (supported.size - 1)).dp),
            verticalArrangement = Arrangement.spacedBy(22.dp),
        ) {
            supported.forEach { language ->
                val labelText=language.label
                val isSelected=selectedLanguageTag?.lowercase()==language.tag.lowercase()
                val selectedDescription=if(isSelected)resolvedCopy.selectedDescription.replace("%s",labelText) else null
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(246.3158.dp, 63.9474.dp)
                        .background(if (isSelected) colors.selectedBackground else colors.surfacePrimary, RoundedCornerShape(12.dp))
                        .border(
                            width = 1.dp,
                            color = if (isSelected) colors.selectedForeground else colors.borderStrong,
                            shape = RoundedCornerShape(12.dp),
                        )
                        .semantics {
                            role = Role.RadioButton
                            selected = isSelected
                            selectedDescription?.let { stateDescription = it }
                        }
                        .clickable { onSelect(language.tag) }
                        .padding(horizontal = 8.dp),
                ) {
                    Text(
                        labelText,
                        color = colors.selectedForeground,
                        fontSize = 24.sp,
                        lineHeight = 34.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}
