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
import androidx.compose.ui.graphics.graphicsLayer
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
import androidx.compose.ui.text.style.TextAlign
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
import com.popwam.pop.ui.components.PopApprovedAsset
import com.popwam.pop.ui.components.PopApprovedAvatar
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
    onActivate: () -> Unit,
    navigate: (String) -> Unit,
    initialPanel: ShareInitialPanel = ShareInitialPanel.NONE,
    onBack: () -> Unit = {},
) {
    val context = LocalContext.current
    val arabic = LocalConfiguration.current.locales[0].language == "ar"
    val nativeShareTitle = stringResource(R.string.share_native)
    val lifecycleOwner = LocalLifecycleOwner.current
    var nfcPanel by rememberSaveable { mutableStateOf(false) }
    var hceQuickPanel by rememberSaveable { mutableStateOf(false) }
    var initialPanelConsumed by rememberSaveable(activeProfile?.id, initialPanel) { mutableStateOf(false) }

    LaunchedEffect(activeProfile) {
        if (activeProfile == null) viewModel.clearActiveProfile() else viewModel.activateProfile(activeProfile)
    }
    LaunchedEffect(state.loadState, state.shareable, initialPanel, activeProfile?.id) {
        if (!initialPanelConsumed && state.loadState==ShareLoadState.READY) {
            when (initialPanel) {
                ShareInitialPanel.QR -> if(state.shareable)viewModel.showQr()
                ShareInitialPanel.NFC -> nfcPanel = true
                ShareInitialPanel.HCE -> { if(state.shareable&&state.hce.availability==HceAvailability.READY)viewModel.setHce(context,true);hceQuickPanel=true }
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
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item { ApprovedShareTopBar(onBack) }
            item { ApprovedShareProfileCard(state) { state.payload?.let { payload -> runCatching { SharePlatform.copy(context,payload);viewModel.linkCopied() }.onFailure { viewModel.qrFailed() } } } }
            if (!state.shareable) item { UnshareableCard(state) { activeProfile?.id?.let { navigate("profile/$it/edit/VISIBILITY") } } }
            if (state.availability == ShareAvailability.UNLISTED) item { StatusNotice(R.string.share_unlisted_notice, Icons.Default.VisibilityOff) }
            item {
                Text(stringResource(R.string.share_how), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ApprovedShareAction(R.string.share_whatsapp, R.drawable.pop_approved_share_whatsapp, Modifier.weight(1f), state.shareable) {
                        state.payload?.let { runCatching { SharePlatform.shareWhatsApp(context, it, arabic); viewModel.nativeShareOpened() }.onFailure { viewModel.qrFailed() } }
                    }
                    ApprovedShareAction(R.string.share_native, R.drawable.pop_approved_action_share, Modifier.weight(1f), state.shareable) {
                        state.payload?.let { runCatching { SharePlatform.shareLink(context, it, nativeShareTitle, arabic); viewModel.nativeShareOpened() }.onFailure { viewModel.qrFailed() } }
                    }
                    ApprovedShareAction(R.string.share_show_qr, R.drawable.pop_approved_action_qr, Modifier.weight(1f), state.shareable, viewModel::showQr)
                }
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ApprovedShareAction(R.string.share_write_nfc, R.drawable.pop_approved_share_program_card, Modifier.weight(1f), state.shareable && state.nfc.availability != NfcAvailability.UNAVAILABLE) { nfcPanel = true }
                    ApprovedShareAction(R.string.share_phone_tap, R.drawable.pop_approved_share_tap, Modifier.weight(1f), state.shareable && state.hce.availability !in setOf(HceAvailability.UNAVAILABLE,HceAvailability.UNSUPPORTED)) {
                        when(state.hce.availability){HceAvailability.READY->viewModel.setHce(context,true);HceAvailability.DISABLED->openNfcSettings(context);else->Unit}
                    }
                    Spacer(Modifier.weight(1f))
                }
            }
            if(state.hce.activeForProfile||state.hce.requested)item{ApprovedHceGuidance()}
            item { StatusNotice(R.string.share_privacy_note, Icons.Default.PrivacyTip) }
            state.feedback?.let { feedback -> item { ShareFeedback(feedback) { viewModel.consumeFeedback() } } }
            state.errorCode?.let { item { ErrorNotice(it) } }
        }
    }

    if (state.qrVisible && state.payload != null) QrSheet(state.payload, viewModel::hideQr, viewModel)
    if (nfcPanel) NfcWriteSheet(state, viewModel, { nfcPanel = false; viewModel.cancelNfcOperation() })
    if(hceQuickPanel)HceCountdownSheet(state){hceQuickPanel=false;viewModel.setHce(context,false);if(initialPanel==ShareInitialPanel.HCE)onBack()}
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun HceCountdownSheet(state:ShareUiState,dismiss:()->Unit){
    var remaining by remember(state.activeProfile?.id){mutableIntStateOf(10)}
    LaunchedEffect(Unit){while(remaining>0){delay(1_000);remaining--};dismiss()}
    ModalBottomSheet(onDismissRequest=dismiss){
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(16.dp)){
            PopApprovedAsset(R.drawable.pop_approved_share_tap,null,Modifier.size(72.dp))
            when{
                !state.shareable->Text(stringResource(R.string.share_publish_required),style=MaterialTheme.typography.titleMedium)
                state.hce.availability==HceAvailability.READY->Text(stringResource(R.string.profile_touch_countdown,remaining),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
                state.hce.availability==HceAvailability.DISABLED->Text(stringResource(R.string.share_nfc_disabled),style=MaterialTheme.typography.titleMedium)
                else->Text(stringResource(R.string.share_hce_unsupported),style=MaterialTheme.typography.titleMedium)
            }
            TextButton(dismiss){Text(stringResource(R.string.close))}
        }
    }
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
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item { ApprovedShareTopBar {} }
            item { ApprovedShareProfileCard(state) {} }
            if (!state.shareable) item { UnshareableCard(state) {} }
            if (state.availability == ShareAvailability.UNLISTED) item { StatusNotice(R.string.share_unlisted_notice, Icons.Default.VisibilityOff) }
            item {
                Text(stringResource(R.string.share_how), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ApprovedShareAction(R.string.share_whatsapp,R.drawable.pop_approved_share_whatsapp,Modifier.weight(1f),state.shareable){}
                    ApprovedShareAction(R.string.share_native,R.drawable.pop_approved_action_share,Modifier.weight(1f),state.shareable){}
                    ApprovedShareAction(R.string.share_show_qr,R.drawable.pop_approved_action_qr,Modifier.weight(1f),state.shareable){}
                }
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ApprovedShareAction(R.string.share_write_nfc,R.drawable.pop_approved_share_program_card,Modifier.weight(1f),state.shareable){}
                    ApprovedShareAction(R.string.share_phone_tap,R.drawable.pop_approved_share_tap,Modifier.weight(1f),state.shareable&&state.hce.availability !in setOf(HceAvailability.UNAVAILABLE,HceAvailability.UNSUPPORTED)){}
                    Spacer(Modifier.weight(1f))
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
private fun ApprovedShareTopBar(onBack:()->Unit){
    val rtl=androidx.compose.ui.platform.LocalLayoutDirection.current==androidx.compose.ui.unit.LayoutDirection.Rtl
    Row(Modifier.fillMaxWidth().heightIn(min=56.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)){
        Surface(Modifier.size(42.dp).clickable(onClick=onBack),shape=RoundedCornerShape(21.dp),color=MaterialTheme.colorScheme.surfaceVariant){
            Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){PopApprovedAsset(R.drawable.pop_approved_chevron,stringResource(R.string.back),Modifier.size(42.dp).graphicsLayer(scaleX=if(rtl)-1f else 1f),tint=MaterialTheme.colorScheme.onSurface)}
        }
        Column(Modifier.weight(1f)){
            Text(stringResource(R.string.share_title),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold)
            Text(stringResource(R.string.share_description),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant,maxLines=2)
        }
    }
}

@Composable
private fun ApprovedShareProfileCard(state:ShareUiState,copy:()->Unit){
    Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(8.dp),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface),border=androidx.compose.foundation.BorderStroke(1.dp,MaterialTheme.colorScheme.outline.copy(alpha=.45f)),elevation=CardDefaults.cardElevation(defaultElevation=4.dp)){
        Column(Modifier.fillMaxWidth().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
            Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(14.dp)){
                PopApprovedAvatar(null,state.activeProfile?.name,68.dp)
                Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(3.dp)){
                    Text(state.activeProfile?.name.orEmpty(),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold)
                    state.activeProfile?.type?.takeIf(String::isNotBlank)?.let{Text(it,style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.primary)}
                    Text(availabilityLabel(state.availability),style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            state.payload?.let{payload->
                androidx.compose.runtime.CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr){
                    Text(payload.canonicalUrl,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant,maxLines=2)
                }
                OutlinedButton(copy,Modifier.fillMaxWidth(),contentPadding=PaddingValues(vertical=9.dp)){
                    PopApprovedAsset(R.drawable.pop_approved_copy,null,Modifier.size(19.dp));Spacer(Modifier.width(7.dp));Text(stringResource(R.string.share_copy))
                }
            }
        }
    }
}

