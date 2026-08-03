package com.popwam.mobile.onboarding

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
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
import com.popwam.mobile.onboarding.generated.resources.pop_mark
import com.popwam.mobile.onboarding.generated.resources.theme_continue
import com.popwam.mobile.onboarding.generated.resources.theme_dark
import com.popwam.mobile.onboarding.generated.resources.theme_light
import com.popwam.mobile.onboarding.generated.resources.theme_style
import com.popwam.mobile.onboarding.generated.resources.theme_subtitle
import com.popwam.mobile.onboarding.generated.resources.theme_system
import com.popwam.mobile.onboarding.generated.resources.theme_title
import org.jetbrains.compose.resources.DrawableResource
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

@Composable
fun ThemeScreen(
    selectedMode: ThemeMode,
    selectedStyle: IdentityPalette,
    galleryVisible: Boolean,
    onSelectMode: (ThemeMode) -> Unit,
    onContinue: () -> Unit,
    onOpenGallery: () -> Unit,
    onPreviewStyle: (IdentityPalette) -> Unit,
    onConfirmStyle: () -> Unit,
    onCancelStyle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalPopSemanticColors.current
    ReferenceFrame(modifier.background(colors.backgroundPrimary)) {
        Image(
            painter = painterResource(Res.drawable.pop_mark),
            contentDescription = stringResource(Res.string.pop_logo_description),
            colorFilter = ColorFilter.tint(colors.brandPrimary),
            modifier = Modifier.offset(107.dp, 68.dp).size(180.dp, 218.dp),
        )
        Column(Modifier.offset(27.dp, 363.dp).size(342.dp, 59.dp)) {
            Text(stringResource(Res.string.theme_title), color = colors.textPrimary, fontSize = 28.sp, lineHeight = 33.sp, fontWeight = FontWeight.Bold)
            Text(stringResource(Res.string.theme_subtitle), color = colors.textPrimary, fontSize = 15.sp, lineHeight = 18.sp, fontWeight = FontWeight.SemiBold)
        }
        Row(
            Modifier.offset(63.1306.dp, 500.dp).size(267.7388.dp, 63.9474.dp),
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
                        .background(if (active) colors.brandPrimary else colors.surfacePrimary, RoundedCornerShape(12.dp))
                        .semantics {
                            role = Role.RadioButton
                            selected = active
                            contentDescription = label
                        }
                        .clickable { onSelectMode(mode) },
                ) {
                    Image(
                        painter = painterResource(choice.icon),
                        contentDescription = null,
                        colorFilter = ColorFilter.tint(if (active) colors.onBrand else colors.textPrimary),
                        modifier = Modifier.size(48.dp),
                    )
                }
            }
        }
        Text(
            text = stringResource(Res.string.theme_style),
            color = colors.brandPrimary,
            fontSize = 15.sp,
            lineHeight = 40.sp,
            fontWeight = FontWeight.SemiBold,
            textDecoration = TextDecoration.Underline,
            modifier = Modifier
                .offset(85.dp, 604.dp)
                .size(222.dp, 40.dp)
                .semantics { role = Role.Button }
                .clickable(onClick = onOpenGallery),
        )
        PrimaryAction(
            text = stringResource(Res.string.theme_continue),
            onClick = onContinue,
            modifier = Modifier.offset(74.dp, 744.dp).size(246.3158.dp, 63.9474.dp),
        )
        if (galleryVisible) {
            ThemeGallery(
                selectedStyle = selectedStyle,
                onPreviewStyle = onPreviewStyle,
                onConfirmStyle = onConfirmStyle,
                onCancel = onCancelStyle,
            )
        }
    }
}

@Composable
private fun ThemeGallery(
    selectedStyle: IdentityPalette,
    onPreviewStyle: (IdentityPalette) -> Unit,
    onConfirmStyle: () -> Unit,
    onCancel: () -> Unit,
) {
    val colors = LocalPopSemanticColors.current
    Box(Modifier.fillMaxSize().background(androidx.compose.ui.graphics.Color.Black.copy(alpha = .5f)).clickable(onClick = onCancel))
    Column(
        Modifier.offset(0.dp, 422.dp).size(393.dp, 430.dp).background(colors.surfaceElevated).padding(start = 34.dp, top = 46.6886.dp, end = 33.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        galleryOrder.forEach { style ->
            val palette = PopIdentityStyle.valueOf(style.name)
            val active = selectedStyle == style
            val label = stringResource(paletteLabel(style))
            val description = if (active) stringResource(Res.string.palette_selected, label) else label
            Row(
                modifier = Modifier
                    .size(326.dp, 56.dp)
                    .background(if (active) palette.primary else colors.surfaceElevated)
                    .semantics {
                        role = Role.RadioButton
                        selected = active
                        contentDescription = description
                    }
                    .clickable {
                        onPreviewStyle(style)
                        onConfirmStyle()
                    }
                    .padding(horizontal = 5.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Image(
                    painterResource(Res.drawable.pop_mark),
                    null,
                    colorFilter = ColorFilter.tint(if (active) palette.soft else palette.primary),
                    modifier = Modifier.size(42.dp, 48.dp),
                )
                Text(
                    label,
                    color = if (active) palette.soft else palette.primary,
                    fontSize = 16.sp,
                    lineHeight = 21.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(start = 12.dp),
                )
            }
        }
    }
    Box(
        Modifier.offset(168.728.dp, 441.254.dp).size(55.544.dp, 1.dp).background(colors.borderStrong),
    )
}

private data class ModeChoice(val icon: DrawableResource, val label: StringResource)

private fun modeChoice(mode: ThemeMode): ModeChoice = when (mode) {
    ThemeMode.SYSTEM -> ModeChoice(Res.drawable.theme_system, Res.string.theme_system)
    ThemeMode.LIGHT -> ModeChoice(Res.drawable.theme_light, Res.string.theme_light)
    ThemeMode.DARK -> ModeChoice(Res.drawable.theme_dark, Res.string.theme_dark)
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
