package com.popwam.pop.ui

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import coil3.compose.AsyncImage
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import com.popwam.pop.data.api.NearbyResultDto
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

@Composable
fun NearbyScreen(state:MainUiState,vm:MainViewModel,navigate:(String)->Unit) {
    val context=LocalContext.current
    val locale=currentLocale()
    val location=remember{NearbyLocationController(context)}
    val lifecycleOwner=LocalLifecycleOwner.current
    val scope=rememberCoroutineScope()
    var blocking by remember{mutableStateOf<NearbyResultDto?>(null)}
    var reporting by remember{mutableStateOf<NearbyResultDto?>(null)}
    var locationBusy by remember{mutableStateOf(false)}

    suspend fun startWithLocation() {
        if(!location.servicesEnabled()){
            vm.nearbyPermissionResult(NearbyPermissionState.SERVICES_OFF)
            return
        }
        locationBusy=true
        runCatching { withTimeout(15_000){location.currentApproximateLocation()} }
            .onSuccess { vm.enableNearby(it,locale) }
            .onFailure { vm.nearbyPermissionResult(if(location.servicesEnabled())NearbyPermissionState.UNAVAILABLE else NearbyPermissionState.SERVICES_OFF) }
        locationBusy=false
    }

    val permissionLauncher=rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()){granted->
        if(granted){
            vm.nearbyPermissionResult(NearbyPermissionState.APPROXIMATE)
            scope.launch { startWithLocation() }
        }else vm.nearbyPermissionResult(NearbyPermissionState.DENIED)
    }

    fun explicitEnable() {
        if(location.permissionState()==NearbyPermissionState.APPROXIMATE){
            vm.nearbyPermissionResult(NearbyPermissionState.APPROXIMATE)
            scope.launch { startWithLocation() }
        }else {
            location.markPermissionRequested()
            permissionLauncher.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
        }
    }

    LaunchedEffect(Unit){vm.observeNearbyPermissionState(location.permissionState());vm.loadNearby(locale)}
    LaunchedEffect(state.nearbyStage){if(state.nearbyStage==NearbyStage.CONSENT_REQUIRED)vm.nearbyConsentViewed()}
    DisposableEffect(Unit){onDispose{vm.pauseNearbyCollection()}}
    LaunchedEffect(state.nearbyStage,state.nearbyClientSessionActive){
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED){
            while(NearbyPolicy.shouldCollect(state.nearbyStage,true,true,state.nearbyClientSessionActive)){
                delay(NearbyPolicy.heartbeatMillis)
                if(!NearbyPolicy.shouldCollect(state.nearbyStage,true,true,state.nearbyClientSessionActive))break
                runCatching { withTimeout(15_000){location.currentApproximateLocation()} }
                    .onSuccess { vm.refreshNearbyPresence(it,locale) }
            }
        }
    }

    val permissionHelp=when(state.nearbyPermissionState){
        NearbyPermissionState.DENIED->R.string.nearby_permission_denied
        NearbyPermissionState.SERVICES_OFF->R.string.nearby_services_off
        NearbyPermissionState.UNAVAILABLE->R.string.nearby_location_unavailable
        else->null
    }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding=PaddingValues(20.dp),
        verticalArrangement=Arrangement.spacedBy(14.dp),
    ){
        item{
            Text(stringResource(R.string.nearby_eyebrow),color=MaterialTheme.colorScheme.primary,fontWeight=FontWeight.Bold)
            Text(stringResource(R.string.nearby_title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)
            Text(stringResource(R.string.nearby_description),color=MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if(state.loading||locationBusy)item{LinearProgressIndicator(Modifier.fillMaxWidth())}
        permissionHelp?.let{message->item{
            Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
                Text(stringResource(message),color=MaterialTheme.colorScheme.error)
                if(state.nearbyPermissionState==NearbyPermissionState.SERVICES_OFF)OutlinedButton({context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))},Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(stringResource(R.string.nearby_open_location_settings))}
                if(state.nearbyPermissionState==NearbyPermissionState.DENIED)OutlinedButton({context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:${context.packageName}")))},Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(stringResource(R.string.open_settings))}
            }}
        }}
        when(state.nearbyStage){
            NearbyStage.LOADING->item{NearbyLoading()}
            NearbyStage.UNAVAILABLE->item{NearbyGate(R.string.nearby_unavailable_title,R.string.nearby_unavailable_help,Icons.Default.LocationOff)}
            NearbyStage.COMMUNITY_REQUIRED->item{NearbyGate(R.string.nearby_community_title,R.string.nearby_community_help,Icons.Default.Gavel){
                Button({navigate("friends")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(stringResource(R.string.nearby_open_friends))}
            }}
            NearbyStage.CONSENT_REQUIRED->item{NearbyGate(R.string.nearby_consent_title,R.string.nearby_consent_help,Icons.Default.PrivacyTip){
                OutlinedButton({openWeb(context,"nearby-privacy")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(stringResource(R.string.nearby_read_privacy))}
                Button({vm.acceptNearbyConsent(locale)},Modifier.fillMaxWidth().heightIn(min=48.dp),enabled=!state.loading){Text(stringResource(R.string.nearby_accept_consent))}
            }}
            NearbyStage.PROFILE_REQUIRED->item{NearbyGate(R.string.nearby_profile_title,R.string.nearby_profile_help,Icons.Default.AccountCircle){
                Button({navigate("friends/privacy")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(stringResource(R.string.nearby_manage_profile))}
            }}
            NearbyStage.OFF->item{NearbyGate(R.string.nearby_off_title,R.string.nearby_off_help,Icons.Default.LocationOn){
                Button(::explicitEnable,Modifier.fillMaxWidth().heightIn(min=52.dp),enabled=!state.loading&&!locationBusy){Text(stringResource(R.string.nearby_enable))}
            }}
            NearbyStage.READY_TO_RESUME->item{NearbyGate(R.string.nearby_resume_title,R.string.nearby_resume_help,Icons.Default.LocationSearching){
                Button(::explicitEnable,Modifier.fillMaxWidth().heightIn(min=52.dp),enabled=!state.loading&&!locationBusy){Text(stringResource(R.string.nearby_resume))}
            }}
            NearbyStage.ERROR->item{NearbyGate(R.string.nearby_unavailable_title,R.string.nearby_action_failed,Icons.Default.CloudOff){
                Button({vm.loadNearby(locale)},Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(stringResource(R.string.settings_retry))}
            }}
            NearbyStage.ACTIVE->{
                item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
                    Text(stringResource(R.string.nearby_active_title),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black)
                    Text(stringResource(R.string.nearby_active_help),color=MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                        OutlinedButton({vm.refreshNearbyPeople(locale)},Modifier.weight(1f).heightIn(min=48.dp)){Text(stringResource(R.string.refresh))}
                        Button({vm.disableNearby(locale)},Modifier.weight(1f).heightIn(min=48.dp),colors=ButtonDefaults.buttonColors(containerColor=MaterialTheme.colorScheme.error)){Text(stringResource(R.string.nearby_disable))}
                    }
                }}}
                if(state.nearbyResults.isEmpty()&&!state.loading)item{NearbyEmpty()}
                items(state.nearbyResults,key={it.key}){result->NearbyResultCard(result,vm,{openWeb(context,"p/${Uri.encode(result.profile.slug)}")},{navigate("friends/requests")},{blocking=result},{reporting=result},locale)}
            }
        }
    }
    blocking?.let{result->AlertDialog(
        onDismissRequest={blocking=null},
        title={Text(stringResource(R.string.nearby_block_title))},
        text={Text(stringResource(R.string.nearby_block_help))},
        confirmButton={TextButton({blocking=null;vm.blockNearby(result,locale)}){Text(stringResource(R.string.friends_block))}},
        dismissButton={TextButton({blocking=null}){Text(stringResource(R.string.cancel))}},
    )}
    reporting?.let{result->NearbyReportDialog(result,state.loading,{reporting=null}){category,details->vm.reportNearby(result,category,details,locale){reporting=null}}}
}

