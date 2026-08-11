@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.popwam.pop.ui.profile

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import com.popwam.pop.ui.components.PopFormFocusController
import com.popwam.pop.ui.components.PopFormImePolicy
import com.popwam.pop.ui.components.PopFormLayout
import com.popwam.pop.ui.components.PopFormSheet
import com.popwam.pop.ui.components.PopFormTextField
import com.popwam.pop.ui.components.PopLtrPrefix
import java.io.ByteArrayOutputStream
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
            if(content.structuredEntries.any{entry->ProfilePolicy.editableCapabilities(content).any{it.key==entry.fieldKey}&&ProfileStructuredPolicy.displayValue(entry).isNotBlank()})item{StructuredProfileContent(content)}
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
                ProfileEditorSection.TYPE_DETAILS->StructuredDetailsEditor(content,state,onEvent)
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
    var firstName by rememberSaveable(content.draftRevision){mutableStateOf(content.firstName)};var lastName by rememberSaveable(content.draftRevision){mutableStateOf(content.lastName)}
    var ar by rememberSaveable(content.draftRevision){mutableStateOf(content.displayNameAr)};var en by rememberSaveable(content.draftRevision){mutableStateOf(content.displayNameEn)}
    var titleAr by rememberSaveable(content.draftRevision){mutableStateOf(content.jobTitleAr)};var titleEn by rememberSaveable(content.draftRevision){mutableStateOf(content.jobTitleEn)}
    var profession by rememberSaveable(content.draftRevision){mutableStateOf(content.profession)};var customProfession by rememberSaveable(content.draftRevision){mutableStateOf(content.customProfession)}
    var company by rememberSaveable(content.draftRevision){mutableStateOf(content.company)};var industryAr by rememberSaveable(content.draftRevision){mutableStateOf(content.industryAr)};var industryEn by rememberSaveable(content.draftRevision){mutableStateOf(content.industryEn)}
    var orgAr by rememberSaveable(content.draftRevision){mutableStateOf(content.organizationNameAr)};var orgEn by rememberSaveable(content.draftRevision){mutableStateOf(content.organizationNameEn)}
    var validation by remember(content.draftRevision){mutableStateOf(ProfileValidationResult())}
    val business=content.summary.backendKind==ProfileBackendKind.BUSINESS
    val category=content.summary.categoryKind
    val personalName=ProfileIdentityPolicy.showsPersonalName(category);val showProfession=ProfileIdentityPolicy.showsProfession(category);val showCompany=ProfileIdentityPolicy.showsCompany(category);val showIndustry=ProfileIdentityPolicy.showsIndustry(category)
    val fields=buildList{add(ProfileFormField.DISPLAY_NAME);add(ProfileFormField.DISPLAY_LABEL);if(personalName){add(ProfileFormField.FIRST_NAME);add(ProfileFormField.LAST_NAME)};add(ProfileFormField.DISPLAY_NAME_AR);add(ProfileFormField.DISPLAY_NAME_EN);add(ProfileFormField.TITLE_AR);add(ProfileFormField.TITLE_EN);if(showProfession)add(ProfileFormField.CUSTOM_PROFESSION);if(showCompany)add(ProfileFormField.COMPANY);if(showIndustry){add(ProfileFormField.INDUSTRY_AR);add(ProfileFormField.INDUSTRY_EN)};if(business){add(ProfileFormField.ORGANIZATION_AR);add(ProfileFormField.ORGANIZATION_EN)}}
    fun changed(){onEvent(ProfileEvent.SetDirty(true))}
    PopFormLayout(firstInvalidField=validation.firstInvalidField,action={focus->SaveButton(state){
        val result=ProfileFormValidation.identity(name,label,ar,en,titleAr,titleEn,orgAr,orgEn,business,firstName,lastName,profession,customProfession,company,industryAr,industryEn,showProfession);validation=result
        if(result.valid)onEvent(ProfileEvent.Save(ProfileEditorMutation.Identity(name.trim(),label.trim(),ar.trim(),en.trim(),titleAr.trim(),titleEn.trim(),orgAr.trim(),orgEn.trim(),content.primaryLanguage,firstName.trim(),lastName.trim(),profession,customProfession.trim(),company.trim(),industryAr.trim(),industryEn.trim())))else result.firstInvalidField?.let(focus::focus)
    }}){focus->
        ValidatedProfileField(ProfileFormField.DISPLAY_NAME,focus,name,{name=it;changed()},R.string.profile_display_name,validation,next=fields.next(ProfileFormField.DISPLAY_NAME))
        ValidatedProfileField(ProfileFormField.DISPLAY_LABEL,focus,label,{label=it;changed()},R.string.profile_display_label,validation,next=fields.next(ProfileFormField.DISPLAY_LABEL))
        if(personalName){
            ValidatedProfileField(ProfileFormField.FIRST_NAME,focus,firstName,{firstName=it;changed()},R.string.profile_first_name,validation,next=fields.next(ProfileFormField.FIRST_NAME))
            ValidatedProfileField(ProfileFormField.LAST_NAME,focus,lastName,{lastName=it;changed()},R.string.profile_last_name,validation,next=fields.next(ProfileFormField.LAST_NAME))
        }
        ValidatedProfileField(ProfileFormField.DISPLAY_NAME_AR,focus,ar,{ar=it;changed()},R.string.profile_name_ar,validation,next=fields.next(ProfileFormField.DISPLAY_NAME_AR))
        ValidatedProfileField(ProfileFormField.DISPLAY_NAME_EN,focus,en,{en=it;changed()},R.string.profile_name_en,validation,next=fields.next(ProfileFormField.DISPLAY_NAME_EN),ltr=true)
        ValidatedProfileField(ProfileFormField.TITLE_AR,focus,titleAr,{titleAr=it;changed()},R.string.profile_title_ar,validation,next=fields.next(ProfileFormField.TITLE_AR))
        ValidatedProfileField(ProfileFormField.TITLE_EN,focus,titleEn,{titleEn=it;changed()},R.string.profile_title_en,validation,next=fields.next(ProfileFormField.TITLE_EN),ltr=true)
        if(showProfession){
            ProfessionSelector(profession,{profession=it;changed()})
            ValidatedProfileField(ProfileFormField.CUSTOM_PROFESSION,focus,customProfession,{customProfession=it;changed()},R.string.profile_custom_profession,validation,next=fields.next(ProfileFormField.CUSTOM_PROFESSION))
        }
        if(showCompany)ValidatedProfileField(ProfileFormField.COMPANY,focus,company,{company=it;changed()},R.string.profile_company,validation,next=fields.next(ProfileFormField.COMPANY))
        if(showIndustry){
            ValidatedProfileField(ProfileFormField.INDUSTRY_AR,focus,industryAr,{industryAr=it;changed()},R.string.profile_industry_ar,validation,next=fields.next(ProfileFormField.INDUSTRY_AR))
            ValidatedProfileField(ProfileFormField.INDUSTRY_EN,focus,industryEn,{industryEn=it;changed()},R.string.profile_industry_en,validation,next=fields.next(ProfileFormField.INDUSTRY_EN),ltr=true)
        }
        if(business){
            ValidatedProfileField(ProfileFormField.ORGANIZATION_AR,focus,orgAr,{orgAr=it;changed()},R.string.profile_org_ar,validation,next=fields.next(ProfileFormField.ORGANIZATION_AR))
            ValidatedProfileField(ProfileFormField.ORGANIZATION_EN,focus,orgEn,{orgEn=it;changed()},R.string.profile_org_en,validation,ltr=true)
        }
    }
}

@Composable private fun ProfessionSelector(value:String,onChange:(String)->Unit){
    var expanded by remember{mutableStateOf(false)};val focus=LocalFocusManager.current
    Column(Modifier.fillMaxWidth(),verticalArrangement=Arrangement.spacedBy(6.dp)){
        Text(stringResource(R.string.profile_profession),style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.onSurfaceVariant)
        Box(Modifier.fillMaxWidth()){
            OutlinedButton({focus.clearFocus();expanded=true},Modifier.fillMaxWidth(),contentPadding=PaddingValues(horizontal=16.dp,vertical=14.dp)){
                Text(profileProfessionLabel(value),Modifier.weight(1f));Icon(Icons.Default.ArrowDropDown,null)
            }
            DropdownMenu(expanded,{expanded=false},Modifier.fillMaxWidth(.9f)){ProfileIdentityPolicy.professions.forEach{option->DropdownMenuItem(text={Text(profileProfessionLabel(option))},onClick={onChange(option);expanded=false})}}
        }
    }
}

