package com.popwam.pop.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.dp
import com.popwam.pop.R
import com.popwam.mobile.designsystem.PopFontFamilies
import com.popwam.mobile.designsystem.PopIdentityStyle
import com.popwam.mobile.designsystem.popSemanticColors

/** The six palette identities are projected from the shared semantic token set. */
enum class PopIdentity(val label:String, val description:String) {
    PULSE("Pulse","Connected. Clear. Modern."),
    MINT("Mint","Fresh. Calm. Capable."),
    VIOLET("Violet","Expressive. Focused. Bold."),
    CORAL("Coral","Warm. Human. Energetic."),
    SOLAR("Solar","Bright. Optimistic. Clear."),
    GRAPHITE("Graphite","Quiet. Solid. Precise.");
    val primary get()=popSemanticColors(PopIdentityStyle.valueOf(name),false).brandPrimary
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
        primary=shared.brandPrimary,onPrimary=shared.onBrand,secondary=shared.logoAccent,onSecondary=shared.onBrand,
        background=shared.backgroundPrimary,onBackground=shared.textPrimary,surface=shared.surfacePrimary,onSurface=shared.textPrimary,
        surfaceVariant=shared.surfaceSecondary,onSurfaceVariant=shared.textSecondary,outline=shared.borderDefault,error=shared.error,
    )
    return scheme to PopSemanticColors(
        shared.brandPrimary,shared.logoAccent,shared.backgroundPrimary,shared.surfacePrimary,shared.surfaceSecondary,
        shared.textPrimary,shared.textSecondary,shared.onBrand,shared.borderDefault,shared.textTertiary,
        shared.brandPrimary.copy(alpha=if(dark).24f else .12f),shared.brandPrimary,shared.error,shared.success,shared.warning,
    )
}

private val Cairo=FontFamily(Font(R.font.cairo,FontWeight.Normal),Font(R.font.cairo,FontWeight.Medium),Font(R.font.cairo,FontWeight.Bold),Font(R.font.cairo,FontWeight.Black))
private val Montserrat=FontFamily(Font(R.font.montserrat,FontWeight.Normal),Font(R.font.montserrat,FontWeight.Medium),Font(R.font.montserrat,FontWeight.SemiBold),Font(R.font.montserrat,FontWeight.Bold),Font(R.font.montserrat,FontWeight.Black))
fun popFontFamilies()=PopFontFamilies(englishMontserrat=Montserrat,arabicCairo=Cairo)
private val Base=Typography()
private fun typography(font:FontFamily)=Typography(displayLarge=Base.displayLarge.copy(fontFamily=font),displayMedium=Base.displayMedium.copy(fontFamily=font),displaySmall=Base.displaySmall.copy(fontFamily=font),headlineLarge=Base.headlineLarge.copy(fontFamily=font),headlineMedium=Base.headlineMedium.copy(fontFamily=font),headlineSmall=Base.headlineSmall.copy(fontFamily=font),titleLarge=Base.titleLarge.copy(fontFamily=font),titleMedium=Base.titleMedium.copy(fontFamily=font),titleSmall=Base.titleSmall.copy(fontFamily=font),bodyLarge=Base.bodyLarge.copy(fontFamily=font),bodyMedium=Base.bodyMedium.copy(fontFamily=font),bodySmall=Base.bodySmall.copy(fontFamily=font),labelLarge=Base.labelLarge.copy(fontFamily=font),labelMedium=Base.labelMedium.copy(fontFamily=font),labelSmall=Base.labelSmall.copy(fontFamily=font))

@Composable fun PopwamTheme(themeMode:String="SYSTEM",fontMode:String="DEFAULT",identityTheme:String="PULSE",content: @Composable () -> Unit) {
    val dark=when(themeMode){"DARK"->true;"LIGHT"->false;else->isSystemInDarkTheme()}
    val (scheme,semantic)=resolveColors(PopIdentity.from(identityTheme),dark)
    val arabic=com.popwam.pop.ui.LocalePolicy.isRtl(com.popwam.pop.ui.currentLocale())
    CompositionLocalProvider(LocalPopColors provides semantic) { MaterialTheme(colorScheme=scheme,typography=typography(if(arabic) Cairo else Montserrat),shapes=Shapes(small=RoundedCornerShape(14.dp),medium=RoundedCornerShape(24.dp),large=RoundedCornerShape(32.dp)),content=content) }
}
