package com.popwam.pop.ui.share

import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.provider.Settings
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import com.popwam.pop.data.api.ShareProductDto
import com.popwam.pop.hce.HceConfig
import com.popwam.pop.nfc.NfcCoordinator
import com.popwam.pop.ui.FigmaLtrText
import com.popwam.pop.ui.QrScanner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class ShareInitialPanel { NONE, QR, NFC, HCE }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareCenterScreen(
    state: ShareUiState,
    viewModel: ShareViewModel,
    activeProfile: ActiveShareProfile?,
    onActivate: () -> Unit,
    navigate: (String) -> Unit,
    initialPanel: ShareInitialPanel = ShareInitialPanel.NONE,
) {
    val context = LocalContext.current
    val arabic = LocalConfiguration.current.locales[0].language == "ar"
    val nativeShareTitle = stringResource(R.string.share_native)
    val lifecycleOwner = LocalLifecycleOwner.current
    var nfcPanel by rememberSaveable { mutableStateOf(false) }
    var hcePanel by rememberSaveable { mutableStateOf(false) }
    var productEditor by remember { mutableStateOf<ShareProductDto?>(null) }
    var initialPanelConsumed by rememberSaveable(activeProfile?.id, initialPanel) { mutableStateOf(false) }

    LaunchedEffect(activeProfile) {
        if (activeProfile == null) viewModel.clearActiveProfile() else viewModel.activateProfile(activeProfile)
    }
    LaunchedEffect(state.shareable, initialPanel, activeProfile?.id) {
        if (!initialPanelConsumed && state.shareable) {
            when (initialPanel) {
                ShareInitialPanel.QR -> viewModel.showQr()
                ShareInitialPanel.NFC -> nfcPanel = true
                ShareInitialPanel.HCE -> hcePanel = true
                ShareInitialPanel.NONE -> Unit
            }
            initialPanelConsumed = true
        }
    }
    LaunchedEffect(state.hce.activeForProfile, state.hce.requested, state.hce.availability) {
        HceConfig.refreshPreferredService(context)
    }
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event -> if (event == Lifecycle.Event.ON_RESUME) viewModel.refreshDeviceCapabilities() }
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
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            item {
                Text(stringResource(R.string.share_eyebrow), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
                Text(stringResource(R.string.share_title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text(stringResource(R.string.share_description), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
            }
            item { ActiveProfileCard(state) }
            if (!state.shareable) item { UnshareableCard(state) { activeProfile?.id?.let { navigate("profile/$it/edit/VISIBILITY") } } }
            if (state.availability == ShareAvailability.UNLISTED) item { StatusNotice(R.string.share_unlisted_notice, Icons.Default.VisibilityOff) }
            item {
                Text(stringResource(R.string.share_how), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ShareAction(R.string.share_whatsapp, Icons.Default.Forum, Modifier.weight(1f), state.shareable) {
                        state.payload?.let { runCatching { SharePlatform.shareWhatsApp(context, it, arabic); viewModel.nativeShareOpened() }.onFailure { viewModel.qrFailed() } }
                    }
                    ShareAction(R.string.share_copy, Icons.Default.ContentCopy, Modifier.weight(1f), state.shareable) {
                        state.payload?.let { runCatching { SharePlatform.copy(context, it); viewModel.linkCopied() }.onFailure { viewModel.qrFailed() } }
                    }
                    ShareAction(R.string.share_native, Icons.Default.Share, Modifier.weight(1f), state.shareable) {
                        state.payload?.let { runCatching { SharePlatform.shareLink(context, it, nativeShareTitle, arabic); viewModel.nativeShareOpened() }.onFailure { viewModel.qrFailed() } }
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ShareAction(R.string.share_show_qr, Icons.Default.QrCode2, Modifier.weight(1f), state.shareable, viewModel::showQr)
                    ShareAction(R.string.share_write_nfc, Icons.Default.Nfc, Modifier.weight(1f), state.shareable && state.nfc.availability != NfcAvailability.UNAVAILABLE) { nfcPanel = true }
                    HceAction(state, Modifier.weight(1f)) { hcePanel = true }
                }
            }
            item { StatusNotice(R.string.share_privacy_note, Icons.Default.PrivacyTip) }
            state.feedback?.let { feedback -> item { ShareFeedback(feedback) { viewModel.consumeFeedback() } } }
            state.errorCode?.let { item { ErrorNotice(it) } }
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) {
                        Text(stringResource(R.string.share_products), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text(stringResource(R.string.share_products_help), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Button(onActivate) { Icon(Icons.Default.AddCircle, null); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.activate_product)) }
                }
            }
            if (state.products.isEmpty()) item { EmptyProducts() }
            items(state.products, key = { it.id }) { product -> ProductCard(product, { productEditor = product }, { runCatching { SharePlatform.copy(context, CanonicalSharePayload(activeProfile?.id.orEmpty(), product.label, product.permanentUrl)); viewModel.linkCopied() } }) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TextButton({ navigate("products") }) { Text(stringResource(R.string.share_legacy_routes)) }
                    TextButton({ navigate("virtual-cards") }) { Text(stringResource(R.string.wallet)) }
                }
            }
        }
    }

    if (state.qrVisible && state.payload != null) QrSheet(state.payload, viewModel::hideQr, viewModel)
    if (nfcPanel) NfcWriteSheet(state, viewModel, { nfcPanel = false; viewModel.cancelNfcOperation() })
    if (hcePanel) HceSheet(state, viewModel) { hcePanel = false }
    productEditor?.let { ProductSheet(it, state, viewModel, { navigate("card/${it.id}") }) { productEditor = null } }
}

