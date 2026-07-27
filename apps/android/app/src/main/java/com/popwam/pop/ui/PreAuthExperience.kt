package com.popwam.pop.ui

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Celebration
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.SettingsSuggest
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.os.LocaleListCompat
import androidx.core.content.edit
import com.popwam.pop.R
import com.popwam.pop.data.api.LocalizationLocaleDto
import com.popwam.pop.ui.theme.PopwamTheme
import com.popwam.pop.ui.theme.PopIdentity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

const val CURRENT_POP_INTRO_VERSION = 1
val supportedPopAppearances = setOf("SYSTEM", "LIGHT", "DARK")

enum class PreAuthStage { LANGUAGE, APPEARANCE, INTRO, AUTH }
enum class PreAuthLegalKind { TERMS, PRIVACY }
enum class UnauthenticatedDestination { PHONE_AUTH, HOW_POP_WORKS, TERMS, PRIVACY }

data class PreAuthSnapshot(
    val language: String? = null,
    val appearance: String? = null,
    val introVersionSeen: Int = 0,
)

fun resolvePreAuthStage(
    state: PreAuthSnapshot,
    authenticated: Boolean,
    availableLanguages: Set<String> = setOf("en"),
    introVersion: Int = CURRENT_POP_INTRO_VERSION,
): PreAuthStage = when {
    authenticated -> PreAuthStage.AUTH
    availableLanguages.size > 1 && state.language !in availableLanguages -> PreAuthStage.LANGUAGE
    state.appearance !in supportedPopAppearances -> PreAuthStage.APPEARANCE
    state.introVersionSeen < introVersion -> PreAuthStage.INTRO
    else -> PreAuthStage.AUTH
}

fun destinationForLegal(kind: PreAuthLegalKind) = when (kind) {
    PreAuthLegalKind.TERMS -> UnauthenticatedDestination.TERMS
    PreAuthLegalKind.PRIVACY -> UnauthenticatedDestination.PRIVACY
}

fun howPopWorksDestination() = UnauthenticatedDestination.HOW_POP_WORKS

class PreAuthStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
    private val _state = MutableStateFlow(read())
    val state = _state.asStateFlow()

    fun selectLanguage(language: String, availableLanguages:Set<String>) {
        if (language !in availableLanguages) return
        preferences.edit { putString(KEY_LANGUAGE, language) }
        _state.value = _state.value.copy(language = language)
    }

    fun reconcileLanguage(availableLanguages:Set<String>,defaultLocale:String) {
        val current=_state.value.language
        val resolved=current?.takeIf { it in availableLanguages }
            ?: defaultLocale.takeIf { it in availableLanguages }
            ?: "en"
        if(availableLanguages.size==1 || current!=null&&current !in availableLanguages) {
            preferences.edit { putString(KEY_LANGUAGE,resolved) }
            _state.value=_state.value.copy(language=resolved)
        }
    }

    fun clearLanguage() {
        preferences.edit { remove(KEY_LANGUAGE) }
        _state.value = _state.value.copy(language = null)
    }

    fun completeAppearance(appearance: String) {
        if (appearance !in supportedPopAppearances) return
        preferences.edit { putString(KEY_APPEARANCE, appearance) }
        _state.value = _state.value.copy(appearance = appearance)
    }

    fun clearAppearance() {
        preferences.edit { remove(KEY_APPEARANCE) }
        _state.value = _state.value.copy(appearance = null)
    }

    fun completeIntro(version: Int = CURRENT_POP_INTRO_VERSION) {
        preferences.edit { putInt(KEY_INTRO_VERSION, version) }
        _state.value = _state.value.copy(introVersionSeen = version)
    }

    /**
     * A valid local POP session proves this is an existing installation. Persisting this
     * compatibility adoption prevents an update or later logout from replaying first-launch UX.
     * It never creates or authorizes a POP session.
     */
    fun adoptAuthenticatedInstallation(language: String, appearance: String) {
        val safeLanguage = language.takeIf { it in LocalePolicy.availableLocales() } ?: LocalePolicy.resolve(null,"")
        val safeAppearance = appearance.takeIf { it in supportedPopAppearances } ?: "SYSTEM"
        val adopted = PreAuthSnapshot(safeLanguage, safeAppearance, CURRENT_POP_INTRO_VERSION)
        preferences.edit {
            putString(KEY_LANGUAGE, adopted.language)
            putString(KEY_APPEARANCE, adopted.appearance)
            putInt(KEY_INTRO_VERSION, adopted.introVersionSeen)
        }
        _state.value = adopted
    }

    private fun read() = PreAuthSnapshot(
        language = preferences.getString(KEY_LANGUAGE, null)?.takeIf { it.matches(Regex("^[a-z]{2}(?:-[a-z0-9]{2,8})?$")) },
        appearance = preferences.getString(KEY_APPEARANCE, null)?.takeIf { it in supportedPopAppearances },
        introVersionSeen = preferences.getInt(KEY_INTRO_VERSION, 0).coerceAtLeast(0),
    )

    companion object {
        private const val PREFERENCES = "pop_pre_auth"
        private const val KEY_LANGUAGE = "language"
        private const val KEY_APPEARANCE = "appearance"
        private const val KEY_INTRO_VERSION = "intro_version_seen"

        fun persistedLanguage(context: Context): String? =
            context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .getString(KEY_LANGUAGE, null)
                ?.takeIf { it.matches(Regex("^[a-z]{2}(?:-[a-z0-9]{2,8})?$")) }

        fun persistLaterLanguageChoice(context: Context, language: String) {
            if (!language.matches(Regex("^[a-z]{2}(?:-[a-z0-9]{2,8})?$"))) return
            context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit { putString(KEY_LANGUAGE, language) }
        }

        fun clearLaterLanguageChoice(context: Context) {
            context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit { remove(KEY_LANGUAGE) }
        }
    }
}

fun applyPopLanguage(language: String) {
    if (language !in LocalePolicy.availableLocales()) return
    AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language))
}

@Composable
fun LanguageSelectionScreen(languages:List<LocalizationLocaleDto>,onSelect: (String) -> Unit) {
    PopSystemBars(false)
    PreAuthBackdrop {
        LazyColumn(
            modifier = Modifier.fillMaxSize().safeDrawingPadding().padding(horizontal = 22.dp),
            contentPadding = PaddingValues(vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp,Alignment.CenterVertically),
        ) {
            item { PopPreAuthBrand() }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                Icon(Icons.Default.Language, null, Modifier.size(38.dp), tint = MaterialTheme.colorScheme.primary)
                Text(
                    stringResource(R.string.pre_auth_language_title),
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Black,
                )
                Text(
                    stringResource(R.string.pre_auth_language_help),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            languages.forEach { language ->
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onSelect(language.code) },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = .94f)),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .32f)),
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 17.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Surface(
                                modifier = Modifier.size(44.dp),
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.primary.copy(alpha = .14f),
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(language.code.uppercase(), fontWeight = FontWeight.Black)
                                }
                            }
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(language.nativeName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            }
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }
}

private data class AppearanceChoice(val value: String, val title: Int, val help: Int, val icon: ImageVector)

