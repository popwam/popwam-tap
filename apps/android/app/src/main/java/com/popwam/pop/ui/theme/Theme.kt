package com.popwam.pop.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.dp
import com.popwam.pop.R
import com.popwam.mobile.designsystem.PopFontFamilies
import com.popwam.mobile.designsystem.PopIdentityStyle
import com.popwam.mobile.designsystem.PopScriptDirection
import com.popwam.mobile.designsystem.popTypography
import com.popwam.mobile.designsystem.popSemanticColors

/** The six palette identities are projected from the shared semantic token set. */
enum class PopIdentity(val label:String, val description:String) {
    PULSE("Pulse","Connected. Clear. Modern."),
    MINT("Mint","Fresh. Calm. Capable."),
    VIOLET("Violet","Expressive. Focused. Bold."),
    CORAL("Coral","Warm. Human. Energetic."),
    SOLAR("Solar","Bright. Optimistic. Clear."),
    GRAPHITE("Graphite","Quiet. Solid. Precise.");
    val primary get()=PopIdentityStyle.valueOf(name).primary
    companion object { fun from(value:String?)=entries.firstOrNull { it.name==value }?:PULSE }
}

data class PopSemanticColors(
    val brandPrimary:Color,val brandAccent:Color,val background:Color,val surface:Color,val surfaceVariant:Color,
    val onBackground:Color,val onSurface:Color,val onPrimary:Color,val outline:Color,val mutedText:Color,
    val selectedSurface:Color,val selectedContent:Color,val danger:Color,val success:Color,val warning:Color,
)
val LocalPopColors=staticCompositionLocalOf { PopSemanticColors(Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified) }

fun logoColor(identity:PopIdentity,dark:Boolean)=popSemanticColors(PopIdentityStyle.valueOf(identity.name),dark).logoPrimary
private fun resolveColors(identity:PopIdentity,dark:Boolean):Pair<ColorScheme,PopSemanticColors> {
    val shared=popSemanticColors(PopIdentityStyle.valueOf(identity.name),dark)
    val scheme=(if(dark) darkColorScheme() else lightColorScheme()).copy(
        primary=shared.primaryAction,onPrimary=shared.onPrimaryAction,primaryContainer=shared.selectedBackground,onPrimaryContainer=shared.selectedForeground,
        secondary=shared.secondaryAction,onSecondary=shared.onSecondaryAction,secondaryContainer=shared.surfaceSecondary,onSecondaryContainer=shared.textPrimary,
        background=shared.backgroundPrimary,onBackground=shared.textPrimary,surface=shared.surfacePrimary,onSurface=shared.textPrimary,
        surfaceVariant=shared.surfaceSecondary,onSurfaceVariant=shared.textSecondary,outline=shared.borderDefault,outlineVariant=shared.borderStrong,
        error=shared.error,onError=shared.textInverse,errorContainer=shared.errorBackground,onErrorContainer=shared.errorText,
    )
    return scheme to PopSemanticColors(
        shared.brandPrimary,shared.logoAccent,shared.backgroundPrimary,shared.surfacePrimary,shared.surfaceSecondary,
        shared.textPrimary,shared.textSecondary,shared.onPrimaryAction,shared.borderDefault,shared.textTertiary,
        shared.selectedBackground,shared.selectedForeground,shared.error,shared.success,shared.warning,
    )
}

@OptIn(ExperimentalTextApi::class)
private fun variableFont(resource: Int, weight: FontWeight) = Font(
    resId = resource,
    weight = weight,
    variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
)
private val Cairo=FontFamily(
    variableFont(R.font.cairo,FontWeight.Normal),variableFont(R.font.cairo,FontWeight.Medium),
    variableFont(R.font.cairo,FontWeight.SemiBold),variableFont(R.font.cairo,FontWeight.Bold),variableFont(R.font.cairo,FontWeight.Black),
)
private val Montserrat=FontFamily(
    variableFont(R.font.montserrat,FontWeight.Normal),variableFont(R.font.montserrat,FontWeight.Medium),
    variableFont(R.font.montserrat,FontWeight.SemiBold),variableFont(R.font.montserrat,FontWeight.Bold),variableFont(R.font.montserrat,FontWeight.Black),
)
fun popFontFamilies()=PopFontFamilies(englishMontserrat=Montserrat,arabicCairo=Cairo)
@Composable fun PopwamTheme(themeMode:String="SYSTEM",fontMode:String="DEFAULT",identityTheme:String="PULSE",content: @Composable () -> Unit) {
    val dark=when(themeMode){"DARK"->true;"LIGHT"->false;else->isSystemInDarkTheme()}
    val (scheme,semantic)=resolveColors(PopIdentity.from(identityTheme),dark)
    val arabic=com.popwam.pop.ui.LocalePolicy.isRtl(com.popwam.pop.ui.currentLocale())
    val direction=if(arabic) PopScriptDirection.RTL else PopScriptDirection.LTR
    CompositionLocalProvider(LocalPopColors provides semantic) { MaterialTheme(colorScheme=scheme,typography=popTypography(popFontFamilies(),direction),shapes=Shapes(small=RoundedCornerShape(14.dp),medium=RoundedCornerShape(24.dp),large=RoundedCornerShape(32.dp)),content=content) }
}
