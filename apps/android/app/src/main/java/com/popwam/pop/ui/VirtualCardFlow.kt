package com.popwam.pop.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.google.gson.Gson
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import com.popwam.pop.hce.HceConfig
import com.popwam.pop.data.api.CardLinkWriteRequest
import com.popwam.pop.data.api.ProfileDto
import com.popwam.pop.data.api.ProfileTemplateDto
import com.popwam.pop.data.api.VirtualCardCreateRequest
import java.util.UUID

data class DraftLink(
    val id: String = UUID.randomUUID().toString(),
    val titleAr: String = "",
    val titleEn: String = "",
    val url: String = "",
    val type: String = "CUSTOM_URL",
    val iconKey: String = "link",
)

data class VirtualCardDraft(
    val cardType: String = "PERSONAL",
    val cardName: String = "",
    val primaryLanguage: String = "ar",
    val displayNameAr: String = "",
    val displayNameEn: String = "",
    val jobTitleAr: String = "",
    val jobTitleEn: String = "",
    val company: String = "",
    val bioAr: String = "",
    val bioEn: String = "",
    val phone: String = "",
    val email: String = "",
    val website: String = "",
    val location: String = "",
    val profileImageUri: String = "",
    val companyLogoUri: String = "",
    val templateId: String = "",
    val links: List<DraftLink> = emptyList(),
) {
    fun hasContent() = cardName.isNotBlank() || displayNameAr.isNotBlank() || displayNameEn.isNotBlank() || links.isNotEmpty()
}

private class VirtualCardDraftStore(context: Context) {
    private val preferences = context.getSharedPreferences("virtual_card_draft", Context.MODE_PRIVATE)
    private val gson = Gson()
    fun load(): VirtualCardDraft = runCatching {
        preferences.getString("draft", null)?.let { gson.fromJson(it, VirtualCardDraft::class.java) }
    }.getOrNull() ?: VirtualCardDraft(primaryLanguage = currentLocale())
    fun save(draft: VirtualCardDraft) { preferences.edit().putString("draft", gson.toJson(draft)).apply() }
    fun clear() { preferences.edit().clear().apply() }
}

@Composable
fun VirtualCardWizardScreen(
    step: String,
    state: MainUiState,
    vm: MainViewModel,
    onBack: () -> Unit,
    navigate: (String) -> Unit,
    onCreated: (String) -> Unit,
) {
    val context = LocalContext.current
    val store = remember { VirtualCardDraftStore(context.applicationContext) }
    var draft by remember(step) { mutableStateOf(store.load()) }
    fun update(next: VirtualCardDraft) { draft = next; store.save(next) }

    when (step) {
        "start" -> CreateCardStart(draft.hasContent(), onBack, onResume = { navigate("create-card/type") }) {
            store.clear(); draft = VirtualCardDraft(primaryLanguage = currentLocale()); store.save(draft); navigate("create-card/type")
        }
        "type" -> TypeStep(draft, state.planSlug, onBack, { navigate("create-card/info") }, ::update)
        "info" -> InformationStep(draft, onBack, { navigate("create-card/links") }, ::update)
        "links" -> LinksStep(draft, onBack, { navigate("create-card/template") }, ::update)
        "template" -> TemplateStep(draft, state.templates, onBack, { navigate("create-card/preview") }, ::update)
        "preview" -> PreviewStep(draft, state.templates, state.loading, onBack, onCreate = {
            val request = VirtualCardCreateRequest(
                cardName = draft.cardName.trim(), cardType = draft.cardType, primaryLanguage = draft.primaryLanguage,
                displayNameAr = draft.displayNameAr.trim().ifBlank { null }, displayNameEn = draft.displayNameEn.trim().ifBlank { null },
                jobTitleAr = draft.jobTitleAr.trim().ifBlank { null }, jobTitleEn = draft.jobTitleEn.trim().ifBlank { null },
                company = draft.company.trim().ifBlank { null }, bioAr = draft.bioAr.trim().ifBlank { null }, bioEn = draft.bioEn.trim().ifBlank { null },
                phone = draft.phone.trim().ifBlank { null }, email = draft.email.trim().ifBlank { null }, website = draft.website.trim().ifBlank { null },
                location = draft.location.trim().ifBlank { null }, templateId = draft.templateId,
                links = draft.links.map { CardLinkWriteRequest(it.type, it.url, it.titleAr.ifBlank { null }, it.titleEn.ifBlank { null }, it.iconKey) },
            )
            vm.createVirtualCard(context, request, draft.profileImageUri.toUriOrNull(), draft.companyLogoUri.toUriOrNull()) { profileId ->
                store.clear(); onCreated(profileId)
            }
        })
    }
}

