@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.popwam.pop.ui.profile

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ProfileListScreen(state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){
    Scaffold(
        containerColor=MaterialTheme.colorScheme.background,
        topBar={TopAppBar(title={Text(stringResource(R.string.profiles_title))},actions={IconButton({onEvent(ProfileEvent.Refresh)}){Icon(Icons.Default.Refresh,stringResource(R.string.refresh))}})},
        floatingActionButton={if(state.quota.canAdd)FloatingActionButton({onEvent(ProfileEvent.OpenCreate)}){Icon(Icons.Default.Add,stringResource(R.string.profile_add))}},
    ){padding->when(state.loadState){
        ProfileLoadState.INITIAL_LOADING->ProfileLoading(Modifier.padding(padding))
        ProfileLoadState.ERROR->ProfileFailure(state.errorCode,onEvent,Modifier.padding(padding))
        ProfileLoadState.EMPTY->ProfileEmpty(onEvent,Modifier.padding(padding))
        ProfileLoadState.CONTENT->LazyColumn(Modifier.fillMaxSize().padding(padding),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
            if(state.offline)item{AssistChip({},label={Text(stringResource(R.string.profile_offline_cached))},leadingIcon={Icon(Icons.Default.CloudOff,null)})}
            items(state.profiles,key={it.id}){profile->OwnedProfileCard(profile,profile.id==state.activeProfileId,{onEvent(ProfileEvent.SelectProfile(profile.id))},{onEvent(ProfileEvent.OpenProfile(profile.id))})}
            if(!state.quota.canAdd)item{Text(stringResource(R.string.profile_limit_reached,state.quota.used,state.quota.limit),style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onSurfaceVariant)}
        }
    }}
}

@Composable private fun OwnedProfileCard(profile:OwnedProfile,selected:Boolean,select:()->Unit,open:()->Unit){
    Card(onClick=open,border=if(selected)BorderStroke(2.dp,MaterialTheme.colorScheme.primary)else null,colors=CardDefaults.cardColors(containerColor=if(selected)MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant)){
        Row(Modifier.fillMaxWidth().padding(16.dp),verticalAlignment=Alignment.CenterVertically){
            ProfileAvatar(profile.avatarUrl,profile.name,56.dp)
            Spacer(Modifier.width(14.dp));Column(Modifier.weight(1f)){Text(profile.name,style=MaterialTheme.typography.titleMedium);profile.subtitle?.takeIf(String::isNotBlank)?.let{Text(it,style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onSurfaceVariant)};Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){ProfileStatus(profile.visibility);if(profile.isPrimary)Text(stringResource(R.string.profile_primary),style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.primary)}}
            if(selected)Icon(Icons.Default.CheckCircle,stringResource(R.string.profile_active),tint=MaterialTheme.colorScheme.primary)else TextButton(select){Text(stringResource(R.string.profile_switch))}
        }
    }
}

@Composable
fun ProfileViewScreen(state:ProfilesUiState,profileId:String,onBack:()->Unit,onEvent:(ProfileEvent)->Unit){
    val content=state.content
    LaunchedEffect(profileId){onEvent(ProfileEvent.SelectProfile(profileId))}
    Scaffold(containerColor=MaterialTheme.colorScheme.background,topBar={TopAppBar(title={Text(stringResource(R.string.profile_preview))},navigationIcon={IconButton(onBack){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.back))}},actions={IconButton({onEvent(ProfileEvent.OpenEditor(profileId))}){Icon(Icons.Default.Edit,stringResource(R.string.profile_edit))}})}){padding->
        when{content==null && (state.loadState==ProfileLoadState.ERROR || !state.refreshing && state.loadState==ProfileLoadState.CONTENT)->ProfileFailure(state.errorCode ?: "PROFILE_CONTENT_UNAVAILABLE",onEvent,Modifier.padding(padding));content==null->ProfileLoading(Modifier.padding(padding));else->LazyColumn(Modifier.fillMaxSize().padding(padding),contentPadding=PaddingValues(bottom=28.dp)){
            item{ProfileHero(content)}
            item{Row(Modifier.fillMaxWidth().padding(horizontal=20.dp,vertical=14.dp),horizontalArrangement=Arrangement.spacedBy(10.dp)){ProfileAction(R.string.profile_share,Icons.Default.Share,Modifier.weight(1f)){onEvent(ProfileEvent.OpenShare(profileId))};ProfileAction(R.string.profile_qr,Icons.Default.QrCode,Modifier.weight(1f)){onEvent(ProfileEvent.OpenQr(profileId))};ProfileAction(R.string.profile_nfc,Icons.Default.Nfc,Modifier.weight(1f)){onEvent(ProfileEvent.OpenNfc(profileId))}}}
            content.localizedAbout()?.let{item{ProfileSection(stringResource(R.string.profile_about)){Text(it,style=MaterialTheme.typography.bodyLarge)}}}
            if(content.hasContact())item{ProfileSection(stringResource(R.string.profile_contact)){ContactRows(content)}}
            if(content.links.isNotEmpty())item{ProfileSection(stringResource(R.string.profile_links)){content.links.sortedBy{it.sortOrder}.forEach{ProfileLinkRow(it)}}}
            if(content.services.isNotEmpty())item{ProfileSection(stringResource(R.string.profile_services)){content.services.forEach{Text(it.name.ifBlank{it.nameEn.ifBlank{it.nameAr}},style=MaterialTheme.typography.titleSmall);it.localizedDescription()?.let{d->Text(d,color=MaterialTheme.colorScheme.onSurfaceVariant)};Spacer(Modifier.height(10.dp))}}}
            if(content.locations.isNotEmpty())item{ProfileSection(stringResource(R.string.profile_locations)){content.locations.forEach{Text(it.name,style=MaterialTheme.typography.titleSmall);Text(it.addressEn.ifBlank{it.addressAr},color=MaterialTheme.colorScheme.onSurfaceVariant);Spacer(Modifier.height(10.dp))}}}
            if(content.media.isNotEmpty())item{ProfileSection(stringResource(R.string.profile_media)){Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){content.media.take(3).forEach{AsyncImage(it.previewUrl,null,Modifier.size(88.dp).clip(RoundedCornerShape(14.dp)))}}}}
        }}
    }
}

