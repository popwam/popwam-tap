package com.popwam.pop.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.popwam.pop.R
import com.popwam.pop.data.api.*

object ProfileHomePolicy {
    val supportedEditors=setOf("IDENTITY","ABOUT","CONTACT","SOCIAL","LINKS","SERVICES","PORTFOLIO","GALLERY","BRANCHES")
    fun selectedProfile(requested:String?,profiles:List<ProfileSelectorItemDto>)=
        profiles.firstOrNull{it.id==requested}?.id ?: profiles.firstOrNull{it.isPrimary}?.id ?: profiles.firstOrNull()?.id
    fun canDisable(required:Boolean)=!required
    fun canPublish(ready:Boolean,loading:Boolean)=ready&&!loading
    fun nextVisibility(current:String)=when(current){"PUBLIC"->"FRIENDS";"FRIENDS"->"ONLY_ME";else->"PUBLIC"}
    fun moved(values:List<String>,index:Int,direction:Int):List<String>{
        val target=index+direction
        if(index !in values.indices||target !in values.indices)return values
        return values.toMutableList().apply{val item=removeAt(index);add(target,item)}
    }
}

@Composable
fun ShareCompatibilityHub(openProfiles:()->Unit,openActivate:()->Unit,openProducts:()->Unit){
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
        item{Text(stringResource(R.string.editor_share),Modifier.semantics{heading()},style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold)}
        item{Text(stringResource(R.string.welcome_description),color=MaterialTheme.colorScheme.onSurfaceVariant)}
        item{ShareRouteCard(Icons.Default.ContactPage,R.string.nav_cards,openProfiles)}
        item{ShareRouteCard(Icons.Default.QrCodeScanner,R.string.nav_scan,openActivate)}
        item{ShareRouteCard(Icons.Default.Inventory2,R.string.nav_products,openProducts)}
    }
}

@Composable private fun ShareRouteCard(icon:androidx.compose.ui.graphics.vector.ImageVector,label:Int,open:()->Unit){
    Surface(Modifier.fillMaxWidth().clickable(onClick=open),shape=RoundedCornerShape(22.dp),color=Color.White){
        Row(Modifier.padding(18.dp),verticalAlignment=Alignment.CenterVertically){Icon(icon,null,tint=Color(0xFF6D3DD7));Spacer(Modifier.width(14.dp));Text(stringResource(label),Modifier.weight(1f),fontWeight=FontWeight.Bold);Icon(Icons.Default.ChevronRight,null)}
    }
}