@Composable
private fun CreateCardStart(hasDraft: Boolean, back: () -> Unit, onResume: () -> Unit, onStart: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 24.dp).imePadding(), horizontalAlignment = Alignment.CenterHorizontally, contentPadding = PaddingValues(vertical = 20.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        item { WizardHeader(stringResource(R.string.vc_create), 0, back) }
        item {
            Box(Modifier.size(72.dp).border(1.dp, Color(0xFFEDEDED), CircleShape), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.ContactPage, null, Modifier.size(38.dp), tint = Color(0xFF6D3DD7))
            }
        }
        item { Text(stringResource(R.string.vc_create), style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center) }
        item { Text(stringResource(R.string.vc_create_description), color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyLarge) }
        if (hasDraft) item { OutlinedButton(onResume, Modifier.fillMaxWidth().height(52.dp)) { Icon(Icons.Default.History, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.vc_resume)) } }
        item { GradientButton(stringResource(if (hasDraft) R.string.vc_start_new else R.string.vc_create), onClick = onStart) }
    }
}

private data class CardTypeOption(val value: String, val title: Int, val description: Int)

@Composable
private fun TypeStep(draft: VirtualCardDraft, planSlug: String, back: () -> Unit, next: () -> Unit, update: (VirtualCardDraft) -> Unit) {
    val options = listOf(
        CardTypeOption("PERSONAL", R.string.vc_personal, R.string.vc_personal_description),
        CardTypeOption("PROFESSIONAL", R.string.vc_professional, R.string.vc_professional_description),
        CardTypeOption("CREATOR", R.string.vc_creator, R.string.vc_creator_description),
        CardTypeOption("BUSINESS", R.string.vc_business, R.string.vc_business_description),
    )
    WizardColumn(R.string.vc_select_type, R.string.vc_select_type_description, 1, back) {
        options.forEachIndexed { index, option ->
            val locked = option.value == "BUSINESS" && planSlug.lowercase() != "business"
            val selected = draft.cardType == option.value
            Surface(
                modifier = Modifier.fillMaxWidth().clickable(enabled = !locked) { update(draft.copy(cardType = option.value)) },
                shape = RoundedCornerShape(24.dp), color = if (selected) Color(0xFFF4EEFF) else Color.White,
                border = androidx.compose.foundation.BorderStroke(if (selected) 2.dp else 1.dp, if (selected) Color(0xFF825BDD) else Color(0xFFEDEDED)),
            ) {
                Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Icon(when(index){0->Icons.Default.Person;1->Icons.Default.Work;2->Icons.Default.AutoAwesome;else->Icons.Default.Business}, null, Modifier.size(28.dp), tint = if (locked) Color(0xFFB0B0B0) else Color(0xFF6D3DD7))
                    Column(Modifier.weight(1f)) { Text(stringResource(option.title), fontWeight = FontWeight.Bold); Text(stringResource(option.description), color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall) }
                    Icon(if (locked) Icons.Default.Lock else if (selected) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked, null, tint = if (selected) Color(0xFF6D3DD7) else Color(0xFFB0B0B0))
                }
            }
        }
        if (draft.cardType == "BUSINESS" && planSlug.lowercase() != "business") Text(stringResource(R.string.vc_plan_required, "BUSINESS"), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        GradientButton(stringResource(R.string.vc_next), onClick = next, enabled = draft.cardType != "BUSINESS" || planSlug.lowercase() == "business")
        SaveLater()
    }
}