@Composable private fun ProfileHero(content:ProfileContent){
    Column(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally){
        ProfileAvatar(content.summary.avatarUrl,content.summary.name,96.dp);Spacer(Modifier.height(12.dp));Text(content.summary.name,style=MaterialTheme.typography.headlineSmall)
        content.summary.subtitle?.takeIf(String::isNotBlank)?.let{Text(it,style=MaterialTheme.typography.bodyLarge,color=MaterialTheme.colorScheme.onSurfaceVariant)}
        Spacer(Modifier.height(8.dp));Row(horizontalArrangement=Arrangement.spacedBy(8.dp),verticalAlignment=Alignment.CenterVertically){ProfileStatus(content.summary.visibility);if(content.summary.verification==ProfileVerificationState.VERIFIED)Icon(Icons.Default.Verified,stringResource(R.string.profile_verified),tint=MaterialTheme.colorScheme.primary)}
        if(content.slug.isNotBlank())Text("pop.popwam.com/${content.slug}",style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.primary,modifier=Modifier.padding(top=8.dp))
    }
}

@Composable
fun ProfileEditorHubScreen(state:ProfilesUiState,profileId:String,onBack:()->Unit,onEvent:(ProfileEvent)->Unit){
    val content=state.content
    LaunchedEffect(profileId){onEvent(ProfileEvent.SelectProfile(profileId))}
    var confirmDelete by remember{mutableStateOf(false)}
    var confirmPublish by remember{mutableStateOf(false)}
    Scaffold(containerColor=MaterialTheme.colorScheme.background,topBar={TopAppBar(title={Text(stringResource(R.string.profile_edit))},navigationIcon={IconButton(onBack){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.back))}},actions={IconButton({onEvent(ProfileEvent.OpenList)}){Icon(Icons.Default.People,stringResource(R.string.profiles_title))};IconButton({onEvent(ProfileEvent.OpenProfile(profileId))}){Icon(Icons.Default.Visibility,stringResource(R.string.profile_preview))}})}){padding->
        if(content==null&&!state.refreshing)ProfileFailure(state.errorCode ?: "PROFILE_CONTENT_UNAVAILABLE",onEvent,Modifier.padding(padding)) else if(content==null)ProfileLoading(Modifier.padding(padding)) else LazyColumn(Modifier.fillMaxSize().padding(padding),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
            item{ProfileReadinessCard(content.summary.completion)}
            if(state.saveState==ProfileSaveState.FAILURE && state.errorCode!=null)item{ProfileOperationError(state.errorCode,state.debugErrorCode)}
            item{when(content.summary.lifecycle){"PUBLISHED"->OutlinedButton({onEvent(ProfileEvent.PublishProfile("pause"))},Modifier.fillMaxWidth(),enabled=state.saveState!=ProfileSaveState.SAVING){Text(stringResource(R.string.profile_pause))};"PAUSED"->Button({onEvent(ProfileEvent.PublishProfile("resume"))},Modifier.fillMaxWidth(),enabled=state.saveState!=ProfileSaveState.SAVING){Text(stringResource(R.string.profile_resume))};else->Button({confirmPublish=true},Modifier.fillMaxWidth(),enabled=content.summary.completion.publishReady&&state.saveState!=ProfileSaveState.SAVING){Text(stringResource(R.string.profile_publish))}}}
            items(ProfilePolicy.sections(content)){section->ProfileEditorSectionCard(section){onEvent(ProfileEvent.OpenSection(profileId,section))}}
            if(content.addableModules.isNotEmpty())item{Text(stringResource(R.string.profile_add_sections),style=MaterialTheme.typography.titleMedium)}
            items(content.addableModules,key={it.key}){module->OutlinedButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.AddModule(module.key)))},Modifier.fillMaxWidth(),enabled=state.saveState!=ProfileSaveState.SAVING){Icon(Icons.Default.Add,null);Spacer(Modifier.width(8.dp));Text(module.name)}}
            if(ProfilePolicy.canArchive(content.summary,state.profiles))item{OutlinedButton({confirmDelete=true},Modifier.fillMaxWidth(),colors=ButtonDefaults.outlinedButtonColors(contentColor=MaterialTheme.colorScheme.error),border=BorderStroke(1.dp,MaterialTheme.colorScheme.error)){Icon(Icons.Default.Delete,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.profile_delete))}}
        }
    }
    if(confirmDelete)AlertDialog(onDismissRequest={confirmDelete=false},title={Text(stringResource(R.string.profile_delete_confirm_title))},text={Text(stringResource(R.string.profile_delete_confirm_body))},confirmButton={TextButton({confirmDelete=false;onEvent(ProfileEvent.ArchiveProfile(profileId,state.profiles.firstOrNull{it.id!=profileId}?.id))}){Text(stringResource(R.string.profile_delete),color=MaterialTheme.colorScheme.error)}},dismissButton={TextButton({confirmDelete=false}){Text(stringResource(R.string.cancel))}})
    if(confirmPublish)AlertDialog(onDismissRequest={confirmPublish=false},title={Text(stringResource(R.string.profile_publish_confirm_title))},text={Text(stringResource(R.string.profile_publish_confirm_body))},confirmButton={TextButton({confirmPublish=false;onEvent(ProfileEvent.PublishProfile("publish"))}){Text(stringResource(R.string.profile_publish))}},dismissButton={TextButton({confirmPublish=false}){Text(stringResource(R.string.cancel))}})
}