@Composable private fun AboutEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){
    var title by rememberSaveable(content.draftRevision){mutableStateOf(content.title)};var bio by rememberSaveable(content.draftRevision){mutableStateOf(content.bio)};var ar by rememberSaveable(content.draftRevision){mutableStateOf(content.bioAr)};var en by rememberSaveable(content.draftRevision){mutableStateOf(content.bioEn)};var descAr by rememberSaveable(content.draftRevision){mutableStateOf(content.descriptionAr)};var descEn by rememberSaveable(content.draftRevision){mutableStateOf(content.descriptionEn)}
    var validation by remember(content.draftRevision){mutableStateOf(ProfileValidationResult())};fun changed(){onEvent(ProfileEvent.SetDirty(true))}
    PopFormLayout(firstInvalidField=validation.firstInvalidField,action={focus->SaveButton(state){val result=ProfileFormValidation.about(title,bio,ar,en,descAr,descEn);validation=result;if(result.valid)onEvent(ProfileEvent.Save(ProfileEditorMutation.About(title.trim(),bio.trim(),ar.trim(),en.trim(),descAr.trim(),descEn.trim())))else result.firstInvalidField?.let(focus::focus)}}){focus->
        ValidatedProfileField(ProfileFormField.HEADLINE,focus,title,{title=it;changed()},R.string.profile_headline,validation)
        ValidatedProfileField(ProfileFormField.BIO,focus,bio,{bio=it;changed()},R.string.profile_bio,validation,minLines=3)
        ValidatedProfileField(ProfileFormField.ABOUT_AR,focus,ar,{ar=it;changed()},R.string.profile_about_ar,validation,minLines=4)
        ValidatedProfileField(ProfileFormField.ABOUT_EN,focus,en,{en=it;changed()},R.string.profile_about_en,validation,minLines=4,ltr=true)
        ValidatedProfileField(ProfileFormField.DESCRIPTION_AR,focus,descAr,{descAr=it;changed()},R.string.profile_description_ar,validation,minLines=4)
        ValidatedProfileField(ProfileFormField.DESCRIPTION_EN,focus,descEn,{descEn=it;changed()},R.string.profile_description_en,validation,minLines=4,ltr=true)
    }
}

@Composable private fun ContactLinksEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){
    var phone by rememberSaveable(content.draftRevision){mutableStateOf(content.phone)};var alternatePhone by rememberSaveable(content.draftRevision){mutableStateOf(content.alternatePhone)};var email by rememberSaveable(content.draftRevision){mutableStateOf(content.email)};var site by rememberSaveable(content.draftRevision){mutableStateOf(content.website)};var whatsapp by rememberSaveable(content.draftRevision){mutableStateOf(content.whatsappBusiness)};var whatsappPrivate by rememberSaveable(content.draftRevision){mutableStateOf(content.whatsappPrivate)};var location by rememberSaveable(content.draftRevision){mutableStateOf(content.locationText)};var addressAr by rememberSaveable(content.draftRevision){mutableStateOf(content.addressAr)};var addressEn by rememberSaveable(content.draftRevision){mutableStateOf(content.addressEn)};var linkDialog by remember{mutableStateOf<ProfileLink?>(null)}
    var phoneVisibility by rememberSaveable(content.draftRevision){mutableStateOf(content.contactVisibility["phone"] ?: "ONLY_ME")};var emailVisibility by rememberSaveable(content.draftRevision){mutableStateOf(content.contactVisibility["email"] ?: "ONLY_ME")};var websiteVisibility by rememberSaveable(content.draftRevision){mutableStateOf(content.contactVisibility["website"] ?: "ONLY_ME")};var whatsappVisibility by rememberSaveable(content.draftRevision){mutableStateOf(content.contactVisibility["whatsappBusiness"] ?: "ONLY_ME")};var privateWhatsappVisibility by rememberSaveable(content.draftRevision){mutableStateOf(content.contactVisibility["whatsappPrivate"] ?: "ONLY_ME")};var locationVisibility by rememberSaveable(content.draftRevision){mutableStateOf(content.contactVisibility["location"] ?: "ONLY_ME")}
    var validation by remember(content.draftRevision){mutableStateOf(ProfileValidationResult())};fun changed(){onEvent(ProfileEvent.SetDirty(true))}
    val fields=listOf(ProfileFormField.PHONE,ProfileFormField.ALTERNATE_PHONE,ProfileFormField.EMAIL,ProfileFormField.WEBSITE,ProfileFormField.WHATSAPP,ProfileFormField.WHATSAPP_PRIVATE,ProfileFormField.LOCATION,ProfileFormField.ADDRESS_AR,ProfileFormField.ADDRESS_EN)
    fun visibilityChanged(){changed()}
    PopFormLayout(firstInvalidField=validation.firstInvalidField,action={focus->SaveButton(state){val result=ProfileFormValidation.contact(phone,alternatePhone,email,site,whatsapp,whatsappPrivate,location,addressAr,addressEn);validation=result;if(result.valid)onEvent(ProfileEvent.Save(ProfileEditorMutation.Contact(ProfileFormValidation.normalizedPhone(phone),ProfileFormValidation.normalizedPhone(alternatePhone),ProfileFormValidation.normalizedEmail(email),ProfileFormValidation.normalizedHttpUrl(site),ProfileFormValidation.normalizedPhone(whatsapp),ProfileFormValidation.normalizedPhone(whatsappPrivate),location.trim(),addressAr.trim(),addressEn.trim(),mapOf("phone" to phoneVisibility,"email" to emailVisibility,"website" to websiteVisibility,"whatsappBusiness" to whatsappVisibility,"whatsappPrivate" to privateWhatsappVisibility,"location" to locationVisibility))))else result.firstInvalidField?.let(focus::focus)}}){focus->
        ValidatedProfileField(ProfileFormField.PHONE,focus,phone,{phone=it;changed()},R.string.profile_phone,validation,next=fields.next(ProfileFormField.PHONE),type=KeyboardType.Phone,ltr=true)
        ScalarVisibilitySelector(phoneVisibility){phoneVisibility=it;visibilityChanged()}
        ValidatedProfileField(ProfileFormField.ALTERNATE_PHONE,focus,alternatePhone,{alternatePhone=it;changed()},R.string.editor_alternate_phone,validation,next=fields.next(ProfileFormField.ALTERNATE_PHONE),type=KeyboardType.Phone,ltr=true)
        ValidatedProfileField(ProfileFormField.EMAIL,focus,email,{email=it;changed()},R.string.profile_email,validation,next=fields.next(ProfileFormField.EMAIL),type=KeyboardType.Email,ltr=true)
        ScalarVisibilitySelector(emailVisibility){emailVisibility=it;visibilityChanged()}
        ValidatedProfileField(ProfileFormField.WEBSITE,focus,site,{site=it;changed()},R.string.profile_website,validation,next=fields.next(ProfileFormField.WEBSITE),type=KeyboardType.Uri,ltr=true)
        ScalarVisibilitySelector(websiteVisibility){websiteVisibility=it;visibilityChanged()}
        ValidatedProfileField(ProfileFormField.WHATSAPP,focus,whatsapp,{whatsapp=it;changed()},R.string.profile_whatsapp,validation,next=fields.next(ProfileFormField.WHATSAPP),type=KeyboardType.Phone,ltr=true)
        ScalarVisibilitySelector(whatsappVisibility){whatsappVisibility=it;visibilityChanged()}
        ValidatedProfileField(ProfileFormField.WHATSAPP_PRIVATE,focus,whatsappPrivate,{whatsappPrivate=it;changed()},R.string.editor_whatsapp_private,validation,next=fields.next(ProfileFormField.WHATSAPP_PRIVATE),type=KeyboardType.Phone,ltr=true)
        ScalarVisibilitySelector(privateWhatsappVisibility){privateWhatsappVisibility=it;visibilityChanged()}
        ValidatedProfileField(ProfileFormField.LOCATION,focus,location,{location=it;changed()},R.string.profile_location,validation,next=fields.next(ProfileFormField.LOCATION))
        ValidatedProfileField(ProfileFormField.ADDRESS_AR,focus,addressAr,{addressAr=it;changed()},R.string.editor_address_ar,validation,next=fields.next(ProfileFormField.ADDRESS_AR),minLines=3)
        ValidatedProfileField(ProfileFormField.ADDRESS_EN,focus,addressEn,{addressEn=it;changed()},R.string.editor_address_en,validation,minLines=3,ltr=true)
        ScalarVisibilitySelector(locationVisibility){locationVisibility=it;visibilityChanged()}
        HorizontalDivider();Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Text(stringResource(R.string.profile_links),style=MaterialTheme.typography.titleMedium);TextButton({linkDialog=ProfileLink()}){Icon(Icons.Default.Add,null);Text(stringResource(R.string.add))}}
        val ordered=content.links.sortedBy{it.sortOrder};ordered.forEachIndexed{index,link->ListItem(headlineContent={Text(link.title)},supportingContent={CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr){Text(link.url)}},trailingContent={Row{if(index>0)IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.LinkReorder(ordered.toMutableList().also{val item=it.removeAt(index);it.add(index-1,item)}.map{it.id})))}){Icon(Icons.Default.ArrowUpward,null)};if(index<ordered.lastIndex)IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.LinkReorder(ordered.toMutableList().also{val item=it.removeAt(index);it.add(index+1,item)}.map{it.id})))}){Icon(Icons.Default.ArrowDownward,null)};IconButton({linkDialog=link}){Icon(Icons.Default.Edit,null)};IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.LinkDelete(link.id)))}){Icon(Icons.Default.Delete,null,tint=MaterialTheme.colorScheme.error)}}})}
    }
    linkDialog?.let{LinkEditorDialog(it,{linkDialog=null},{onEvent(ProfileEvent.SetDirty(true));onEvent(ProfileEvent.Save(ProfileEditorMutation.LinkUpsert(it)));linkDialog=null})}
}

