package com.popwam.pop.ui.share

import android.content.Intent
import android.graphics.Bitmap
import android.provider.Settings
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import com.popwam.pop.data.localization.popStringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.popwam.pop.R
import com.popwam.pop.hce.HceConfig
import com.popwam.pop.nfc.NfcCoordinator
import com.popwam.pop.ui.FigmaLtrText
import com.popwam.pop.ui.components.PopApprovedAsset
import com.popwam.pop.ui.components.PopBrandedLoading
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class ShareInitialPanel { NONE, QR, NFC, HCE }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareCenterScreen(
    state: ShareUiState,
    viewModel: ShareViewModel,
    activeProfile: ActiveShareProfile?,
    navigate: (String) -> Unit,
    initialPanel: ShareInitialPanel = ShareInitialPanel.NONE,
    onBack: () -> Unit = {},
) {
    val context = LocalContext.current
    val arabic = LocalConfiguration.current.locales[0].language == "ar"
    val nativeShareTitle = popStringResource(R.string.share_figma_title)
    val lifecycleOwner = LocalLifecycleOwner.current
    var nfcPanel by rememberSaveable { mutableStateOf(false) }
    var hceQuickPanel by rememberSaveable { mutableStateOf(false) }
    var initialPanelConsumed by rememberSaveable(activeProfile?.id, initialPanel) { mutableStateOf(false) }

    LaunchedEffect(activeProfile) {
        if (activeProfile == null) viewModel.clearActiveProfile() else viewModel.activateProfile(activeProfile)
    }
    LaunchedEffect(state.loadState, state.shareable, initialPanel, activeProfile?.id) {
        if (!initialPanelConsumed && state.loadState == ShareLoadState.READY) {
            when (initialPanel) {
                ShareInitialPanel.QR -> if (state.shareable) viewModel.showQr()
                ShareInitialPanel.NFC -> nfcPanel = true
                ShareInitialPanel.HCE -> {
                    if (state.shareable && state.hce.availability == HceAvailability.READY) {
                        viewModel.setHce(context, true)
                    }
                    hceQuickPanel = true
                }
                ShareInitialPanel.NONE -> Unit
            }
            initialPanelConsumed = true
        }
    }
    LaunchedEffect(state.hce.activeForProfile, state.hce.requested, state.hce.availability) {
        HceConfig.refreshPreferredService(context)
    }
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refreshDeviceCapabilities()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            viewModel.cancelNfcOperation()
        }
    }

    when (state.loadState) {
        ShareLoadState.INITIAL_LOADING -> ShareLoading()
        ShareLoadState.EMPTY -> ShareEmpty()
        ShareLoadState.ERROR -> ShareError(state.errorCode, viewModel::refresh)
        ShareLoadState.READY -> LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 16.dp, bottom = 120.dp),
        ) {
            item { ApprovedShareTopBar(onBack = onBack, onClose = onBack) }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ApprovedShareProfileCard(
                    state = state,
                    copy = {
                        state.payload?.let { payload ->
                            runCatching {
                                SharePlatform.copy(context, payload)
                                viewModel.linkCopied()
                            }.onFailure { viewModel.qrFailed() }
                        }
                    },
                    showQr = { if (state.shareable) viewModel.showQr() },
                )
            }

            if (!state.shareable) {
                item { Spacer(Modifier.height(12.dp)) }
                item {
                    UnshareableCard(state) {
                        activeProfile?.id?.let {
                            navigate(if (state.availability == ShareAvailability.PRIVATE) "profile/$it/edit/VISIBILITY" else "profile-publish/$it")
                        }
                    }
                }
            }
            if (state.availability == ShareAvailability.UNLISTED) {
                item { Spacer(Modifier.height(12.dp)) }
                item { StatusNotice(R.string.share_unlisted_notice, Icons.Default.VisibilityOff) }
            }

            item { Spacer(Modifier.height(40.dp)) }
            item {
                ApprovedShareActions(
                    state = state,
                    onWhatsApp = {
                        state.payload?.let {
                            runCatching {
                                SharePlatform.shareWhatsApp(context, it, arabic)
                                viewModel.nativeShareOpened()
                            }.onFailure { viewModel.qrFailed() }
                        }
                    },
                    onShareLink = {
                        state.payload?.let {
                            runCatching {
                                SharePlatform.shareLink(context, it, nativeShareTitle, arabic)
                                viewModel.nativeShareOpened()
                            }.onFailure { viewModel.qrFailed() }
                        }
                    },
                    onQr = { if (state.shareable) viewModel.showQr() },
                    onNfc = { nfcPanel = true },
                    onHce = {
                        when (state.hce.availability) {
                            HceAvailability.READY -> viewModel.setHce(context, true)
                            HceAvailability.DISABLED -> openNfcSettings(context)
                            else -> Unit
                        }
                    },
                )
            }

            if (state.hce.activeForProfile || state.hce.requested) {
                item { Spacer(Modifier.height(16.dp)) }
                item { ApprovedHceGuidance() }
            }

            item { Spacer(Modifier.height(56.dp)) }
            item { ApprovedSharePrivacyCard { navigate("settings/privacy") } }

            state.feedback?.let { feedback ->
                item { Spacer(Modifier.height(12.dp)) }
                item { ShareFeedback(feedback) { viewModel.consumeFeedback() } }
            }
            state.errorCode?.let {
                item { Spacer(Modifier.height(12.dp)) }
                item { ErrorNotice(it) }
            }
        }
    }

    if (state.qrVisible && state.payload != null) QrSheet(state.payload, viewModel::hideQr, viewModel)
    if (nfcPanel) NfcWriteSheet(state, viewModel, { nfcPanel = false; viewModel.cancelNfcOperation() })
    if (hceQuickPanel) HceCountdownSheet(state) {
        hceQuickPanel = false
        viewModel.setHce(context, false)
        if (initialPanel == ShareInitialPanel.HCE) onBack()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun HceCountdownSheet(state:ShareUiState,dismiss:()->Unit){
    var remaining by remember(state.activeProfile?.id){mutableIntStateOf(10)}
    LaunchedEffect(Unit){while(remaining>0){delay(1_000);remaining--};dismiss()}
    ModalBottomSheet(onDismissRequest=dismiss){
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(16.dp)){
            PopApprovedAsset(R.drawable.pop_approved_share_tap,null,Modifier.size(72.dp))
            when{
                !state.shareable->Text(popStringResource(R.string.share_publish_required),style=MaterialTheme.typography.titleMedium)
                state.hce.availability==HceAvailability.READY->Text(popStringResource(R.string.profile_touch_countdown,remaining),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
                state.hce.availability==HceAvailability.DISABLED->Text(popStringResource(R.string.share_nfc_disabled),style=MaterialTheme.typography.titleMedium)
                else->Text(popStringResource(R.string.share_hce_unsupported),style=MaterialTheme.typography.titleMedium)
            }
            TextButton(dismiss){Text(popStringResource(R.string.close))}
        }
    }
}


@Composable
private fun ApprovedShareTopBar(onBack: () -> Unit, onClose: () -> Unit) {
    val rtl = androidx.compose.ui.platform.LocalLayoutDirection.current == androidx.compose.ui.unit.LayoutDirection.Rtl
    val ink = Color(0xFF111817)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(66.dp),
    ) {
        Surface(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .size(44.dp)
                .clickable(role = Role.Button, onClick = onBack),
            shape = RoundedCornerShape(22.dp),
            color = Color(0xFFEEF3F2),
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                PopApprovedAsset(
                    R.drawable.pop_approved_chevron,
                    popStringResource(R.string.back),
                    Modifier
                        .size(26.dp)
                        .graphicsLayer(scaleX = if (rtl) -1f else 1f),
                    tint = ink,
                )
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 52.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = popStringResource(R.string.share_figma_title),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = ink,
                textAlign = TextAlign.Center,
                maxLines = 1,
            )
            Text(
                text = popStringResource(R.string.share_figma_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = ink,
                textAlign = TextAlign.Center,
                maxLines = 2,
            )
        }

        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .size(44.dp)
                .clickable(role = Role.Button, onClick = onClose),
            contentAlignment = Alignment.Center,
        ) {
            PopApprovedAsset(
                R.drawable.pop_figma_share_close,
                popStringResource(R.string.close),
                Modifier.size(28.dp),
            )
        }
    }
}