@Composable
fun ProfileEditorSectionScreen(state:ProfilesUiState,profileId:String,section:ProfileEditorSection,onBack:()->Unit,onEvent:(ProfileEvent)->Unit){
    val content=state.content
    LaunchedEffect(profileId){onEvent(ProfileEvent.SelectProfile(profileId))}
    if(content==null){if(state.refreshing)ProfileLoading()else ProfileFailure(state.errorCode ?: "PROFILE_CONTENT_UNAVAILABLE",onEvent);return}
    DirtyBackGuard(state.editorDirty,onBack){onEvent(ProfileEvent.SetDirty(false))}
    Scaffold(containerColor=MaterialTheme.colorScheme.background,topBar={TopAppBar(title={Text(sectionTitle(section))},navigationIcon={IconButton(onBack){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.back))}})}){padding->
        Box(Modifier.fillMaxSize().padding(padding)){
            when(section){
                ProfileEditorSection.BASIC_INFORMATION->BasicInformationEditor(content,state,onEvent)
                ProfileEditorSection.ABOUT->AboutEditor(content,state,onEvent)
                ProfileEditorSection.CONTACT_LINKS->ContactLinksEditor(content,state,onEvent)
                ProfileEditorSection.MEDIA->MediaEditor(content,state,onEvent)
                ProfileEditorSection.APPEARANCE->AppearanceEditor(content,state,onEvent)
                ProfileEditorSection.VERIFICATION->VerificationPanel(content)
                ProfileEditorSection.VISIBILITY->VisibilityEditor(content,state,onEvent)
                ProfileEditorSection.SERVICES->ServicesEditor(content,state,onEvent)
                ProfileEditorSection.LOCATIONS->LocationsEditor(content,state,onEvent)
            }
        }
    }
}

@Composable private fun BasicInformationEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){
    var name by rememberSaveable(content.draftRevision){mutableStateOf(content.displayName)};var label by rememberSaveable(content.draftRevision){mutableStateOf(content.displayLabel)}
    var ar by rememberSaveable(content.draftRevision){mutableStateOf(content.displayNameAr)};var en by rememberSaveable(content.draftRevision){mutableStateOf(content.displayNameEn)}
    var titleAr by rememberSaveable(content.draftRevision){mutableStateOf(content.jobTitleAr)};var titleEn by rememberSaveable(content.draftRevision){mutableStateOf(content.jobTitleEn)}
    var orgAr by rememberSaveable(content.draftRevision){mutableStateOf(content.organizationNameAr)};var orgEn by rememberSaveable(content.draftRevision){mutableStateOf(content.organizationNameEn)}
    EditorColumn{ProfileTextField(name,{name=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_display_name);ProfileTextField(label,{label=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_display_label);ProfileTextField(ar,{ar=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_name_ar);ProfileTextField(en,{en=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_name_en);ProfileTextField(titleAr,{titleAr=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_title_ar);ProfileTextField(titleEn,{titleEn=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_title_en);if(content.summary.backendKind==ProfileBackendKind.BUSINESS){ProfileTextField(orgAr,{orgAr=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_org_ar);ProfileTextField(orgEn,{orgEn=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_org_en)};SaveButton(state){onEvent(ProfileEvent.Save(ProfileEditorMutation.Identity(name,label,ar,en,titleAr,titleEn,orgAr,orgEn,content.primaryLanguage)))}}
}

@Composable private fun AboutEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){
    var title by rememberSaveable(content.draftRevision){mutableStateOf(content.title)};var bio by rememberSaveable(content.draftRevision){mutableStateOf(content.bio)};var ar by rememberSaveable(content.draftRevision){mutableStateOf(content.bioAr)};var en by rememberSaveable(content.draftRevision){mutableStateOf(content.bioEn)};var descAr by rememberSaveable(content.draftRevision){mutableStateOf(content.descriptionAr)};var descEn by rememberSaveable(content.draftRevision){mutableStateOf(content.descriptionEn)}
    EditorColumn{ProfileTextField(title,{title=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_headline);ProfileTextField(bio,{bio=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_bio,minLines=3);ProfileTextField(ar,{ar=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_about_ar,minLines=4);ProfileTextField(en,{en=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_about_en,minLines=4);ProfileTextField(descAr,{descAr=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_description_ar,minLines=4);ProfileTextField(descEn,{descEn=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_description_en,minLines=4);SaveButton(state){onEvent(ProfileEvent.Save(ProfileEditorMutation.About(title,bio,ar,en,descAr,descEn)))}}
}

@Composable private fun ContactLinksEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){
    var phone by rememberSaveable(content.draftRevision){mutableStateOf(content.phone)};var email by rememberSaveable(content.draftRevision){mutableStateOf(content.email)};var site by rememberSaveable(content.draftRevision){mutableStateOf(content.website)};var whatsapp by rememberSaveable(content.draftRevision){mutableStateOf(content.whatsappBusiness)};var location by rememberSaveable(content.draftRevision){mutableStateOf(content.locationText)};var linkDialog by remember{mutableStateOf<ProfileLink?>(null)}
    EditorColumn{LtrField(phone,{phone=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_phone,KeyboardType.Phone);LtrField(email,{email=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_email,KeyboardType.Email);LtrField(site,{site=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_website,KeyboardType.Uri);LtrField(whatsapp,{whatsapp=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_whatsapp,KeyboardType.Phone);ProfileTextField(location,{location=it;onEvent(ProfileEvent.SetDirty(true))},R.string.profile_location);SaveButton(state){onEvent(ProfileEvent.Save(ProfileEditorMutation.Contact(phone,content.alternatePhone,email,site,whatsapp,content.whatsappPrivate,location,content.addressAr,content.addressEn,content.contactVisibility)))};HorizontalDivider();Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Text(stringResource(R.string.profile_links),style=MaterialTheme.typography.titleMedium);TextButton({linkDialog=ProfileLink()}){Icon(Icons.Default.Add,null);Text(stringResource(R.string.add))}};val ordered=content.links.sortedBy{it.sortOrder};ordered.forEachIndexed{index,link->ListItem(headlineContent={Text(link.title)},supportingContent={Text(link.url)},trailingContent={Row{if(index>0)IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.LinkReorder(ordered.toMutableList().also{val item=it.removeAt(index);it.add(index-1,item)}.map{it.id})))}){Icon(Icons.Default.ArrowUpward,null)};if(index<ordered.lastIndex)IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.LinkReorder(ordered.toMutableList().also{val item=it.removeAt(index);it.add(index+1,item)}.map{it.id})))}){Icon(Icons.Default.ArrowDownward,null)};IconButton({linkDialog=link}){Icon(Icons.Default.Edit,null)};IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.LinkDelete(link.id)))}){Icon(Icons.Default.Delete,null,tint=MaterialTheme.colorScheme.error)}}})}}
    linkDialog?.let{LinkEditorDialog(it,{linkDialog=null},{onEvent(ProfileEvent.SetDirty(true));onEvent(ProfileEvent.Save(ProfileEditorMutation.LinkUpsert(it)));linkDialog=null})}
}

@Composable private fun MediaEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){
    val context=LocalContext.current;val scope=rememberCoroutineScope();var purpose by remember{mutableStateOf("GALLERY")}
    val picker=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){uri->if(uri!=null)scope.launch{val bytes=withContext(Dispatchers.IO){context.contentResolver.openInputStream(uri)?.use{it.readBytes()}};if(bytes!=null&&bytes.size<=8*1024*1024)onEvent(ProfileEvent.UploadMedia(ProfileMediaUpload(purpose,"profile-${System.currentTimeMillis()}.jpg",context.contentResolver.getType(uri)?:"image/jpeg",bytes)))}}
    val purposes=if(content.summary.backendKind==ProfileBackendKind.BUSINESS)listOf("LOGO","COVER","GALLERY")else listOf("AVATAR","COVER","GALLERY")
    EditorColumn{Text(stringResource(R.string.profile_media_help),color=MaterialTheme.colorScheme.onSurfaceVariant);SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()){purposes.forEachIndexed{i,value->SegmentedButton(selected=purpose==value,onClick={purpose=value},shape=SegmentedButtonDefaults.itemShape(i,purposes.size)){Text(value.lowercase().replaceFirstChar{it.uppercase()})}}};Button({picker.launch("image/*")},Modifier.fillMaxWidth()){Icon(Icons.Default.Upload,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.profile_upload))};state.uploadProgress?.let{LinearProgressIndicator(Modifier.fillMaxWidth())};content.media.forEach{media->ListItem(leadingContent={AsyncImage(media.previewUrl,null,Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)))},headlineContent={Text(media.purpose)},supportingContent={Text(media.visibility)},trailingContent={IconButton({onEvent(ProfileEvent.RemoveMedia(media.id))}){Icon(Icons.Default.Delete,stringResource(R.string.remove),tint=MaterialTheme.colorScheme.error)}})}}
}

