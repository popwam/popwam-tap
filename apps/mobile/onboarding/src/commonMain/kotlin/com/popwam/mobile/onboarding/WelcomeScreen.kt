package com.popwam.mobile.onboarding

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.popwam.mobile.designsystem.LocalPopSemanticColors
import com.popwam.mobile.designsystem.PopFontFamilies
import com.popwam.mobile.designsystem.PopIdentityStyle
import com.popwam.mobile.designsystem.PopScriptDirection
import com.popwam.mobile.designsystem.PopTheme
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.foundation.navigation.WelcomePage
import com.popwam.mobile.onboarding.generated.resources.Res
import com.popwam.mobile.onboarding.generated.resources.all_in_one_art_description
import com.popwam.mobile.onboarding.generated.resources.all_in_one_body
import com.popwam.mobile.onboarding.generated.resources.all_in_one_title
import com.popwam.mobile.onboarding.generated.resources.get_started_art_description
import com.popwam.mobile.onboarding.generated.resources.get_started_body
import com.popwam.mobile.onboarding.generated.resources.get_started_title
import com.popwam.mobile.onboarding.generated.resources.onboarding_all_in_one
import com.popwam.mobile.onboarding.generated.resources.onboarding_continue
import com.popwam.mobile.onboarding.generated.resources.onboarding_get_started
import com.popwam.mobile.onboarding.generated.resources.onboarding_personal_business_ar
import com.popwam.mobile.onboarding.generated.resources.onboarding_personal_business_en
import com.popwam.mobile.onboarding.generated.resources.onboarding_share_ar
import com.popwam.mobile.onboarding.generated.resources.onboarding_share_en_left
import com.popwam.mobile.onboarding.generated.resources.onboarding_share_en_right
import com.popwam.mobile.onboarding.generated.resources.onboarding_skip
import com.popwam.mobile.onboarding.generated.resources.personal_business_art_description
import com.popwam.mobile.onboarding.generated.resources.personal_business_body
import com.popwam.mobile.onboarding.generated.resources.personal_business_title
import com.popwam.mobile.onboarding.generated.resources.pop_logo_description
import com.popwam.mobile.onboarding.generated.resources.share_your_way_art_description
import com.popwam.mobile.onboarding.generated.resources.share_your_way_body
import com.popwam.mobile.onboarding.generated.resources.share_your_way_title
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

@Composable
fun Phase3OnboardingTheme(
    baseTheme: ThemeMode,
    popStyle: IdentityPalette,
    systemDark: Boolean,
    languageTag: String,
    fonts: PopFontFamilies,
    content: @Composable () -> Unit,
) {
    val dark = resolveDarkTheme(baseTheme, systemDark)
    PopTheme(
        dark = dark,
        identity = PopIdentityStyle.valueOf(popStyle.name),
        direction = if (languageTag.substringBefore('-') == "ar") PopScriptDirection.RTL else PopScriptDirection.LTR,
        fonts = fonts,
        content = content,
    )
}

fun resolveDarkTheme(baseTheme: ThemeMode, systemDark: Boolean): Boolean = when (baseTheme) {
    ThemeMode.SYSTEM -> systemDark
    ThemeMode.LIGHT -> false
    ThemeMode.DARK -> true
}

@Composable
fun WelcomeScreen(
    page: WelcomePage,
    languageTag: String,
    reducedMotion: Boolean,
    onContinue: () -> Unit,
    onSkip: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Crossfade(
        targetState = page,
        animationSpec = tween(if (reducedMotion) 0 else 180),
        label = "phase3-welcome-page",
    ) { current ->
        WelcomePageContent(
            page = current,
            arabic = languageTag.substringBefore('-') == "ar",
            onContinue = onContinue,
            onSkip = onSkip,
            modifier = modifier,
        )
    }
}

@Composable
private fun WelcomePageContent(
    page: WelcomePage,
    arabic: Boolean,
    onContinue: () -> Unit,
    onSkip: () -> Unit,
    modifier: Modifier,
) {
    val colors = LocalPopSemanticColors.current
    val content = pageContent(page)
    ReferenceFrame(modifier.background(colors.backgroundTertiary)) {
        if (page == WelcomePage.ALL_IN_ONE || page == WelcomePage.SHARE_YOUR_WAY) {
            Canvas(Modifier.fillMaxSize()) {
                drawCircle(colors.surfacePrimary, 156.5.dp.toPx(), androidx.compose.ui.geometry.Offset((-48 + 156.5).dp.toPx(), (-78 + 156.5).dp.toPx()))
                drawCircle(colors.brandPrimary.copy(alpha = .4f), 156.5.dp.toPx(), androidx.compose.ui.geometry.Offset((123 + 156.5).dp.toPx(), (108 + 156.5).dp.toPx()))
                if (page == WelcomePage.ALL_IN_ONE) {
                    drawCircle(colors.brandPrimary.copy(alpha = .14f), 156.5.dp.toPx(), androidx.compose.ui.geometry.Offset((-79 + 156.5).dp.toPx(), (183 + 156.5).dp.toPx()))
                }
            }
        }
        PopMarkVector(
            color = colors.brandPrimary,
            contentDescription = stringResource(Res.string.pop_logo_description),
            modifier = Modifier.offset(307.dp, 36.dp).size(70.dp, 85.dp),
        )
        if (page != WelcomePage.GET_STARTED) {
            Text(
                stringResource(Res.string.onboarding_skip),
                color = colors.textPrimary,
                fontSize = 16.sp,
                lineHeight = 40.sp,
                modifier = Modifier
                    .offset(33.dp, 58.dp)
                    .size(89.dp, 40.dp)
                    .semantics { role = Role.Button }
                    .clickable(onClick = onSkip),
            )
        }
        WelcomeArtwork(page, arabic)
        Text(
            stringResource(content.title),
            color = colors.textPrimary,
            fontSize = 28.sp,
            lineHeight = 42.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Start,
            modifier = Modifier.offset(45.dp, 553.dp).size(304.dp, 84.dp),
        )
        Text(
            stringResource(content.body),
            color = colors.textSecondary,
            fontSize = 16.sp,
            lineHeight = 26.sp,
            fontWeight = FontWeight.Normal,
            textAlign = TextAlign.Start,
            modifier = Modifier.offset(
                if (page == WelcomePage.ALL_IN_ONE) 53.dp else 45.dp,
                when {
                    arabic && page == WelcomePage.GET_STARTED -> 652.dp
                    arabic && page == WelcomePage.PERSONAL_AND_BUSINESS -> 650.dp
                    else -> 645.dp
                },
            ).size(if (page == WelcomePage.ALL_IN_ONE) 296.dp else 309.dp, 58.dp),
        )
        PrimaryAction(
            text = stringResource(if (page == WelcomePage.GET_STARTED) Res.string.onboarding_get_started else Res.string.onboarding_continue),
            onClick = onContinue,
            modifier = Modifier.offset(32.dp, 751.dp).size(330.3938.dp, 63.9474.dp),
        )
    }
}