@Composable
private fun ApprovedShareProfileCard(
    state: ShareUiState,
    copy: () -> Unit,
    showQr: () -> Unit,
) {
    val ink = Color(0xFF111817)
    val muted = Color(0xFF52605E)
    val teal = Color(0xFF0EA5A4)

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 210.dp),
        shape = RoundedCornerShape(7.dp),
        color = Color.White,
        shadowElevation = 4.dp,
    ) {
        BoxWithConstraints(Modifier.fillMaxWidth()) {
            val compact = maxWidth < 340.dp
            val qrSize = if (compact) 76.dp else 92.dp
            val copyWidth = if (compact) .56f else .62f
            val textEndPadding = if (compact) 94.dp else 112.dp

            Box(Modifier.fillMaxWidth().heightIn(min = if (compact) 230.dp else 210.dp)) {
            Column(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(start = 18.dp, top = 22.dp, end = textEndPadding),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text(
                    text = popStringResource(R.string.share_figma_your_link),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = teal,
                    maxLines = 1,
                )
                Text(
                    text = state.payload?.profileName ?: state.activeProfile?.name.orEmpty(),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = ink,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                state.activeProfile?.type?.takeIf(String::isNotBlank)?.let { type ->
                    Text(
                        text = when (type.uppercase()) {
                            "BUSINESS" -> popStringResource(R.string.profile_type_business)
                            "PERSONAL" -> popStringResource(R.string.profile_type_personal)
                            else -> type
                        },
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = muted,
                        maxLines = 1,
                    )
                }
                state.payload?.let { payload ->
                    androidx.compose.runtime.CompositionLocalProvider(
                        androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr,
                    ) {
                        Text(
                            text = payload.canonicalUrl,
                            style = MaterialTheme.typography.bodySmall,
                            color = muted,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }

            OutlinedButton(
                onClick = copy,
                enabled = state.payload != null,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 19.dp, bottom = 24.dp)
                    .fillMaxWidth(copyWidth)
                    .height(30.dp),
                shape = RoundedCornerShape(6.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, ink),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = ink),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
            ) {
                PopApprovedAsset(R.drawable.pop_approved_copy, null, Modifier.size(18.dp), tint = ink)
                Spacer(Modifier.width(9.dp))
                Text(
                    popStringResource(R.string.share_copy),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Medium,
                )
            }

            PopApprovedAsset(
                drawable = R.drawable.pop_figma_share_qr_mark,
                contentDescription = popStringResource(R.string.share_show_qr),
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 31.dp, end = if (compact) 14.dp else 18.dp)
                    .size(qrSize)
                    .clickable(enabled = state.shareable, role = Role.Button, onClick = showQr)
                    .graphicsLayer(alpha = if (state.shareable) 1f else .35f),
            )

            Text(
                text = popStringResource(R.string.share_figma_scan),
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = if (compact) 12.dp else 18.dp, bottom = 24.dp)
                    .widthIn(max = if (compact) 135.dp else 170.dp),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = muted,
                textAlign = TextAlign.Center,
                maxLines = 2,
            )

            if (!state.shareable) {
                Text(
                    text = availabilityLabel(state.availability),
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 20.dp, bottom = 18.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = teal,
                )
            }
        }
        }
    }
}