private fun action(type:String,vararg values:Pair<String,Any?>)=JsonObject().apply{
    addProperty("type",type)
    values.forEach{(key,value)->when(value){
        null->add(key,com.google.gson.JsonNull.INSTANCE)
        is String->addProperty(key,value)
        is Boolean->addProperty(key,value)
        is Number->addProperty(key,value)
        is List<*>->add(key,JsonArray().apply{value.forEach{add(it.toString())}})
        is Map<*,*>->add(key,JsonObject().apply{value.forEach{(nestedKey,nestedValue)->addProperty(nestedKey.toString(),nestedValue.toString())}})
        else->addProperty(key,value.toString())
    }}
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileEditorHomeScreen(state:MainUiState,vm:MainViewModel,navigate:(String)->Unit){
    val locale=currentLocale()
    val editor=state.profileEditor
    val selector=state.profileSelector
    var selectorOpen by rememberSaveable{mutableStateOf(false)}
    var quotaOpen by rememberSaveable{mutableStateOf(false)}
    var addSectionOpen by rememberSaveable{mutableStateOf(false)}
    var activeModule by rememberSaveable{mutableStateOf<String?>(null)}
    LaunchedEffect(locale){vm.loadProfileHome(locale)}

    if(selectorOpen&&selector!=null)ModalBottomSheet({selectorOpen=false}){
        Text(stringResource(R.string.editor_select_profile),Modifier.padding(horizontal=20.dp).semantics{heading()},style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold)
        selector.profiles.forEach{profile->
            ListItem(
                headlineContent={Text(profile.label)},
                supportingContent={Text("${if(profile.isPrimary)stringResource(R.string.editor_primary) else if(profile.profileKind=="BUSINESS")stringResource(R.string.editor_business) else stringResource(R.string.editor_personal)} · ${profile.lifecycle}")},
                leadingContent={RadioButton(profile.id==state.selectedProfileId,null)},
                modifier=Modifier.clickable{selectorOpen=false;vm.switchEditorProfile(profile.id,locale)}.padding(horizontal=8.dp),
            )
        }
        Spacer(Modifier.height(24.dp))
    }
    if(quotaOpen&&selector!=null)ModalBottomSheet({quotaOpen=false}){
        Column(Modifier.padding(20.dp).navigationBarsPadding(),verticalArrangement=Arrangement.spacedBy(14.dp)){
            Text(stringResource(R.string.editor_add_profile),Modifier.semantics{heading()},style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold)
            Text(stringResource(R.string.editor_profile_usage,selector.quota.used,selector.quota.limit),style=MaterialTheme.typography.titleMedium)
            Text(stringResource(if(selector.quota.quotaAllowsAdditional)R.string.editor_quota_available else R.string.editor_quota_reached))
            Card(colors=CardDefaults.cardColors(containerColor=Color(0xFFFFF3CD))){Text(stringResource(R.string.editor_add_profile_blocked),Modifier.padding(16.dp),color=Color(0xFF6A4B00))}
            OutlinedButton({quotaOpen=false;navigate("menu")},Modifier.fillMaxWidth().heightIn(min=52.dp)){Text(stringResource(R.string.editor_view_plans))}
        }
    }
    if(addSectionOpen&&editor!=null)ModalBottomSheet({addSectionOpen=false}){
        Column(Modifier.padding(20.dp).navigationBarsPadding(),verticalArrangement=Arrangement.spacedBy(10.dp)){
            Text(stringResource(R.string.editor_add_section),Modifier.semantics{heading()},style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold)
            editor.addableModules.forEach{module->OutlinedButton({vm.mutateProfileEditor(action("MODULE_ADD","key" to module.key),locale){addSectionOpen=false}},Modifier.fillMaxWidth().heightIn(min=52.dp),enabled=!state.loading){Text(module.name)}}
            if(editor.addableModules.isEmpty())Text(stringResource(R.string.editor_unsupported),color=MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    activeModule?.let{key->editor?.let{ModuleEditorSheet(key,it,state,vm,locale,{activeModule=null})}}

    when{
        state.loading&&editor==null->Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){CircularProgressIndicator()}
        state.error!=null&&editor==null->Box(Modifier.fillMaxSize().padding(24.dp),contentAlignment=Alignment.Center){Column(horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(12.dp)){Icon(Icons.Default.ErrorOutline,null,tint=MaterialTheme.colorScheme.error);Text(stringResource(R.string.generic_error));Button({vm.loadProfileHome(locale)}){Text(stringResource(R.string.retry))}}}
        editor==null->Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){Text(stringResource(R.string.profiles_empty))}
        else->LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)){
            item{Text(stringResource(R.string.editor_home_title),Modifier.semantics{heading()},style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold,color=Color.White);Text(stringResource(R.string.editor_home_description),color=Color(0xFFD8D0B7))}
            item{
                Surface(Modifier.fillMaxWidth().clickable{selectorOpen=true},shape=RoundedCornerShape(22.dp),color=Color.White){
                    Row(Modifier.padding(16.dp),verticalAlignment=Alignment.CenterVertically){
                        Column(Modifier.weight(1f)){Text(editor.profile.label,fontWeight=FontWeight.Bold);Row(horizontalArrangement=Arrangement.spacedBy(7.dp)){if(editor.profile.isPrimary)AssistChip({},label={Text(stringResource(R.string.editor_primary))});AssistChip({},label={Text(editor.profile.lifecycle)});if(editor.profile.draftChanged)AssistChip({},label={Text(stringResource(R.string.editor_draft_changes))})}}
                        Icon(Icons.Default.ExpandMore,stringResource(R.string.editor_select_profile))
                    }
                }
            }
            item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)){OutlinedButton({quotaOpen=true},Modifier.weight(1f).heightIn(min=52.dp)){Icon(Icons.Default.Add,null);Spacer(Modifier.width(6.dp));Text(stringResource(R.string.editor_add_profile))};OutlinedButton({navigate("profile-publish/${editor.profile.id}")},Modifier.weight(1f).heightIn(min=52.dp)){Icon(Icons.Default.Visibility,null);Spacer(Modifier.width(6.dp));Text(stringResource(R.string.editor_preview))}}}
            if(editor.profile.lifecycle=="PAUSED")item{Card(colors=CardDefaults.cardColors(containerColor=Color(0xFFFFF3CD))){Text(stringResource(R.string.editor_public_unavailable),Modifier.padding(16.dp),color=Color(0xFF6A4B00))}}
            item{DraftProfilePreview(editor)}
            item{Text(stringResource(R.string.editor_sections),Modifier.semantics{heading()},style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold,color=Color.White)}
            items(editor.modules.sortedBy{it.sortOrder},key={it.id}){module->
                val ordered=editor.modules.sortedBy{it.sortOrder};val index=ordered.indexOfFirst{it.id==module.id}
                EditorModuleCard(module,state.loading,{activeModule=module.key},{visibility->vm.mutateProfileEditor(action("MODULE_UPDATE","key" to module.key,"enabled" to module.enabled,"visibility" to visibility),locale)},{vm.mutateProfileEditor(action("MODULE_UPDATE","key" to module.key,"enabled" to !module.enabled,"visibility" to module.visibility),locale)},{vm.mutateProfileEditor(action("MODULE_REORDER","keys" to ProfileHomePolicy.moved(ordered.map{it.key},index,-1)),locale)},{vm.mutateProfileEditor(action("MODULE_REORDER","keys" to ProfileHomePolicy.moved(ordered.map{it.key},index,1)),locale)},index>0,index<ordered.lastIndex)
            }
            if(editor.addableModules.isNotEmpty())item{OutlinedButton({addSectionOpen=true},Modifier.fillMaxWidth().heightIn(min=52.dp)){Icon(Icons.Default.Add,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.editor_add_section))}}
            item{
                Surface(Modifier.fillMaxWidth(),shape=RoundedCornerShape(22.dp),color=Color.White){
                    Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
                        Text(if(editor.readiness.ready)stringResource(R.string.editor_ready) else stringResource(R.string.editor_finish_count,editor.readiness.issues.size),style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold)
                        editor.readiness.issues.forEach{issue->TextButton({activeModule=issue.module ?: when{issue.path.contains("displayName")->"IDENTITY";issue.path.contains("contact",true)->"CONTACT";else->null}},Modifier.fillMaxWidth()){Text(issue.code.replace('_',' '),Modifier.weight(1f));Icon(Icons.Default.ChevronRight,null)}}
                        Button({navigate("profile-publish/${editor.profile.id}")},Modifier.fillMaxWidth().heightIn(min=52.dp),enabled=ProfileHomePolicy.canPublish(editor.readiness.ready,state.loading)){Text(stringResource(R.string.editor_publish_changes))}
                    }
                }
            }
            item{EditorSaveStatus(state,vm,locale)}
        }
    }
}