@Composable private fun MediaEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){
    val context=LocalContext.current;val scope=rememberCoroutineScope();var purpose by remember{mutableStateOf("GALLERY")}
    var titleAr by rememberSaveable(content.draftRevision){mutableStateOf("")};var titleEn by rememberSaveable(content.draftRevision){mutableStateOf("")}
    var documentValidation by remember{mutableStateOf(ProfileValidationResult())};var documentError by remember{mutableStateOf<ProfileDocumentValidation?>(null)}
    val picker=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){uri->if(uri!=null)scope.launch{val mime=context.contentResolver.getType(uri)?:"image/jpeg";val name=context.profileFileName(uri,"profile-${System.currentTimeMillis()}.jpg");val bytes=withContext(Dispatchers.IO){context.readProfileBytes(uri,8L*1024L*1024L)};if(bytes!=null)onEvent(ProfileEvent.UploadMedia(ProfileMediaUpload(purpose,name,mime,bytes)))}}
    val documentPicker=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()){uri->if(uri!=null)scope.launch{
        val mime=context.contentResolver.getType(uri).orEmpty();val name=context.profileFileName(uri,"profile-document");val declaredSize=context.profileFileSize(uri)
        val preflight=ProfileDocumentPolicy.validate(name,mime,declaredSize ?: 1L)
        if(preflight in setOf(ProfileDocumentValidation.INVALID_TYPE,ProfileDocumentValidation.TOO_LARGE)){documentError=preflight;return@launch}
        val bytes=withContext(Dispatchers.IO){context.readProfileBytes(uri,ProfileDocumentPolicy.maxBytes)}
        val result=ProfileDocumentPolicy.validate(name,mime,bytes?.size?.toLong() ?: if(declaredSize!=null&&declaredSize>ProfileDocumentPolicy.maxBytes)declaredSize else 0L)
        documentError=result.takeUnless{it==ProfileDocumentValidation.VALID}
        if(result==ProfileDocumentValidation.VALID&&bytes!=null)onEvent(ProfileEvent.UploadDocument(ProfileDocumentUpload(titleAr.trim(),titleEn.trim(),name,mime,bytes)))
    }}
    val purposes=if(content.summary.backendKind==ProfileBackendKind.BUSINESS)listOf("LOGO","COVER","GALLERY")else listOf("AVATAR","COVER","GALLERY")
    PopFormLayout(firstInvalidField=documentValidation.firstInvalidField){focus ->
        Text(stringResource(R.string.profile_media_help),color=MaterialTheme.colorScheme.onSurfaceVariant)
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()){purposes.forEachIndexed{i,value->SegmentedButton(selected=purpose==value,onClick={purpose=value},shape=SegmentedButtonDefaults.itemShape(i,purposes.size)){Text(value.lowercase().replaceFirstChar{it.uppercase()})}}}
        Button({picker.launch("image/*")},Modifier.fillMaxWidth()){Icon(Icons.Default.Upload,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.profile_upload))}
        state.uploadProgress?.let{LinearProgressIndicator(Modifier.fillMaxWidth())}
        content.media.forEach{media->ListItem(leadingContent={AsyncImage(media.previewUrl,null,Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)))},headlineContent={Text(media.purpose)},supportingContent={Text(media.visibility)},trailingContent={IconButton({onEvent(ProfileEvent.RemoveMedia(media.id))}){Icon(Icons.Default.Delete,stringResource(R.string.remove),tint=MaterialTheme.colorScheme.error)}})}
        HorizontalDivider();Text(stringResource(R.string.profile_documents),style=MaterialTheme.typography.titleLarge)
        Text(stringResource(R.string.profile_documents_help),color=MaterialTheme.colorScheme.onSurfaceVariant)
        if(content.documentCapability.uploadSupported){
            ValidatedProfileField(ProfileFormField.DOCUMENT_TITLE_AR,focus,titleAr,{titleAr=it;documentError=null},R.string.profile_document_title_ar,documentValidation,next=ProfileFormField.DOCUMENT_TITLE_EN)
            ValidatedProfileField(ProfileFormField.DOCUMENT_TITLE_EN,focus,titleEn,{titleEn=it;documentError=null},R.string.profile_document_title_en,documentValidation,ltr=true)
            Button({val result=ProfileFormValidation.document(titleAr,titleEn);documentValidation=result;if(result.valid)documentPicker.launch(ProfileDocumentPolicy.mimeTypes)else result.firstInvalidField?.let(focus::focus)},Modifier.fillMaxWidth(),enabled=state.saveState!=ProfileSaveState.SAVING){Icon(Icons.Default.UploadFile,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.profile_document_upload))}
            documentError?.let{Text(stringResource(when(it){ProfileDocumentValidation.TOO_LARGE->R.string.profile_document_too_large;ProfileDocumentValidation.INVALID_TYPE->R.string.profile_document_type_invalid;ProfileDocumentValidation.EMPTY->R.string.profile_document_empty;else->R.string.profile_document_upload_failed}),color=MaterialTheme.colorScheme.error)}
        }else Text(stringResource(R.string.profile_document_upload_unavailable),color=MaterialTheme.colorScheme.onSurfaceVariant)
        content.documents.sortedBy{it.sortOrder}.forEach{document->ListItem(leadingContent={Icon(Icons.Default.Description,null)},headlineContent={Text(document.displayTitleEn.ifBlank{document.displayTitleAr.ifBlank{document.title.ifBlank{document.originalFilename}}})},supportingContent={Text(stringResource(R.string.profile_document_metadata,document.mimeType,profileFileSizeLabel(document.sizeBytes)))})}
        if(content.documents.isNotEmpty()&&(!content.documentCapability.replaceSupported||!content.documentCapability.deleteSupported))Text(stringResource(R.string.profile_document_manage_unavailable),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable private fun AppearanceEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){var selected by rememberSaveable(content.draftRevision){mutableStateOf(content.theme)};val themes=(state.quota.allowedThemes.ifEmpty{listOf(content.theme)}).distinct();PopFormLayout(action={_->SaveButton(state){onEvent(ProfileEvent.Save(ProfileEditorMutation.Appearance(selected)))}}){_->Text(stringResource(R.string.profile_appearance_separate),color=MaterialTheme.colorScheme.onSurfaceVariant);themes.forEach{theme->Card(onClick={selected=theme;onEvent(ProfileEvent.SetDirty(true))},border=if(selected==theme)BorderStroke(2.dp,MaterialTheme.colorScheme.primary)else null){Row(Modifier.fillMaxWidth().padding(16.dp),verticalAlignment=Alignment.CenterVertically){Box(Modifier.size(44.dp).clip(CircleShape).background(if(theme.endsWith("DARK"))MaterialTheme.colorScheme.inverseSurface else MaterialTheme.colorScheme.surface));Spacer(Modifier.width(12.dp));Text(theme.replace('_',' '),Modifier.weight(1f));RadioButton(selected==theme,{selected=theme;onEvent(ProfileEvent.SetDirty(true))})}}}}}

