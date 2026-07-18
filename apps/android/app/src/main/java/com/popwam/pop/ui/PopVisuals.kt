package com.popwam.pop.ui

import android.content.Context
import android.provider.Settings
import androidx.compose.animation.core.RepeatMode
import androidx.activity.compose.LocalActivity
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Contactless
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import com.popwam.pop.R
import kotlinx.coroutines.launch

enum class PopBackdrop { WELCOME, HOME, DETAILS, EMPTY, NEUTRAL }

@Composable
fun PopDynamicBackground(kind: PopBackdrop, accent: Color = Color(0xFFD4AF37), content: @Composable BoxScope.() -> Unit) {
    val context = LocalContext.current
    val reduceMotion = remember(context) {
        runCatching { Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }.getOrDefault(false)
    }
    val transition = rememberInfiniteTransition(label = "pop-background")
    val drift by transition.animateFloat(
        initialValue = 0f,
        targetValue = if (reduceMotion) 0f else 1f,
        animationSpec = infiniteRepeatable(tween(18000), RepeatMode.Reverse),
        label = "background-drift",
    )
    val colors = when (kind) {
        PopBackdrop.WELCOME -> listOf(Color(0xFFF9F7F0), Color.White, Color(0xFFFFF7D8))
        PopBackdrop.HOME -> listOf(Color(0xFF050505), Color(0xFF101010), Color(0xFF1A1406))
        PopBackdrop.DETAILS -> listOf(Color(0xFF050505), accent.copy(alpha = .38f), Color(0xFF111111))
        PopBackdrop.EMPTY -> listOf(Color(0xFFF8F8F8), accent.copy(alpha = .12f), Color.White)
        PopBackdrop.NEUTRAL -> listOf(Color.White, Color(0xFFF7F7F7))
    }
    Box(Modifier.fillMaxSize().background(Brush.linearGradient(colors))) {
        if (kind != PopBackdrop.NEUTRAL) Canvas(Modifier.fillMaxSize()) {
            val shift = size.width * .12f * drift
            drawCircle(accent.copy(alpha = if (kind == PopBackdrop.HOME || kind == PopBackdrop.DETAILS) .10f else .08f), size.width * .42f, Offset(size.width * .84f - shift, size.height * .15f))
            drawCircle(Color.White.copy(alpha = if (kind == PopBackdrop.HOME || kind == PopBackdrop.DETAILS) .035f else .28f), size.width * .30f, Offset(size.width * .12f + shift, size.height * .82f))
        }
        content()
    }
}

@Composable
fun PopSystemBars(darkBackground: Boolean) {
    val activity = LocalActivity.current ?: return
    SideEffect {
        WindowCompat.getInsetsController(activity.window, activity.window.decorView).apply {
            isAppearanceLightStatusBars = !darkBackground
            isAppearanceLightNavigationBars = !darkBackground
        }
    }
}

private data class HowPage(val title: Int, val body: Int, val icon: ImageVector)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HowItWorksSheet(show: Boolean, onDismiss: () -> Unit, onStart: () -> Unit) {
    if (!show) return
    val context = LocalContext.current
    val pages = listOf(
        HowPage(R.string.how_step_create_title, R.string.how_step_create_body, Icons.Default.Contactless),
        HowPage(R.string.how_step_customize_title, R.string.how_step_customize_body, Icons.Default.EditNote),
        HowPage(R.string.how_step_share_title, R.string.how_step_share_body, Icons.Default.QrCode2),
    )
    val pager = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()
    fun viewed() { context.getSharedPreferences("pop_help", Context.MODE_PRIVATE).edit().putBoolean("how_it_works_seen", true).apply() }
    ModalBottomSheet(onDismissRequest = { viewed(); onDismiss() }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.how_it_works), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                TextButton({ viewed(); onDismiss() }) { Text(stringResource(R.string.skip)) }
            }
            HorizontalPager(state = pager, modifier = Modifier.fillMaxWidth().height(330.dp)) { index ->
                val page = pages[index]
                Column(Modifier.fillMaxSize().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Surface(shape = CircleShape, color = Color(0xFFFFF6D5), modifier = Modifier.size(116.dp)) { Box(contentAlignment = Alignment.Center) { Icon(page.icon, null, Modifier.size(58.dp), tint = Color(0xFFD4AF37)) } }
                    Spacer(Modifier.height(24.dp))
                    Text(stringResource(page.title), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(10.dp))
                    Text(stringResource(page.body), textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Text(stringResource(R.string.page_count, pager.currentPage + 1, pages.size), style = MaterialTheme.typography.labelLarge)
            Row(Modifier.padding(20.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton({ scope.launch { pager.animateScrollToPage((pager.currentPage - 1).coerceAtLeast(0)) } }, Modifier.weight(1f), enabled = pager.currentPage > 0) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null); Text(stringResource(R.string.back)) }
                Button({ if (pager.currentPage == pages.lastIndex) { viewed(); onDismiss(); onStart() } else scope.launch { pager.animateScrollToPage(pager.currentPage + 1) } }, Modifier.weight(1f)) { Text(stringResource(if (pager.currentPage == pages.lastIndex) R.string.start_now else R.string.next)); Icon(Icons.AutoMirrored.Filled.ArrowForward, null) }
            }
        }
    }
}