@Composable
private fun InformationStep(draft: VirtualCardDraft, back: () -> Unit, next: () -> Unit, update: (VirtualCardDraft) -> Unit) {
    val context = LocalContext.current
    fun persistUri(uri: Uri?): String {
        if (uri == null) return ""
        runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
        return uri.toString()
    }
    val avatar = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { update(draft.copy(profileImageUri = persistUri(it))) }
    val logo = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { update(draft.copy(companyLogoUri = persistUri(it))) }
    val requiredName = if (draft.primaryLanguage == "ar") draft.displayNameAr else draft.displayNameEn
    val validEmail = draft.email.isBlank() || android.util.Patterns.EMAIL_ADDRESS.matcher(draft.email).matches()
    val validWebsite = draft.website.isBlank() || draft.website.matches(Regex("https?://.+", RegexOption.IGNORE_CASE))
    val valid = draft.cardName.isNotBlank() && requiredName.isNotBlank() && validEmail && validWebsite
    WizardColumn(R.string.vc_information, R.string.vc_information_description, 2, back) {
        Text(stringResource(R.string.vc_primary_language), style = MaterialTheme.typography.labelLarge)
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            listOf("ar" to R.string.vc_language_ar, "en" to R.string.vc_language_en).forEachIndexed { index, item ->
                SegmentedButton(selected = draft.primaryLanguage == item.first, onClick = { update(draft.copy(primaryLanguage = item.first)) }, shape = SegmentedButtonDefaults.itemShape(index, 2)) { Text(stringResource(item.second)) }
            }
        }
        FigmaField(draft.cardName, { update(draft.copy(cardName = it)) }, R.string.vc_card_name, required = true)
        FigmaField(draft.displayNameAr, { update(draft.copy(displayNameAr = it)) }, R.string.vc_display_name_ar, required = draft.primaryLanguage == "ar")
        FigmaField(draft.displayNameEn, { update(draft.copy(displayNameEn = it)) }, R.string.vc_display_name_en, required = draft.primaryLanguage == "en")
        FigmaField(draft.jobTitleAr, { update(draft.copy(jobTitleAr = it)) }, R.string.vc_job_title_ar)
        FigmaField(draft.jobTitleEn, { update(draft.copy(jobTitleEn = it)) }, R.string.vc_job_title_en)
        FigmaField(draft.company, { update(draft.copy(company = it)) }, R.string.vc_company)
        FigmaField(draft.bioAr, { update(draft.copy(bioAr = it)) }, R.string.vc_bio_ar, lines = 3)
        FigmaField(draft.bioEn, { update(draft.copy(bioEn = it)) }, R.string.vc_bio_en, lines = 3)
        FigmaField(draft.phone, { update(draft.copy(phone = it)) }, R.string.phone, keyboard = KeyboardType.Phone, ltr = true)
        FigmaField(draft.email, { update(draft.copy(email = it)) }, R.string.email, keyboard = KeyboardType.Email, ltr = true, error = if (validEmail) null else stringResource(R.string.vc_invalid_email))
        FigmaField(draft.website, { update(draft.copy(website = it)) }, R.string.website, keyboard = KeyboardType.Uri, ltr = true, error = if (validWebsite) null else stringResource(R.string.vc_invalid_url))
        FigmaField(draft.location, { update(draft.copy(location = it)) }, R.string.vc_location)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ImageChoice(draft.profileImageUri, R.string.vc_profile_image, Modifier.weight(1f)) { avatar.launch(arrayOf("image/*")) }
            if (draft.cardType == "BUSINESS") ImageChoice(draft.companyLogoUri, R.string.vc_company_logo, Modifier.weight(1f)) { logo.launch(arrayOf("image/*")) }
        }
        CompactLivePreview(draft)
        GradientButton(stringResource(R.string.vc_next), onClick = next, enabled = valid)
        if (!valid) Text(stringResource(R.string.vc_required), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        SaveLater()
    }
}

@Composable
private fun LinksStep(draft: VirtualCardDraft, back: () -> Unit, next: () -> Unit, update: (VirtualCardDraft) -> Unit) {
    var title by rememberSaveable { mutableStateOf("") }
    var url by rememberSaveable { mutableStateOf("") }
    val valid = url.matches(Regex("https?://.+", RegexOption.IGNORE_CASE)) && title.isNotBlank()
    WizardColumn(R.string.vc_add_links, R.string.vc_add_links_description, 3, back) {
        FigmaField(title, { title = it }, R.string.vc_link_title)
        FigmaField(url, { url = it }, R.string.vc_link_url, keyboard = KeyboardType.Uri, ltr = true, error = if (url.isBlank() || valid) null else stringResource(R.string.vc_invalid_url))
        OutlinedButton({
            val link = DraftLink(titleAr = if (draft.primaryLanguage == "ar") title else "", titleEn = if (draft.primaryLanguage == "en") title else "", url = url, iconKey = iconKeyFor(url))
            update(draft.copy(links = draft.links + link)); title = ""; url = ""
        }, Modifier.fillMaxWidth().height(50.dp), enabled = valid) { Icon(Icons.Default.AddLink, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.vc_add_link_button)) }
        if (draft.links.isEmpty()) Text(stringResource(R.string.vc_no_links), color = MaterialTheme.colorScheme.onSurfaceVariant)
        draft.links.forEachIndexed { index, link ->
            Surface(shape = RoundedCornerShape(18.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) {
                Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    LinkIcon(link.url)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) { Text(link.titleAr.ifBlank { link.titleEn }, fontWeight = FontWeight.Medium); Text(link.url, style = MaterialTheme.typography.bodySmall, color = Color(0xFF888888), maxLines = 1) }
                    IconButton({ if (index > 0) update(draft.copy(links = draft.links.toMutableList().apply { add(index - 1, removeAt(index)) })) }, enabled = index > 0) { Icon(Icons.Default.KeyboardArrowUp, stringResource(R.string.vc_move_up)) }
                    IconButton({ if (index < draft.links.lastIndex) update(draft.copy(links = draft.links.toMutableList().apply { add(index + 1, removeAt(index)) })) }, enabled = index < draft.links.lastIndex) { Icon(Icons.Default.KeyboardArrowDown, stringResource(R.string.vc_move_down)) }
                    IconButton({ update(draft.copy(links = draft.links.filterNot { it.id == link.id })) }) { Icon(Icons.Default.Close, stringResource(R.string.vc_remove_link)) }
                }
            }
        }
        CompactLivePreview(draft)
        GradientButton(stringResource(R.string.vc_next), onClick = next)
        SaveLater()
    }
}