@Composable private fun AppearanceEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){var selected by rememberSaveable(content.draftRevision){mutableStateOf(content.theme)};val themes=(state.quota.allowedThemes.ifEmpty{listOf(content.theme)}).distinct();EditorColumn{Text(stringResource(R.string.profile_appearance_separate),color=MaterialTheme.colorScheme.onSurfaceVariant);themes.forEach{theme->Card(onClick={selected=theme;onEvent(ProfileEvent.SetDirty(true))},border=if(selected==theme)BorderStroke(2.dp,MaterialTheme.colorScheme.primary)else null){Row(Modifier.fillMaxWidth().padding(16.dp),verticalAlignment=Alignment.CenterVertically){Box(Modifier.size(44.dp).clip(CircleShape).background(if(theme.endsWith("DARK"))MaterialTheme.colorScheme.inverseSurface else MaterialTheme.colorScheme.surface));Spacer(Modifier.width(12.dp));Text(theme.replace('_',' '),Modifier.weight(1f));RadioButton(selected==theme,{selected=theme;onEvent(ProfileEvent.SetDirty(true))})}}};SaveButton(state){onEvent(ProfileEvent.Save(ProfileEditorMutation.Appearance(selected)))}}}

@Composable private fun VisibilityEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){var access by rememberSaveable(content.draftRevision){mutableStateOf(content.summary.visibility)};var slug by rememberSaveable(content.draftRevision){mutableStateOf(content.slug)};EditorColumn{Text(stringResource(R.string.profile_visibility_help),color=MaterialTheme.colorScheme.onSurfaceVariant);listOf("PUBLIC","UNLISTED","PRIVATE").forEach{value->ListItem(modifier=Modifier.clickable{access=value;onEvent(ProfileEvent.SetDirty(true))},headlineContent={Text(stringResource(when(value){"PUBLIC"->R.string.profile_public;"UNLISTED"->R.string.profile_unlisted;else->R.string.profile_private}))},leadingContent={RadioButton(access==value,{access=value;onEvent(ProfileEvent.SetDirty(true))})})};LtrField(slug,{slug=ProfilePolicy.normalizedSlug(it);onEvent(ProfileEvent.SetDirty(true))},R.string.profile_slug,KeyboardType.Uri,prefix="pop.popwam.com/",enabled=state.quota.canCustomizeSlug);Text(stringResource(if(state.quota.canCustomizeSlug)R.string.profile_slug_server_validation else R.string.profile_slug_subscription),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant);SaveButton(state){onEvent(ProfileEvent.SaveVisibility(access,slug))};HorizontalDivider();Text(stringResource(R.string.profile_section_visibility),style=MaterialTheme.typography.titleMedium);content.modules.filter(ProfilePolicy::canEditModule).forEach{module->ListItem(headlineContent={Text(module.name)},supportingContent={Text(module.visibility)},leadingContent={Switch(module.enabled,{onEvent(ProfileEvent.Save(ProfileEditorMutation.UpdateModule(module.key,it,module.visibility)))},enabled=!module.required)},trailingContent={TextButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.UpdateModule(module.key,module.enabled,ProfilePolicy.nextModuleVisibility(module.visibility))))}){Text(module.visibility)}})}}}

