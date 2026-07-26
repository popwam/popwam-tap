package com.popwam.pop.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.popwam.pop.R

object PublishingPolicy {
    fun canPublish(ready:Boolean, firstPublish:Boolean, reviewed:Boolean, busy:Boolean) =
        ready && (!firstPublish || reviewed) && !busy
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfilePublishingScreen(profileId:String,state:MainUiState,vm:MainViewModel,back:()->Unit) {
    val locale=if(LocalConfiguration.current.locales[0].language=="ar")"ar" else "en"
    val publishing=state.publishing
    var reviewed by rememberSaveable(profileId){mutableStateOf(false)}
    LaunchedEffect(profileId,locale){vm.loadPublishing(profileId,locale)}
    Scaffold(topBar={TopAppBar(title={Text(stringResource(R.string.publish_title),fontWeight=FontWeight.Bold)},navigationIcon={IconButton(back){Icon(Icons.Default.ArrowBack,stringResource(R.string.back))}})}){padding->
        if(publishing==null){
            Box(Modifier.fillMaxSize().padding(padding),contentAlignment=Alignment.Center){
                if(state.error!=null)Column(horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(12.dp)){Text(stringResource(R.string.generic_error));OutlinedButton({vm.loadPublishing(profileId,locale)}){Text(stringResource(R.string.retry))}}
                else CircularProgressIndicator()
            }
            return@Scaffold
        }
        val first=publishing.publishedRevision==null
        var slug by rememberSaveable(publishing.preview.slug){mutableStateOf(publishing.preview.slug.orEmpty())}
        LazyColumn(Modifier.fillMaxSize().padding(padding),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)){
            item { Text(publishing.preview.lifecycle,style=MaterialTheme.typography.labelLarge,color=Color(0xFF9A7412));DraftPhonePreview(publishing.preview.identity,publishing.preview.links) }
            item {
                Text(stringResource(R.string.publish_visibility),fontWeight=FontWeight.Bold)
                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                    listOf("PUBLIC" to R.string.publish_public,"UNLISTED" to R.string.publish_unlisted,"PRIVATE" to R.string.publish_private).forEach{(value,label)->
                        FilterChip(selected=publishing.preview.access==value,onClick={vm.setPublishingVisibility(profileId,value,locale)},label={Text(stringResource(label))},enabled=!state.loading)
                    }
                }
            }
            item {
                Text(stringResource(R.string.publish_slug),fontWeight=FontWeight.Bold)
                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp),verticalAlignment=Alignment.CenterVertically){
                    OutlinedTextField(slug,{slug=it},Modifier.weight(1f),singleLine=true)
                    OutlinedButton({vm.setPublishingSlug(profileId,slug,locale)},enabled=!state.loading&&slug!=publishing.preview.slug){Text(stringResource(R.string.save))}
                }
            }
            item{
                Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
                    Text(stringResource(R.string.publish_module_visibility),fontWeight=FontWeight.Bold)
                    publishing.preview.modules.forEach{module->
                        Text(module.key,style=MaterialTheme.typography.bodyMedium)
                        Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){
                            listOf("PUBLIC" to R.string.publish_public,"FRIENDS" to R.string.friends,"ONLY_ME" to R.string.publish_private).forEach{(visibility,label)->
                                FilterChip(selected=module.visibility==visibility,onClick={vm.setModuleVisibility(profileId,module.key,visibility,locale)},label={Text(stringResource(label))},enabled=!state.loading)
                            }
                        }
                    }
                }
            }
            item{
                Column(verticalArrangement=Arrangement.spacedBy(8.dp)){
                    Text(stringResource(R.string.publish_field_visibility),fontWeight=FontWeight.Bold)
                    publishing.preview.fieldVisibility.forEach{(field,visible)->Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text(field);Text(stringResource(if(visible)R.string.publish_public else R.string.publish_private),color=if(visible)Color(0xFF287A43) else MaterialTheme.colorScheme.onSurfaceVariant)}}
                }
            }
            if(publishing.preview.media.isNotEmpty())item{
                Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
                    Text(stringResource(R.string.publish_media_visibility),fontWeight=FontWeight.Bold)
                    publishing.preview.media.forEach{media->
                        Text(media.purpose,style=MaterialTheme.typography.bodyMedium)
                        Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){
                            listOf("PUBLIC" to R.string.publish_public,"FRIENDS" to R.string.friends,"ONLY_ME" to R.string.publish_private).forEach{(visibility,label)->
                                FilterChip(selected=media.visibility==visibility,onClick={vm.setMediaVisibility(profileId,media.id,visibility,locale)},label={Text(stringResource(label))},enabled=!state.loading)
                            }
                        }
                    }
                }
            }
            if(!publishing.readiness.ready){
                item{Text(stringResource(R.string.publish_blocked),fontWeight=FontWeight.Bold,color=MaterialTheme.colorScheme.error)}
                items(publishing.readiness.issues,key={it.code+it.path}){issue->Text("• ${issue.code.replace('_',' ')}",style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.error)}
            }else item{Text(stringResource(R.string.publish_ready),fontWeight=FontWeight.Bold,color=Color(0xFF287A43))}
            if(first)item{
                Row(verticalAlignment=Alignment.Top,horizontalArrangement=Arrangement.spacedBy(10.dp)){
                    Checkbox(reviewed,{reviewed=it})
                    Text(stringResource(R.string.publish_review),style=MaterialTheme.typography.bodyMedium)
                }
            }
            item {
                Button(
                    onClick={vm.publishingAction(profileId,"publish",locale)},
                    enabled=PublishingPolicy.canPublish(publishing.readiness.ready,first,reviewed,state.loading),
                    modifier=Modifier.fillMaxWidth().heightIn(min=52.dp),
                ){if(state.loading)CircularProgressIndicator(Modifier.size(20.dp),strokeWidth=2.dp) else Text(stringResource(if(first)R.string.publish_action else R.string.publish_update))}
            }
            if(publishing.readiness.lifecycle=="PUBLISHED")item{OutlinedButton({vm.publishingAction(profileId,"pause",locale)},Modifier.fillMaxWidth().heightIn(min=52.dp),enabled=!state.loading){Text(stringResource(R.string.publish_pause))}}
            if(publishing.readiness.lifecycle=="PAUSED")item{OutlinedButton({vm.publishingAction(profileId,"resume",locale)},Modifier.fillMaxWidth().heightIn(min=52.dp),enabled=!state.loading){Text(stringResource(R.string.publish_resume))}}
        }
    }
}

@Composable
private fun DraftPhonePreview(identity:com.popwam.pop.data.api.PreviewIdentityDto,links:List<com.popwam.pop.data.api.PreviewLinkDto>){
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(Color(0xFF111318))){
        if(!identity.coverUrl.isNullOrBlank())AsyncImage(identity.coverUrl,null,Modifier.fillMaxWidth().height(130.dp),contentScale=ContentScale.Crop)
        Column(Modifier.padding(20.dp)){
            if(!identity.imageUrl.isNullOrBlank())AsyncImage(identity.imageUrl,null,Modifier.size(88.dp).clip(CircleShape),contentScale=ContentScale.Crop)
            Text(identity.name,Modifier.padding(top=12.dp),color=Color.White,style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
            identity.title?.let{Text(it,color=Color(0xFFD4AF37))}
            identity.bio?.let{Text(it,Modifier.padding(top=10.dp),color=Color(0xFFC6C8CE))}
            links.forEach{Text(it.title,Modifier.fillMaxWidth().padding(top=8.dp).background(Color.White.copy(alpha=.08f),RoundedCornerShape(12.dp)).padding(14.dp),color=Color.White)}
        }
    }
}
