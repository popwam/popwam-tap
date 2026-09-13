@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.popwam.pop.ui

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.core.os.LocaleListCompat
import com.popwam.pop.R
import com.popwam.pop.TapApplication
import com.popwam.pop.data.api.PublishedLegalDocumentDto
import kotlinx.coroutines.launch

enum class PreAuthLegalKind { TERMS, PRIVACY }
fun applyPopLanguage(language: String) {
    if (language !in LocalePolicy.availableLocales()) return
    AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language))
}

fun persistPopLanguageChoice(context: Context, language: String) {
    (context.applicationContext as? com.popwam.pop.TapApplication)?.container?.persistSelectedLanguage(language)
}

@Composable
fun NativeLegalScreen(kind: PreAuthLegalKind, onBack: () -> Unit) {
    val title = if (kind == PreAuthLegalKind.TERMS) R.string.terms else R.string.privacy
    val context = LocalContext.current
    val api = remember(context) { (context.applicationContext as TapApplication).container.api }
    var reload by remember { mutableIntStateOf(0) }
    var document by remember { mutableStateOf<PublishedLegalDocumentDto?>(null) }
    var loading by remember { mutableStateOf(true) }
    var failed by remember { mutableStateOf(false) }
    LaunchedEffect(kind, currentLocale(), reload) {
        loading = true
        failed = false
        document = runCatching {
            api.currentLegal(kind.name, currentLocale()).takeIf { it.ok }?.document
                ?: error("LEGAL_DOCUMENT_UNAVAILABLE")
        }.onFailure { failed = true }.getOrNull()
        loading = false
    }
    PopSystemBars(MaterialTheme.colorScheme.background.red < .2f)
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(title), fontWeight = FontWeight.Black) },
                navigationIcon = {
                    IconButton(onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back)) }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).navigationBarsPadding().padding(horizontal = 22.dp),
            contentPadding = PaddingValues(top = 22.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(10.dp))
                    Text(stringResource(R.string.pop_brand_short), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                }
            }
            when {
                loading -> item { Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
                failed || document == null -> item {
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(stringResource(R.string.generic_error), color = MaterialTheme.colorScheme.error)
                        Button({ reload++ }, Modifier.padding(top = 12.dp)) { Text(stringResource(R.string.retry)) }
                    }
                }
                else -> {
                    item {
                        Text(document!!.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Text(
                            stringResource(R.string.legal_version_format, document!!.version),
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                    document!!.content.split(Regex("\\n\\s*\\n")).filter(String::isNotBlank).forEach { paragraph ->
                        item { Text(paragraph.trim(), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                }
            }
            item { HorizontalDivider() }
            item { Text(stringResource(R.string.legal_reading_not_consent), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}
