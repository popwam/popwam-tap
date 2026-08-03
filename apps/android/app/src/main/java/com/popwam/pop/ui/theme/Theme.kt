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

/** Appearance controls surfaces; identity controls the POP personality. */
data class PopIdentityPalette(val backgroundDay:Color=Color(0xFFF8FAFC),val backgroundNight:Color=Color(0xFF0B1220),val surfaceDay:Color=Color.White,val surfaceNight:Color=Color(0xFF121B2A),val primaryDay:Color,val primaryNight:Color,val accentDay:Color,val accentNight:Color,val titleDay:Color=Color(0xFF0F172A),val titleNight:Color=Color(0xFFF8FAFC),val bodyDay:Color=Color(0xFF334155),val bodyNight:Color=Color(0xFFCBD5E1),val mutedDay:Color=Color(0xFF64748B),val mutedNight:Color=Color(0xFFCBD5E1),val outlineDay:Color=Color(0xFF94A3B8),val outlineNight:Color=Color(0xFF64748B),val selectedSurfaceDay:Color,val selectedSurfaceNight:Color,val selectedContentDay:Color,val selectedContentNight:Color,val onPrimaryDay:Color=Color.White,val onPrimaryNight:Color=Color.White)
private fun palette(primary:Color,accent:Color)=PopIdentityPalette(primaryDay=primary,primaryNight=accent,accentDay=accent,accentNight=accent,selectedSurfaceDay=primary.copy(alpha=.12f),selectedSurfaceNight=accent.copy(alpha=.24f),selectedContentDay=primary,selectedContentNight=accent)
enum class PopIdentity(val label:String, val palette:PopIdentityPalette, val description:String, val proOnly:Boolean=false) {
    PULSE("Pulse",palette(Color(0xFF1E5BFF),Color(0xFF60A5FA)),"Connected. Clear. Modern."), MINT("Mint",palette(Color(0xFF0EA5A4),Color(0xFF2DD4BF)),"Fresh. Calm. Capable."), VIOLET("Violet",palette(Color(0xFF7C3AED),Color(0xFFA78BFA)),"Expressive. Focused. Bold."), CORAL("Coral",palette(Color(0xFFF43F5E),Color(0xFFFB7185)),"Warm. Human. Energetic."), SOLAR("Solar",palette(Color(0xFFF59E0B),Color(0xFFFBBF24)),"Bright. Optimistic. Clear."), GRAPHITE("Graphite",palette(Color(0xFF334155),Color(0xFF94A3B8)),"Quiet. Solid. Precise."), PRO("POP Pro",palette(Color(0xFF0EA5A4),Color(0xFF5EEAD4)).copy(backgroundDay=Color(0xFFF0FDFA),backgroundNight=Color(0xFF071A1A),surfaceNight=Color(0xFF102727)),"Premium POP identity.",true);
    val primary get()=palette.primaryDay; val accent get()=palette.accentDay
    companion object { fun from(value:String?)=entries.firstOrNull { it.name==value }?:PULSE }
}

data class PopSemanticColors(
    val brandPrimary:Color,val brandAccent:Color,val background:Color,val surface:Color,val surfaceVariant:Color,
    val onBackground:Color,val onSurface:Color,val onPrimary:Color,val outline:Color,val mutedText:Color,
    val selectedSurface:Color,val selectedContent:Color,val danger:Color,val success:Color,val warning:Color,
)
val LocalPopColors=staticCompositionLocalOf { PopSemanticColors(Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified,Color.Unspecified) }

fun logoColor(identity:PopIdentity,dark:Boolean)=when { identity==PopIdentity.GRAPHITE&&dark->Color(0xFFCBD5E1); dark->identity.palette.primaryNight; else->identity.palette.primaryDay }
private fun resolveColors(identity:PopIdentity,dark:Boolean):Pair<ColorScheme,PopSemanticColors> {
    val p=identity.palette; val background=if(dark)p.backgroundNight else p.backgroundDay; val surface=if(dark)p.surfaceNight else p.surfaceDay
    val variant=surface.copy(alpha=if(dark).86f else .94f); val on=if(dark)p.titleNight else p.titleDay; val muted=if(dark)p.mutedNight else p.mutedDay
    val primary=if(dark)p.primaryNight else p.primaryDay; val onPrimary=if(dark)p.onPrimaryNight else p.onPrimaryDay
    val scheme=(if(dark) darkColorScheme() else lightColorScheme()).copy(primary=primary,onPrimary=onPrimary,secondary=identity.accent,onSecondary=if(dark)Color(0xFF06201F) else Color.White,background=background,onBackground=on,surface=surface,onSurface=on,surfaceVariant=variant,onSurfaceVariant=muted,outline=if(dark) Color(0xFF64748B) else Color(0xFF94A3B8),error=if(dark)Color(0xFFFFB4AB) else Color(0xFFBA1A1A))
    return scheme to PopSemanticColors(primary,if(dark)p.accentNight else p.accentDay,background,surface,variant,on,if(dark)p.bodyNight else p.bodyDay,onPrimary,if(dark)p.outlineNight else p.outlineDay,muted,if(dark)p.selectedSurfaceNight else p.selectedSurfaceDay,if(dark)p.selectedContentNight else p.selectedContentDay,scheme.error,Color(0xFF22C55E),Color(0xFFF59E0B))
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