@Composable private fun DraftProfilePreview(editor:ProfileEditorResponse){
    Surface(Modifier.fillMaxWidth(),shape=RoundedCornerShape(28.dp),color=Color(0xFF111827)){Column{editor.preview.identity.coverUrl?.let{AsyncImage(it,null,Modifier.fillMaxWidth().height(110.dp),contentScale=ContentScale.Crop)};Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){editor.preview.identity.imageUrl?.let{AsyncImage(it,null,Modifier.size(78.dp).clip(CircleShape),contentScale=ContentScale.Crop)}?:Box(Modifier.size(64.dp).background(Color(0xFF6D3DD7),CircleShape),contentAlignment=Alignment.Center){Icon(Icons.Default.Person,null,tint=Color.White)};Text(editor.preview.identity.name,style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold,color=Color.White);editor.preview.identity.title?.let{Text(it,color=Color(0xFFD4AF37))};editor.preview.identity.bio?.let{Text(it,color=Color(0xFFD1D5DB))};editor.preview.links.take(4).forEach{Surface(shape=RoundedCornerShape(14.dp),color=Color.White.copy(alpha=.08f)){Text(it.title,Modifier.fillMaxWidth().padding(12.dp),color=Color.White)}}}}}
}

@Composable private fun EditorModuleCard(module:EditorModuleDto,loading:Boolean,edit:()->Unit,visibility:(String)->Unit,toggle:()->Unit,up:()->Unit,down:()->Unit,canUp:Boolean,canDown:Boolean){
    Surface(Modifier.fillMaxWidth(),shape=RoundedCornerShape(22.dp),color=Color.White){Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){Row(verticalAlignment=Alignment.CenterVertically){IconButton(edit,Modifier.sizeIn(minWidth=48.dp,minHeight=48.dp)){Icon(Icons.Default.Edit,stringResource(R.string.edit_profile))};Column(Modifier.weight(1f)){Text(module.name,fontWeight=FontWeight.Bold);Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){if(module.required)Text(stringResource(R.string.editor_required),style=MaterialTheme.typography.labelSmall,color=Color(0xFF6D3DD7));if(module.modified)Text(stringResource(R.string.editor_modified),style=MaterialTheme.typography.labelSmall,color=Color(0xFF9A7412))}};TextButton({visibility(ProfileHomePolicy.nextVisibility(module.visibility))},enabled=!loading&&module.enabled){Text(when(module.visibility){"PUBLIC"->stringResource(R.string.publish_public);"FRIENDS"->stringResource(R.string.editor_friends);else->stringResource(R.string.editor_only_me)})}};Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){IconButton(up,enabled=!loading&&canUp){Icon(Icons.Default.ArrowUpward,null)};IconButton(down,enabled=!loading&&canDown){Icon(Icons.Default.ArrowDownward,null)};Spacer(Modifier.weight(1f));OutlinedButton(toggle,enabled=!loading&&(!module.enabled||ProfileHomePolicy.canDisable(module.required))){Text(stringResource(if(module.enabled)R.string.editor_disable else R.string.editor_enable))}}}}
}