@Composable
private fun ApprovedShareActions(
    state: ShareUiState,
    onWhatsApp: () -> Unit,
    onShareLink: () -> Unit,
    onQr: () -> Unit,
    onNfc: () -> Unit,
    onHce: () -> Unit,
) {
    val hceEnabled = state.shareable && state.hce.availability == HceAvailability.READY
    val nfcEnabled = state.shareable && state.nfc.availability != NfcAvailability.UNAVAILABLE

    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ApprovedShareAction(
                label = R.string.share_figma_whatsapp,
                subtitle = R.string.share_figma_whatsapp_subtitle,
                drawable = R.drawable.pop_figma_share_whatsapp,
                modifier = Modifier.weight(1f),
                enabled = state.shareable,
                onClick = onWhatsApp,
            )
            ApprovedShareAction(
                label = R.string.share_figma_share_link,
                subtitle = R.string.share_figma_share_link_subtitle,
                drawable = R.drawable.pop_figma_share_link,
                modifier = Modifier.weight(1f),
                enabled = state.shareable,
                onClick = onShareLink,
            )
            ApprovedShareAction(
                label = R.string.share_show_qr,
                subtitle = R.string.share_figma_qr_subtitle,
                drawable = R.drawable.pop_approved_action_qr,
                modifier = Modifier.weight(1f),
                enabled = state.shareable,
                onClick = onQr,
            )
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Spacer(Modifier.weight(.5f))
            ApprovedShareAction(
                label = R.string.share_figma_nfc,
                subtitle = R.string.share_figma_nfc_subtitle,
                drawable = R.drawable.pop_figma_share_nfc,
                modifier = Modifier.weight(1f),
                enabled = nfcEnabled,
                onClick = onNfc,
            )
            ApprovedShareAction(
                label = R.string.share_figma_hce,
                subtitle = R.string.share_figma_hce_subtitle,
                drawable = R.drawable.pop_figma_share_hce,
                modifier = Modifier.weight(1f),
                enabled = hceEnabled,
                onClick = onHce,
            )
            Spacer(Modifier.weight(.5f))
        }
    }
}