@Composable
private fun TemplateStep(draft: VirtualCardDraft, templates: List<ProfileTemplateDto>, back: () -> Unit, next: () -> Unit, update: (VirtualCardDraft) -> Unit) {
    Column(Modifier.fillMaxSize().imePadding()) {
        WizardHeader(stringResource(R.string.vc_select_template), 4, back)
        Text(stringResource(R.string.vc_select_template_description), Modifier.padding(horizontal = 24.dp, vertical = 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (templates.isEmpty()) Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) { Text(stringResource(R.string.vc_template_empty), textAlign = TextAlign.Center) }
        else LazyVerticalGrid(columns = GridCells.Fixed(2), modifier = Modifier.weight(1f), contentPadding = PaddingValues(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(templates, key = { it.id }) { template ->
                TemplateTile(template, selected = draft.templateId == template.id) { if (template.allowed) update(draft.copy(templateId = template.id)) }
            }
        }
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            GradientButton(stringResource(R.string.vc_use_template), onClick = next, enabled = draft.templateId.isNotBlank())
            SaveLater()
        }
    }
}

@Composable
private fun PreviewStep(draft: VirtualCardDraft, templates: List<ProfileTemplateDto>, loading: Boolean, back: () -> Unit, onCreate: () -> Unit) {
    val template = templates.firstOrNull { it.id == draft.templateId }
    LazyColumn(Modifier.fillMaxSize().imePadding(), contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { WizardHeader(stringResource(R.string.vc_preview), 5, back) }
        item { Text(stringResource(R.string.vc_preview_description), Modifier.padding(horizontal = 24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
        item { CardTemplatePreview(draft, template, Modifier.padding(horizontal = 20.dp)) }
        item { Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { GradientButton(stringResource(if (loading) R.string.vc_creating else R.string.vc_create_card), onClick = onCreate, enabled = !loading && template != null); if (loading) LinearProgressIndicator(Modifier.fillMaxWidth()) } }
    }
}

@Composable
fun VirtualCardDetailsScreen(profileId: String, state: MainUiState, vm: MainViewModel, back: () -> Unit, edit: () -> Unit) {
    val context = LocalContext.current
    val profile = state.profiles.firstOrNull { it.id == profileId }
    if (profile == null) { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }; return }
    val card = profile.virtualCard
    var selectedTemplateId by remember(profile.virtualCard?.themeId) { mutableStateOf(profile.virtualCard?.themeId.orEmpty()) }
    val selectedTemplate = state.templates.firstOrNull { it.id == selectedTemplateId } ?: card?.template
    val draft = profile.toDraft(selectedTemplateId)
    val hceSupported=context.packageManager.hasSystemFeature("android.hardware.nfc.hce")
    val publicUrl="${BuildConfig.PUBLIC_BASE_URL.trimEnd('/')}/${if(!profile.slug.isNullOrBlank()) "profile/${profile.slug}" else "p/id/${profile.id}"}"
    var hceActive by remember(card?.id){mutableStateOf(card?.id!=null&&HceConfig.enabled(context)&&HceConfig.activeHceVirtualCardId(context)==card.id)}
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { WizardHeader(stringResource(R.string.vc_card_details), 0, back) }
        item { Column(Modifier.padding(horizontal = 20.dp)) { Text(card?.name ?: profile.displayName, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold); card?.id?.let { FigmaLtrText(it, MaterialTheme.typography.bodySmall) } } }
        item { CardTemplatePreview(draft, selectedTemplate, Modifier.padding(horizontal = 20.dp)) }
        item {
            Row(Modifier.padding(horizontal = 20.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(edit, Modifier.weight(1f)) { Icon(Icons.Default.Edit, null); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.vc_open_editor)) }
                OutlinedButton({ context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(publicUrl))) }, Modifier.weight(1f)) { Icon(Icons.Default.OpenInBrowser, null); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.vc_open_public_page), maxLines = 1) }
            }
        }
        item { Column(Modifier.padding(horizontal=20.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){Button(onClick={if(card!=null){hceActive=!hceActive;HceConfig.save(context,hceActive,if(hceActive)publicUrl else null,if(hceActive)card.id else null)}},enabled=hceSupported&&card!=null,modifier=Modifier.fillMaxWidth(),colors=ButtonDefaults.buttonColors(containerColor=Color(0xFFD4AF37),contentColor=Color.Black)){Icon(Icons.Default.Contactless,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.set_device_card))};Text(if(hceSupported)stringResource(R.string.hce_experimental) else stringResource(R.string.nfc_unavailable),style=MaterialTheme.typography.bodySmall,color=Color(0xFF6E6E6E))} }
        item { Text(stringResource(R.string.vc_change_template), Modifier.padding(horizontal = 20.dp), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
        item {
            LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(state.templates, key = { it.id }) { template ->
                    Box(Modifier.width(180.dp)) { TemplateTile(template, selectedTemplateId == template.id) {
                        if (template.allowed && card != null) { selectedTemplateId = template.id; vm.selectTemplate(card.id, template.id) }
                    } }
                }
            }
        }
        if (state.wallet.googleAvailable && card != null) item {
            Column(Modifier.padding(horizontal = 20.dp)) { GradientButton(stringResource(R.string.vc_google_wallet), icon = Icons.Default.Wallet) { vm.openGoogleWallet(card.id) { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } } }
        } else if (vm.role == "ADMIN" && !state.wallet.googleConfigured) item {
            Surface(Modifier.padding(horizontal = 20.dp).fillMaxWidth(), color = Color(0xFFFFF7E6), shape = RoundedCornerShape(16.dp)) { Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.AdminPanelSettings, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.vc_wallet_setup_required)) } }
        }
    }
}