@Composable private fun EditorSaveStatus(state:MainUiState,vm:MainViewModel,locale:String){when(state.editorSaveState){"SAVING"->Text(stringResource(R.string.editor_saving),color=Color.White);"SAVED"->Text(stringResource(R.string.editor_saved),color=Color(0xFF8BE0A4));"FAILED"->Text(stringResource(R.string.editor_failed),color=Color(0xFFFFA0A0));"CONFLICT"->Card(colors=CardDefaults.cardColors(containerColor=Color(0xFFFFE2E2))){Row(Modifier.fillMaxWidth().padding(14.dp),verticalAlignment=Alignment.CenterVertically){Text(stringResource(R.string.editor_conflict),Modifier.weight(1f),color=Color(0xFF7F1D1D));TextButton({vm.loadProfileHome(locale,state.selectedProfileId)}){Text(stringResource(R.string.editor_refresh))}}}}}

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun ModuleEditorSheet(key:String,editor:ProfileEditorResponse,state:MainUiState,vm:MainViewModel,locale:String,close:()->Unit){
    ModalBottomSheet(close){LazyColumn(Modifier.fillMaxWidth().imePadding(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(editor.modules.firstOrNull{it.key==key}?.name ?: key,Modifier.semantics{heading()},style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold)};when(key){"IDENTITY"->item{IdentityForm(editor,state.loading){vm.mutateProfileEditor(it,locale,close)}};"ABOUT"->item{AboutForm(editor,state.loading){vm.mutateProfileEditor(it,locale,close)}};"CONTACT"->item{ContactForm(editor,state.loading){vm.mutateProfileEditor(it,locale,close)}};"LINKS","SOCIAL","PORTFOLIO"->item{LinkEditor(editor,key,state.loading){vm.mutateProfileEditor(it,locale)}};"SERVICES"->item{ServiceEditor(editor,state.loading){vm.mutateProfileEditor(it,locale)}};"BRANCHES"->item{BranchEditor(editor,state.loading){vm.mutateProfileEditor(it,locale)}};"GALLERY"->item{GalleryEditor(editor,state,vm,locale)};else->item{Text(stringResource(R.string.editor_unsupported))}};item{Spacer(Modifier.height(24.dp))}}}
}