@Composable
private fun ApprovedShareAction(
    label: Int,
    subtitle: Int,
    drawable: Int,
    modifier: Modifier,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val ink = Color(0xFF111817)
    val muted = Color(0xFF52605E)
    Column(
        modifier = modifier
            .heightIn(min = 106.dp)
            .semantics { role = Role.Button }
            .clickable(enabled = enabled, onClick = onClick)
            .graphicsLayer(alpha = if (enabled) 1f else .35f)
            .padding(horizontal = 2.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        PopApprovedAsset(drawable, null, Modifier.size(34.dp))
        Spacer(Modifier.height(8.dp))
        Text(
            text = popStringResource(label),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = ink,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = popStringResource(subtitle),
            style = MaterialTheme.typography.bodySmall,
            color = muted,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
    }
}

@Composable
private fun ApprovedSharePrivacyCard(onClick: () -> Unit) {
    val rtl = androidx.compose.ui.platform.LocalLayoutDirection.current == androidx.compose.ui.unit.LayoutDirection.Rtl
    val ink = Color(0xFF111817)
    val teal = Color(0xFF0EA5A4)

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 122.dp)
            .clickable(role = Role.Button, onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 3.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            PopApprovedAsset(R.drawable.pop_figma_share_privacy, null, Modifier.size(30.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    popStringResource(R.string.share_figma_privacy_title),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = ink,
                )
                Text(
                    popStringResource(R.string.share_figma_privacy_body),
                    style = MaterialTheme.typography.bodyMedium,
                    color = ink,
                    maxLines = 3,
                )
                Text(
                    popStringResource(R.string.share_figma_privacy_action),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = teal,
                )
            }
            PopApprovedAsset(
                R.drawable.pop_figma_share_privacy_chevron,
                null,
                Modifier
                    .size(18.dp)
                    .graphicsLayer(scaleX = if (rtl) -1f else 1f),
            )
        }
    }
}