@Composable
private fun BoxScope.WelcomeArtwork(page: WelcomePage, arabic: Boolean) {
    when (page) {
        WelcomePage.ALL_IN_ONE -> Image(
            painterResource(Res.drawable.onboarding_all_in_one),
            stringResource(Res.string.all_in_one_art_description),
            contentScale = ContentScale.FillBounds,
            modifier = Modifier.offset(0.dp, 148.dp).size(393.dp, 393.dp),
        )
        WelcomePage.SHARE_YOUR_WAY -> {
            Image(
                painterResource(Res.drawable.onboarding_share_en_right),
                stringResource(Res.string.share_your_way_art_description),
                contentScale = ContentScale.FillBounds,
                modifier = Modifier.offset(93.dp, 36.dp).size(349.dp, 523.dp),
            )
            Image(
                painterResource(if (arabic) Res.drawable.onboarding_share_ar else Res.drawable.onboarding_share_en_left),
                null,
                contentScale = ContentScale.FillBounds,
                modifier = if (arabic) Modifier.offset(0.dp, 98.dp).size(338.dp, 507.dp) else Modifier.offset((-85).dp, (-8).dp).size(374.dp, 561.dp),
            )
        }
        WelcomePage.PERSONAL_AND_BUSINESS -> Image(
            painterResource(if (arabic) Res.drawable.onboarding_personal_business_ar else Res.drawable.onboarding_personal_business_en),
            stringResource(Res.string.personal_business_art_description),
            contentScale = ContentScale.FillBounds,
            modifier = if (arabic) Modifier.offset(0.dp, 129.dp).size(392.dp, 416.dp) else Modifier.offset(3.dp, 121.dp).size(387.dp, 357.dp),
        )
        WelcomePage.GET_STARTED -> Image(
            painterResource(Res.drawable.onboarding_get_started),
            stringResource(Res.string.get_started_art_description),
            contentScale = ContentScale.FillBounds,
            modifier = Modifier.offset(0.dp, 121.dp).size(393.dp, 371.dp),
        )
    }
}

@Composable
internal fun PrimaryAction(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalPopSemanticColors.current
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(colors.brandPrimary)
            .semantics { role = Role.Button }
            .clickable(onClick = onClick),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(text, color = colors.onBrand, fontSize = 24.sp, lineHeight = 29.sp, fontWeight = FontWeight.Medium)
            ChevronVector(
                color = colors.onBrand,
                modifier = Modifier.offset(x = if (rtl) (-82).dp else 82.dp).size(24.dp).graphicsLayer(scaleX = if (rtl) -1f else 1f),
            )
        }
    }
}

@Composable
internal fun ReferenceFrame(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    BoxWithConstraints(modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        val scale = minOf(1f, maxWidth / 393.dp)
        val scaledWidth = 393.dp * scale
        val scaledHeight = 852.dp * scale
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.width(scaledWidth).height(scaledHeight)) {
                Box(
                    Modifier.requiredSize(393.dp, 852.dp).graphicsLayer(
                        scaleX = scale,
                        scaleY = scale,
                        transformOrigin = TransformOrigin(0f, 0f),
                    ),
                    content = content,
                )
            }
        }
    }
}

private data class WelcomeCopy(val title: StringResource, val body: StringResource)

private fun pageContent(page: WelcomePage): WelcomeCopy = when (page) {
    WelcomePage.ALL_IN_ONE -> WelcomeCopy(Res.string.all_in_one_title, Res.string.all_in_one_body)
    WelcomePage.SHARE_YOUR_WAY -> WelcomeCopy(Res.string.share_your_way_title, Res.string.share_your_way_body)
    WelcomePage.PERSONAL_AND_BUSINESS -> WelcomeCopy(Res.string.personal_business_title, Res.string.personal_business_body)
    WelcomePage.GET_STARTED -> WelcomeCopy(Res.string.get_started_title, Res.string.get_started_body)
}