@Composable private fun ServicesEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){var dialog by remember{mutableStateOf<ProfileService?>(null)};EditorColumn{Button({dialog=ProfileService()},Modifier.fillMaxWidth()){Icon(Icons.Default.Add,null);Text(stringResource(R.string.profile_add_service))};content.services.forEach{service->ListItem(headlineContent={Text(service.name)},supportingContent={service.localizedDescription()?.let{Text(it)}},trailingContent={Row{IconButton({dialog=service}){Icon(Icons.Default.Edit,null)};IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceDelete(service.id)))}){Icon(Icons.Default.Delete,null,tint=MaterialTheme.colorScheme.error)}}})}};dialog?.let{ServiceDialog(it,{dialog=null},{onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceUpsert(it)));dialog=null})}}

@Composable private fun LocationsEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){var dialog by remember{mutableStateOf<ProfileLocation?>(null)};EditorColumn{Button({dialog=ProfileLocation()},Modifier.fillMaxWidth()){Icon(Icons.Default.Add,null);Text(stringResource(R.string.profile_add_location))};content.locations.forEach{location->ListItem(headlineContent={Text(location.name)},supportingContent={Text(location.addressEn.ifBlank{location.addressAr})},trailingContent={Row{IconButton({dialog=location}){Icon(Icons.Default.Edit,null)};IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.LocationDelete(location.id)))}){Icon(Icons.Default.Delete,null,tint=MaterialTheme.colorScheme.error)}}})}};dialog?.let{LocationDialog(it,{dialog=null},{onEvent(ProfileEvent.Save(ProfileEditorMutation.LocationUpsert(it)));dialog=null})}}

@Composable private fun VerificationPanel(content:ProfileContent){EditorColumn{Icon(Icons.Default.VerifiedUser,null,Modifier.size(56.dp),tint=MaterialTheme.colorScheme.onSurfaceVariant);Text(stringResource(R.string.profile_verification_unavailable_title),style=MaterialTheme.typography.titleLarge);Text(stringResource(R.string.profile_verification_unavailable_body),color=MaterialTheme.colorScheme.onSurfaceVariant);Text(stringResource(R.string.profile_verification_backend_authority),style=MaterialTheme.typography.bodySmall)}}

@Composable
fun ProfileCreationScreen(state:ProfilesUiState,onBack:()->Unit,onEvent:(ProfileEvent)->Unit){var kind by remember{mutableStateOf(ProfileBackendKind.PERSONAL)};var name by rememberSaveable{mutableStateOf("")};var category by rememberSaveable{mutableStateOf<String?>(null)};val selectedCategory=state.categories.firstOrNull{it.slug==category&&it.backendKind==kind};LaunchedEffect(kind){onEvent(ProfileEvent.LoadCategories(kind));category=null};Scaffold(containerColor=MaterialTheme.colorScheme.background,topBar={TopAppBar(title={Text(stringResource(R.string.profile_add))},navigationIcon={IconButton(onBack){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.back))}})}){padding->EditorColumn(Modifier.padding(padding)){SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()){ProfileBackendKind.entries.forEachIndexed{i,value->val allowed=value in state.quota.allowedKinds;SegmentedButton(kind==value,{kind=value},SegmentedButtonDefaults.itemShape(i,ProfileBackendKind.entries.size),enabled=allowed){Text(stringResource(if(value==ProfileBackendKind.PERSONAL)R.string.profile_type_personal else R.string.profile_type_business))}}};if(ProfileBackendKind.BUSINESS !in state.quota.allowedKinds)Text(stringResource(R.string.profile_business_plan_unavailable),style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onSurfaceVariant);ProfileTextField(name,{name=it},R.string.profile_name);if(state.categoryKindLoading!=null)LinearProgressIndicator(Modifier.fillMaxWidth())else state.categories.filter{it.backendKind==kind}.forEach{item->val available=item.defaultTemplateId!=null;Card(onClick={if(available)category=item.slug},enabled=available,border=if(category==item.slug)BorderStroke(2.dp,MaterialTheme.colorScheme.primary)else null){Row(Modifier.fillMaxWidth().padding(14.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(category==item.slug,{if(available)category=item.slug},enabled=available);Column{Text(item.name);if(!available)Text(stringResource(R.string.profile_type_reference_unavailable),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.error)}}}};if(state.saveState==ProfileSaveState.FAILURE&&state.errorCode!=null)ProfileOperationError(state.errorCode,state.debugErrorCode);Button({onEvent(ProfileEvent.CreateProfile(name,kind,category,selectedCategory?.defaultTemplateId))},Modifier.fillMaxWidth(),enabled=name.isNotBlank()&&selectedCategory?.defaultTemplateId!=null&&state.saveState!=ProfileSaveState.SAVING){if(state.saveState==ProfileSaveState.SAVING)CircularProgressIndicator(Modifier.size(20.dp),strokeWidth=2.dp)else Text(stringResource(R.string.profile_create_continue))}}}}