@Composable
private fun WizardColumn(title: Int, description: Int, step: Int, back: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    LazyColumn(Modifier.fillMaxSize().imePadding(), contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { WizardHeader(stringResource(title), step, back) }
        item { Text(stringResource(description), color = MaterialTheme.colorScheme.onSurfaceVariant) }
        item { Column(verticalArrangement = Arrangement.spacedBy(12.dp), content = content) }
    }
}

@Composable
private fun WizardHeader(title: String, step: Int, back: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            IconButton(back) { Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back)) }
            Text(title, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Medium)
            if (step > 0) Text(stringResource(R.string.vc_step_format, step, 5), style = MaterialTheme.typography.labelMedium, color = Color(0xFF6E6E6E))
        }
        if (step > 0) LinearProgressIndicator(progress = { step / 5f }, modifier = Modifier.fillMaxWidth().height(5.dp).clip(CircleShape), color = Color(0xFF825BDD), trackColor = Color(0xFFEDEDED))
    }
}

@Composable
private fun FigmaField(value: String, onChange: (String) -> Unit, label: Int, required: Boolean = false, lines: Int = 1, keyboard: KeyboardType = KeyboardType.Text, ltr: Boolean = false, error: String? = null) {
    OutlinedTextField(
        value, onChange, label = { Text(stringResource(label) + if (required) " *" else "") },
        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), minLines = lines, maxLines = if (lines > 1) 5 else 1,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard), isError = error != null,
        supportingText = if (error != null) { { Text(error) } } else null,
        textStyle = LocalTextStyle.current.copy(textDirection = if (ltr) androidx.compose.ui.text.style.TextDirection.Ltr else androidx.compose.ui.text.style.TextDirection.Content),
    )
}