@Composable private fun VisibilityEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){var access by rememberSaveable(content.draftRevision){mutableStateOf(content.summary.visibility)};var slug by rememberSaveable(content.draftRevision){mutableStateOf(content.slug)};var validation by remember(content.draftRevision){mutableStateOf(ProfileValidationResult())};PopFormLayout(firstInvalidField=validation.firstInvalidField,action={focus->SaveButton(state){val result=if(state.quota.canCustomizeSlug)ProfileFormValidation.visibility(slug)else ProfileValidationResult();validation=result;if(result.valid)onEvent(ProfileEvent.SaveVisibility(access,slug))else result.firstInvalidField?.let(focus::focus)}}){focus->Text(stringResource(R.string.profile_visibility_help),color=MaterialTheme.colorScheme.onSurfaceVariant);listOf("PUBLIC","UNLISTED","PRIVATE").forEach{value->ListItem(modifier=Modifier.clickable{access=value;onEvent(ProfileEvent.SetDirty(true))},headlineContent={Text(stringResource(when(value){"PUBLIC"->R.string.profile_public;"UNLISTED"->R.string.profile_unlisted;else->R.string.profile_private}))},leadingContent={RadioButton(access==value,{access=value;onEvent(ProfileEvent.SetDirty(true))})})};ValidatedProfileField(ProfileFormField.SLUG,focus,slug,{slug=ProfilePolicy.normalizedSlug(it);onEvent(ProfileEvent.SetDirty(true))},R.string.profile_slug,validation,type=KeyboardType.Uri,ltr=true,enabled=state.quota.canCustomizeSlug,prefix="pop.popwam.com/");Text(stringResource(if(state.quota.canCustomizeSlug)R.string.profile_slug_server_validation else R.string.profile_slug_subscription),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant);HorizontalDivider();Text(stringResource(R.string.profile_section_visibility),style=MaterialTheme.typography.titleMedium);content.modules.filter(ProfilePolicy::canEditModule).forEach{module->ListItem(headlineContent={Text(module.name)},supportingContent={Text(module.visibility)},leadingContent={Switch(module.enabled,{onEvent(ProfileEvent.Save(ProfileEditorMutation.UpdateModule(module.key,it,module.visibility)))},enabled=!module.required)},trailingContent={TextButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.UpdateModule(module.key,module.enabled,ProfilePolicy.nextModuleVisibility(module.visibility))))}){Text(module.visibility)}})}}}

@Composable private fun ServicesEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){var dialog by remember{mutableStateOf<ProfileService?>(null)};PopFormLayout{_->Button({dialog=ProfileService()},Modifier.fillMaxWidth()){Icon(Icons.Default.Add,null);Text(stringResource(R.string.profile_add_service))};content.services.forEach{service->ListItem(headlineContent={Text(service.name)},supportingContent={service.localizedDescription()?.let{Text(it)}},trailingContent={Row{IconButton({dialog=service}){Icon(Icons.Default.Edit,null)};IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceDelete(service.id)))}){Icon(Icons.Default.Delete,null,tint=MaterialTheme.colorScheme.error)}}})}};dialog?.let{ServiceDialog(it,{dialog=null},{onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceUpsert(it)));dialog=null})}}

@Composable private fun LocationsEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){var dialog by remember{mutableStateOf<ProfileLocation?>(null)};PopFormLayout{_->Button({dialog=ProfileLocation()},Modifier.fillMaxWidth()){Icon(Icons.Default.Add,null);Text(stringResource(R.string.profile_add_location))};content.locations.forEach{location->ListItem(headlineContent={Text(location.name)},supportingContent={Text(location.addressEn.ifBlank{location.addressAr})},trailingContent={Row{IconButton({dialog=location}){Icon(Icons.Default.Edit,null)};IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.LocationDelete(location.id)))}){Icon(Icons.Default.Delete,null,tint=MaterialTheme.colorScheme.error)}}})}};dialog?.let{LocationDialog(it,{dialog=null},{onEvent(ProfileEvent.Save(ProfileEditorMutation.LocationUpsert(it)));dialog=null})}}

@Composable private fun VerificationPanel(content:ProfileContent){val verification=content.verification;PopFormLayout{_->Icon(if(verification.overallStatus=="VERIFIED")Icons.Default.Verified else Icons.Default.VerifiedUser,null,Modifier.size(56.dp),tint=if(verification.overallStatus=="VERIFIED")MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant);Text(profileVerificationStatus(verification.overallStatus),style=MaterialTheme.typography.titleLarge);Text(stringResource(R.string.profile_verification_backend_authority),color=MaterialTheme.colorScheme.onSurfaceVariant);verification.signals.forEach{signal->ListItem(headlineContent={Text(profileVerificationKind(signal.kind))},supportingContent={Column{Text(profileVerificationStatus(signal.status));signal.reasonCode?.takeIf(String::isNotBlank)?.let{Text(it,style=MaterialTheme.typography.bodySmall)}}},leadingContent={Icon(if(signal.publicBadge)Icons.Default.Verified else Icons.Default.Shield,null,tint=if(signal.publicBadge)MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)})};if(!verification.submissionSupported){Text(stringResource(R.string.profile_verification_unavailable_title),style=MaterialTheme.typography.titleMedium);Text(stringResource(R.string.profile_verification_unavailable_body),color=MaterialTheme.colorScheme.onSurfaceVariant)}}}

@Composable private fun StructuredDetailsEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit){
    var editing by remember{mutableStateOf<Pair<ProfileFieldCapability,ProfileStructuredEntry?>?>(null)}
    PopFormLayout{_->
        ProfilePolicy.editableCapabilities(content).groupBy{it.moduleKey}.forEach{(module,capabilities)->
            Text(profileModuleLabel(module),style=MaterialTheme.typography.titleLarge)
            capabilities.forEach{capability->
                val entries=content.structuredEntries.filter{it.fieldKey==capability.key}.sortedBy{it.sortOrder}
                Card(Modifier.fillMaxWidth()){
                    Column(Modifier.fillMaxWidth().padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
                        Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){Text(capability.label,Modifier.weight(1f),style=MaterialTheme.typography.titleMedium);if(capability.requiredForCompletion)Text(stringResource(R.string.profile_required),style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.primary)}
                        entries.forEachIndexed{index,entry->
                            Surface(onClick={editing=capability to entry},shape=RoundedCornerShape(14.dp),color=MaterialTheme.colorScheme.surfaceVariant){
                                Row(Modifier.fillMaxWidth().padding(12.dp),verticalAlignment=Alignment.CenterVertically){
                                    val rendered=ProfileStructuredPolicy.displayValue(entry)
                                    CompositionLocalProvider(LocalLayoutDirection provides if(ProfileStructuredPolicy.isTechnical(capability))LayoutDirection.Ltr else LocalLayoutDirection.current){Text(rendered.ifBlank{stringResource(R.string.profile_value_empty)},Modifier.weight(1f),maxLines=3)}
                                    if(capability.repeatable&&index>0)IconButton({val reordered=entries.toMutableList().also{val item=it.removeAt(index);it.add(index-1,item)};onEvent(ProfileEvent.Save(ProfileEditorMutation.StructuredEntryReorder(capability.key,reordered.map{it.id})))}){Icon(Icons.Default.ArrowUpward,stringResource(R.string.move_up))}
                                    if(capability.repeatable&&index<entries.lastIndex)IconButton({val reordered=entries.toMutableList().also{val item=it.removeAt(index);it.add(index+1,item)};onEvent(ProfileEvent.Save(ProfileEditorMutation.StructuredEntryReorder(capability.key,reordered.map{it.id})))}){Icon(Icons.Default.ArrowDownward,stringResource(R.string.move_down))}
                                    IconButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.StructuredEntryDelete(entry.id)))}){Icon(Icons.Default.Delete,stringResource(R.string.remove),tint=MaterialTheme.colorScheme.error)}
                                }
                            }
                        }
                        if(entries.size<capability.maxItems&&(capability.repeatable||entries.isEmpty()))OutlinedButton({editing=capability to null},Modifier.fillMaxWidth()){Icon(Icons.Default.Add,null);Spacer(Modifier.width(6.dp));Text(stringResource(R.string.profile_add_value))}
                    }
                }
            }
        }
    }
    editing?.let{(capability,entry)->StructuredEntrySheet(capability,entry,state,{editing=null}){onEvent(ProfileEvent.Save(ProfileEditorMutation.StructuredEntryUpsert(it)));editing=null}}
}