@Composable private fun EditorText(value:String,onChange:(String)->Unit,label:Int,keyboard:KeyboardType=KeyboardType.Text,multiline:Boolean=false){OutlinedTextField(value,{onChange(it.take(if(multiline)3000 else 500))},Modifier.fillMaxWidth(),label={Text(stringResource(label))},singleLine=!multiline,minLines=if(multiline)3 else 1,keyboardOptions=KeyboardOptions(keyboardType=keyboard))}
@Composable private fun SaveEditorButton(loading:Boolean,save:()->Unit){Button(save,Modifier.fillMaxWidth().heightIn(min=52.dp),enabled=!loading){if(loading)CircularProgressIndicator(Modifier.size(20.dp),strokeWidth=2.dp)else Text(stringResource(R.string.save))}}
@Composable private fun VisibilityCycle(value:String,change:(String)->Unit){OutlinedButton({change(ProfileHomePolicy.nextVisibility(value))},Modifier.fillMaxWidth().heightIn(min=48.dp)){Text("${stringResource(R.string.editor_visibility)}: ${when(value){"PUBLIC"->stringResource(R.string.publish_public);"FRIENDS"->stringResource(R.string.editor_friends);else->stringResource(R.string.editor_only_me)}}")}}

@Composable private fun IdentityForm(editor:ProfileEditorResponse,loading:Boolean,save:(JsonObject)->Unit){
    var label by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.identity.displayLabel)};var name by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.identity.displayName)};var nameAr by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.identity.displayNameAr)};var nameEn by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.identity.displayNameEn)};var titleAr by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.identity.jobTitleAr)};var titleEn by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.identity.jobTitleEn)}
    Column(verticalArrangement=Arrangement.spacedBy(10.dp)){EditorText(label,{label=it},R.string.editor_selector_label);EditorText(name,{name=it},R.string.editor_public_name);EditorText(nameAr,{nameAr=it},R.string.editor_arabic_name);EditorText(nameEn,{nameEn=it},R.string.editor_english_name);EditorText(titleAr,{titleAr=it},R.string.editor_arabic_title);EditorText(titleEn,{titleEn=it},R.string.editor_english_title);SaveEditorButton(loading){save(action("IDENTITY_SAVE","displayLabel" to label,"displayName" to name,"displayNameAr" to nameAr,"displayNameEn" to nameEn,"jobTitleAr" to titleAr,"jobTitleEn" to titleEn,"organizationNameAr" to nameAr,"organizationNameEn" to nameEn,"primaryLanguage" to editor.profile.primaryLanguage))}}
}
@Composable private fun AboutForm(editor:ProfileEditorResponse,loading:Boolean,save:(JsonObject)->Unit){
    var about by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.about.bio)};var ar by rememberSaveable(editor.profile.draftRevision){mutableStateOf(if(editor.profile.profileKind=="BUSINESS")editor.about.descriptionAr else editor.about.bioAr)};var en by rememberSaveable(editor.profile.draftRevision){mutableStateOf(if(editor.profile.profileKind=="BUSINESS")editor.about.descriptionEn else editor.about.bioEn)}
    Column(verticalArrangement=Arrangement.spacedBy(10.dp)){EditorText(about,{about=it},R.string.editor_about,multiline=true);EditorText(ar,{ar=it},R.string.editor_arabic_bio,multiline=true);EditorText(en,{en=it},R.string.editor_english_bio,multiline=true);SaveEditorButton(loading){save(action("ABOUT_SAVE","bio" to about,"bioAr" to ar,"bioEn" to en,"descriptionAr" to ar,"descriptionEn" to en))}}
}
@Composable private fun ContactForm(editor:ProfileEditorResponse,loading:Boolean,save:(JsonObject)->Unit){
    var phone by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.phone)}
    var alternatePhone by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.alternatePhone)}
    var email by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.email)}
    var website by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.website)}
    var whatsappBusiness by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.whatsappBusiness)}
    var whatsappPrivate by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.whatsappPrivate)}
    var location by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.locationText)}
    var addressAr by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.addressAr)}
    var addressEn by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.addressEn)}
    var phoneVisibility by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.visibility["phone"]?:"ONLY_ME")}
    var emailVisibility by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.visibility["email"]?:"ONLY_ME")}
    var websiteVisibility by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.visibility["website"]?:"ONLY_ME")}
    var whatsappBusinessVisibility by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.visibility["whatsappBusiness"]?:"ONLY_ME")}
    var whatsappPrivateVisibility by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.visibility["whatsappPrivate"]?:"ONLY_ME")}
    var locationVisibility by rememberSaveable(editor.profile.draftRevision){mutableStateOf(editor.contact.visibility["location"]?:"ONLY_ME")}
    Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
        EditorText(phone,{phone=it},R.string.phone,KeyboardType.Phone)
        VisibilityCycle(phoneVisibility){phoneVisibility=it}
        EditorText(alternatePhone,{alternatePhone=it},R.string.editor_alternate_phone,KeyboardType.Phone)
        EditorText(email,{email=it},R.string.email,KeyboardType.Email)
        VisibilityCycle(emailVisibility){emailVisibility=it}
        EditorText(website,{website=it},R.string.website,KeyboardType.Uri)
        VisibilityCycle(websiteVisibility){websiteVisibility=it}
        EditorText(whatsappBusiness,{whatsappBusiness=it},R.string.editor_whatsapp_business,KeyboardType.Phone)
        VisibilityCycle(whatsappBusinessVisibility){whatsappBusinessVisibility=it}
        EditorText(whatsappPrivate,{whatsappPrivate=it},R.string.editor_whatsapp_private,KeyboardType.Phone)
        VisibilityCycle(whatsappPrivateVisibility){whatsappPrivateVisibility=it}
        EditorText(location,{location=it},R.string.vc_location)
        VisibilityCycle(locationVisibility){locationVisibility=it}
        EditorText(addressAr,{addressAr=it},R.string.editor_address_ar)
        EditorText(addressEn,{addressEn=it},R.string.editor_address_en)
        SaveEditorButton(loading){
            save(action(
                "CONTACT_SAVE",
                "phone" to phone,
                "alternatePhone" to alternatePhone,
                "email" to email,
                "website" to website,
                "whatsappBusiness" to whatsappBusiness,
                "whatsappPrivate" to whatsappPrivate,
                "locationText" to location,
                "addressAr" to addressAr,
                "addressEn" to addressEn,
                "visibility" to mapOf(
                    "phone" to phoneVisibility,
                    "email" to emailVisibility,
                    "website" to websiteVisibility,
                    "whatsappBusiness" to whatsappBusinessVisibility,
                    "whatsappPrivate" to whatsappPrivateVisibility,
                    "location" to locationVisibility,
                ),
            ))
        }
    }
}