/** Stateless entry point used only by the debug design-review gallery. */
@Composable
fun ShareReviewScreen(state: ShareUiState, panel: ShareInitialPanel = ShareInitialPanel.NONE) {
    when (state.loadState) {
        ShareLoadState.INITIAL_LOADING -> ShareLoading()
        ShareLoadState.EMPTY -> ShareEmpty()
        ShareLoadState.ERROR -> ShareError(state.errorCode) {}
        ShareLoadState.READY -> LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            item {
                Text(stringResource(R.string.share_eyebrow), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
                Text(stringResource(R.string.share_title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text(stringResource(R.string.share_description), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
            }
            item { ActiveProfileCard(state) }
            if (!state.shareable) item { UnshareableCard(state) {} }
            if (state.availability == ShareAvailability.UNLISTED) item { StatusNotice(R.string.share_unlisted_notice, Icons.Default.VisibilityOff) }
            item {
                Text(stringResource(R.string.share_how), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ShareAction(R.string.share_copy, Icons.Default.ContentCopy, Modifier.weight(1f), state.shareable) {}
                    ShareAction(R.string.share_native, Icons.Default.Share, Modifier.weight(1f), state.shareable) {}
                    ShareAction(R.string.share_show_qr, Icons.Default.QrCode2, Modifier.weight(1f), state.shareable) {}
                }
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ShareAction(R.string.share_write_nfc, Icons.Default.Nfc, Modifier.weight(1f), state.shareable) {}
                    HceAction(state, Modifier.weight(1f)) {}
                }
            }
            when (panel) {
                ShareInitialPanel.QR -> state.payload?.let { payload -> item { QrReviewPanel(payload) } }
                ShareInitialPanel.NFC -> item { NfcReviewPanel(state) }
                ShareInitialPanel.HCE -> item { HceReviewPanel(state) }
                ShareInitialPanel.NONE -> Unit
            }
            item { StatusNotice(R.string.share_privacy_note, Icons.Default.PrivacyTip) }
            state.feedback?.let { feedback -> item { ShareFeedback(feedback) {} } }
            state.errorCode?.let { item { ErrorNotice(it) } }
            if (state.products.isEmpty()) item { EmptyProducts() }
            else items(state.products, key = { it.id }) { ProductCard(it, {}, {}) }
        }
    }
}

@Composable
private fun QrReviewPanel(payload: CanonicalSharePayload) {
    val context = LocalContext.current
    var bitmap by remember(payload.canonicalUrl) { mutableStateOf<Bitmap?>(null) }
    LaunchedEffect(payload.canonicalUrl) {
        bitmap = withContext(Dispatchers.Default) { runCatching { ShareQrRenderer.renderPresentation(context, payload, 720) }.getOrNull() }
    }
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(payload.profileName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            bitmap?.let { value ->
                Surface(color = androidx.compose.ui.graphics.Color.White, shape = RoundedCornerShape(18.dp)) {
                    Image(value.asImageBitmap(), stringResource(R.string.share_qr_description), Modifier.fillMaxWidth().aspectRatio(1f / 1.24f).padding(8.dp))
                }
            } ?: CircularProgressIndicator()
            FigmaLtrText(payload.canonicalUrl, MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun NfcReviewPanel(state: ShareUiState) {
    when (state.nfc.availability) {
        NfcAvailability.UNAVAILABLE -> StatusNotice(R.string.share_nfc_unavailable, Icons.Default.Nfc)
        NfcAvailability.DISABLED -> StatusNotice(R.string.share_nfc_disabled, Icons.Default.Nfc)
        NfcAvailability.READY -> when (state.nfc.stage) {
            NfcStage.IDLE -> StatusNotice(R.string.share_nfc_ready, Icons.Default.Nfc)
            NfcStage.WAITING_FOR_TAG -> NfcProgress(R.string.share_nfc_waiting, false) {}
            NfcStage.WRITING -> NfcProgress(R.string.share_nfc_writing, false) {}
            NfcStage.SUCCESS -> StatusNotice(if (state.nfc.locked) R.string.share_nfc_locked else R.string.share_nfc_write_success, Icons.Default.CheckCircle)
            NfcStage.ERROR -> ErrorNotice(nfcFailureMessage(state.nfc.failureCode))
        }
    }
}

@Composable
private fun HceReviewPanel(state: ShareUiState) {
    StatusNotice(
        when (state.hce.availability) {
            HceAvailability.UNAVAILABLE, HceAvailability.UNSUPPORTED -> R.string.share_hce_unsupported
            HceAvailability.DISABLED -> R.string.share_nfc_disabled
            HceAvailability.READY -> if (state.hce.activeForProfile) R.string.share_hce_ready else R.string.share_hce_observability
        },
        Icons.Default.Contactless,
    )
}

@Composable
private fun ActiveProfileCard(state: ShareUiState) {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp)) {
        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                Icon(Icons.Default.Person, null, Modifier.padding(14.dp), tint = MaterialTheme.colorScheme.onPrimaryContainer)
            }
            Column(Modifier.weight(1f).padding(horizontal = 14.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(stringResource(R.string.active_profile), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(state.activeProfile?.name.orEmpty(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                state.payload?.let { FigmaLtrText(it.canonicalUrl, MaterialTheme.typography.bodySmall) }
            }
            AssistChip(onClick = {}, label = { Text(availabilityLabel(state.availability)) })
        }
    }
}

@Composable
private fun availabilityLabel(value: ShareAvailability) = stringResource(when (value) {
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
            Text(stringResource(when (state.availability) {
                ShareAvailability.PRIVATE -> R.string.share_profile_private
                ShareAvailability.PAUSED -> R.string.share_profile_paused
                else -> R.string.share_publish_required
            }), color = MaterialTheme.colorScheme.onErrorContainer)
            OutlinedButton(editVisibility) { Text(stringResource(R.string.profile_section_visibility)) }
        }
    }
}

@Composable
private fun ShareAction(label: Int, icon: ImageVector, modifier: Modifier, enabled: Boolean, action: () -> Unit) {
    Surface(
        modifier = modifier.heightIn(min = 116.dp).semantics { role = Role.Button }.clickable(enabled = enabled, onClick = action),
        shape = RoundedCornerShape(20.dp),
        color = if (enabled) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .45f),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Icon(icon, null, tint = if (enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
            Text(stringResource(label), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun HceAction(state: ShareUiState, modifier: Modifier, action: () -> Unit) {
    val enabled = state.shareable && state.hce.availability != HceAvailability.UNAVAILABLE && state.hce.availability != HceAvailability.UNSUPPORTED
    Surface(modifier.heightIn(min = 116.dp).semantics { role = Role.Button }.clickable(enabled = enabled, onClick = action), shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Default.Contactless, null, tint = MaterialTheme.colorScheme.primary)
            Text(stringResource(if (state.hce.activeForProfile) R.string.disable_hce else R.string.share_phone_tap), fontWeight = FontWeight.SemiBold)
            Text(stringResource(when (state.hce.availability) {
                HceAvailability.UNAVAILABLE, HceAvailability.UNSUPPORTED -> R.string.share_hce_unsupported
                HceAvailability.DISABLED -> R.string.share_nfc_disabled
                HceAvailability.READY -> if (state.hce.activeForProfile) R.string.share_hce_ready else R.string.share_hce_observability
            }), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HceSheet(state: ShareUiState, viewModel: ShareViewModel, dismiss: () -> Unit) {
    val context = LocalContext.current
    ModalBottomSheet(dismiss) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(stringResource(R.string.share_phone_tap), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.hce_explanation), color = MaterialTheme.colorScheme.onSurfaceVariant)
            state.activeProfile?.name?.takeIf(String::isNotBlank)?.let {
                Text(it, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
            state.payload?.let { FigmaLtrText(it.canonicalUrl, MaterialTheme.typography.bodySmall) }
            when (state.hce.availability) {
                HceAvailability.UNAVAILABLE, HceAvailability.UNSUPPORTED ->
                    StatusNotice(R.string.share_hce_unsupported, Icons.Default.Contactless)
                HceAvailability.DISABLED -> {
                    StatusNotice(R.string.share_nfc_disabled, Icons.Default.Nfc)
                    Button({ openNfcSettings(context) }, Modifier.fillMaxWidth()) {
                        Text(stringResource(R.string.share_enable_nfc))
                    }
                }
                HceAvailability.READY -> {
                    StatusNotice(
                        if (state.hce.activeForProfile) R.string.share_hce_ready else R.string.share_hce_observability,
                        Icons.Default.Contactless,
                    )
                    Button(
                        { viewModel.setHce(context, !state.hce.requested) },
                        Modifier.fillMaxWidth(),
                        enabled = state.shareable,
                    ) {
                        Text(stringResource(if (state.hce.activeForProfile) R.string.disable_hce else R.string.enable_hce))
                    }
                }
            }
            Text(stringResource(R.string.hce_compatibility), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(dismiss, Modifier.align(Alignment.End)) { Text(stringResource(R.string.close)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QrSheet(payload: CanonicalSharePayload, dismiss: () -> Unit, viewModel: ShareViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val qrShareTitle = stringResource(R.string.share_qr)
    var bitmapState by remember(payload.canonicalUrl) { mutableStateOf<Result<Bitmap>?>(null) }
    LaunchedEffect(payload.canonicalUrl) {
        bitmapState = withContext(Dispatchers.Default) { runCatching { ShareQrRenderer.renderPresentation(context, payload) } }
    }
    ModalBottomSheet(onDismissRequest = dismiss, sheetState = sheetState) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(payload.profileName, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.share_qr_ready), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            when {
                bitmapState == null -> Box(Modifier.fillMaxWidth().aspectRatio(1f / 1.24f), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                bitmapState?.isFailure == true -> ErrorNotice("QR_GENERATION_FAILED")
                else -> bitmapState?.getOrNull()?.let { bitmap ->
                    Surface(color = androidx.compose.ui.graphics.Color.White, shape = RoundedCornerShape(20.dp)) {
                        Image(bitmap.asImageBitmap(), stringResource(R.string.share_qr_description), Modifier.fillMaxWidth().aspectRatio(1f / 1.24f).padding(8.dp))
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button({ scope.launch { when (SharePlatform.saveQr(context, payload, bitmap)) { QrExportResult.Success -> viewModel.qrSaved(); else -> viewModel.qrFailed() } } }, Modifier.weight(1f)) { Icon(Icons.Default.Download, null); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.share_download_qr)) }
                        OutlinedButton({ scope.launch { when (SharePlatform.shareQr(context, payload, bitmap, qrShareTitle)) { QrExportResult.Success -> viewModel.qrShared(); else -> viewModel.qrFailed() } } }, Modifier.weight(1f)) { Icon(Icons.Default.Share, null); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.share_qr)) }
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
            Text(stringResource(R.string.share_write_nfc), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.share_nfc_public_only), color = MaterialTheme.colorScheme.onSurfaceVariant)
            state.payload?.let { FigmaLtrText(it.canonicalUrl, MaterialTheme.typography.bodySmall) }
            when (state.nfc.availability) {
                NfcAvailability.UNAVAILABLE -> StatusNotice(R.string.share_nfc_unavailable, Icons.Default.Nfc)
                NfcAvailability.DISABLED -> Button({ openNfcSettings(context) }, Modifier.fillMaxWidth()) { Text(stringResource(R.string.share_enable_nfc)) }
                NfcAvailability.READY -> when (state.nfc.stage) {
                    NfcStage.IDLE -> Button(viewModel::startNfcWrite, Modifier.fillMaxWidth(), enabled = state.shareable) { Icon(Icons.Default.Nfc, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.share_start_nfc_write)) }
                    NfcStage.WAITING_FOR_TAG -> NfcProgress(R.string.share_nfc_waiting, true, viewModel::cancelNfcOperation)
                    NfcStage.WRITING -> NfcProgress(if (state.nfc.operation == NfcOperation.LOCK) R.string.share_nfc_locking else R.string.share_nfc_writing, false, viewModel::cancelNfcOperation)
                    NfcStage.ERROR -> {
                        ErrorNotice(nfcFailureMessage(state.nfc.failureCode))
                        Button(viewModel::startNfcWrite, Modifier.fillMaxWidth()) { Text(stringResource(R.string.retry)) }
                    }
                    NfcStage.SUCCESS -> {
                        StatusNotice(if (state.nfc.locked) R.string.share_nfc_locked else R.string.share_nfc_write_success, Icons.Default.CheckCircle)
                        if (!state.nfc.locked) OutlinedButton({ confirmLock = true }, Modifier.fillMaxWidth()) { Icon(Icons.Default.Lock, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.lock_read_only)) }
                        Button(dismiss, Modifier.fillMaxWidth()) { Text(stringResource(R.string.close)) }
                    }
                }
            }
        }
    }
    if (confirmLock) AlertDialog(
        onDismissRequest = { confirmLock = false },
        icon = { Icon(Icons.Default.Warning, null, tint = MaterialTheme.colorScheme.error) },
        title = { Text(stringResource(R.string.lock_confirm)) },
        text = { Text(stringResource(R.string.share_nfc_lock_warning)) },
        confirmButton = { TextButton({ confirmLock = false; viewModel.requestNfcLock() }) { Text(stringResource(R.string.lock_confirm), color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton({ confirmLock = false }) { Text(stringResource(R.string.cancel)) } },
    )
}

@Composable
private fun NfcProgress(message: Int, cancellable: Boolean, cancel: () -> Unit) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        CircularProgressIndicator()
        Text(stringResource(message), style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
        if (cancellable) TextButton(cancel) { Text(stringResource(R.string.cancel)) }
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
            Text(stringResource(message), Modifier.padding(horizontal = 12.dp), color = MaterialTheme.colorScheme.onSecondaryContainer, style = MaterialTheme.typography.bodyMedium)
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
            Text(stringResource(message), Modifier.weight(1f).padding(horizontal = 10.dp))
            IconButton(consumed) { Icon(Icons.Default.Close, stringResource(R.string.close)) }
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
        Text(stringResource(message), Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onErrorContainer)
    }
}

@Composable private fun ShareLoading() = Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
@Composable private fun ShareEmpty() = Box(Modifier.fillMaxSize().padding(28.dp), contentAlignment = Alignment.Center) { Text(stringResource(R.string.no_active_profile), style = MaterialTheme.typography.titleMedium) }
@Composable private fun ShareError(code: String?, retry: () -> Unit) = Box(Modifier.fillMaxSize().padding(28.dp), contentAlignment = Alignment.Center) { Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) { ErrorNotice(code ?: "SHARE_UNAVAILABLE"); Button(retry) { Text(stringResource(R.string.retry)) } } }

@Composable private fun EmptyProducts() { Card(Modifier.fillMaxWidth()) { Column(Modifier.fillMaxWidth().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) { Icon(Icons.Default.CreditCard, null); Text(stringResource(R.string.share_no_products), Modifier.padding(top = 8.dp)) } } }

@Composable
private fun ProductCard(product: ShareProductDto, manage: () -> Unit, copy: () -> Unit) {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CreditCard, null)
                Column(Modifier.weight(1f).padding(horizontal = 12.dp)) { Text(product.label, fontWeight = FontWeight.Bold); FigmaLtrText(product.maskedSerial, MaterialTheme.typography.bodySmall) }
                AssistChip({}, { Text(product.status) })
            }
            Text("${stringResource(R.string.share_assigned_profile)}: ${product.profile?.label ?: stringResource(R.string.share_not_assigned)}")
            Text("${stringResource(R.string.share_current_target)}: ${product.shareTarget?.label ?: stringResource(R.string.share_not_configured)}")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button(manage) { Text(stringResource(R.string.share_manage)) }; OutlinedButton(copy) { Icon(Icons.Default.ContentCopy, null); Spacer(Modifier.width(4.dp)); Text(stringResource(R.string.share_permanent_link)) } }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProductSheet(product: ShareProductDto, state: ShareUiState, viewModel: ShareViewModel, details: () -> Unit, close: () -> Unit) {
    val profile = state.activeProfile ?: return
    var targetId by rememberSaveable(product.id, profile.id) { mutableStateOf(state.productTargets.firstOrNull()?.id.orEmpty()) }
    ModalBottomSheet(close) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(product.label, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.share_permanent_safety), style = MaterialTheme.typography.bodySmall)
            Text("${stringResource(R.string.active_profile)}: ${profile.name.orEmpty()}", fontWeight = FontWeight.SemiBold)
            state.productTargets.forEach { target -> Row(Modifier.fillMaxWidth().clickable { targetId = target.id }.padding(6.dp), verticalAlignment = Alignment.CenterVertically) { RadioButton(targetId == target.id, { targetId = target.id }); Text(target.label) } }
            Button({ viewModel.updateProduct(product.id, profile.id, targetId, null) }, Modifier.fillMaxWidth(), enabled = targetId.isNotBlank() && product.capabilities.targetChange && !state.busy) { Text(stringResource(R.string.share_save_target)) }
            if (product.capabilities.pause) OutlinedButton({ viewModel.updateProduct(product.id, profile.id, null, "PAUSED") }, Modifier.fillMaxWidth()) { Text(stringResource(R.string.share_pause)) }
            else if (product.capabilities.resume) OutlinedButton({ viewModel.updateProduct(product.id, profile.id, null, "ACTIVE") }, Modifier.fillMaxWidth()) { Text(stringResource(R.string.share_resume)) }
            OutlinedButton(details, Modifier.fillMaxWidth()) { Text(stringResource(R.string.share_product_details)) }
        }
    }
}

@Composable
fun ShareActivationScreen(state: ShareUiState, viewModel: ShareViewModel, onDone: () -> Unit) {
    var identifier by rememberSaveable { mutableStateOf("") }
    var scratch by rememberSaveable { mutableStateOf("") }
    var targetId by rememberSaveable { mutableStateOf("profile") }
    val activation = state.activation
    val context = LocalContext.current
    DisposableEffect(Unit) { onDispose { NfcCoordinator.clear() } }
    LaunchedEffect(state.productTargets) { targetId = state.productTargets.firstOrNull { it.id == "profile" }?.id ?: state.productTargets.firstOrNull()?.id.orEmpty() }
    LazyColumn(Modifier.fillMaxSize().imePadding(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text(stringResource(R.string.activate_product), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold); Text(stringResource(R.string.share_activation_help), color = MaterialTheme.colorScheme.onSurfaceVariant) }
        if (activation?.eligible != true) {
            when (activation?.nextAction) {
                "COOLDOWN" -> item { ErrorNotice("ACTIVATION_COOLDOWN") }
                "ALREADY_OWNED" -> item { Text(stringResource(R.string.share_already_owned)) }
                "LEGACY_FLOW" -> item { Button({ val url = BuildConfig.API_BASE_URL.trimEnd('/') + (activation.legacyUrl ?: "/activate/scan"); context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }, Modifier.fillMaxWidth()) { Text(stringResource(R.string.share_continue_legacy)) } }
                else -> {
                    item { QrScanner { identifier = it; viewModel.inspectActivation(it) } }
                    item { OutlinedTextField(identifier, { identifier = it.trim().take(512) }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.share_product_identifier)) }, singleLine = true) }
                    item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) { OutlinedButton({ NfcCoordinator.register(viewModel::inspectActivationTag) }, Modifier.weight(1f)) { Icon(Icons.Default.Contactless, null); Text(stringResource(R.string.share_identify_nfc)) }; Button({ viewModel.inspectActivation(identifier) }, Modifier.weight(1f), enabled = identifier.isNotBlank()) { Text(stringResource(R.string.validate_qr)) } } }
                }
            }
        } else {
            activation.product?.let { product -> item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(product.label, fontWeight = FontWeight.Bold); FigmaLtrText(product.maskedSerial, MaterialTheme.typography.bodySmall) } } } }
            item { Text(stringResource(R.string.share_scratch_help), style = MaterialTheme.typography.bodySmall) }
            item { OutlinedTextField(scratch, { scratch = it.filter(Char::isDigit).take(6) }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.share_scratch_code)) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword)) }
            item { Text("${stringResource(R.string.active_profile)}: ${state.activeProfile?.name.orEmpty()}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
            items(state.productTargets, key = { it.id }) { target -> Row(Modifier.fillMaxWidth().clickable { targetId = target.id }.padding(6.dp), verticalAlignment = Alignment.CenterVertically) { RadioButton(targetId == target.id, { targetId = target.id }); Text(target.label) } }
            item { Button({ viewModel.claimActivation(scratch, targetId, onDone) }, Modifier.fillMaxWidth(), enabled = scratch.length == 6 && scratch.all(Char::isDigit) && targetId.isNotBlank() && !state.busy) { Icon(Icons.Default.Shield, null); Text(stringResource(R.string.share_activate_securely)) } }
            item { OutlinedButton({ scratch = ""; viewModel.clearActivation() }, Modifier.fillMaxWidth()) { Text(stringResource(R.string.share_scan_another)) } }
        }
    }
}

private fun openNfcSettings(context: android.content.Context) {
    runCatching { context.startActivity(Intent(Settings.ACTION_NFC_SETTINGS)) }
}