@Composable
private fun NearbyGate(title:Int,help:Int,icon:androidx.compose.ui.graphics.vector.ImageVector,actions:@Composable ColumnScope.()->Unit={}) {
    Card(Modifier.fillMaxWidth()){Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
        Surface(shape=CircleShape,color=MaterialTheme.colorScheme.primaryContainer){Icon(icon,null,Modifier.padding(12.dp),tint=MaterialTheme.colorScheme.primary)}
        Text(stringResource(title),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black)
        Text(stringResource(help),color=MaterialTheme.colorScheme.onSurfaceVariant)
        actions()
    }}
}

@Composable
private fun NearbyResultCard(result:NearbyResultDto,vm:MainViewModel,open:()->Unit,respond:()->Unit,block:()->Unit,report:()->Unit,locale:String) {
    Card(Modifier.fillMaxWidth()){
        Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
            Row(verticalAlignment=Alignment.CenterVertically){
                if(!result.profile.avatarUrl.isNullOrBlank())AsyncImage(result.profile.avatarUrl,null,Modifier.size(56.dp).clip(CircleShape),contentScale=ContentScale.Crop)
                else Surface(Modifier.size(56.dp),shape=CircleShape,color=MaterialTheme.colorScheme.primaryContainer){Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){Text(result.profile.name.take(1).uppercase(),fontWeight=FontWeight.Black)}}
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)){Text(result.profile.name,fontWeight=FontWeight.Black);result.profile.title?.let{Text(it,color=MaterialTheme.colorScheme.onSurfaceVariant)};Text(stringResource(when(NearbyPolicy.bandLabel(result.proximityBand)){"SAME_AREA"->R.string.nearby_same_area;"NEARBY_AREA"->R.string.nearby_area;else->R.string.nearby_around_area}),style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.primary)}
            }
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                if(result.capabilities.canViewProfile)OutlinedButton({vm.nearbyResultOpened(result);open()},Modifier.weight(1f).heightIn(min=48.dp)){Text(stringResource(R.string.nearby_view_profile))}
                if(result.capabilities.canSendFriendRequest)Button({vm.sendNearbyFriendRequest(result,locale)},Modifier.weight(1f).heightIn(min=48.dp)){Icon(Icons.Default.PersonAdd,null);Text(stringResource(R.string.friends_add))}
                else when(NearbyPolicy.publicRelationshipState(result.relationshipState)){
                    "OUTGOING_PENDING"->if(result.capabilities.canCancelRequest&&result.requestId!=null)OutlinedButton({vm.cancelNearbyFriendRequest(result,locale)},Modifier.weight(1f).heightIn(min=48.dp)){Text(stringResource(R.string.friends_cancel))}else Text(stringResource(R.string.friends_state_requested))
                    "INCOMING_PENDING"->OutlinedButton(respond,Modifier.weight(1f).heightIn(min=48.dp)){Text(stringResource(R.string.friends_state_incoming))}
                    "FRIENDS"->Text(stringResource(R.string.friends_state_friends))
                    else->Unit
                }
            }
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.End){
                if(result.capabilities.canReport)TextButton(report){Icon(Icons.Default.Report,null);Text(stringResource(R.string.friends_report))}
                if(result.capabilities.canBlock)TextButton(block,colors=ButtonDefaults.textButtonColors(contentColor=MaterialTheme.colorScheme.error)){Icon(Icons.Default.Block,null);Text(stringResource(R.string.friends_block))}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NearbyReportDialog(result:NearbyResultDto,loading:Boolean,dismiss:()->Unit,submit:(String,String)->Unit) {
    var category by remember(result.key){mutableStateOf("SPAM")}
    var details by remember(result.key){mutableStateOf("")}
    var expanded by remember{mutableStateOf(false)}
    AlertDialog(
        onDismissRequest=dismiss,
        title={Text(stringResource(R.string.friends_report_title))},
        text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){
            ExposedDropdownMenuBox(expanded,{expanded=it}){OutlinedTextField(stringResource(nearbyReportCategoryLabel(category)),{},Modifier.menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable).fillMaxWidth(),readOnly=true,label={Text(stringResource(R.string.friends_report_reason))},trailingIcon={ExposedDropdownMenuDefaults.TrailingIcon(expanded)});ExposedDropdownMenu(expanded,{expanded=false}){FriendsPolicy.reportCategories.forEach{value->DropdownMenuItem({Text(stringResource(nearbyReportCategoryLabel(value)))},{category=value;expanded=false})}}}
            OutlinedTextField(details,{details=it.take(500)},Modifier.fillMaxWidth(),minLines=3,label={Text(stringResource(R.string.friends_report_details))})
        }},
        confirmButton={TextButton({submit(category,details)},enabled=!loading&&FriendsPolicy.validReport(category,details)){Text(stringResource(R.string.friends_submit_report))}},
        dismissButton={TextButton(dismiss){Text(stringResource(R.string.cancel))}},
    )
}

@Composable private fun NearbyEmpty(){Card(Modifier.fillMaxWidth()){Column(Modifier.fillMaxWidth().padding(28.dp),horizontalAlignment=Alignment.CenterHorizontally){Icon(Icons.Default.PeopleOutline,null);Spacer(Modifier.height(10.dp));Text(stringResource(R.string.nearby_no_results),color=MaterialTheme.colorScheme.onSurfaceVariant)}}}
@Composable private fun NearbyLoading(){Card(Modifier.fillMaxWidth()){Row(Modifier.padding(24.dp),verticalAlignment=Alignment.CenterVertically){CircularProgressIndicator(Modifier.size(24.dp),strokeWidth=2.dp);Spacer(Modifier.width(12.dp));Text(stringResource(R.string.nearby_loading))}}}
private fun nearbyReportCategoryLabel(value:String)=when(value){
    "SPAM"->R.string.friends_report_spam
    "HARASSMENT"->R.string.friends_report_harassment
    "IMPERSONATION"->R.string.friends_report_impersonation
    "INAPPROPRIATE_CONTENT"->R.string.friends_report_content
    "SCAM"->R.string.friends_report_scam
    "PRIVACY"->R.string.friends_report_privacy
    else->R.string.friends_report_other
}