@Composable private fun StructuredEntrySheet(capability:ProfileFieldCapability,initial:ProfileStructuredEntry?,state:ProfilesUiState,dismiss:()->Unit,save:(ProfileStructuredEntry)->Unit){
    val seed="${capability.key}:${initial?.id.orEmpty()}"
    var simple by remember(seed){mutableStateOf(initial?.value?.let{value->when{value.isJsonPrimitive->value.asString;value.isJsonArray->value.asJsonArray.joinToString("\n"){runCatching{it.asString}.getOrDefault("")};else->""}}.orEmpty())}
    val parts=remember(seed){mutableStateMapOf<String,String>().apply{putAll(structuredParts(capability.valueType,initial?.value))}}
    val flags=remember(seed){mutableStateMapOf<String,Boolean>().apply{putAll(structuredFlags(capability.valueType,initial?.value))}}
    var visibility by remember(seed){mutableStateOf(initial?.visibility ?: "ONLY_ME")}
    var validation by remember(seed){mutableStateOf(ProfileStructuredValidationResult())}
    fun part(name:String)=parts[name].orEmpty()
    fun change(name:String,value:String){parts[name]=value}
    PopFormSheet(
        onDismissRequest=dismiss,
        title={Text(capability.label,style=MaterialTheme.typography.titleLarge)},
        firstInvalidField=validation.firstInvalidField,
        action={focus->
            Button({
                val value=buildStructuredValue(capability.valueType,simple,parts,flags)
                val result=ProfileStructuredPolicy.validate(capability,value);validation=result
                if(result.valid)save(ProfileStructuredEntry(initial?.id.orEmpty(),capability.key,initial?.instanceKey.orEmpty(),capability.moduleKey,value,if(capability.visibilitySupported)visibility else "ONLY_ME",initial?.sortOrder ?: 0))else result.firstInvalidField?.let(focus::focus)
            },Modifier.fillMaxWidth(),enabled=state.saveState!=ProfileSaveState.SAVING&&capability.valueType!=ProfileStructuredValueType.UNKNOWN){Text(stringResource(R.string.save))}
            TextButton(dismiss,Modifier.fillMaxWidth()){Text(stringResource(R.string.cancel))}
        },
    ){focus->
        when(capability.valueType){
            ProfileStructuredValueType.TEXT,ProfileStructuredValueType.LONG_TEXT,ProfileStructuredValueType.URL,ProfileStructuredValueType.EMAIL,ProfileStructuredValueType.INTEGER,ProfileStructuredValueType.STRING_LIST->StructuredInput(capability,null,focus,simple,{simple=it},validation,if(capability.valueType==ProfileStructuredValueType.STRING_LIST)R.string.profile_list_one_per_line else null)
            ProfileStructuredValueType.EDUCATION->{StructuredInput(capability,"institution",focus,part("institution"),{change("institution",it)},validation,R.string.profile_institution);StructuredInput(capability,"qualification",focus,part("qualification"),{change("qualification",it)},validation,R.string.profile_qualification);StructuredInput(capability,"field",focus,part("field"),{change("field",it)},validation,R.string.profile_study_field);StructuredInput(capability,"startYear",focus,part("startYear"),{change("startYear",it)},validation,R.string.profile_start_year);StructuredInput(capability,"endYear",focus,part("endYear"),{change("endYear",it)},validation,R.string.profile_end_year)}
            ProfileStructuredValueType.EXPERIENCE->{StructuredInput(capability,"organization",focus,part("organization"),{change("organization",it)},validation,R.string.profile_organization);StructuredInput(capability,"role",focus,part("role"),{change("role",it)},validation,R.string.profile_role);StructuredInput(capability,"summary",focus,part("summary"),{change("summary",it)},validation,R.string.profile_summary);StructuredInput(capability,"startYear",focus,part("startYear"),{change("startYear",it)},validation,R.string.profile_start_year);StructuredInput(capability,"endYear",focus,part("endYear"),{change("endYear",it)},validation,R.string.profile_end_year);Row(verticalAlignment=Alignment.CenterVertically){Checkbox(flags["current"]==true,{flags["current"]=it});Text(stringResource(R.string.profile_current_role))}}
            ProfileStructuredValueType.PROJECT->{StructuredInput(capability,"name",focus,part("name"),{change("name",it)},validation,R.string.profile_name);StructuredInput(capability,"summary",focus,part("summary"),{change("summary",it)},validation,R.string.profile_summary);StructuredInput(capability,"url",focus,part("url"),{change("url",it)},validation,R.string.profile_website)}
            ProfileStructuredValueType.WEEKLY_HOURS->ProfileStructuredPolicy.weekDays.forEach{day->val closed=flags["$day-closed"]!=false;Text(profileDayLabel(day),style=MaterialTheme.typography.titleMedium);Row(verticalAlignment=Alignment.CenterVertically){Switch(closed,{flags["$day-closed"]=it});Spacer(Modifier.width(8.dp));Text(stringResource(R.string.profile_closed))};if(!closed){StructuredInput(capability,"$day-open",focus,part("$day-open"),{change("$day-open",it)},validation,R.string.profile_opens_at);StructuredInput(capability,"$day-close",focus,part("$day-close"),{change("$day-close",it)},validation,R.string.profile_closes_at)}}
            ProfileStructuredValueType.UNKNOWN->Text(stringResource(R.string.profile_field_unsupported),color=MaterialTheme.colorScheme.error)
        }
        if(capability.visibilitySupported)ProfileVisibilitySelector(visibility){visibility=it}
    }
}

@Composable private fun StructuredInput(capability:ProfileFieldCapability,part:String?,focus:PopFormFocusController,value:String,change:(String)->Unit,validation:ProfileStructuredValidationResult,labelOverride:Int?=null){
    val key=ProfileStructuredPolicy.fieldId(capability.key,part);val error=validation.errors[key];val long=capability.valueType==ProfileStructuredValueType.LONG_TEXT||part=="summary";val type=when{part?.contains("Year",true)==true||capability.valueType==ProfileStructuredValueType.INTEGER->KeyboardType.Number;part?.contains("url",true)==true||capability.valueType==ProfileStructuredValueType.URL->KeyboardType.Uri;capability.valueType==ProfileStructuredValueType.EMAIL->KeyboardType.Email;else->KeyboardType.Text}
    PopFormTextField(key,focus,value,change,label={Text(labelOverride?.let{stringResource(it)} ?: capability.label)},keyboardType=type,imeAction=if(long)ImeAction.Default else ImeAction.Done,singleLine=!long,minLines=if(long)3 else 1,maxLines=if(long)8 else 1,valueIsLtr=ProfileStructuredPolicy.isTechnical(capability,part),isError=error!=null,supportingText=error?.let{{Text(profileValidationMessage(it),color=MaterialTheme.colorScheme.error)}})
}