@Composable
private fun ImageChoice(uri: String, label: Int, modifier: Modifier, click: () -> Unit) {
    Surface(modifier.clickable(onClick = click), shape = RoundedCornerShape(22.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) {
        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (uri.isNotBlank()) AsyncImage(uri, null, Modifier.size(64.dp).clip(CircleShape), contentScale = ContentScale.Crop) else Box(Modifier.size(64.dp).border(1.dp, Color(0xFFEDEDED), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.CloudUpload, null, tint = Color(0xFFB0B0B0)) }
            Text(stringResource(label), style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun TemplateTile(template: ProfileTemplateDto, selected: Boolean, onClick: () -> Unit) {
    Surface(
        Modifier.fillMaxWidth().clickable(enabled = template.allowed, onClick = onClick), shape = RoundedCornerShape(20.dp),
        border = androidx.compose.foundation.BorderStroke(if (selected) 2.dp else 1.dp, if (selected) Color(0xFF825BDD) else Color(0xFFEDEDED)), color = Color.White,
    ) {
        Column {
            Box {
                AsyncImage(template.previewImageUrl, null, Modifier.fillMaxWidth().height(150.dp), contentScale = ContentScale.Crop)
                if (!template.allowed) Box(Modifier.matchParentSize().background(Color.Black.copy(alpha = .45f)), contentAlignment = Alignment.Center) { Icon(Icons.Default.Lock, null, tint = Color.White) }
                if (selected) Icon(Icons.Default.CheckCircle, stringResource(R.string.vc_selected), Modifier.align(Alignment.TopEnd).padding(8.dp), tint = Color(0xFF825BDD))
            }
            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(if (currentLocale() == "ar") template.nameAr else template.nameEn, fontWeight = FontWeight.Bold, maxLines = 2)
                Text(template.minimumPlan.uppercase(), style = MaterialTheme.typography.labelSmall, color = Color(0xFF6E6E6E))
            }
        }
    }
}

@Composable
private fun CompactLivePreview(draft: VirtualCardDraft) {
    val name = draft.localized(draft.displayNameAr, draft.displayNameEn).ifBlank { stringResource(R.string.vc_public_identity) }
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), color = Color(0xFFFCFCFC), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Avatar(draft.imageModel(), 54.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) { Text(name, fontWeight = FontWeight.Bold); Text(draft.localized(draft.jobTitleAr, draft.jobTitleEn).ifBlank { draft.company }, color = Color(0xFF888888), style = MaterialTheme.typography.bodySmall); Text(stringResource(R.string.vc_links_label) + ": " + draft.links.size, style = MaterialTheme.typography.labelSmall, color = Color(0xFF825BDD)) }
        }
    }
}