@Composable private fun DirtyBackGuard(dirty:Boolean,onBack:()->Unit,discard:()->Unit){var confirm by remember{mutableStateOf(false)};BackHandler{if(dirty)confirm=true else onBack()};if(confirm)AlertDialog(onDismissRequest={confirm=false},title={Text(stringResource(R.string.profile_unsaved_title))},text={Text(stringResource(R.string.profile_unsaved_body))},confirmButton={TextButton({discard();confirm=false;onBack()}){Text(stringResource(R.string.profile_discard))}},dismissButton={TextButton({confirm=false}){Text(stringResource(R.string.cancel))}})}

@Composable private fun LinkEditorDialog(initial:ProfileLink,dismiss:()->Unit,save:(ProfileLink)->Unit){var title by remember{mutableStateOf(initial.title)};var url by remember{mutableStateOf(initial.url)};var type by remember{mutableStateOf(initial.type)};val types=listOf("WEBSITE","PHONE","EMAIL","WHATSAPP_PRIVATE","LINKEDIN","INSTAGRAM","X","CUSTOM_URL");AlertDialog(onDismissRequest=dismiss,title={Text(stringResource(if(initial.id.isBlank())R.string.profile_add_link else R.string.profile_edit_link))},text={Column(verticalArrangement=Arrangement.spacedBy(8.dp)){ProfileTextField(title,{title=it},R.string.profile_link_title);LazyRow(horizontalArrangement=Arrangement.spacedBy(6.dp)){items(types){value->FilterChip(type==value,{type=value},label={Text(value.replace('_',' '))})}};LtrField(url,{url=it},R.string.profile_link_url,if(type in setOf("PHONE","WHATSAPP_PRIVATE"))KeyboardType.Phone else if(type=="EMAIL")KeyboardType.Email else KeyboardType.Uri);if(url.isNotBlank()&&!ProfilePolicy.validLink(type,url))Text(stringResource(R.string.profile_link_invalid),color=MaterialTheme.colorScheme.error)}},confirmButton={TextButton({save(initial.copy(title=title,titleEn=title,url=url,type=type))},enabled=title.isNotBlank()&&ProfilePolicy.validLink(type,url)){Text(stringResource(R.string.save))}},dismissButton={TextButton(dismiss){Text(stringResource(R.string.cancel))}})}
@Composable private fun ServiceDialog(initial:ProfileService,dismiss:()->Unit,save:(ProfileService)->Unit){var name by remember{mutableStateOf(initial.nameEn.ifBlank{initial.nameAr})};var desc by remember{mutableStateOf(initial.descriptionEn.ifBlank{initial.descriptionAr})};AlertDialog(onDismissRequest=dismiss,title={Text(stringResource(R.string.profile_service))},text={Column(verticalArrangement=Arrangement.spacedBy(8.dp)){ProfileTextField(name,{name=it},R.string.profile_name);ProfileTextField(desc,{desc=it},R.string.profile_description,minLines=3)}},confirmButton={TextButton({save(initial.copy(name=name,nameEn=name,descriptionEn=desc))},enabled=name.isNotBlank()){Text(stringResource(R.string.save))}},dismissButton={TextButton(dismiss){Text(stringResource(R.string.cancel))}})}
@Composable private fun LocationDialog(initial:ProfileLocation,dismiss:()->Unit,save:(ProfileLocation)->Unit){var name by remember{mutableStateOf(initial.nameEn.ifBlank{initial.nameAr})};var address by remember{mutableStateOf(initial.addressEn.ifBlank{initial.addressAr})};var phone by remember{mutableStateOf(initial.phone)};var map by remember{mutableStateOf(initial.mapUrl)};AlertDialog(onDismissRequest=dismiss,title={Text(stringResource(R.string.profile_location))},text={Column(verticalArrangement=Arrangement.spacedBy(8.dp)){ProfileTextField(name,{name=it},R.string.profile_name);ProfileTextField(address,{address=it},R.string.profile_address);LtrField(phone,{phone=it},R.string.profile_phone,KeyboardType.Phone);LtrField(map,{map=it},R.string.profile_map_url,KeyboardType.Uri)}},confirmButton={TextButton({save(initial.copy(name=name,nameEn=name,addressEn=address,phone=phone,mapUrl=map))},enabled=name.isNotBlank()){Text(stringResource(R.string.save))}},dismissButton={TextButton(dismiss){Text(stringResource(R.string.cancel))}})}