@Composable private fun LinkEditor(editor:ProfileEditorResponse,key:String,loading:Boolean,mutate:(JsonObject)->Unit){
    val social=setOf("FACEBOOK","LINKEDIN","GITHUB","TIKTOK","INSTAGRAM","X","YOUTUBE","TELEGRAM","SOCIAL");val values=editor.links.filter{when(key){"SOCIAL"->it.type in social;"PORTFOLIO"->it.type in setOf("WEBSITE","CUSTOM_URL");else->it.type !in social}}
    var editId by rememberSaveable{mutableStateOf<String?>(null)};var title by rememberSaveable{mutableStateOf("")};var url by rememberSaveable{mutableStateOf("")};var type by rememberSaveable{mutableStateOf(if(key=="SOCIAL")"INSTAGRAM" else "WEBSITE")};var visibility by rememberSaveable{mutableStateOf("ONLY_ME")}
    Column(verticalArrangement=Arrangement.spacedBy(10.dp)){if(key=="PORTFOLIO")Text(stringResource(R.string.editor_portfolio_help),color=MaterialTheme.colorScheme.onSurfaceVariant);if(key=="SOCIAL")Text(stringResource(R.string.editor_connected_accounts_help),color=MaterialTheme.colorScheme.onSurfaceVariant);if(values.isEmpty())Text(stringResource(R.string.editor_no_links));values.forEachIndexed{index,item->EditorItemRow(item.title,item.visibility,{editId=item.id;title=item.title;url=item.url;type=item.type;visibility=item.visibility},{mutate(action("LINK_DELETE","id" to item.id))},{mutate(action("LINK_REORDER","ids" to ProfileHomePolicy.moved(values.map{it.id},index,-1)))},{mutate(action("LINK_REORDER","ids" to ProfileHomePolicy.moved(values.map{it.id},index,1)))},index>0,index<values.lastIndex)};Text(stringResource(R.string.editor_add_link),fontWeight=FontWeight.Bold);EditorText(title,{title=it},R.string.editor_link_title);EditorText(url,{url=it},R.string.vc_link_url,KeyboardType.Uri);OutlinedTextField(type,{type=it.uppercase().take(30)},Modifier.fillMaxWidth(),label={Text(stringResource(R.string.editor_link_type))});VisibilityCycle(visibility){visibility=it};SaveEditorButton(loading){mutate(action("LINK_UPSERT","id" to editId,"title" to title,"titleEn" to title,"destinationType" to type,"url" to url,"visibility" to visibility));editId=null;title="";url=""}}
}
@Composable private fun ServiceEditor(editor:ProfileEditorResponse,loading:Boolean,mutate:(JsonObject)->Unit){
    var editId by rememberSaveable{mutableStateOf<String?>(null)};var ar by rememberSaveable{mutableStateOf("")};var en by rememberSaveable{mutableStateOf("")};var descriptionAr by rememberSaveable{mutableStateOf("")};var descriptionEn by rememberSaveable{mutableStateOf("")};var url by rememberSaveable{mutableStateOf("")};var visibility by rememberSaveable{mutableStateOf("ONLY_ME")}
    Column(verticalArrangement=Arrangement.spacedBy(10.dp)){if(editor.services.isEmpty())Text(stringResource(R.string.editor_no_services));editor.services.forEachIndexed{index,item->EditorItemRow(item.name,item.visibility,{editId=item.id;ar=item.nameAr.orEmpty();en=item.nameEn.orEmpty();descriptionAr=item.descriptionAr.orEmpty();descriptionEn=item.descriptionEn.orEmpty();url=item.url.orEmpty();visibility=item.visibility},{mutate(action("SERVICE_DELETE","id" to item.id))},{mutate(action("SERVICE_REORDER","ids" to ProfileHomePolicy.moved(editor.services.map{it.id},index,-1)))},{mutate(action("SERVICE_REORDER","ids" to ProfileHomePolicy.moved(editor.services.map{it.id},index,1)))},index>0,index<editor.services.lastIndex)};Text(stringResource(R.string.editor_add_service),fontWeight=FontWeight.Bold);EditorText(ar,{ar=it},R.string.editor_service_name_ar);EditorText(en,{en=it},R.string.editor_service_name_en);EditorText(descriptionAr,{descriptionAr=it},R.string.editor_description_ar,multiline=true);EditorText(descriptionEn,{descriptionEn=it},R.string.editor_description_en,multiline=true);EditorText(url,{url=it},R.string.vc_link_url,KeyboardType.Uri);VisibilityCycle(visibility){visibility=it};SaveEditorButton(loading){mutate(action("SERVICE_UPSERT","id" to editId,"nameAr" to ar,"nameEn" to en,"descriptionAr" to descriptionAr,"descriptionEn" to descriptionEn,"url" to url,"visibility" to visibility));editId=null;ar="";en="";descriptionAr="";descriptionEn="";url=""}}
}
@Composable private fun BranchEditor(editor:ProfileEditorResponse,loading:Boolean,mutate:(JsonObject)->Unit){
    var editId by rememberSaveable{mutableStateOf<String?>(null)};var ar by rememberSaveable{mutableStateOf("")};var en by rememberSaveable{mutableStateOf("")};var addressAr by rememberSaveable{mutableStateOf("")};var addressEn by rememberSaveable{mutableStateOf("")};var phone by rememberSaveable{mutableStateOf("")};var mapUrl by rememberSaveable{mutableStateOf("")};var visibility by rememberSaveable{mutableStateOf("ONLY_ME")}
    Column(verticalArrangement=Arrangement.spacedBy(10.dp)){if(editor.branches.isEmpty())Text(stringResource(R.string.editor_no_branches));editor.branches.forEachIndexed{index,item->EditorItemRow(item.name,item.visibility,{editId=item.id;ar=item.nameAr.orEmpty();en=item.nameEn.orEmpty();addressAr=item.addressAr.orEmpty();addressEn=item.addressEn.orEmpty();phone=item.phone.orEmpty();mapUrl=item.mapUrl.orEmpty();visibility=item.visibility},{mutate(action("BRANCH_DELETE","id" to item.id))},{mutate(action("BRANCH_REORDER","ids" to ProfileHomePolicy.moved(editor.branches.map{it.id},index,-1)))},{mutate(action("BRANCH_REORDER","ids" to ProfileHomePolicy.moved(editor.branches.map{it.id},index,1)))},index>0,index<editor.branches.lastIndex)};Text(stringResource(R.string.editor_add_branch),fontWeight=FontWeight.Bold);EditorText(ar,{ar=it},R.string.editor_branch_name_ar);EditorText(en,{en=it},R.string.editor_branch_name_en);EditorText(addressAr,{addressAr=it},R.string.editor_address_ar);EditorText(addressEn,{addressEn=it},R.string.editor_address_en);EditorText(phone,{phone=it},R.string.phone,KeyboardType.Phone);EditorText(mapUrl,{mapUrl=it},R.string.editor_map_url,KeyboardType.Uri);VisibilityCycle(visibility){visibility=it};SaveEditorButton(loading){mutate(action("BRANCH_UPSERT","id" to editId,"nameAr" to ar,"nameEn" to en,"addressAr" to addressAr,"addressEn" to addressEn,"phone" to phone,"mapUrl" to mapUrl,"visibility" to visibility));editId=null;ar="";en="";addressAr="";addressEn="";phone="";mapUrl=""}}
}
@Composable private fun EditorItemRow(title:String,visibility:String,edit:()->Unit,remove:()->Unit,up:()->Unit,down:()->Unit,canUp:Boolean,canDown:Boolean){Surface(shape=RoundedCornerShape(16.dp),tonalElevation=1.dp){Row(Modifier.fillMaxWidth().padding(8.dp),verticalAlignment=Alignment.CenterVertically){IconButton(edit){Icon(Icons.Default.Edit,null)};Column(Modifier.weight(1f)){Text(title,fontWeight=FontWeight.Medium);Text(visibility,style=MaterialTheme.typography.labelSmall)};IconButton(up,enabled=canUp){Icon(Icons.Default.ArrowUpward,null)};IconButton(down,enabled=canDown){Icon(Icons.Default.ArrowDownward,null)};IconButton(remove){Icon(Icons.Default.Delete,null,tint=MaterialTheme.colorScheme.error)}}}}

