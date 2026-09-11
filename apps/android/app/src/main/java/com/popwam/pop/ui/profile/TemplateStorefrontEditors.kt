@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.popwam.pop.ui.profile

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import com.popwam.pop.data.api.ProfileTemplateDto
import com.popwam.pop.ui.components.PopFormSheet
import com.popwam.pop.ui.components.PopFormTextField
import com.popwam.pop.ui.components.PopFormFocusController
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal fun profileAssetUrl(value:String?)=value?.let{if(it.startsWith("/"))BuildConfig.API_BASE_URL.trimEnd('/')+it else it}

@Composable
fun TemplateEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit) {
    var chosenId by rememberSaveable(content.summary.id,content.templateId){mutableStateOf(content.templateId)}
    var preview by remember{mutableStateOf(false)}
    val catalog=ShowcasePolicy.templates(state.templates,content.summary.backendKind)
    val chosen=catalog.firstOrNull{it.id==chosenId}
    val saving=state.saveState==ProfileSaveState.SAVING
    LaunchedEffect(content.summary.id){onEvent(ProfileEvent.LoadTemplates)}
    Column(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
        Text(content.templateName.ifBlank{stringResource(R.string.pass6_template)},style=MaterialTheme.typography.titleMedium)
        Text(stringResource(R.string.pass6_draft_only),style=MaterialTheme.typography.bodySmall)
        Text(stringResource(R.string.pass6_thumbnail_hint),style=MaterialTheme.typography.bodySmall)
        if(state.templatesLoading)LinearProgressIndicator(Modifier.fillMaxWidth())
        state.errorCode?.let{Pass6Error(it)}
        if(catalog.isEmpty() && !state.templatesLoading)TextButton({onEvent(ProfileEvent.LoadTemplates)}){Text(stringResource(R.string.pass6_retry))}
        LazyVerticalGrid(GridCells.Adaptive(145.dp),Modifier.weight(1f),horizontalArrangement=Arrangement.spacedBy(10.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
            items(catalog,key={it.id}){template->
                Card(onClick={if(template.allowed && !saving)chosenId=template.id},colors=CardDefaults.cardColors(containerColor=if(template.id==chosenId)MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant)) {
                    AsyncImage(profileAssetUrl(template.previewImageUrl),templateLabel(template),Modifier.fillMaxWidth().height(160.dp))
                    Column(Modifier.padding(10.dp),verticalArrangement=Arrangement.spacedBy(4.dp)) {
                        Text(templateLabel(template),style=MaterialTheme.typography.titleSmall)
                        Text(templateFamily(template.family),style=MaterialTheme.typography.bodySmall)
                        if(template.id==content.templateId)Text(stringResource(R.string.pass6_saved_draft),style=MaterialTheme.typography.labelSmall)
                        if(template.id==chosenId)Text(stringResource(R.string.pass6_selected),style=MaterialTheme.typography.labelMedium)
                        if(!template.allowed)Text(stringResource(R.string.pass6_plan_locked),style=MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
            OutlinedButton({preview=true},Modifier.weight(1f),enabled=chosen?.allowed==true && !saving){Text(stringResource(R.string.pass6_draft_preview))}
            Button({chosen?.let{onEvent(ProfileEvent.Save(ProfileEditorMutation.TemplateSelect(it)))}},Modifier.weight(1f),enabled=chosen?.allowed==true && chosenId!=content.templateId && !saving){Text(stringResource(R.string.save))}
        }
    }
    if(preview && chosenId!=null)DraftTemplatePreview(content.summary.id,chosenId!!){preview=false}
}

@Composable private fun templateLabel(template:ProfileTemplateDto):String {
    val locale=LocalConfiguration.current.locales[0].language
    return if(locale=="ar")template.nameAr.ifBlank{template.nameEn} else template.nameEn.ifBlank{template.nameAr}
}
@Composable private fun templateFamily(family:String)=stringResource(when(family){
    "personal"->R.string.pass6_family_personal;"professional"->R.string.pass6_family_professional
    "business"->R.string.pass6_family_business;"agency"->R.string.pass6_family_agency;"brand"->R.string.pass6_family_brand
    "tech"->R.string.pass6_family_tech;else->R.string.pass6_family_storefront
})
@Composable internal fun itemTypeLabel(type:String)=stringResource(if(type=="PRODUCT")R.string.pass6_product else R.string.pass6_service)

@Composable
fun StorefrontEditor(content:ProfileContent,state:ProfilesUiState,onEvent:(ProfileEvent)->Unit) {
    if(content.summary.backendKind!=ProfileBackendKind.BUSINESS)return
    val policy=content.storefront
    val types=ShowcasePolicy.types(policy)
    val busy=state.saveState==ProfileSaveState.SAVING
    var editing by remember(content.summary.id){mutableStateOf<ProfileService?>(null)}
    var selectingType by remember{mutableStateOf(false)}
    var deleting by remember{mutableStateOf<ProfileService?>(null)}
    var submitted by remember{mutableStateOf(false)}
    val items=content.services.sortedBy{it.sortOrder}
    fun open(item:ProfileService){onEvent(ProfileEvent.ClearItemImage);submitted=false;editing=item}
    LaunchedEffect(state.saveState){if(submitted && state.saveState==ProfileSaveState.SUCCESS){editing=null;deleting=null;submitted=false}}
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
        item {
            Text(stringResource(R.string.pass6_showcase_help))
            val module=content.modules.firstOrNull{it.key=="SERVICES"}
            if(module?.enabled!=true || module.visibility!="PUBLIC") {
                Text(stringResource(R.string.pass6_section_hidden),style=MaterialTheme.typography.bodySmall)
                if(module!=null || content.addableModules.any{it.key=="SERVICES"})TextButton({
                    onEvent(ProfileEvent.Save(if(module==null)ProfileEditorMutation.AddModule("SERVICES") else ProfileEditorMutation.UpdateModule("SERVICES",true,"PUBLIC")))
                },enabled=!busy && policy.storefrontEnabled){Text(stringResource(if(module==null)R.string.pass6_add_section else R.string.pass6_enable_section))}
            }
            Text(if(policy.storefrontMaxItems==null)stringResource(R.string.pass6_unlimited_count,items.size) else stringResource(R.string.pass6_item_count,items.size,policy.storefrontMaxItems),style=MaterialTheme.typography.titleMedium)
            if(!policy.storefrontEnabled || types.isEmpty())Text(stringResource(R.string.pass6_plan_locked),color=MaterialTheme.colorScheme.error)
            else if(!ShowcasePolicy.canAdd(policy,items.size))Text(stringResource(R.string.pass6_limit_reached),color=MaterialTheme.colorScheme.error)
            Button({if(types.size==1)open(ProfileService(itemType=types.single())) else selectingType=true},enabled=!busy && ShowcasePolicy.canAdd(policy,items.size)){Text(stringResource(R.string.pass6_add))}
            if(busy)LinearProgressIndicator(Modifier.fillMaxWidth())
            state.errorCode?.let{Pass6Error(it)}
        }
        item {
            Card { Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(6.dp)) {
                Text(stringResource(R.string.pass6_order_contacts),style=MaterialTheme.typography.titleSmall)
                Text(stringResource(R.string.pass6_whatsapp)+": "+stringResource(if(policy.storefrontEnabled && policy.storefrontWhatsappOrder)R.string.pass6_allowed else R.string.pass6_plan_locked))
                if(policy.storefrontEnabled && policy.storefrontWhatsappOrder && (!policy.publicWhatsappReady || !policy.contactModulePublic))ContactNotice(R.string.pass6_missing_whatsapp,content,onEvent)
                Text(stringResource(R.string.pass6_email)+": "+stringResource(if(policy.storefrontEnabled && policy.storefrontEmailOrder)R.string.pass6_allowed else R.string.pass6_plan_locked))
                if(policy.storefrontEnabled && policy.storefrontEmailOrder && (!policy.publicEmailReady || !policy.contactModulePublic))ContactNotice(R.string.pass6_missing_email,content,onEvent)
                Text(stringResource(R.string.pass6_contacts_publish),style=MaterialTheme.typography.bodySmall)
            } }
        }
        items(items,key={it.id}){item->
            Card { Column(Modifier.fillMaxWidth().padding(12.dp),verticalArrangement=Arrangement.spacedBy(6.dp)) {
                Row(horizontalArrangement=Arrangement.spacedBy(12.dp)) {
                    item.imageUrl?.let{AsyncImage(profileAssetUrl(it),null,Modifier.size(64.dp))}
                    Column(Modifier.weight(1f)) {
                        Text(item.name.ifBlank{item.nameEn.ifBlank{item.nameAr}},style=MaterialTheme.typography.titleMedium)
                        Text(itemTypeLabel(item.itemType),style=MaterialTheme.typography.labelMedium)
                        item.price?.let{Text(listOfNotNull(it,item.currency).joinToString(" "))}
                        item.category?.takeIf{it.isNotBlank()}?.let{Text(it,style=MaterialTheme.typography.bodySmall)}
                        Text(stringResource(if(item.visibility=="PUBLIC")R.string.pass6_visible else R.string.pass6_hidden))
                        if(item.featured)Text(stringResource(R.string.pass6_featured))
                    }
                }
                Row(horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                    TextButton({open(item)},enabled=!busy){Text(stringResource(R.string.pass6_edit))}
                    TextButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceUpsert(item.copy(visibility=if(item.visibility=="PUBLIC")"ONLY_ME" else "PUBLIC"))))},enabled=!busy && item.itemType in types){Text(stringResource(if(item.visibility=="PUBLIC")R.string.pass6_hide else R.string.pass6_show))}
                    TextButton({deleting=item;submitted=false},enabled=!busy){Text(stringResource(R.string.pass6_delete))}
                }
                Row {
                    TextButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceReorder(ShowcasePolicy.move(items.map{it.id},item.id,-1))))},enabled=!busy && items.firstOrNull()?.id!=item.id){Text(stringResource(R.string.pass6_move_up))}
                    TextButton({onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceReorder(ShowcasePolicy.move(items.map{it.id},item.id,1))))},enabled=!busy && items.lastOrNull()?.id!=item.id){Text(stringResource(R.string.pass6_move_down))}
                }
            } }
        }
    }
    if(selectingType)AlertDialog(onDismissRequest={selectingType=false},title={Text(stringResource(R.string.pass6_add))},text={Column{types.forEach{type->TextButton({selectingType=false;open(ProfileService(itemType=type))}){Text(itemTypeLabel(type))}}}},confirmButton={TextButton({selectingType=false}){Text(stringResource(R.string.cancel))}})
    deleting?.let{item->AlertDialog(onDismissRequest={if(!busy)deleting=null},title={Text(stringResource(R.string.pass6_delete_confirm))},text={Text(item.name)},confirmButton={TextButton({submitted=true;onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceDelete(item.id)))},enabled=!busy){Text(stringResource(R.string.pass6_delete))}},dismissButton={TextButton({deleting=null},enabled=!busy){Text(stringResource(R.string.cancel))}})}
    editing?.let{item->ShowcaseItemSheet(item,state,types,{if(!busy){editing=null;onEvent(ProfileEvent.ClearItemImage)}},onEvent){submitted=true;onEvent(ProfileEvent.Save(ProfileEditorMutation.ServiceUpsert(it)))}}
}