@Composable private fun ProfileLoading(modifier:Modifier=Modifier){Box(modifier.fillMaxSize(),contentAlignment=Alignment.Center){CircularProgressIndicator()}}
@Composable private fun ProfileFailure(code:String?,onEvent:(ProfileEvent)->Unit,modifier:Modifier=Modifier){Column(modifier.fillMaxSize().padding(32.dp),verticalArrangement=Arrangement.Center,horizontalAlignment=Alignment.CenterHorizontally){Icon(Icons.Default.CloudOff,null,Modifier.size(52.dp),tint=MaterialTheme.colorScheme.error);Text(stringResource(R.string.profile_error_title),style=MaterialTheme.typography.titleLarge);Text(profileErrorMessage(code ?: "PROFILE_SERVER_UNAVAILABLE"),color=MaterialTheme.colorScheme.onSurfaceVariant);if(BuildConfig.DEBUG&&!code.isNullOrBlank())Text(code,style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.onSurfaceVariant);Button({onEvent(ProfileEvent.Retry)},Modifier.padding(top=16.dp)){Text(stringResource(R.string.retry))}}}
@Composable private fun ProfileEmpty(onEvent:(ProfileEvent)->Unit,modifier:Modifier=Modifier){Column(modifier.fillMaxSize().padding(32.dp),verticalArrangement=Arrangement.Center,horizontalAlignment=Alignment.CenterHorizontally){Icon(Icons.Default.PersonAdd,null,Modifier.size(56.dp));Text(stringResource(R.string.profile_empty_title),style=MaterialTheme.typography.titleLarge);Text(stringResource(R.string.profile_empty_body),color=MaterialTheme.colorScheme.onSurfaceVariant);Button({onEvent(ProfileEvent.OpenCreate)},Modifier.padding(top=16.dp)){Text(stringResource(R.string.profile_add))}}}
@Composable private fun ProfileAvatar(url:String?,name:String,size:androidx.compose.ui.unit.Dp){Surface(Modifier.size(size).clearAndSetSemantics{},shape=CircleShape,color=MaterialTheme.colorScheme.primaryContainer){if(url.isNullOrBlank())Box(contentAlignment=Alignment.Center){Text(name.take(1).uppercase(),style=MaterialTheme.typography.headlineSmall,color=MaterialTheme.colorScheme.onPrimaryContainer)}else AsyncImage(url,null,Modifier.fillMaxSize().clip(CircleShape))}}
@Composable private fun ProfileStatus(value:String){Surface(shape=RoundedCornerShape(999.dp),color=when(value){"PUBLIC"->MaterialTheme.colorScheme.secondaryContainer;"UNLISTED"->MaterialTheme.colorScheme.tertiaryContainer;else->MaterialTheme.colorScheme.surfaceVariant}){Text(stringResource(when(value){"PUBLIC"->R.string.profile_public;"UNLISTED"->R.string.profile_unlisted;else->R.string.profile_private}),Modifier.padding(horizontal=9.dp,vertical=3.dp),style=MaterialTheme.typography.labelMedium)}}
@Composable private fun ProfileSection(title:String,content:@Composable ColumnScope.()->Unit){Column(Modifier.fillMaxWidth().padding(horizontal=20.dp,vertical=12.dp)){Text(title,style=MaterialTheme.typography.titleLarge);Spacer(Modifier.height(10.dp));content()}}
@Composable private fun ProfileAction(label:Int,icon:androidx.compose.ui.graphics.vector.ImageVector,modifier:Modifier,onClick:()->Unit){FilledTonalButton(onClick,modifier){Icon(icon,null);Spacer(Modifier.width(5.dp));Text(stringResource(label))}}
@Composable private fun ProfileLinkRow(link:ProfileLink){ListItem(headlineContent={Text(link.title)},supportingContent={Text(link.url)},leadingContent={Icon(Icons.Default.Link,null)})}
@Composable private fun ContactRows(c:ProfileContent){listOf(c.phone to Icons.Default.Phone,c.email to Icons.Default.Email,c.website to Icons.Default.Language,c.locationText to Icons.Default.LocationOn).filter{it.first.isNotBlank()}.forEach{(value,icon)->ListItem(headlineContent={CompositionLocalProvider(LocalLayoutDirection provides if(icon!=Icons.Default.LocationOn)LayoutDirection.Ltr else LocalLayoutDirection.current){Text(value)}},leadingContent={Icon(icon,null)})}}
@Composable private fun ProfileReadinessCard(completion:ProfileCompletion){Card(colors=CardDefaults.cardColors(containerColor=if(completion.publishReady)MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceVariant)){Column(Modifier.fillMaxWidth().padding(16.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){Row(verticalAlignment=Alignment.CenterVertically){Icon(if(completion.publishReady)Icons.Default.CheckCircle else Icons.Default.PendingActions,null,tint=if(completion.publishReady)MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary);Spacer(Modifier.width(10.dp));Text(stringResource(if(completion.publishReady)R.string.profile_ready else R.string.profile_incomplete),style=MaterialTheme.typography.titleMedium)};if(!completion.publishReady){Text(stringResource(R.string.profile_issues_count,completion.blockingIssueCodes.size),color=MaterialTheme.colorScheme.onSurfaceVariant);completion.blockingIssueCodes.distinct().forEach{Text("• ${profileReadinessMessage(it)}",style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onSurfaceVariant)}}}}}
@Composable private fun ProfileEditorSectionCard(section:ProfileEditorSection,onClick:()->Unit){Card(onClick=onClick){Row(Modifier.fillMaxWidth().padding(18.dp),verticalAlignment=Alignment.CenterVertically){Icon(sectionIcon(section),null,tint=MaterialTheme.colorScheme.primary);Spacer(Modifier.width(14.dp));Text(sectionTitle(section),Modifier.weight(1f),style=MaterialTheme.typography.titleMedium);Icon(Icons.Default.ChevronRight,null)}}}
@Composable private fun sectionTitle(section:ProfileEditorSection)=stringResource(when(section){ProfileEditorSection.BASIC_INFORMATION->R.string.profile_basic_information;ProfileEditorSection.ABOUT->R.string.profile_about;ProfileEditorSection.CONTACT_LINKS->R.string.profile_contact_links;ProfileEditorSection.MEDIA->R.string.profile_media;ProfileEditorSection.APPEARANCE->R.string.profile_appearance;ProfileEditorSection.VERIFICATION->R.string.profile_verification;ProfileEditorSection.VISIBILITY->R.string.profile_visibility;ProfileEditorSection.SERVICES->R.string.profile_services;ProfileEditorSection.LOCATIONS->R.string.profile_locations})
private fun sectionIcon(section:ProfileEditorSection)=when(section){ProfileEditorSection.BASIC_INFORMATION->Icons.Default.Badge;ProfileEditorSection.ABOUT->Icons.Default.Article;ProfileEditorSection.CONTACT_LINKS->Icons.Default.Link;ProfileEditorSection.MEDIA->Icons.Default.PhotoLibrary;ProfileEditorSection.APPEARANCE->Icons.Default.Palette;ProfileEditorSection.VERIFICATION->Icons.Default.VerifiedUser;ProfileEditorSection.VISIBILITY->Icons.Default.Visibility;ProfileEditorSection.SERVICES->Icons.Default.Work;ProfileEditorSection.LOCATIONS->Icons.Default.LocationOn}
@Composable private fun EditorColumn(modifier:Modifier=Modifier,content:@Composable ColumnScope.()->Unit){Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp),content=content)}
@Composable private fun ProfileTextField(value:String,onValueChange:(String)->Unit,label:Int,minLines:Int=1){OutlinedTextField(value,onValueChange,Modifier.fillMaxWidth(),label={Text(stringResource(label))},minLines=minLines,textStyle=MaterialTheme.typography.bodyLarge)}
@Composable private fun LtrField(value:String,onValueChange:(String)->Unit,label:Int,type:KeyboardType,prefix:String?=null,enabled:Boolean=true){CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr){OutlinedTextField(value,onValueChange,Modifier.fillMaxWidth(),label={Text(stringResource(label))},prefix=prefix?.let{{Text(it)}},keyboardOptions=KeyboardOptions(keyboardType=type),singleLine=true,textStyle=MaterialTheme.typography.bodyLarge,enabled=enabled)}}
@Composable private fun SaveButton(state:ProfilesUiState,onClick:()->Unit){Button(onClick,Modifier.fillMaxWidth(),enabled=state.editorDirty&&state.saveState!=ProfileSaveState.SAVING){if(state.saveState==ProfileSaveState.SAVING)CircularProgressIndicator(Modifier.size(20.dp),strokeWidth=2.dp)else Text(stringResource(R.string.save))};state.errorCode?.takeIf{state.saveState==ProfileSaveState.FAILURE}?.let{ProfileOperationError(it,state.debugErrorCode)}}