@Composable
private fun ApprovedHceGuidance(){
    Surface(Modifier.fillMaxWidth(),shape=RoundedCornerShape(8.dp),color=MaterialTheme.colorScheme.primaryContainer){
        Row(Modifier.fillMaxWidth().padding(14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(10.dp)){
            PopApprovedAsset(R.drawable.pop_approved_share_tap,null,Modifier.size(28.dp))
            Text(popStringResource(R.string.share_hce_guidance),style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onPrimaryContainer)
        }
    }
}

@Composable
private fun availabilityLabel(value: ShareAvailability) = popStringResource(when (value) {
    ShareAvailability.PUBLIC -> R.string.profile_public
    ShareAvailability.UNLISTED -> R.string.profile_unlisted
    ShareAvailability.PRIVATE -> R.string.profile_private
    ShareAvailability.PAUSED -> R.string.profile_pause
    ShareAvailability.NOT_PUBLISHED -> R.string.home_status_draft
    ShareAvailability.UNAVAILABLE -> R.string.disabled
})

@Composable
private fun UnshareableCard(state: ShareUiState, editVisibility: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(Icons.Default.Lock, null, tint = MaterialTheme.colorScheme.onErrorContainer)
            Text(popStringResource(when (state.availability) {
                ShareAvailability.PRIVATE -> R.string.share_profile_private
                ShareAvailability.PAUSED -> R.string.share_profile_paused
                else -> R.string.share_publish_required
            }), color = MaterialTheme.colorScheme.onErrorContainer)
            Button(editVisibility,Modifier.fillMaxWidth().heightIn(min=48.dp)) { Text(popStringResource(when(state.availability){ShareAvailability.PRIVATE->R.string.profile_section_visibility;ShareAvailability.PAUSED->R.string.profile_resume;else->R.string.profile_publish})) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QrSheet(payload: CanonicalSharePayload, dismiss: () -> Unit, viewModel: ShareViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val qrShareTitle = popStringResource(R.string.share_qr)
    var bitmapState by remember(payload.canonicalUrl) { mutableStateOf<Result<Bitmap>?>(null) }
    LaunchedEffect(payload.canonicalUrl) {
        bitmapState = withContext(Dispatchers.Default) { runCatching { ShareQrRenderer.renderPresentation(context, payload) } }
    }
    ModalBottomSheet(onDismissRequest = dismiss, sheetState = sheetState) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(payload.profileName, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(popStringResource(R.string.share_qr_ready), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            when {
                bitmapState == null -> Box(Modifier.fillMaxWidth().aspectRatio(1f / 1.24f), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                bitmapState?.isFailure == true -> ErrorNotice("QR_GENERATION_FAILED")
                else -> bitmapState?.getOrNull()?.let { bitmap ->
                    Surface(color = androidx.compose.ui.graphics.Color.White, shape = RoundedCornerShape(20.dp)) {
                        Image(bitmap.asImageBitmap(), popStringResource(R.string.share_qr_description), Modifier.fillMaxWidth().aspectRatio(1f / 1.24f).padding(8.dp))
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button({ scope.launch { when (SharePlatform.saveQr(context, payload, bitmap)) { QrExportResult.Success -> viewModel.qrSaved(); else -> viewModel.qrFailed() } } }, Modifier.weight(1f)) { PopApprovedAsset(R.drawable.pop_figma_share_download_qr,null,Modifier.size(20.dp)); Spacer(Modifier.width(6.dp)); Text(popStringResource(R.string.share_download_qr)) }
                        OutlinedButton({ scope.launch { when (SharePlatform.shareQr(context, payload, bitmap, qrShareTitle)) { QrExportResult.Success -> viewModel.qrShared(); else -> viewModel.qrFailed() } } }, Modifier.weight(1f)) { PopApprovedAsset(R.drawable.pop_figma_share_link,null,Modifier.size(20.dp)); Spacer(Modifier.width(6.dp)); Text(popStringResource(R.string.share_qr)) }
                    }
                }
            }
            FigmaLtrText(payload.canonicalUrl, MaterialTheme.typography.bodySmall)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NfcWriteSheet(state: ShareUiState, viewModel: ShareViewModel, dismiss: () -> Unit) {
    val context = LocalContext.current
    var confirmLock by remember { mutableStateOf(false) }
    ModalBottomSheet(dismiss) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(popStringResource(R.string.share_write_nfc), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(popStringResource(R.string.share_nfc_public_only), color = MaterialTheme.colorScheme.onSurfaceVariant)
            state.payload?.let { FigmaLtrText(it.canonicalUrl, MaterialTheme.typography.bodySmall) }
            when (state.nfc.availability) {
                NfcAvailability.UNAVAILABLE -> StatusNotice(R.string.share_nfc_unavailable, Icons.Default.Nfc)
                NfcAvailability.DISABLED -> Button({ openNfcSettings(context) }, Modifier.fillMaxWidth()) { Text(popStringResource(R.string.share_enable_nfc)) }
                NfcAvailability.READY -> when (state.nfc.stage) {
                    NfcStage.IDLE -> Button(viewModel::startNfcWrite, Modifier.fillMaxWidth(), enabled = state.shareable) { Icon(Icons.Default.Nfc, null); Spacer(Modifier.width(8.dp)); Text(popStringResource(R.string.share_start_nfc_write)) }
                    NfcStage.WAITING_FOR_TAG -> NfcProgress(R.string.share_nfc_waiting, true, viewModel::cancelNfcOperation)
                    NfcStage.WRITING -> NfcProgress(if (state.nfc.operation == NfcOperation.LOCK) R.string.share_nfc_locking else R.string.share_nfc_writing, false, viewModel::cancelNfcOperation)
                    NfcStage.ERROR -> {
                        ErrorNotice(nfcFailureMessage(state.nfc.failureCode))
                        Button(viewModel::startNfcWrite, Modifier.fillMaxWidth()) { Text(popStringResource(R.string.retry)) }
                    }
                    NfcStage.SUCCESS -> {
                        StatusNotice(if (state.nfc.locked) R.string.share_nfc_locked else R.string.share_nfc_write_success, Icons.Default.CheckCircle)
                        if (!state.nfc.locked) OutlinedButton({ confirmLock = true }, Modifier.fillMaxWidth()) { Icon(Icons.Default.Lock, null); Spacer(Modifier.width(8.dp)); Text(popStringResource(R.string.lock_read_only)) }
                        Button(dismiss, Modifier.fillMaxWidth()) { Text(popStringResource(R.string.close)) }
                    }
                }
            }
        }
    }
    if (confirmLock) AlertDialog(
        onDismissRequest = { confirmLock = false },
        icon = { Icon(Icons.Default.Warning, null, tint = MaterialTheme.colorScheme.error) },
        title = { Text(popStringResource(R.string.lock_confirm)) },
        text = { Text(popStringResource(R.string.share_nfc_lock_warning)) },
        confirmButton = { TextButton({ confirmLock = false; viewModel.requestNfcLock() }) { Text(popStringResource(R.string.lock_confirm), color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton({ confirmLock = false }) { Text(popStringResource(R.string.cancel)) } },
    )
}

@Composable
private fun NfcProgress(message: Int, cancellable: Boolean, cancel: () -> Unit) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        CircularProgressIndicator()
        Text(popStringResource(message), style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
        if (cancellable) TextButton(cancel) { Text(popStringResource(R.string.cancel)) }
    }
}

private fun nfcFailureMessage(code: String?) = when (code) {
    "UNSUPPORTED" -> "NFC_UNSUPPORTED"
    "READ_ONLY" -> "NFC_READ_ONLY"
    "TOO_SMALL" -> "NFC_TOO_SMALL"
    "CONNECT_FAILED" -> "NFC_CONNECT_FAILED"
    "VERIFY_FAILED" -> "NFC_VERIFY_FAILED"
    "LOCK_UNSUPPORTED" -> "NFC_LOCK_UNSUPPORTED"
    "LOCK_FAILED" -> "NFC_LOCK_FAILED"
    else -> "NFC_WRITE_FAILED"
}

@Composable
private fun StatusNotice(message: Int, icon: ImageVector) {
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
            Text(popStringResource(message), Modifier.padding(horizontal = 12.dp), color = MaterialTheme.colorScheme.onSecondaryContainer, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun ShareFeedback(feedback: ShareFeedback, consumed: () -> Unit) {
    val message = when (feedback) {
        ShareFeedback.LINK_COPIED -> R.string.share_copied
        ShareFeedback.SHARE_OPENED -> R.string.share_opened
        ShareFeedback.QR_SAVED -> R.string.share_qr_saved
        ShareFeedback.QR_SHARED -> R.string.share_qr_shared
        ShareFeedback.QR_FAILED -> R.string.share_qr_failed
        ShareFeedback.PRODUCT_UPDATED -> R.string.share_target_updated
        ShareFeedback.PRODUCT_ACTIVATED -> R.string.share_product_activated
    }
    Surface(Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite }, color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(16.dp)) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.CheckCircle, null)
            Text(popStringResource(message), Modifier.weight(1f).padding(horizontal = 10.dp))
            IconButton(consumed) { Icon(Icons.Default.Close, popStringResource(R.string.close)) }
        }
    }
}

@Composable
private fun ErrorNotice(code: String) {
    val message = when (code) {
        "NFC_UNSUPPORTED" -> R.string.unsupported_tag
        "NFC_READ_ONLY" -> R.string.tag_read_only
        "NFC_TOO_SMALL" -> R.string.tag_too_small
        "NFC_LOCK_UNSUPPORTED" -> R.string.share_nfc_lock_unsupported
        "NFC_VERIFY_FAILED" -> R.string.share_nfc_verify_failed
        else -> R.string.generic_error
    }
    Surface(Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Assertive }, color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(16.dp)) {
        Text(popStringResource(message), Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onErrorContainer)
    }
}

@Composable private fun ShareLoading() = PopBrandedLoading()
@Composable private fun ShareEmpty() = Box(Modifier.fillMaxSize().padding(28.dp), contentAlignment = Alignment.Center) { Text(popStringResource(R.string.no_active_profile), style = MaterialTheme.typography.titleMedium) }
@Composable private fun ShareError(code: String?, retry: () -> Unit) = Box(Modifier.fillMaxSize().padding(28.dp), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) { ErrorNotice(code ?: "SHARE_UNAVAILABLE"); Button(retry) { Text(popStringResource(R.string.retry)) } } }

private fun openNfcSettings(context: android.content.Context) {
    runCatching { context.startActivity(Intent(Settings.ACTION_NFC_SETTINGS)) }
}