@Composable private fun ContactNotice(message:Int,content:ProfileContent,onEvent:(ProfileEvent)->Unit) {
    Text(stringResource(message),style=MaterialTheme.typography.bodySmall)
    TextButton({onEvent(ProfileEvent.OpenSection(content.summary.id,ProfileEditorSection.CONTACT_LINKS))}){Text(stringResource(R.string.pass6_edit_contact))}
    if(!content.storefront.contactModulePublic)TextButton({onEvent(ProfileEvent.OpenSection(content.summary.id,ProfileEditorSection.VISIBILITY))}){Text(stringResource(R.string.pass6_section_visibility))}
}

@Composable private fun ShowcaseItemSheet(initial:ProfileService,state:ProfilesUiState,types:List<String>,dismiss:()->Unit,onEvent:(ProfileEvent)->Unit,save:(ProfileService)->Unit) {
    var item by remember(initial.id){mutableStateOf(initial)}
    var localError by remember{mutableStateOf<String?>(null)}
    val context=LocalContext.current
    val scope=rememberCoroutineScope()
    val busy=state.saveState==ProfileSaveState.SAVING
    LaunchedEffect(state.uploadedItemImage){state.uploadedItemImage?.let{item=item.copy(imageUrl=it)}}
    val picker=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){uri->if(uri!=null)scope.launch {
        localError=null
        val upload=withContext(Dispatchers.IO){runCatching {
            val mime=context.contentResolver.getType(uri).orEmpty()
            if(mime !in setOf("image/jpeg","image/png","image/webp"))error("PROFILE_MEDIA_UPLOAD_FAILED")
            val bytes=context.readProfileBytes(uri,state.content?.imageUploadMaxBytes ?: 5L*1024*1024) ?: error("PROFILE_MEDIA_UPLOAD_FAILED")
            ProfileMediaUpload("GALLERY",context.profileFileName(uri,"showcase.${if(mime=="image/jpeg")"jpg" else mime.substringAfter('/')}"),mime,bytes)
        }}
        upload.onSuccess{onEvent(ProfileEvent.UploadItemImage(it))}.onFailure{localError="PROFILE_MEDIA_UPLOAD_FAILED"}
    }}
    PopFormSheet(dismiss,{Text(itemTypeLabel(item.itemType),style=MaterialTheme.typography.titleLarge)},action={
        Button({if(ShowcasePolicy.itemValid(item))save(item.copy(name=item.nameEn.ifBlank{item.nameAr},price=item.price?.trim()?.takeIf{it.isNotEmpty()},currency=item.currency?.trim()?.uppercase()?.takeIf{it.isNotEmpty()}))else localError=if(!ShowcasePolicy.priceValid(item.price.orEmpty()))"SHOWCASE_PRICE_INVALID" else if(!ShowcasePolicy.currencyValid(item.currency.orEmpty()))"SHOWCASE_CURRENCY_INVALID" else "PROFILE_REQUIRED_DATA_INCOMPLETE"},Modifier.fillMaxWidth(),enabled=!busy && item.itemType in types){Text(stringResource(R.string.save))}
        TextButton(dismiss,enabled=!busy){Text(stringResource(R.string.cancel))}
    },content={focus->
        Row {types.forEach{type->FilterChip(selected=item.itemType==type,onClick={item=item.copy(itemType=type)},label={Text(itemTypeLabel(type))},enabled=!busy)}}
        if(item.itemType !in types)Text(stringResource(R.string.pass6_plan_locked))
        ItemField(focus,R.string.pass6_name_ar,item.nameAr,{item=item.copy(nameAr=it)},!busy)
        ItemField(focus,R.string.pass6_name_en,item.nameEn,{item=item.copy(nameEn=it)},!busy)
        ItemField(focus,R.string.pass6_description_ar,item.descriptionAr,{item=item.copy(descriptionAr=it)},!busy)
        ItemField(focus,R.string.pass6_description_en,item.descriptionEn,{item=item.copy(descriptionEn=it)},!busy)
        item.imageUrl?.let{AsyncImage(profileAssetUrl(it),null,Modifier.fillMaxWidth().height(150.dp))}
        Row {
            TextButton({picker.launch("image/*")},enabled=!busy){Text(stringResource(if(item.imageUrl==null)R.string.pass6_choose_image else R.string.pass6_replace_image))}
            if(item.imageUrl!=null)TextButton({item=item.copy(imageUrl=null);onEvent(ProfileEvent.ClearItemImage)},enabled=!busy){Text(stringResource(R.string.pass6_remove_image))}
        }
        ItemField(focus,R.string.pass6_price,item.price.orEmpty(),{item=item.copy(price=it)},!busy,KeyboardType.Decimal)
        ItemField(focus,R.string.pass6_currency,item.currency.orEmpty(),{item=item.copy(currency=it)},!busy)
        ItemField(focus,R.string.pass6_category,item.category.orEmpty(),{item=item.copy(category=it)},!busy)
        Row {Checkbox(item.featured,{item=item.copy(featured=it)},enabled=!busy);Text(stringResource(R.string.pass6_featured))}
        Text(stringResource(R.string.pass6_featured_help),style=MaterialTheme.typography.bodySmall)
        Row {Switch(item.visibility=="PUBLIC",{item=item.copy(visibility=if(it)"PUBLIC" else "ONLY_ME")},enabled=!busy);Text(stringResource(if(item.visibility=="PUBLIC")R.string.pass6_visible else R.string.pass6_hidden))}
        if(busy)LinearProgressIndicator(Modifier.fillMaxWidth())
        (localError ?: state.errorCode)?.let{Pass6Error(it)}
    })
}

@Composable private fun ItemField(focus:PopFormFocusController,label:Int,value:String,change:(String)->Unit,enabled:Boolean,type:KeyboardType=KeyboardType.Text) {
    PopFormTextField(fieldKey="showcase-$label",focusController=focus,value=value,onValueChange=change,label={Text(stringResource(label))},modifier=Modifier.fillMaxWidth(),enabled=enabled,keyboardType=type,valueIsLtr=type==KeyboardType.Decimal || label in setOf(R.string.pass6_currency,R.string.pass6_name_en,R.string.pass6_description_en),singleLine=label !in setOf(R.string.pass6_description_ar,R.string.pass6_description_en))
}

@Composable internal fun Pass6Error(code:String) {Text(profileErrorMessage(code),color=MaterialTheme.colorScheme.error,style=MaterialTheme.typography.bodyMedium)}