@Composable private fun ProfileOperationError(code:String,debugCode:String?){Column(Modifier.fillMaxWidth().semantics{liveRegion=LiveRegionMode.Assertive}){Text(profileErrorMessage(code),color=MaterialTheme.colorScheme.error,style=MaterialTheme.typography.bodyMedium);if(BuildConfig.DEBUG&&!debugCode.isNullOrBlank())Text(debugCode,style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.onSurfaceVariant)}}

@Composable private fun profileErrorMessage(code:String)=stringResource(when(code){
    "PROFILE_CREATE_FAILED","PROFILE_CREATE_ENDPOINT_UNAVAILABLE"->R.string.profile_error_create
    "PROFILE_REQUIRED_DATA_INCOMPLETE","PROFILE_NAME_REQUIRED","PROFILE_CATEGORY_REQUIRED"->R.string.profile_error_required
    "PROFILE_SLUG_TAKEN"->R.string.profile_error_slug_taken
    "PROFILE_CONFLICT_REFRESHED"->R.string.profile_error_conflict_refreshed
    "PROFILE_CONFLICT_REFRESH_FAILED"->R.string.profile_error_conflict_refresh_failed
    "PROFILE_VISIBILITY_FAILED"->R.string.profile_error_visibility
    "PROFILE_NOT_READY"->R.string.profile_error_not_ready
    "PROFILE_SERVER_UNAVAILABLE","PROFILE_OFFLINE"->R.string.profile_error_server
    "PROFILE_TYPE_NOT_AVAILABLE"->R.string.profile_error_type_unavailable
    "PROFILE_TEMPLATE_UNAVAILABLE"->R.string.profile_error_template_unavailable
    else->R.string.profile_error_save
})

@Composable private fun profileReadinessMessage(code:String)=stringResource(when(code){
    "DISPLAY_NAME_REQUIRED"->R.string.profile_readiness_display_name
    "PROFILE_KIND_REQUIRED"->R.string.profile_readiness_kind
    "CATEGORY_REQUIRED","CATEGORY_MISMATCH"->R.string.profile_readiness_category
    "TEMPLATE_REQUIRED","TEMPLATE_MISMATCH"->R.string.profile_readiness_template
    "VISIBILITY_REQUIRED"->R.string.profile_readiness_visibility
    "SLUG_REQUIRED","SLUG_INVALID","SLUG_RESERVED","SLUG_NOT_NORMALIZED"->R.string.profile_readiness_slug
    "MEDIA_INVALID","MEDIA_NOT_READY"->R.string.profile_readiness_media
    "REQUIRED_MODULE_MISSING"->R.string.profile_readiness_module_missing
    "REQUIRED_MODULE_DISABLED"->R.string.profile_readiness_module_disabled
    "REQUIRED_MODULE_NOT_PUBLIC"->R.string.profile_readiness_module_public
    "MODULE_INCOMPLETE"->R.string.profile_readiness_module_incomplete
    "PROFILE_ARCHIVED"->R.string.profile_readiness_archived
    else->R.string.profile_readiness_generic
})

private fun ProfileContent.localizedAbout()=listOf(bio,if(primaryLanguage=="ar")bioAr else bioEn,if(primaryLanguage=="ar")descriptionAr else descriptionEn).firstOrNull{it.isNotBlank()}
private fun ProfileContent.hasContact()=listOf(phone,email,website,locationText).any{it.isNotBlank()}
private fun ProfileService.localizedDescription()=descriptionEn.takeIf(String::isNotBlank)?:descriptionAr.takeIf(String::isNotBlank)