@Composable
private fun ApprovedShareAction(label:Int,drawable:Int,modifier:Modifier,enabled:Boolean,onClick:()->Unit){
    Surface(modifier.heightIn(min=96.dp).semantics{role=Role.Button}.clickable(enabled=enabled,onClick=onClick),shape=RoundedCornerShape(8.dp),color=if(enabled)MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant.copy(alpha=.55f),shadowElevation=2.dp,border=androidx.compose.foundation.BorderStroke(1.dp,MaterialTheme.colorScheme.outline.copy(alpha=.3f))){
        Column(Modifier.fillMaxSize().padding(horizontal=8.dp,vertical=13.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center){
            PopApprovedAsset(drawable,null,Modifier.size(31.dp),tint=if(enabled)null else MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(9.dp))
            Text(stringResource(label),style=MaterialTheme.typography.labelMedium,fontWeight=FontWeight.SemiBold,color=if(enabled)MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,textAlign=TextAlign.Center,maxLines=2)
        }
    }
}

@Composable
private fun ApprovedHceGuidance(){
    Surface(Modifier.fillMaxWidth(),shape=RoundedCornerShape(8.dp),color=MaterialTheme.colorScheme.primaryContainer){
        Row(Modifier.fillMaxWidth().padding(14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(10.dp)){
            PopApprovedAsset(R.drawable.pop_approved_share_tap,null,Modifier.size(28.dp))
            Text(stringResource(R.string.share_hce_guidance),style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onPrimaryContainer)
        }
    }
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

@Composable private fun ShareLoading() = PopBrandedLoading()
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