internal fun structuredParts(type:ProfileStructuredValueType,value:JsonElement?):Map<String,String> = buildMap{
    val root=value?.takeIf(JsonElement::isJsonObject)?.asJsonObject ?: return@buildMap
    root.entrySet().forEach{(key,entry)->if(entry.isJsonPrimitive&&key!="closed"&&key!="current")put(key,entry.asString)}
    if(type==ProfileStructuredValueType.WEEKLY_HOURS)ProfileStructuredPolicy.weekDays.forEach{day->
        val hours=root.get(day)?.takeIf(JsonElement::isJsonObject)?.asJsonObject ?: return@forEach
        hours.get("open")?.takeIf(JsonElement::isJsonPrimitive)?.asString?.let{put("$day-open",it)}
        hours.get("close")?.takeIf(JsonElement::isJsonPrimitive)?.asString?.let{put("$day-close",it)}
    }
}
internal fun structuredFlags(type:ProfileStructuredValueType,value:JsonElement?):Map<String,Boolean> = buildMap{
    if(type==ProfileStructuredValueType.EXPERIENCE)value?.takeIf(JsonElement::isJsonObject)?.asJsonObject?.get("current")?.takeIf(JsonElement::isJsonPrimitive)?.asBoolean?.let{put("current",it)}
    if(type==ProfileStructuredValueType.WEEKLY_HOURS){val root=value?.takeIf(JsonElement::isJsonObject)?.asJsonObject;ProfileStructuredPolicy.weekDays.forEach{day->val hours=root?.get(day)?.takeIf(JsonElement::isJsonObject)?.asJsonObject;put("$day-closed",hours?.get("closed")?.asBoolean ?: true)}}
}
internal fun buildStructuredValue(type:ProfileStructuredValueType,simple:String,parts:Map<String,String>,flags:Map<String,Boolean>):JsonElement=when(type){
    ProfileStructuredValueType.TEXT,ProfileStructuredValueType.LONG_TEXT->JsonPrimitive(simple.trim())
    ProfileStructuredValueType.URL->JsonPrimitive(ProfileFormValidation.normalizedHttpUrl(simple))
    ProfileStructuredValueType.EMAIL->JsonPrimitive(ProfileFormValidation.normalizedEmail(simple))
    ProfileStructuredValueType.INTEGER->simple.trim().toIntOrNull()?.let(::JsonPrimitive) ?: JsonPrimitive(simple.trim())
    ProfileStructuredValueType.STRING_LIST->JsonArray().also{array->simple.lineSequence().flatMap{it.split(',').asSequence()}.map(String::trim).filter(String::isNotBlank).distinct().forEach(array::add)}
    ProfileStructuredValueType.EDUCATION,ProfileStructuredValueType.EXPERIENCE,ProfileStructuredValueType.PROJECT->JsonObject().also{json->parts.forEach{(key,value)->if(value.isNotBlank())if(key.endsWith("Year"))value.toIntOrNull()?.let{json.addProperty(key,it)}else json.addProperty(key,if(key=="url")ProfileFormValidation.normalizedHttpUrl(value)else value.trim())};if(type==ProfileStructuredValueType.EXPERIENCE)json.addProperty("current",flags["current"]==true)}
    ProfileStructuredValueType.WEEKLY_HOURS->JsonObject().also{week->ProfileStructuredPolicy.weekDays.forEach{day->val closed=flags["$day-closed"]!=false;week.add(day,JsonObject().also{hours->hours.addProperty("closed",closed);if(!closed){hours.addProperty("open",parts["$day-open"].orEmpty().trim());hours.addProperty("close",parts["$day-close"].orEmpty().trim())}})}}
    ProfileStructuredValueType.UNKNOWN->JsonPrimitive("")
}

@Composable private fun StructuredProfileContent(content:ProfileContent){val publicCapabilities=ProfilePolicy.editableCapabilities(content).associateBy{it.key};ProfileSection(stringResource(R.string.profile_type_details)){content.structuredEntries.filter{it.fieldKey in publicCapabilities&&ProfileStructuredPolicy.displayValue(it).isNotBlank()}.groupBy{it.moduleKey}.forEach{(module,entries)->Text(profileModuleLabel(module),style=MaterialTheme.typography.titleMedium);entries.sortedBy{it.sortOrder}.forEach{entry->val capability=publicCapabilities[entry.fieldKey];Text(capability?.label ?: stringResource(R.string.profile_additional_details),style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.onSurfaceVariant);CompositionLocalProvider(LocalLayoutDirection provides if(capability?.let{ProfileStructuredPolicy.isTechnical(it)}==true)LayoutDirection.Ltr else LocalLayoutDirection.current){Text(ProfileStructuredPolicy.displayValue(entry),style=MaterialTheme.typography.bodyLarge)};Text(profileVisibilityLabel(entry.visibility),style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.onSurfaceVariant);Spacer(Modifier.height(10.dp))}}}}

@Composable private fun ProfileVisibilitySelector(value:String,change:(String)->Unit){Text(stringResource(R.string.editor_visibility),style=MaterialTheme.typography.titleMedium);SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()){listOf("PUBLIC","FRIENDS","ONLY_ME").forEachIndexed{index,item->SegmentedButton(value==item,{change(item)},SegmentedButtonDefaults.itemShape(index,3)){Text(profileVisibilityLabel(item))}}}}
@Composable private fun ScalarVisibilitySelector(value:String,change:(String)->Unit){Text(stringResource(R.string.editor_visibility),style=MaterialTheme.typography.labelLarge);SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()){listOf("PUBLIC","ONLY_ME").forEachIndexed{index,item->SegmentedButton(value==item,{change(item)},SegmentedButtonDefaults.itemShape(index,2)){Text(profileVisibilityLabel(item))}}}}
@Composable private fun profileVisibilityLabel(value:String)=stringResource(when(value){"PUBLIC"->R.string.profile_public;"FRIENDS"->R.string.editor_friends;else->R.string.editor_only_me})
@Composable private fun profileDayLabel(day:String)=stringResource(when(day){"monday"->R.string.profile_monday;"tuesday"->R.string.profile_tuesday;"wednesday"->R.string.profile_wednesday;"thursday"->R.string.profile_thursday;"friday"->R.string.profile_friday;"saturday"->R.string.profile_saturday;else->R.string.profile_sunday})
@Composable private fun profileModuleLabel(key:String)=stringResource(when(key){
    "IDENTITY"->R.string.profile_module_identity
    "ABOUT"->R.string.profile_about
    "CONTACT"->R.string.profile_contact_links
    "SOCIAL","LINKS"->R.string.profile_module_social_links
    "SERVICES"->R.string.profile_services
    "PORTFOLIO"->R.string.profile_module_portfolio
    "GALLERY"->R.string.profile_media
    "BRANCHES"->R.string.profile_locations
    "CATALOG"->R.string.profile_module_catalog
    "PERSONAL_DETAILS"->R.string.profile_module_personal_details
    "PROFESSIONAL_DETAILS"->R.string.profile_module_professional_details
    "BUSINESS_DETAILS"->R.string.profile_module_business_details
    "RESTAURANT_DETAILS"->R.string.profile_module_restaurant_details
    "MEDICAL_DETAILS"->R.string.profile_module_medical_details
    else->R.string.profile_additional_details
})
@Composable private fun profileVerificationStatus(value:String)=stringResource(when(value){"REQUIRED"->R.string.profile_verification_required;"IN_PROGRESS"->R.string.profile_verification_in_progress;"PENDING"->R.string.profile_verification_pending;"VERIFIED"->R.string.profile_verified;"REJECTED"->R.string.profile_verification_rejected;"NEEDS_UPDATE"->R.string.profile_verification_needs_update;"EXPIRED"->R.string.profile_verification_expired;else->R.string.profile_verification_not_started})
@Composable private fun profileVerificationKind(value:String)=stringResource(when(value){"BUSINESS"->R.string.profile_verification_business;"PROFESSIONAL"->R.string.profile_verification_professional;"MEDICAL"->R.string.profile_verification_medical;"CONTACT"->R.string.profile_verification_contact;"DOMAIN"->R.string.profile_verification_domain;else->R.string.profile_verification_identity})

