package com.popwam.pop.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import com.popwam.pop.data.api.ProfileDto
import com.popwam.pop.data.api.ProfileTemplateDto
import java.util.UUID

data class DraftLink(
    val id: String = UUID.randomUUID().toString(),
    val titleAr: String = "",
    val titleEn: String = "",
    val url: String = "",
    val type: String = "CUSTOM_URL",
    val iconKey: String = "link",
)

data class VirtualCardPreview(
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
)

@Composable
fun VirtualCardDetailsScreen(profileId: String, state: MainUiState, vm: MainViewModel, back: () -> Unit, edit: () -> Unit, publish: () -> Unit) {
    val context = LocalContext.current
    val profile = state.profiles.firstOrNull { it.id == profileId }
    if (profile == null) { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }; return }
    val card = profile.virtualCard
    var selectedTemplateId by remember(profile.virtualCard?.themeId) { mutableStateOf(profile.virtualCard?.themeId.orEmpty()) }
    val selectedTemplate = state.templates.firstOrNull { it.id == selectedTemplateId } ?: card?.template
    val draft = profile.toDraft(selectedTemplateId)
    val publicUrl="${BuildConfig.PUBLIC_BASE_URL.trimEnd('/')}/${if(!profile.slug.isNullOrBlank()) "p/${profile.slug}" else "p/id/${profile.id}"}"
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { CardDetailsHeader(stringResource(R.string.vc_card_details), back) }
        item { Column(Modifier.padding(horizontal = 20.dp)) { Text(card?.name ?: profile.displayName, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold); card?.id?.let { FigmaLtrText(it, MaterialTheme.typography.bodySmall) } } }
        item { CardTemplatePreview(draft, selectedTemplate, Modifier.padding(horizontal = 20.dp)) }
        item {
            Row(Modifier.padding(horizontal = 20.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(edit, Modifier.weight(1f)) { Icon(Icons.Default.Edit, null); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.vc_open_editor)) }
                OutlinedButton({ context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(publicUrl))) }, Modifier.weight(1f)) { Icon(Icons.Default.OpenInBrowser, null); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.vc_open_public_page), maxLines = 1) }
            }
        }
        item { Button(publish,Modifier.padding(horizontal=20.dp).fillMaxWidth()){Icon(Icons.Default.Visibility,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.publish_title))} }
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
private fun CardDetailsHeader(title: String, back: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            IconButton(back) { Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back)) }
            Text(title, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Medium)
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
fun CardTemplatePreview(draft: VirtualCardPreview, template: ProfileTemplateDto?, modifier: Modifier = Modifier) {
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


private fun VirtualCardPreview.localized(ar: String, en: String) = if (primaryLanguage == "ar") ar.ifBlank { en } else en.ifBlank { ar }
private fun VirtualCardPreview.imageModel() = (if (cardType == "BUSINESS") companyLogoUri.ifBlank { profileImageUri } else profileImageUri).ifBlank { null }
@Composable private fun VirtualCardPreview.previewLinks(): List<DraftLink> { if (links.isNotEmpty()) return links.take(6); val values = listOf(phone to stringResource(R.string.phone), email to stringResource(R.string.email), website to stringResource(R.string.website)).filter { it.first.isNotBlank() }; return values.map { DraftLink(titleAr = it.second, titleEn = it.second, url = it.first) }.ifEmpty { listOf(DraftLink(titleAr = stringResource(R.string.vc_links_label), titleEn = stringResource(R.string.vc_links_label), url = "https://popwam.com")) } }
private fun ProfileDto.toDraft(templateId: String) = VirtualCardPreview(
    cardType = virtualCard?.type ?: if (type == "ORGANIZATION") "BUSINESS" else "PERSONAL", cardName = virtualCard?.name ?: displayName, primaryLanguage = primaryLanguage,
    displayNameAr = displayNameAr ?: organizationNameAr.orEmpty(), displayNameEn = displayNameEn ?: organizationNameEn.orEmpty(),
    jobTitleAr = jobTitleAr.orEmpty(), jobTitleEn = jobTitleEn.orEmpty(), company = company.orEmpty(), bioAr = bioAr ?: descriptionAr.orEmpty(), bioEn = bioEn ?: descriptionEn.orEmpty(),
    phone = phone.orEmpty(), email = email.orEmpty(), website = website.orEmpty(), location = locationText ?: addressAr ?: addressEn.orEmpty(),
    profileImageUri = avatarUrl.orEmpty(), companyLogoUri = logoUrl.orEmpty(), templateId = templateId,
    links = destinations.filter { it.type !in setOf("PROFILE", "VCF") }.map { DraftLink(id = it.id, titleAr = it.titleAr.orEmpty(), titleEn = it.titleEn ?: it.title, url = it.url, type = it.type, iconKey = it.iconKey ?: "link") },
)