@Composable
fun AppearanceSelectionScreen(
    onBack: () -> Unit,
    onComplete: (String, String) -> Unit,
) {
    var selected by rememberSaveable { mutableStateOf("SYSTEM") }
    var identity by rememberSaveable { mutableStateOf("PULSE") }
    val choices = remember {
        listOf(
            AppearanceChoice("SYSTEM", R.string.settings_system, R.string.pre_auth_theme_system_help, Icons.Default.SettingsSuggest),
            AppearanceChoice("LIGHT", R.string.settings_light, R.string.pre_auth_theme_light_help, Icons.Default.LightMode),
            AppearanceChoice("DARK", R.string.settings_dark, R.string.pre_auth_theme_dark_help, Icons.Default.DarkMode),
        )
    }
    PopwamTheme(selected, "DEFAULT", identity) {
        PopSystemBars(MaterialTheme.colorScheme.background.red < .2f)
        PreAuthBackdrop {
            LazyColumn(
                modifier = Modifier.fillMaxSize().safeDrawingPadding().padding(horizontal = 22.dp),
                contentPadding = PaddingValues(vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp,Alignment.CenterVertically),
            ) {
                item {
                    Box(Modifier.fillMaxWidth()) {
                        IconButton(onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back))
                        }
                        PopPreAuthBrand(Modifier.align(Alignment.Center))
                    }
                }
                item {
                    Icon(Icons.Default.Palette, null, Modifier.size(38.dp), tint = MaterialTheme.colorScheme.primary)
                    Text(
                        stringResource(R.string.pre_auth_appearance_title),
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Black,
                    )
                    Text(
                        stringResource(R.string.pre_auth_appearance_help),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                item { Text("Appearance",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Black) }
                choices.forEach { choice ->
                    item {
                        val isSelected = selected == choice.value
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable { selected = choice.value },
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = .14f) else MaterialTheme.colorScheme.surface,
                            ),
                            border = BorderStroke(
                                if (isSelected) 2.dp else 1.dp,
                                if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = .3f),
                            ),
                        ) {
                            Row(
                                Modifier.fillMaxWidth().padding(18.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(choice.icon, null, Modifier.size(32.dp), tint = MaterialTheme.colorScheme.primary)
                                Spacer(Modifier.width(14.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(stringResource(choice.title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text(stringResource(choice.help), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                if (isSelected) Icon(Icons.Default.Check, null, tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
                item { Text("Your POP Style",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Black) }
                item { androidx.compose.foundation.layout.FlowRow(horizontalArrangement=Arrangement.spacedBy(10.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) { PopIdentity.entries.filter { !it.proOnly }.forEach { option ->
                    val active=identity==option.name
                    Card(Modifier.weight(.5f).clickable { identity=option.name },colors=CardDefaults.cardColors(containerColor=if(active) option.primary.copy(alpha=.14f) else MaterialTheme.colorScheme.surface),border=BorderStroke(if(active)2.dp else 1.dp,if(active)option.primary else MaterialTheme.colorScheme.outline.copy(alpha=.3f))){Row(Modifier.padding(12.dp),verticalAlignment=Alignment.CenterVertically){Icon(painterResource(R.drawable.pop_logo),null,Modifier.size(30.dp),tint=option.primary);Spacer(Modifier.width(8.dp));Column{Text(option.label,fontWeight=FontWeight.Bold);Text(option.description,style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.onSurfaceVariant,maxLines=1)}}}
                } } }
                item {
                    Button(
                        onClick = { onComplete(selected,identity) },
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        enabled = true,
                    ) {
                        Text(stringResource(R.string.continue_action))
                        Spacer(Modifier.width(8.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, null)
                    }
                }
            }
        }
    }
}

private data class IntroPage(val title: Int, val body: Int, val icon: ImageVector)

@Composable
fun ProductIntroScreen(
    onBack: () -> Unit,
    onComplete: () -> Unit,
    helpMode: Boolean = false,
) {
    PopSystemBars(MaterialTheme.colorScheme.background.red < .2f)
    val pages = remember {
        listOf(
            IntroPage(R.string.pre_auth_intro_identity_title, R.string.pre_auth_intro_identity_body, Icons.Default.Person),
            IntroPage(R.string.pre_auth_intro_share_title, R.string.pre_auth_intro_share_body, Icons.Default.QrCode2),
            IntroPage(R.string.pre_auth_intro_connect_title, R.string.pre_auth_intro_connect_body, Icons.Default.Groups),
            IntroPage(R.string.pre_auth_intro_ready_title, R.string.pre_auth_intro_ready_body, Icons.Default.Celebration),
        )
    }
    val pager = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()
    PreAuthBackdrop {
        Column(Modifier.fillMaxSize().safeDrawingPadding()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(
                    onClick = {
                        if (pager.currentPage == 0) onBack()
                        else scope.launch { pager.animateScrollToPage(pager.currentPage - 1) }
                    },
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back))
                }
                PopPreAuthBrand(Modifier.weight(1f))
                if (helpMode) {
                    TextButton(onBack) { Text(stringResource(R.string.close)) }
                }
            }
            HorizontalPager(
                state = pager,
                modifier = Modifier.fillMaxWidth().weight(1f),
            ) { index ->
                val page = pages[index]
                Column(
                    Modifier.fillMaxSize().padding(horizontal = 28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Surface(
                        modifier = Modifier.size(148.dp),
                        shape = RoundedCornerShape(42.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = .15f),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(page.icon, null, Modifier.size(72.dp), tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                    Spacer(Modifier.height(30.dp))
                    Text(
                        stringResource(page.title),
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        stringResource(page.body),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }
            }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.Center,
            ) {
                pages.indices.forEach { index ->
                    Box(
                        Modifier.padding(4.dp).size(if (index == pager.currentPage) 22.dp else 8.dp)
                            .background(
                                if (index == pager.currentPage) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = .35f),
                                CircleShape,
                            ),
                    )
                }
            }
            Button(
                onClick = {
                    if (pager.currentPage == pages.lastIndex) onComplete()
                    else scope.launch { pager.animateScrollToPage(pager.currentPage + 1) }
                },
                modifier = Modifier.fillMaxWidth().padding(24.dp).height(54.dp),
            ) {
                Text(
                    stringResource(
                        if (pager.currentPage == pages.lastIndex) {
                            if (helpMode) R.string.back_to_sign_in else R.string.continue_to_pop
                        } else {
                            R.string.next
                        },
                    ),
                )
                Spacer(Modifier.width(8.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, null)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NativeLegalScreen(kind: PreAuthLegalKind, version: String? = null, onBack: () -> Unit) {
    val title = if (kind == PreAuthLegalKind.TERMS) R.string.terms else R.string.privacy
    val paragraphs = if (kind == PreAuthLegalKind.TERMS) {
        listOf(R.string.legal_terms_body_one, R.string.legal_terms_body_two)
    } else {
        listOf(R.string.legal_privacy_body_one, R.string.legal_privacy_body_two)
    }
    PopSystemBars(MaterialTheme.colorScheme.background.red < .2f)
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(title), fontWeight = FontWeight.Black) },
                navigationIcon = {
                    IconButton(onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back))
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).navigationBarsPadding().padding(horizontal = 22.dp),
            contentPadding = PaddingValues(
                top = 22.dp,
                bottom = 32.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(10.dp))
                    Text(stringResource(R.string.pop_brand_short), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                }
            }
            item {
                Text(
                    if(version.isNullOrBlank())stringResource(R.string.legal_current_public_notice) else stringResource(R.string.legal_version_format,version),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            paragraphs.forEach { paragraph ->
                item {
                    Text(
                        stringResource(paragraph),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            item { HorizontalDivider() }
            item {
                Text(
                    stringResource(R.string.legal_reading_not_consent),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun PreAuthBackdrop(content: @Composable () -> Unit) {
    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(
                listOf(
                    MaterialTheme.colorScheme.background,
                    MaterialTheme.colorScheme.surface,
                    MaterialTheme.colorScheme.primary.copy(alpha = .10f),
                ),
            ),
        ),
    ) {
        content()
    }
}

@Composable
private fun PopPreAuthBrand(modifier: Modifier = Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            painterResource(R.drawable.pop_logo),
            contentDescription = stringResource(R.string.pop_brand_short),
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.primary,
        )
        Column {
            Text(stringResource(R.string.pop_brand_short), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text(
                stringResource(R.string.pop_slogan),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