@Composable
fun ProfileCreationScreen(state:ProfilesUiState,onBack:()->Unit,onEvent:(ProfileEvent)->Unit){var kind by remember{mutableStateOf(ProfileBackendKind.PERSONAL)};var name by rememberSaveable{mutableStateOf("")};var category by rememberSaveable{mutableStateOf<String?>(null)};var validation by remember{mutableStateOf(ProfileValidationResult())};val selectedCategory=state.categories.firstOrNull{it.slug==category&&it.backendKind==kind};LaunchedEffect(kind){onEvent(ProfileEvent.LoadCategories(kind));category=null};Scaffold(containerColor=MaterialTheme.colorScheme.background,topBar={TopAppBar(title={Text(stringResource(R.string.profile_add))},navigationIcon={IconButton(onBack){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.back))}})}){padding->PopFormLayout(Modifier.padding(padding),validation.firstInvalidField,action={focus->Button({val result=ProfileFormValidation.creation(name);validation=result;if(result.valid)onEvent(ProfileEvent.CreateProfile(name.trim(),kind,category,selectedCategory?.defaultTemplateId))else result.firstInvalidField?.let(focus::focus)},Modifier.fillMaxWidth(),enabled=selectedCategory?.defaultTemplateId!=null&&state.saveState!=ProfileSaveState.SAVING){if(state.saveState==ProfileSaveState.SAVING)CircularProgressIndicator(Modifier.size(20.dp),strokeWidth=2.dp)else Text(stringResource(R.string.profile_create_continue))};if(state.saveState==ProfileSaveState.FAILURE&&state.errorCode!=null)ProfileOperationError(state.errorCode,state.debugErrorCode)}){focus->SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()){ProfileBackendKind.entries.forEachIndexed{i,value->val allowed=value in state.quota.allowedKinds;SegmentedButton(kind==value,{kind=value},SegmentedButtonDefaults.itemShape(i,ProfileBackendKind.entries.size),enabled=allowed){Text(stringResource(if(value==ProfileBackendKind.PERSONAL)R.string.profile_type_personal else R.string.profile_type_business))}}};if(ProfileBackendKind.BUSINESS !in state.quota.allowedKinds)Text(stringResource(R.string.profile_business_plan_unavailable),style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onSurfaceVariant);ValidatedProfileField(ProfileFormField.CREATE_NAME,focus,name,{name=it},R.string.profile_name,validation);if(state.categoryKindLoading!=null)LinearProgressIndicator(Modifier.fillMaxWidth())else state.categories.filter{it.backendKind==kind}.forEach{item->val available=item.defaultTemplateId!=null;Card(onClick={if(available)category=item.slug},enabled=available,border=if(category==item.slug)BorderStroke(2.dp,MaterialTheme.colorScheme.primary)else null){Row(Modifier.fillMaxWidth().padding(14.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(category==item.slug,{if(available)category=item.slug},enabled=available);Column{Text(item.name);if(!available)Text(stringResource(R.string.profile_type_reference_unavailable),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.error)}}}}}}}

@Composable private fun DirtyBackGuard(dirty:Boolean,onBack:()->Unit,discard:()->Unit){var confirm by remember{mutableStateOf(false)};BackHandler{if(dirty)confirm=true else onBack()};if(confirm)AlertDialog(onDismissRequest={confirm=false},title={Text(stringResource(R.string.profile_unsaved_title))},text={Text(stringResource(R.string.profile_unsaved_body))},confirmButton={TextButton({discard();confirm=false;onBack()}){Text(stringResource(R.string.profile_discard))}},dismissButton={TextButton({confirm=false}){Text(stringResource(R.string.cancel))}})}

@Composable private fun LinkEditorDialog(initial:ProfileLink,dismiss:()->Unit,save:(ProfileLink)->Unit){var title by remember{mutableStateOf(initial.title)};var url by remember{mutableStateOf(initial.url)};var type by remember{mutableStateOf(initial.type)};var visibility by remember{mutableStateOf(initial.visibility)};var validation by remember{mutableStateOf(ProfileValidationResult())};val types=listOf("WEBSITE","PHONE","EMAIL","WHATSAPP_PRIVATE","LINKEDIN","INSTAGRAM","X","CUSTOM_URL");PopFormSheet(dismiss,{Text(stringResource(if(initial.id.isBlank())R.string.profile_add_link else R.string.profile_edit_link),style=MaterialTheme.typography.titleLarge)},validation.firstInvalidField,action={focus->Button({val result=ProfileFormValidation.link(type,title,url);validation=result;if(result.valid){val normalized=when(type){"EMAIL"->ProfileFormValidation.normalizedEmail(url);"PHONE","WHATSAPP_PRIVATE","WHATSAPP_BUSINESS"->ProfileFormValidation.normalizedPhone(url);else->ProfileFormValidation.normalizedHttpUrl(url)};save(initial.copy(title=title.trim(),titleEn=title.trim(),url=normalized,type=type,visibility=visibility))}else result.firstInvalidField?.let(focus::focus)},Modifier.fillMaxWidth()){Text(stringResource(R.string.save))};TextButton(dismiss,Modifier.fillMaxWidth()){Text(stringResource(R.string.cancel))}},content={focus->ValidatedProfileField(ProfileFormField.LINK_TITLE,focus,title,{title=it},R.string.profile_link_title,validation,next=ProfileFormField.LINK_VALUE);LazyRow(horizontalArrangement=Arrangement.spacedBy(6.dp)){items(types){value->FilterChip(type==value,{type=value},label={Text(value.replace('_',' '))})}};ValidatedProfileField(ProfileFormField.LINK_VALUE,focus,url,{url=it},R.string.profile_link_url,validation,type=if(type in setOf("PHONE","WHATSAPP_PRIVATE"))KeyboardType.Phone else if(type=="EMAIL")KeyboardType.Email else KeyboardType.Uri,ltr=true);ScalarVisibilitySelector(visibility){visibility=it}})}
@Composable private fun ServiceDialog(initial:ProfileService,dismiss:()->Unit,save:(ProfileService)->Unit){var name by remember{mutableStateOf(initial.nameEn.ifBlank{initial.nameAr})};var desc by remember{mutableStateOf(initial.descriptionEn.ifBlank{initial.descriptionAr})};var url by remember{mutableStateOf(initial.url)};var visibility by remember{mutableStateOf(initial.visibility)};var validation by remember{mutableStateOf(ProfileValidationResult())};PopFormSheet(dismiss,{Text(stringResource(R.string.profile_service),style=MaterialTheme.typography.titleLarge)},validation.firstInvalidField,action={focus->Button({val result=ProfileFormValidation.service(name,desc,url);validation=result;if(result.valid)save(initial.copy(name=name.trim(),nameEn=name.trim(),descriptionEn=desc.trim(),url=ProfileFormValidation.normalizedHttpUrl(url),visibility=visibility))else result.firstInvalidField?.let(focus::focus)},Modifier.fillMaxWidth()){Text(stringResource(R.string.save))};TextButton(dismiss,Modifier.fillMaxWidth()){Text(stringResource(R.string.cancel))}},content={focus->ValidatedProfileField(ProfileFormField.SERVICE_NAME,focus,name,{name=it},R.string.profile_name,validation,next=ProfileFormField.SERVICE_DESCRIPTION);ValidatedProfileField(ProfileFormField.SERVICE_DESCRIPTION,focus,desc,{desc=it},R.string.profile_description,validation,minLines=3);ValidatedProfileField(ProfileFormField.SERVICE_URL,focus,url,{url=it},R.string.profile_website,validation,type=KeyboardType.Uri,ltr=true);ScalarVisibilitySelector(visibility){visibility=it}})}
@Composable private fun LocationDialog(initial:ProfileLocation,dismiss:()->Unit,save:(ProfileLocation)->Unit){var name by remember{mutableStateOf(initial.nameEn.ifBlank{initial.nameAr})};var address by remember{mutableStateOf(initial.addressEn.ifBlank{initial.addressAr})};var phone by remember{mutableStateOf(initial.phone)};var map by remember{mutableStateOf(initial.mapUrl)};var visibility by remember{mutableStateOf(initial.visibility)};var validation by remember{mutableStateOf(ProfileValidationResult())};PopFormSheet(dismiss,{Text(stringResource(R.string.profile_location),style=MaterialTheme.typography.titleLarge)},validation.firstInvalidField,action={focus->Button({val result=ProfileFormValidation.location(name,address,phone,map);validation=result;if(result.valid)save(initial.copy(name=name.trim(),nameEn=name.trim(),addressEn=address.trim(),phone=ProfileFormValidation.normalizedPhone(phone),mapUrl=ProfileFormValidation.normalizedHttpUrl(map),visibility=visibility))else result.firstInvalidField?.let(focus::focus)},Modifier.fillMaxWidth()){Text(stringResource(R.string.save))};TextButton(dismiss,Modifier.fillMaxWidth()){Text(stringResource(R.string.cancel))}},content={focus->ValidatedProfileField(ProfileFormField.LOCATION_NAME,focus,name,{name=it},R.string.profile_name,validation,next=ProfileFormField.LOCATION_ADDRESS);ValidatedProfileField(ProfileFormField.LOCATION_ADDRESS,focus,address,{address=it},R.string.profile_address,validation,next=ProfileFormField.LOCATION_PHONE);ValidatedProfileField(ProfileFormField.LOCATION_PHONE,focus,phone,{phone=it},R.string.profile_phone,validation,next=ProfileFormField.LOCATION_MAP_URL,type=KeyboardType.Phone,ltr=true);ValidatedProfileField(ProfileFormField.LOCATION_MAP_URL,focus,map,{map=it},R.string.profile_map_url,validation,type=KeyboardType.Uri,ltr=true);ScalarVisibilitySelector(visibility){visibility=it}})}