@Composable
fun CardTemplatePreview(draft: VirtualCardDraft, template: ProfileTemplateDto?, modifier: Modifier = Modifier) {
    val variant = template?.slug ?: "personal-free-links"
    val name = draft.localized(draft.displayNameAr, draft.displayNameEn).ifBlank { stringResource(R.string.vc_public_identity) }
    val title = draft.localized(draft.jobTitleAr, draft.jobTitleEn).ifBlank { draft.company }
    val bio = draft.localized(draft.bioAr, draft.bioEn)
    val links = draft.previewLinks()
    when (variant) {
        "personal-pro-hero" -> Surface(modifier.fillMaxWidth(), shape = RoundedCornerShape(28.dp), shadowElevation = 6.dp) { Column { Box(Modifier.fillMaxWidth().height(310.dp)) { PreviewImage(draft.imageModel(), Modifier.matchParentSize()); Box(Modifier.matchParentSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.White.copy(.96f))))); Column(Modifier.align(Alignment.BottomCenter).padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text(name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center); if (title.isNotBlank()) Text(title, color = Color(0xFF5C6779)); if (bio.isNotBlank()) Text(bio, textAlign = TextAlign.Center, color = Color(0xFF5C6779), style = MaterialTheme.typography.bodySmall) } }; LinkList(links, Color.White, Color(0xFF121020), pill = true) } }
        "personal-plus-tabs" -> Surface(modifier.fillMaxWidth(), color = Color(0xFF1F1F20), shape = RoundedCornerShape(4.dp)) { Column(Modifier.padding(26.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) { Avatar(draft.imageModel(), 82.dp); Text(name, color = Color(0xFFEFEdf7), style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center); Text(title, color = Color(0xFFB0ADBF), textAlign = TextAlign.Center); if (bio.isNotBlank()) Text(bio, color = Color(0xFFB0ADBF), textAlign = TextAlign.Center, style = MaterialTheme.typography.bodySmall); Row(Modifier.fillMaxWidth().background(Color(0xFF292933), RoundedCornerShape(8.dp)).padding(10.dp), horizontalArrangement = Arrangement.SpaceEvenly) { repeat(3) { Box(Modifier.width(54.dp).height(6.dp).background(if (it == 0) Color(0xFF46495A) else Color(0xFF30313A), CircleShape)) } }; LinkList(links, Color(0xFF30363F), Color(0xFFEFEdf7)) } }
        "business-free-portfolio" -> Surface(modifier.fillMaxWidth(), color = Color.White, shape = RoundedCornerShape(4.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) { Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) { Avatar(draft.imageModel(), 96.dp); Text(name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Medium); Text(title, color = Color(0xFF4B5563)); if (bio.isNotBlank()) Text(bio, textAlign = TextAlign.Center); Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { AssistChip({}, { Text(stringResource(R.string.vc_contact_label)) }); AssistChip({}, { Text(stringResource(R.string.vc_links_label)) }) }; LinkGrid(links, Color(0xFFF8F4FF), Color(0xFF6D3DD7)) } }
        "business-pro-grid" -> Surface(modifier.fillMaxWidth(), color = Color(0xFF1E1E1E), shape = RoundedCornerShape(28.dp)) { Column(Modifier.background(Brush.verticalGradient(listOf(Color(0xFF2C4165), Color(0xFF0D1931)))).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) { Box(Modifier.size(150.dp).background(Color(0xFFFFB829), RoundedCornerShape(32.dp)), contentAlignment = Alignment.Center) { Avatar(draft.imageModel(), 132.dp, RoundedCornerShape(26.dp)) }; Text(name.uppercase(), color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text(title, color = Color(0xFFC9D1D9)); Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) { repeat(4) { Box(Modifier.size(40.dp).background(Color(0xFF3A4B6A), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) { Icon(listOf(Icons.Default.Language, Icons.Default.Email, Icons.Default.Work, Icons.Default.Link)[it], null, tint = Color.White) } } }; LinkGrid(links, Color(0xFF2C3F60), Color.White) } }
        "business-pro-social" -> Surface(modifier.fillMaxWidth(), color = Color(0xFF1E1E1E), shape = RoundedCornerShape(28.dp)) { Column(Modifier.background(Brush.verticalGradient(listOf(Color(0xFF2C4165), Color(0xFF101A31)))).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) { Box(Modifier.size(150.dp).background(Color(0xFFFFB829), RoundedCornerShape(32.dp)), contentAlignment = Alignment.Center) { Avatar(draft.imageModel(), 132.dp, RoundedCornerShape(26.dp)) }; Text(name, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text(title, color = Color(0xFFC9D1D9)); if (bio.isNotBlank()) Text(bio, color = Color(0xFFC9D1D9), textAlign = TextAlign.Center, style = MaterialTheme.typography.bodySmall); links.forEachIndexed { index, link -> Surface(Modifier.fillMaxWidth(if (index % 3 == 2) 1f else .78f).align(if (index % 2 == 0) Alignment.Start else Alignment.End), color = if (index % 2 == 0) Color(0xFF183871) else Color(0xFF7A07A3), shape = RoundedCornerShape(14.dp)) { Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) { LinkIcon(link.url, Color.White); Spacer(Modifier.width(10.dp)); Text(link.titleAr.ifBlank { link.titleEn }, color = Color.White, fontWeight = FontWeight.Bold) } } } } }
        else -> Surface(modifier.fillMaxWidth(), color = Color.Black, shape = RoundedCornerShape(4.dp)) { Column(Modifier.padding(horizontal = 28.dp, vertical = 48.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) { Avatar(draft.imageModel(), 112.dp); Text(name, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center); if (title.isNotBlank()) Text(title, color = Color.White, textAlign = TextAlign.Center); links.forEach { link -> Surface(Modifier.fillMaxWidth(), color = Color(0xFF3A8A8D), shape = RoundedCornerShape(12.dp)) { Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) { LinkIcon(link.url, Color.White); Text(link.titleAr.ifBlank { link.titleEn }, color = Color.White, fontWeight = FontWeight.Bold) } } } } }
    }
}

@Composable private fun LinkList(links: List<DraftLink>, background: Color, foreground: Color, pill: Boolean = false) { Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { links.forEach { link -> Surface(Modifier.fillMaxWidth(), color = background, shape = RoundedCornerShape(if (pill) 28.dp else 8.dp), border = androidx.compose.foundation.BorderStroke(1.dp, foreground.copy(.12f))) { Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) { Text(link.titleAr.ifBlank { link.titleEn }, Modifier.weight(1f), color = foreground, fontWeight = FontWeight.Medium); Icon(Icons.Default.NorthEast, null, tint = foreground) } } } } }

@Composable private fun LinkGrid(links: List<DraftLink>, background: Color, foreground: Color) { Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) { links.chunked(2).forEach { row -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { row.forEach { link -> Surface(Modifier.weight(1f), color = background, shape = RoundedCornerShape(12.dp)) { Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { LinkIcon(link.url, foreground); Text(link.titleAr.ifBlank { link.titleEn }, color = foreground, style = MaterialTheme.typography.labelLarge, maxLines = 2) } }; if (row.size == 1) Spacer(Modifier.weight(1f)) } } } } }

