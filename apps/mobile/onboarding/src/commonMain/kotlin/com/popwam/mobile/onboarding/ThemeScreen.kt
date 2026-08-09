package com.popwam.mobile.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.popwam.mobile.designsystem.LocalPopSemanticColors
import com.popwam.mobile.designsystem.PopIdentityStyle
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.onboarding.generated.resources.Res
import com.popwam.mobile.onboarding.generated.resources.palette_coral
import com.popwam.mobile.onboarding.generated.resources.palette_graphite
import com.popwam.mobile.onboarding.generated.resources.palette_mint
import com.popwam.mobile.onboarding.generated.resources.palette_pulse
import com.popwam.mobile.onboarding.generated.resources.palette_selected
import com.popwam.mobile.onboarding.generated.resources.palette_solar
import com.popwam.mobile.onboarding.generated.resources.palette_violet
import com.popwam.mobile.onboarding.generated.resources.pop_logo_description
import com.popwam.mobile.onboarding.generated.resources.theme_continue
import com.popwam.mobile.onboarding.generated.resources.theme_dark
import com.popwam.mobile.onboarding.generated.resources.theme_light
import com.popwam.mobile.onboarding.generated.resources.theme_style
import com.popwam.mobile.onboarding.generated.resources.theme_subtitle
import com.popwam.mobile.onboarding.generated.resources.theme_system
import com.popwam.mobile.onboarding.generated.resources.theme_title
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun ThemeScreen(
    selectedMode: ThemeMode,
    selectedStyle: IdentityPalette,
    galleryVisible: Boolean,
    onSelectMode: (ThemeMode) -> Unit,
    onContinue: () -> Unit,
    onOpenGallery: () -> Unit,
    onSelectStyle: (IdentityPalette) -> Unit,
    onDismissGallery: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalPopSemanticColors.current
    ReferenceFrame(modifier.background(colors.backgroundPrimary)) {
        PopMarkVector(
            color = colors.brandPrimary,
            contentDescription = stringResource(Res.string.pop_logo_description),
            modifier = Modifier.offset(107.dp, 144.dp).size(180.dp, 218.dp),
        )
        Column(
            Modifier.offset(27.dp, 390.dp).size(342.dp, 72.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(stringResource(Res.string.theme_title), color = colors.textPrimary, fontSize = 28.sp, lineHeight = 33.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            Text(stringResource(Res.string.theme_subtitle), color = colors.textSecondary, fontSize = 15.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }
        Row(
            Modifier.offset(63.1306.dp, 516.dp).size(267.7388.dp, 63.9474.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            ThemeMode.entries.forEach { mode ->
                val choice = modeChoice(mode)
                val label = stringResource(choice.label)
                val active = selectedMode == mode
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(82.5796.dp, 63.9474.dp)
                        .background(if (active) colors.primaryAction else colors.surfacePrimary, RoundedCornerShape(12.dp))
                        .semantics {
                            role = Role.RadioButton
                            selected = active
                            contentDescription = label
                        }
                        .clickable { onSelectMode(mode) },
                ) {
                    ThemeModeVector(
                        mode = mode,
                        color = if (active) colors.onPrimaryAction else colors.textPrimary,
                        modifier = Modifier.size(48.dp),
                    )
                }
            }
        }
        Text(
            text = stringResource(Res.string.theme_style),
            color = colors.primaryAction,
            fontSize = 15.sp,
            lineHeight = 40.sp,
            fontWeight = FontWeight.SemiBold,
            textDecoration = TextDecoration.Underline,
            modifier = Modifier
                .offset(85.dp, 620.dp)
                .size(222.dp, 40.dp)
                .semantics { role = Role.Button }
                .clickable(onClick = onOpenGallery),
        )
        PrimaryAction(
            text = stringResource(Res.string.theme_continue),
            onClick = onContinue,
            modifier = Modifier.offset(74.dp, 744.dp).size(246.3158.dp, 63.9474.dp),
        )
    }
    if (galleryVisible) {
        ThemeGallery(
            selectedStyle = selectedStyle,
            onSelectStyle = onSelectStyle,
            onDismiss = onDismissGallery,
        )
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun ThemeGallery(
    selectedStyle: IdentityPalette,
    onSelectStyle: (IdentityPalette) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalPopSemanticColors.current
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.surfaceElevated,
        contentColor = colors.textPrimary,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().heightIn(max = 560.dp).verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            galleryOrder.forEach { style ->
                val palette = PopIdentityStyle.valueOf(style.name)
                val active = selectedStyle == style
                val label = stringResource(paletteLabel(style))
                val description = if (active) stringResource(Res.string.palette_selected, label) else label
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 56.dp)
                        .background(if (active) colors.selectedBackground else colors.surfaceElevated, RoundedCornerShape(14.dp))
                        .border(BorderStroke(1.dp, if (active) colors.selectedForeground else colors.borderDefault), RoundedCornerShape(14.dp))
                        .semantics {
                            role = Role.RadioButton
                            selected = active
                            contentDescription = description
                        }
                        .clickable { onSelectStyle(style) }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    PopMarkVector(
                        color = palette.primary,
                        contentDescription = null,
                        modifier = Modifier.size(36.dp, 42.dp),
                    )
                    Text(
                        label,
                        color = colors.textPrimary,
                        fontSize = 16.sp,
                        lineHeight = 21.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(start = 12.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun ThemeModeVector(mode: ThemeMode, color: Color, modifier: Modifier) {
    when (mode) {
        ThemeMode.SYSTEM -> ThemeSystemVector(color, modifier)
        ThemeMode.LIGHT -> ThemeLightVector(color, modifier)
        ThemeMode.DARK -> ThemeDarkVector(color, modifier)
    }
}

private data class ModeChoice(val label: StringResource)

private fun modeChoice(mode: ThemeMode): ModeChoice = when (mode) {
    ThemeMode.SYSTEM -> ModeChoice(Res.string.theme_system)
    ThemeMode.LIGHT -> ModeChoice(Res.string.theme_light)
    ThemeMode.DARK -> ModeChoice(Res.string.theme_dark)
}

private val galleryOrder = listOf(
    IdentityPalette.MINT,
    IdentityPalette.PULSE,
    IdentityPalette.VIOLET,
    IdentityPalette.CORAL,
    IdentityPalette.SOLAR,
    IdentityPalette.GRAPHITE,
)

private fun paletteLabel(style: IdentityPalette): StringResource = when (style) {
    IdentityPalette.MINT -> Res.string.palette_mint
    IdentityPalette.PULSE -> Res.string.palette_pulse
    IdentityPalette.VIOLET -> Res.string.palette_violet
    IdentityPalette.CORAL -> Res.string.palette_coral
    IdentityPalette.SOLAR -> Res.string.palette_solar
    IdentityPalette.GRAPHITE -> Res.string.palette_graphite
}