private fun Context.profileFileName(uri:Uri,fallback:String)=contentResolver.query(uri,arrayOf(OpenableColumns.DISPLAY_NAME),null,null,null)?.use{cursor->if(cursor.moveToFirst())cursor.getString(0)?.takeIf(String::isNotBlank)else null} ?: fallback
private fun Context.profileFileSize(uri:Uri):Long?=contentResolver.query(uri,arrayOf(OpenableColumns.SIZE),null,null,null)?.use{cursor->if(cursor.moveToFirst()&&!cursor.isNull(0))cursor.getLong(0)else null}
private fun Context.readProfileBytes(uri:Uri,maximum:Long):ByteArray?=contentResolver.openInputStream(uri)?.use{input->
    val output=ByteArrayOutputStream();val buffer=ByteArray(16*1024);var total=0L
    while(true){val read=input.read(buffer);if(read<0)break;total+=read;if(total>maximum)return null;output.write(buffer,0,read)}
    output.toByteArray()
}
private fun profileFileSizeLabel(bytes:Long)=when{bytes>=1024L*1024L->"%.1f MB".format(bytes/(1024.0*1024.0));bytes>=1024L->"%.1f KB".format(bytes/1024.0);else->"$bytes B"}

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
@Composable private fun sectionTitle(section:ProfileEditorSection)=stringResource(when(section){ProfileEditorSection.BASIC_INFORMATION->R.string.profile_basic_information;ProfileEditorSection.ABOUT->R.string.profile_about;ProfileEditorSection.CONTACT_LINKS->R.string.profile_contact_links;ProfileEditorSection.TYPE_DETAILS->R.string.profile_type_details;ProfileEditorSection.MEDIA->R.string.profile_media;ProfileEditorSection.APPEARANCE->R.string.profile_appearance;ProfileEditorSection.VERIFICATION->R.string.profile_verification;ProfileEditorSection.VISIBILITY->R.string.profile_visibility;ProfileEditorSection.SERVICES->R.string.profile_services;ProfileEditorSection.LOCATIONS->R.string.profile_locations})
private fun sectionIcon(section:ProfileEditorSection)=when(section){ProfileEditorSection.BASIC_INFORMATION->Icons.Default.Badge;ProfileEditorSection.ABOUT->Icons.Default.Article;ProfileEditorSection.CONTACT_LINKS->Icons.Default.Link;ProfileEditorSection.TYPE_DETAILS->Icons.Default.DynamicForm;ProfileEditorSection.MEDIA->Icons.Default.PhotoLibrary;ProfileEditorSection.APPEARANCE->Icons.Default.Palette;ProfileEditorSection.VERIFICATION->Icons.Default.VerifiedUser;ProfileEditorSection.VISIBILITY->Icons.Default.Visibility;ProfileEditorSection.SERVICES->Icons.Default.Work;ProfileEditorSection.LOCATIONS->Icons.Default.LocationOn}
@Composable private fun ValidatedProfileField(
    field:ProfileFormField,
    focus:PopFormFocusController,
    value:String,
    onValueChange:(String)->Unit,
    label:Int,
    validation:ProfileValidationResult,
    next:ProfileFormField?=null,
    type:KeyboardType=KeyboardType.Text,
    minLines:Int=1,
    ltr:Boolean=false,
    enabled:Boolean=true,
    prefix:String?=null,
){
    val error=validation[field]
    PopFormTextField(
        fieldKey=field.key,
        focusController=focus,
        value=value,
        onValueChange=onValueChange,
        label={Text(stringResource(label))},
        nextFieldKey=next?.key,
        keyboardType=type,
        imeAction=PopFormImePolicy.imeAction(minLines==1,next!=null),
        singleLine=minLines==1,
        minLines=minLines,
        maxLines=if(minLines==1)1 else 8,
        enabled=enabled,
        valueIsLtr=ltr,
        isError=error!=null,
        supportingText=error?.let{{Text(profileValidationMessage(it),color=MaterialTheme.colorScheme.error)}},
        prefix=prefix?.let{{PopLtrPrefix(it)}},
    )
}

private fun List<ProfileFormField>.next(field:ProfileFormField)=indexOf(field).takeIf{it>=0&&it<lastIndex}?.let{get(it+1)}

@Composable private fun profileValidationMessage(code:ProfileValidationCode)=stringResource(when(code){
    ProfileValidationCode.REQUIRED->R.string.profile_field_required
    ProfileValidationCode.TOO_LONG->R.string.profile_field_too_long
    ProfileValidationCode.INVALID_PHONE->R.string.profile_field_phone_invalid
    ProfileValidationCode.INVALID_EMAIL->R.string.profile_field_email_invalid
    ProfileValidationCode.INVALID_URL->R.string.profile_field_url_invalid
    ProfileValidationCode.INVALID_SLUG->R.string.profile_field_slug_invalid
    ProfileValidationCode.INVALID_NUMBER->R.string.profile_field_number_invalid
    ProfileValidationCode.INVALID_TIME->R.string.profile_field_time_invalid
    ProfileValidationCode.INVALID_SELECTION->R.string.profile_field_selection_invalid
    ProfileValidationCode.TOO_MANY_ITEMS->R.string.profile_field_too_many_items
    ProfileValidationCode.UNSUPPORTED->R.string.profile_field_unsupported
})

@Composable private fun profileProfessionLabel(value:String)=stringResource(when(value){
    "BUSINESS_OWNER"->R.string.profile_profession_business_owner
    "COMPANY"->R.string.profile_profession_company
    "DEVELOPER"->R.string.profile_profession_developer
    "DESIGNER"->R.string.profile_profession_designer
    "CREATOR"->R.string.profile_profession_creator
    "MARKETER"->R.string.profile_profession_marketer
    "REAL_ESTATE"->R.string.profile_profession_real_estate
    "DOCTOR"->R.string.profile_profession_doctor
    "LAWYER"->R.string.profile_profession_lawyer
    "MUSICIAN"->R.string.profile_profession_musician
    "PHOTOGRAPHER"->R.string.profile_profession_photographer
    "FREELANCER"->R.string.profile_profession_freelancer
    "RESTAURANT"->R.string.profile_profession_restaurant
    "SHOP"->R.string.profile_profession_shop
    else->R.string.profile_profession_personal
})
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