@Composable private fun Avatar(model: String?, size: androidx.compose.ui.unit.Dp, shape: androidx.compose.ui.graphics.Shape = CircleShape) { Box(Modifier.size(size).clip(shape).background(Color(0xFFEDEDED)), contentAlignment = Alignment.Center) { if (!model.isNullOrBlank()) AsyncImage(model, null, Modifier.matchParentSize(), contentScale = ContentScale.Crop) else Icon(Icons.Default.Person, null, Modifier.size(size * .5f), tint = Color(0xFF888888)) } }
@Composable private fun PreviewImage(model: String?, modifier: Modifier) { Box(modifier.background(Color(0xFFE4ECF7)), contentAlignment = Alignment.Center) { if (!model.isNullOrBlank()) AsyncImage(model, null, Modifier.matchParentSize(), contentScale = ContentScale.Crop) else Icon(Icons.Default.Person, null, Modifier.size(90.dp), tint = Color(0xFF888888)) } }
@Composable private fun LinkIcon(url: String, tint: Color = Color(0xFF6D3DD7)) { Icon(when { "instagram" in url.lowercase() -> Icons.Default.PhotoCamera; "linkedin" in url.lowercase() -> Icons.Default.Work; "youtube" in url.lowercase() -> Icons.Default.PlayCircle; "github" in url.lowercase() -> Icons.Default.Code; "mailto" in url.lowercase() -> Icons.Default.Email; else -> Icons.Default.Public }, null, tint = tint) }

@Composable
private fun GradientButton(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector? = null, enabled: Boolean = true, onClick: () -> Unit) {
    val brush = if (enabled) Brush.horizontalGradient(listOf(Color(0xFF825BDD), Color(0xFF5327BA))) else Brush.horizontalGradient(listOf(Color(0xFFD9D9D9), Color(0xFFB0B0B0)))
    Row(Modifier.fillMaxWidth().height(52.dp).clip(CircleShape).background(brush).clickable(enabled = enabled, onClick = onClick), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) { if (icon != null) { Icon(icon, null, tint = Color.White); Spacer(Modifier.width(8.dp)) }; Text(label, color = Color.White, fontWeight = FontWeight.Medium) }
}

@Composable private fun SaveLater() { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { Icon(Icons.Default.CloudDone, null, tint = Color(0xFF888888)); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.vc_saved), color = Color(0xFF888888), style = MaterialTheme.typography.bodySmall) } }

private fun String.toUriOrNull() = takeIf { it.isNotBlank() }?.let(Uri::parse)
private fun iconKeyFor(url: String) = when { "instagram" in url.lowercase() -> "instagram"; "linkedin" in url.lowercase() -> "linkedin"; "youtube" in url.lowercase() -> "video"; "github" in url.lowercase() -> "website"; else -> "link" }
private fun VirtualCardDraft.localized(ar: String, en: String) = if (primaryLanguage == "ar") ar.ifBlank { en } else en.ifBlank { ar }
private fun VirtualCardDraft.imageModel() = (if (cardType == "BUSINESS") companyLogoUri.ifBlank { profileImageUri } else profileImageUri).ifBlank { null }
@Composable private fun VirtualCardDraft.previewLinks(): List<DraftLink> { if (links.isNotEmpty()) return links.take(6); val values = listOf(phone to stringResource(R.string.phone), email to stringResource(R.string.email), website to stringResource(R.string.website)).filter { it.first.isNotBlank() }; return values.map { DraftLink(titleAr = it.second, titleEn = it.second, url = it.first) }.ifEmpty { listOf(DraftLink(titleAr = stringResource(R.string.vc_links_label), titleEn = stringResource(R.string.vc_links_label), url = "https://popwam.com")) } }
private fun ProfileDto.toDraft(templateId: String) = VirtualCardDraft(
    cardType = virtualCard?.type ?: if (type == "ORGANIZATION") "BUSINESS" else "PERSONAL", cardName = virtualCard?.name ?: displayName, primaryLanguage = primaryLanguage,
    displayNameAr = displayNameAr ?: organizationNameAr.orEmpty(), displayNameEn = displayNameEn ?: organizationNameEn.orEmpty(),
    jobTitleAr = jobTitleAr.orEmpty(), jobTitleEn = jobTitleEn.orEmpty(), company = company.orEmpty(), bioAr = bioAr ?: descriptionAr.orEmpty(), bioEn = bioEn ?: descriptionEn.orEmpty(),
    phone = phone.orEmpty(), email = email.orEmpty(), website = website.orEmpty(), location = locationText ?: addressAr ?: addressEn.orEmpty(),
    profileImageUri = avatarUrl.orEmpty(), companyLogoUri = logoUrl.orEmpty(), templateId = templateId,
    links = destinations.filter { it.type !in setOf("PROFILE", "VCF") }.map { DraftLink(id = it.id, titleAr = it.titleAr.orEmpty(), titleEn = it.titleEn ?: it.title, url = it.url, type = it.type, iconKey = it.iconKey ?: "link") },
)