@Composable private fun GalleryEditor(editor:ProfileEditorResponse,state:MainUiState,vm:MainViewModel,locale:String){
    val context=LocalContext.current;val picker=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){uri:Uri?->uri?.let{vm.uploadEditorMedia(context,it,locale)}}
    Column(verticalArrangement=Arrangement.spacedBy(10.dp)){Text(stringResource(R.string.editor_media_private),color=MaterialTheme.colorScheme.onSurfaceVariant);if(editor.media.isEmpty())Text(stringResource(R.string.editor_no_media));editor.media.forEachIndexed{index,item->Surface(shape=RoundedCornerShape(18.dp),tonalElevation=1.dp){Column(Modifier.padding(10.dp)){AsyncImage(item.previewUrl,null,Modifier.fillMaxWidth().height(150.dp).clip(RoundedCornerShape(14.dp)),contentScale=ContentScale.Crop);Row(verticalAlignment=Alignment.CenterVertically){TextButton({vm.mutateProfileEditor(action("MEDIA_VISIBILITY","id" to item.id,"visibility" to ProfileHomePolicy.nextVisibility(item.visibility)),locale)}){Text(item.visibility)};Spacer(Modifier.weight(1f));IconButton({vm.mutateProfileEditor(action("MEDIA_REORDER","ids" to ProfileHomePolicy.moved(editor.media.map{it.id},index,-1)),locale)},enabled=index>0){Icon(Icons.Default.ArrowUpward,null)};IconButton({vm.mutateProfileEditor(action("MEDIA_REORDER","ids" to ProfileHomePolicy.moved(editor.media.map{it.id},index,1)),locale)},enabled=index<editor.media.lastIndex){Icon(Icons.Default.ArrowDownward,null)};IconButton({vm.removeEditorMedia(item.id,locale)}){Icon(Icons.Default.Delete,null,tint=MaterialTheme.colorScheme.error)}}}}};OutlinedButton({picker.launch("image/*")},Modifier.fillMaxWidth().heightIn(min=52.dp),enabled=!state.loading){Icon(Icons.Default.AddPhotoAlternate,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.editor_add_photo))}}
}
