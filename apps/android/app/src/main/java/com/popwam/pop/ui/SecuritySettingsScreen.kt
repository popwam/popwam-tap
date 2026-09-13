package com.popwam.pop.ui

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.biometric.BiometricManager
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.os.LocaleListCompat
import com.google.gson.JsonParser
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import com.popwam.pop.data.auth.PasskeyCoordinator
import com.popwam.pop.data.api.SecuritySessionDto
import com.popwam.pop.ui.theme.AppearanceStore
import com.popwam.pop.ui.theme.PopIdentity
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.pop.ui.components.PopFormLayout
import com.popwam.pop.ui.components.PopFormTextField
import kotlinx.coroutines.launch
import java.util.Locale

private data class StepUpAction(val purpose:String,val action:suspend (String)->Unit)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SecuritySettingsScreen(
    section:String,
    state:MainUiState,
    vm:MainViewModel,
    appearanceStore:AppearanceStore,
    onThemeModeSelected:(ThemeMode)->Unit,
    onPaletteSelected:(IdentityPalette)->Unit,
    navigate:(String)->Unit,
    back:()->Unit,
    logout:()->Unit,
    showHowItWorks:()->Unit,
) {
    val context=LocalContext.current
    val scope=rememberCoroutineScope()
    val appearance by appearanceStore.state.collectAsState()
    var stepUp by remember{mutableStateOf<StepUpAction?>(null)}
    var confirm by remember{mutableStateOf<Pair<Int,()->Unit>?>(null)}
    var passkeyFailure by remember{mutableStateOf(false)}
    var phone by rememberSaveable{mutableStateOf("")}
    var phoneChallenge by rememberSaveable{mutableStateOf("")}
    var phoneCode by rememberSaveable{mutableStateOf("")}
    var accountMessage by rememberSaveable{mutableStateOf("")}
    LaunchedEffect(Unit){vm.loadSecuritySettings();vm.settingsViewed(section)}

    val title=when(section){
        "appearance"->R.string.settings_appearance
        "language"->R.string.settings_language_region
        "notifications"->R.string.settings_notifications
        "privacy"->R.string.settings_privacy
        "permissions"->R.string.settings_permissions
        "security"->R.string.settings_security
        "devices"->R.string.settings_devices
        "sessions"->R.string.settings_sessions
        "passkeys"->R.string.settings_passkeys
        "device-security"->R.string.settings_passcode_biometrics
        "usage"->R.string.settings_usage
        "account"->R.string.settings_account
        "help"->R.string.settings_help_legal
        "about"->R.string.about_app
        "legal"->R.string.settings_legal
        else->R.string.settings_center_title
    }
    val phoneChangedCopy=stringResource(R.string.settings_phone_changed)
    val deletionRequestedCopy=stringResource(R.string.settings_deletion_requested)
    Scaffold(
        topBar={TopAppBar(title={Text(stringResource(title),fontWeight=FontWeight.Black)},navigationIcon={IconButton(back){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.back))}})},
    ){padding->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding).padding(horizontal=18.dp),
            contentPadding=PaddingValues(bottom=32.dp),
            verticalArrangement=Arrangement.spacedBy(12.dp),
        ){
            if(state.loading&&state.settingsPreferences==null)item{LinearProgressIndicator(Modifier.fillMaxWidth());Text(stringResource(R.string.settings_loading))}
            state.error?.takeIf{it.contains("SECURITY")||it.contains("SETTINGS")}?.let{item{Text(stringResource(R.string.generic_error),color=MaterialTheme.colorScheme.error);TextButton(vm::loadSecuritySettings){Text(stringResource(R.string.settings_retry))}}}
            when(section){
                "root"->{
                    item{Text(stringResource(R.string.settings_center_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{SettingsGroup(R.string.settings_security_group,listOf(
                        Triple("security",R.string.settings_security,Icons.Default.Security),
                        Triple("devices",R.string.settings_devices,Icons.Default.Devices),
                        Triple("sessions",R.string.settings_sessions,Icons.Default.LockClock),
                        Triple("passkeys",R.string.settings_passkeys,Icons.Default.Key),
                        Triple("device-security",R.string.settings_passcode_biometrics,Icons.Default.Fingerprint),
                    ),navigate)}
                    item{SettingsGroup(R.string.settings_preferences_group,listOf(
                        Triple("language",R.string.settings_language_region,Icons.Default.Language),
                        Triple("appearance",R.string.settings_appearance,Icons.Default.Palette),
                        Triple("notifications",R.string.settings_notifications,Icons.Default.Notifications),
                        Triple("privacy",R.string.settings_privacy,Icons.Default.PrivacyTip),
                        Triple("permissions",R.string.settings_permissions,Icons.Default.AdminPanelSettings),
                    ),navigate)}
                    item{SettingsGroup(R.string.settings_account_group,listOf(
                        Triple("account",R.string.settings_account,Icons.Default.AccountCircle),
                        Triple("help",R.string.settings_help_legal,Icons.Default.HelpOutline),
                        Triple("about",R.string.about_app,Icons.Default.Info),
                        Triple("legal",R.string.settings_legal,Icons.Default.Gavel),
                    ),navigate)}
                }
                "appearance"->{
                    item{ChoiceSetting(R.string.theme,appearance.theme,listOf("SYSTEM" to R.string.settings_system,"LIGHT" to R.string.settings_light,"DARK" to R.string.settings_dark)){value->onThemeModeSelected(ThemeMode.valueOf(value));vm.updateAppearancePreference("theme",value)}}
                    item{Text("POP Style",fontWeight=FontWeight.Bold)}
                    item{PopIdentity.entries.forEach{option->Card(Modifier.fillMaxWidth().clickable{onPaletteSelected(IdentityPalette.valueOf(option.name))}.padding(bottom=2.dp),colors=CardDefaults.cardColors(containerColor=if(appearance.identity==option.name) MaterialTheme.colorScheme.primary.copy(alpha=.12f) else MaterialTheme.colorScheme.surface)){Row(Modifier.padding(14.dp),verticalAlignment=Alignment.CenterVertically){Icon(Icons.Default.Palette,null,tint=option.primary);Spacer(Modifier.width(12.dp));Column(Modifier.weight(1f)){Text(option.label,fontWeight=FontWeight.Bold);Text(option.description,style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)};if(appearance.identity==option.name)Icon(Icons.Default.Check,null,tint=MaterialTheme.colorScheme.primary)}}}}
                    item{Text(stringResource(R.string.settings_font),fontWeight=FontWeight.Bold);Text(if(LocalePolicy.isRtl(currentLocale()))"Cairo" else "Montserrat",color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{Text(stringResource(R.string.settings_accessibility_scale),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                }
                "language"->{
                    item{Text(stringResource(R.string.settings_language_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{ChoiceSetting(R.string.language,currentLocale(),LocalePolicy.availableLocales().mapNotNull { code -> when(code){"en"->code to R.string.english;"ar"->code to R.string.arabic;"fr"->code to R.string.french;else->null} }){
                        when(it){
                            "en"->vm.updateAppearancePreference("language","ENGLISH")
                            "ar"->vm.updateAppearancePreference("language","ARABIC")
                        }
                        persistPopLanguageChoice(context,it)
                        applyPopLanguage(it)
                    }}
                    item{InfoCard(stringResource(R.string.settings_region),deviceRegionLabel())}
                    item{Text(stringResource(R.string.settings_region_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{InfoCard(stringResource(R.string.settings_font),if(LocalePolicy.isRtl(currentLocale()))"Cairo" else "Montserrat")}
                }
                "notifications"->{
                    val notificationState=notificationPermissionState(context)
                    item{InfoCard(stringResource(R.string.settings_notification_permission),permissionText(notificationState))}
                    if(notificationState!="ALLOWED")item{OutlinedButton({openApplicationNotificationSettings(context)},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.Settings,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.settings_open_notification_settings))}}
                    state.notificationPreferences?.let{preferences->
                        item{ToggleSetting(R.string.settings_general_notifications,preferences.generalEnabled){vm.updateNotificationPreference("generalEnabled",it)}}
                        item{ToggleSetting(R.string.settings_security_notifications,preferences.securityEnabled){vm.updateNotificationPreference("securityEnabled",it)}}
                        item{ToggleSetting(R.string.settings_product_notifications,preferences.productsEnabled){vm.updateNotificationPreference("productsEnabled",it)}}
                        item{ToggleSetting(R.string.settings_social_notifications,preferences.socialEnabled){vm.updateNotificationPreference("socialEnabled",it)}}
                        item{ToggleSetting(R.string.settings_marketing_notifications,preferences.marketingEnabled){vm.updateNotificationPreference("marketingEnabled",it)}}
                    }
                    item{Text(stringResource(R.string.settings_notification_foundation),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                }
                "privacy"->state.settingsPreferences?.let{preferences->
                    item{ToggleSetting(R.string.settings_share_activity_identity,preferences.privacy.shareActivityIdentity){vm.updatePrivacyPreference("shareActivityIdentity",it)}}
                    item{InfoCard(stringResource(R.string.settings_blocked_users),preferences.privacy.blockedUsers.toString())}
                    item{InfoCard(stringResource(R.string.nearby_users),if(preferences.privacy.nearby.enabled)stringResource(R.string.settings_nearby_enabled) else stringResource(R.string.settings_nearby_off))}
                    item{OutlinedButton({navigate("nearby")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.LocationOn,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.nearby_manage))}}
                    item{Button({navigate("friends/privacy")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.Groups,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.friends_manage_privacy))}}
                    item{OutlinedButton({navigate("friends/blocked")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.Block,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.friends_manage_blocked))}}
                    item{HorizontalDivider()}
                    item{Text(stringResource(R.string.settings_profile_privacy_separate),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{OutlinedButton({navigate("profiles")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.Person,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.settings_manage_profile_visibility))}}
                }
                "permissions"->{
                    item{PermissionRow(R.string.settings_camera,permissionState(context,Manifest.permission.CAMERA))}
                    item{PermissionRow(R.string.settings_nfc,if(context.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC))"ALLOWED" else "UNAVAILABLE")}
                    item{PermissionRow(R.string.settings_location,permissionState(context,Manifest.permission.ACCESS_COARSE_LOCATION))}
                    item{PermissionRow(R.string.settings_notifications,notificationPermissionState(context))}
                    item{PermissionRow(R.string.settings_contacts,permissionState(context,Manifest.permission.READ_CONTACTS))}
                    item{Text(stringResource(R.string.settings_permissions_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{Button({context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:${context.packageName}")))},Modifier.fillMaxWidth()){Text(stringResource(R.string.settings_open_system_settings))}}
                }
                "security"->state.securityOverview?.let{overview->
                    item{SecuritySummary(R.string.settings_passkeys,if(overview.passkey.configured)"${overview.passkey.count} · ${stringResource(R.string.settings_configured)}" else stringResource(R.string.settings_not_configured)){navigate("passkeys")}}
                    item{SecuritySummary(R.string.settings_active_devices,overview.devices.active.toString()){navigate("devices")}}
                    item{SecuritySummary(R.string.settings_active_sessions,overview.sessions.active.toString()){navigate("sessions")}}
                    item{SecuritySummary(R.string.settings_recovery_phone,stringResource(if(overview.recovery.phoneVerified)R.string.settings_configured else R.string.settings_not_configured)){navigate("account")}}
                    item{SecuritySummary(R.string.settings_passcode_biometrics,deviceSecuritySummary(context)){navigate("device-security")}}
                }
                "devices"->{
                    item{Text(stringResource(R.string.settings_device_authority_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    items(state.securityDevices,key={it.id}){device->DeviceCard(device.label,"${device.platform} · ${device.appName}",device.lastActiveAt,device.authMethod,device.current,device.pushEnabled,device.activeSessionCount){navigate("sessions")}}
                    if(state.securityDevices.isEmpty())item{EmptySettings()}
                    item{Text(stringResource(R.string.settings_fcm_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                }
                "sessions"->{
                    item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                        OutlinedButton({confirm=R.string.settings_confirm_others to {stepUp=StepUpAction("REVOKE_OTHER_SESSIONS"){vm.revokeOtherSecuritySessions(it)}}},Modifier.weight(1f)){Text(stringResource(R.string.settings_sign_out_others))}
                        Button({confirm=R.string.settings_confirm_all to {stepUp=StepUpAction("SECURITY_SETTINGS"){vm.revokeAllSecuritySessions(it,logout)}}},Modifier.weight(1f),colors=ButtonDefaults.buttonColors(containerColor=MaterialTheme.colorScheme.error)){Text(stringResource(R.string.settings_sign_out_everywhere))}
                    }}
                    items(state.securitySessions,key={it.id}){session->SessionCard(session){
                        confirm=R.string.settings_confirm_revoke to {stepUp=StepUpAction("REVOKE_SESSION"){grant->vm.revokeSecuritySession(session.id,grant,logout)}}
                    }}
                    if(state.securitySessions.isEmpty())item{EmptySettings()}
                }
                "passkeys"->{
                    item{Button({vm.passkeyManagementEnrollmentShown();stepUp=StepUpAction("ADD_PASSKEY"){grant->
                        runCatching{
                            val options=vm.passkeyRegistrationOptions(grant)
                            val response=PasskeyCoordinator(context).register(context,options.toString())
                            check(vm.verifyPasskeyRegistration(JsonParser.parseString(response).asJsonObject))
                        }.onFailure{passkeyFailure=true}
                    }},Modifier.fillMaxWidth()){Icon(Icons.Default.Key,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.settings_add_passkey))}}
                    if(passkeyFailure)item{Text(stringResource(R.string.settings_passkey_failed),color=MaterialTheme.colorScheme.error)}
                    items(state.securityPasskeys,key={it.id}){passkey->Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(7.dp)){
                        Text(passkey.name,fontWeight=FontWeight.Bold)
                        Text("${stringResource(R.string.settings_created)}: ${passkey.createdAt}",style=MaterialTheme.typography.bodySmall)
                        Text("${stringResource(R.string.settings_last_used)}: ${passkey.lastUsedAt ?: stringResource(R.string.never)}",style=MaterialTheme.typography.bodySmall)
                        OutlinedButton({confirm=R.string.settings_remove_confirm to {stepUp=StepUpAction("REMOVE_PASSKEY"){vm.removeSecurityPasskey(passkey.id,it)}}}){Text(stringResource(R.string.settings_remove_passkey))}
                    }}}
                    if(state.securityPasskeys.isEmpty())item{Text(stringResource(R.string.settings_no_passkeys))}
                }
                "device-security"->{
                    item{com.popwam.pop.ui.auth.BiometricSetupCard()}
                    val capability=deviceSecurityCapability(context)
                    item{InfoCard(stringResource(R.string.settings_biometric_status),deviceSecuritySummary(context))}
                    item{Text(stringResource(R.string.settings_device_security_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{InfoCard(stringResource(R.string.settings_passkeys),if(state.securityPasskeys.isEmpty())stringResource(R.string.settings_not_configured) else stringResource(R.string.settings_configured))}
                    item{OutlinedButton({navigate("passkeys")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.Key,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.settings_manage_passkeys))}}
                    item{Button({openDeviceSecuritySettings(context,capability)},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.Fingerprint,null);Spacer(Modifier.width(8.dp));Text(stringResource(if(capability=="NOT_ENROLLED")R.string.settings_enroll_biometrics else R.string.settings_open_device_security))}}
                }
                "usage"->state.quotaUsage?.let{quota->
                    item{Text(stringResource(R.string.settings_usage_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{QuotaCard(stringResource(R.string.settings_storage),formatQuotaBytes(quota.storage.usedBytes),formatQuotaBytes(quota.storage.limitBytes),formatQuotaBytes(quota.storage.remainingBytes),quota.storage.overridden)}
                    item{QuotaCard(stringResource(R.string.settings_links),quota.links.used.toString(),quota.links.limit.toString(),quota.links.remaining.toString(),quota.links.overridden)}
                    quota.requests.firstOrNull()?.let{request->item{InfoCard(stringResource(R.string.settings_latest_request),request.status)}}
                    if(quota.requests.none{it.status=="PENDING"}) {
                        item{OutlinedButton({val limit=quota.storage.limitBytes.toLongOrNull()?:0L;vm.requestQuotaIncrease("MAX_STORAGE_BYTES",maxOf(limit*2,50L*1024L*1024L).toString())},Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(stringResource(R.string.settings_request_storage))}}
                        item{OutlinedButton({vm.requestQuotaIncrease("MAX_LINKS",maxOf(quota.links.limit*2,10).toString())},Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(stringResource(R.string.settings_request_links))}}
                    }
                }
                "account"->{
                    state.securityOverview?.account?.let{account->
                        account.name?.takeIf(String::isNotBlank)?.let{item{InfoCard(stringResource(R.string.settings_account_name),it)}}
                        account.email?.takeIf(String::isNotBlank)?.let{item{InfoCard(stringResource(R.string.settings_account_email),it,true)}}
                        account.phone?.takeIf(String::isNotBlank)?.let{item{InfoCard(stringResource(R.string.settings_recovery_phone),it,true)}}
                        item{InfoCard(stringResource(R.string.settings_account_language),account.locale?.uppercase() ?: stringResource(R.string.settings_system))}
                        item{InfoCard(stringResource(R.string.settings_account_status),account.status)}
                    }
                    item{OutlinedButton({navigate("profiles")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.Person,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.settings_manage_profiles))}}
                    item{Text(stringResource(R.string.settings_account_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{Card(Modifier.fillMaxWidth().heightIn(min=300.dp,max=420.dp)){PopFormLayout(action={
                        if(phoneChallenge.isBlank())Button({stepUp=StepUpAction("CHANGE_PHONE"){grant->val result=vm.startPhoneChange(phone,currentLocale(),grant);if(result.ok){phoneChallenge=result.challengeId;accountMessage=result.maskedPhone}else error(result.error ?: "PHONE_CHANGE_FAILED")}},Modifier.fillMaxWidth(),enabled=phone.isNotBlank()){Text(stringResource(R.string.settings_send_code))}
                        else Button({scope.launch{val result=runCatching{vm.verifyPhoneChange(phoneChallenge,phoneCode)}.getOrNull();if(result?.ok==true){accountMessage=phoneChangedCopy;phone="";phoneCode="";phoneChallenge="";vm.loadSecuritySettings()}}},Modifier.fillMaxWidth(),enabled=phoneCode.length==6){Text(stringResource(R.string.step_up_verify))}
                    }){focus->
                        Text(stringResource(R.string.settings_change_phone),fontWeight=FontWeight.Black)
                        if(phoneChallenge.isBlank())PopFormTextField("account-phone",focus,phone,{phone=it.take(32)},{Text(stringResource(R.string.settings_new_phone))},keyboardType=KeyboardType.Phone,valueIsLtr=true)
                        else PopFormTextField("account-code",focus,phoneCode,{phoneCode=it.filter(Char::isDigit).take(6)},{Text(stringResource(R.string.step_up_code))},keyboardType=KeyboardType.NumberPassword,valueIsLtr=true)
                    }}}
                    item{Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.errorContainer)){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){Text(stringResource(R.string.settings_delete_account),fontWeight=FontWeight.Black,color=MaterialTheme.colorScheme.onErrorContainer);Text(stringResource(R.string.settings_delete_help),color=MaterialTheme.colorScheme.onErrorContainer);Button({confirm=R.string.settings_delete_confirm to {stepUp=StepUpAction("DELETE_ACCOUNT"){grant->val result=vm.requestAccountDeletion(grant);if(result.ok)accountMessage=deletionRequestedCopy else error(result.error ?: "DELETE_REQUEST_FAILED")}}},colors=ButtonDefaults.buttonColors(containerColor=MaterialTheme.colorScheme.error)){Text(stringResource(R.string.settings_delete_account))}}}}
                    if(accountMessage.isNotBlank())item{Text(accountMessage,color=MaterialTheme.colorScheme.primary)}
                    item{OutlinedButton({confirm=R.string.settings_logout_confirm_title to logout},Modifier.fillMaxWidth()){Icon(Icons.Default.Logout,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.logout))}}
                }
                "help"->{
                    item{Button(showHowItWorks,Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.AutoStories,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.how_it_works))}}
                    item{OutlinedButton({openWeb(context,"ideas")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.Feedback,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.settings_feedback_roadmap))}}
                    item{Text(stringResource(R.string.settings_help_no_direct_support),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                }
                "about"->{
                    item{Icon(Icons.Default.Info,null,Modifier.size(52.dp),tint=MaterialTheme.colorScheme.primary)}
                    item{Text(stringResource(R.string.app_name),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)}
                    item{InfoCard(stringResource(R.string.settings_version_name),BuildConfig.VERSION_NAME,true)}
                    item{InfoCard(stringResource(R.string.settings_build_number),BuildConfig.VERSION_CODE.toString(),true)}
                    item{Text(stringResource(R.string.settings_company_attribution),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{OutlinedButton({navigate("legal")},Modifier.fillMaxWidth()){Text(stringResource(R.string.settings_legal))}}
                }
                "legal"->{
                    item{Text(stringResource(R.string.settings_legal_help),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    item{Button({navigate("legal/terms")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.Gavel,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.terms))}}
                    item{OutlinedButton({navigate("legal/privacy")},Modifier.fillMaxWidth().heightIn(min=48.dp)){Icon(Icons.Default.PrivacyTip,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.privacy))}}
                }
            }
        }
    }
    confirm?.let{pending->AlertDialog(onDismissRequest={confirm=null},title={Text(stringResource(pending.first))},confirmButton={TextButton({confirm=null;pending.second()}){Text(stringResource(R.string.continue_label))}},dismissButton={TextButton({confirm=null}){Text(stringResource(R.string.cancel))}})}
    stepUp?.let{pending->StepUpSheet(vm,pending.purpose,{stepUp=null},{grant->pending.action(grant);stepUp=null})}
}

@Composable private fun SettingsGroup(title:Int,rows:List<Triple<String,Int,androidx.compose.ui.graphics.vector.ImageVector>>,navigate:(String)->Unit)=Card(Modifier.fillMaxWidth()){Column{Text(stringResource(title),Modifier.padding(16.dp),fontWeight=FontWeight.Black);rows.forEach{(route,label,icon)->Row(Modifier.fillMaxWidth().clickable{navigate(route)}.padding(16.dp),verticalAlignment=Alignment.CenterVertically){Icon(icon,null);Spacer(Modifier.width(12.dp));Text(stringResource(label),Modifier.weight(1f));Icon(Icons.Default.ChevronRight,null)}}}}
@Composable private fun ChoiceSetting(title:Int,value:String,choices:List<Pair<String,Int>>,change:(String)->Unit)=Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text(stringResource(title),fontWeight=FontWeight.Bold);choices.forEach{(key,label)->Row(Modifier.fillMaxWidth().clickable{change(key)}.padding(vertical=9.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(value==key,{change(key)});Text(stringResource(label))}}}}
@Composable private fun ToggleSetting(label:Int,checked:Boolean,change:(Boolean)->Unit)=Card(Modifier.fillMaxWidth()){Row(Modifier.fillMaxWidth().clickable{change(!checked)}.padding(16.dp),verticalAlignment=Alignment.CenterVertically){Text(stringResource(label),Modifier.weight(1f));Switch(checked,change)}}
@Composable private fun InfoCard(label:String,value:String,ltr:Boolean=false)=Card(Modifier.fillMaxWidth()){Row(Modifier.fillMaxWidth().padding(16.dp),horizontalArrangement=Arrangement.SpaceBetween){Text(label,fontWeight=FontWeight.Bold);Spacer(Modifier.width(12.dp));if(ltr)CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr){Text(value,color=MaterialTheme.colorScheme.onSurfaceVariant)}else Text(value,color=MaterialTheme.colorScheme.onSurfaceVariant)}}
@Composable private fun QuotaCard(label:String,used:String,limit:String,remaining:String,overridden:Boolean)=Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){Text(label,fontWeight=FontWeight.Black);Text("$used / $limit");Text("${stringResource(R.string.settings_remaining)}: $remaining",style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant);if(overridden)Text(stringResource(R.string.settings_custom_override),style=MaterialTheme.typography.labelSmall,color=MaterialTheme.colorScheme.primary)}}
private fun formatQuotaBytes(raw:String):String{val bytes=raw.toLongOrNull()?.coerceAtLeast(0)?:0L;val gib=1024L*1024L*1024L;val mib=1024L*1024L;return if(bytes>=gib&&bytes%gib==0L)"${bytes/gib} GB" else "${bytes/mib} MB"}
@Composable private fun SecuritySummary(label:Int,value:String,click:()->Unit)=Card(Modifier.fillMaxWidth().clickable(onClick=click)){Row(Modifier.padding(18.dp),verticalAlignment=Alignment.CenterVertically){Text(stringResource(label),Modifier.weight(1f),fontWeight=FontWeight.Bold);Text(value);Icon(Icons.Default.ChevronRight,null)}}
@Composable private fun DeviceCard(label:String,platform:String,last:String,auth:String,current:Boolean,push:Boolean,activeSessions:Int,manage:()->Unit)=Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){Row{Text(label,Modifier.weight(1f),fontWeight=FontWeight.Bold);if(current)AssistChip({}, {Text(stringResource(R.string.settings_current))})};Text(platform);Text("${stringResource(R.string.settings_last_active)}: $last",style=MaterialTheme.typography.bodySmall);Text("${stringResource(R.string.settings_auth_method)}: $auth",style=MaterialTheme.typography.bodySmall);Text(stringResource(if(push)R.string.settings_push_enabled else R.string.settings_push_disabled),style=MaterialTheme.typography.bodySmall);if(activeSessions>0)OutlinedButton(manage){Text(stringResource(R.string.settings_manage_device_sessions,activeSessions))}}}
@Composable private fun SessionCard(session:SecuritySessionDto,revoke:()->Unit)=Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(7.dp)){Row{Text(session.label,Modifier.weight(1f),fontWeight=FontWeight.Bold);if(session.current)AssistChip({}, {Text(stringResource(R.string.settings_current))})};Text("${session.authority} · ${session.appName}");Text("${stringResource(R.string.settings_last_active)}: ${session.lastActiveAt}",style=MaterialTheme.typography.bodySmall);Text("${stringResource(R.string.settings_auth_method)}: ${session.authMethod}",style=MaterialTheme.typography.bodySmall);OutlinedButton(revoke){Text(stringResource(R.string.settings_sign_out_session))}}}
@Composable private fun EmptySettings()=Text(stringResource(R.string.settings_empty),Modifier.fillMaxWidth().padding(24.dp),color=MaterialTheme.colorScheme.onSurfaceVariant)

private fun declared(context:android.content.Context,permission:String)=context.packageManager.getPackageInfo(context.packageName,PackageManager.GET_PERMISSIONS).requestedPermissions?.contains(permission)==true
private fun permissionState(context:android.content.Context,permission:String):String {
    return devicePermissionState(
        declared(context,permission),
        ContextCompat.checkSelfPermission(context,permission)==PackageManager.PERMISSION_GRANTED,
        context is Activity&&ActivityCompat.shouldShowRequestPermissionRationale(context,permission),
    )
}
private fun notificationPermissionState(context:android.content.Context)=if(Build.VERSION.SDK_INT<33)"ALLOWED" else permissionState(context,Manifest.permission.POST_NOTIFICATIONS)
@Composable private fun permissionText(value:String)=stringResource(when(value){"ALLOWED"->R.string.settings_allowed;"DENIED"->R.string.settings_denied;"NOT_REQUESTED"->R.string.settings_not_requested;else->R.string.settings_unavailable})
@Composable private fun PermissionRow(label:Int,value:String)=InfoCard(stringResource(label),permissionText(value))

private fun deviceSecurityCapability(context:android.content.Context):String {
    val authenticators=BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
    return when(BiometricManager.from(context).canAuthenticate(authenticators)){
        BiometricManager.BIOMETRIC_SUCCESS->"READY"
        BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED->"NOT_ENROLLED"
        BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE->"TEMPORARILY_UNAVAILABLE"
        BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE->"UNAVAILABLE"
        else->"UNAVAILABLE"
    }
}

@Composable private fun deviceSecuritySummary(context:android.content.Context)=stringResource(when(deviceSecurityCapability(context)){
    "READY"->R.string.settings_biometric_ready
    "NOT_ENROLLED"->R.string.settings_biometric_not_enrolled
    "TEMPORARILY_UNAVAILABLE"->R.string.settings_biometric_temporary
    else->R.string.settings_unavailable
})

private fun openDeviceSecuritySettings(context:android.content.Context,capability:String){
    val intent=if(Build.VERSION.SDK_INT>=30&&capability=="NOT_ENROLLED")Intent(Settings.ACTION_BIOMETRIC_ENROLL).putExtra(Settings.EXTRA_BIOMETRIC_AUTHENTICATORS_ALLOWED,BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL) else Intent(Settings.ACTION_SECURITY_SETTINGS)
    runCatching{context.startActivity(intent)}
}

private fun openApplicationNotificationSettings(context:android.content.Context){
    val intent=Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,context.packageName)
    runCatching{context.startActivity(intent)}
}

private fun deviceRegionLabel():String=Locale.getDefault().displayCountry.ifBlank{Locale.getDefault().country.ifBlank{"—"}}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuSettingsReviewScreen(section:String){
    val title=when(section){
        "account"->R.string.settings_account
        "security"->R.string.settings_security
        "devices"->R.string.settings_saved_devices
        "language"->R.string.settings_language_region
        "appearance"->R.string.settings_appearance
        else->R.string.settings_privacy
    }
    Scaffold(topBar={TopAppBar(title={Text(stringResource(title),fontWeight=FontWeight.Bold)})}){padding->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(horizontal=18.dp),verticalArrangement=Arrangement.spacedBy(12.dp),contentPadding=PaddingValues(bottom=32.dp)){
            when(section){
                "account"->{item{InfoCard(stringResource(R.string.settings_account_name),"Sarah Ahmed")};item{InfoCard(stringResource(R.string.settings_account_email),"sarah@example.com",true)};item{InfoCard(stringResource(R.string.settings_recovery_phone),"+20 100 123 4567",true)}}
                "security"->{item{SecuritySummary(R.string.settings_passkeys,"1 · ${stringResource(R.string.settings_configured)}",{})};item{SecuritySummary(R.string.settings_active_devices,"2",{})};item{SecuritySummary(R.string.settings_passcode_biometrics,stringResource(R.string.settings_biometric_ready),{})}}
                "devices"->{item{DeviceCard("moto g85","Android · POP Android","2026-08-11T15:00:00Z","PASSKEY",true,true,1,{})}}
                "language"->{item{ChoiceSetting(R.string.language,"en",listOf("en" to R.string.english,"ar" to R.string.arabic,"fr" to R.string.french),{})};item{InfoCard(stringResource(R.string.settings_region),"Egypt")}}
                "appearance"->{item{ChoiceSetting(R.string.theme,"SYSTEM",listOf("SYSTEM" to R.string.settings_system,"LIGHT" to R.string.settings_light,"DARK" to R.string.settings_dark),{})}}
                else->{item{ToggleSetting(R.string.settings_share_activity_identity,false,{})};item{Text(stringResource(R.string.settings_profile_privacy_separate),color=MaterialTheme.colorScheme.onSurfaceVariant)}}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable internal fun StepUpSheet(vm:MainViewModel,purpose:String,dismiss:()->Unit,verified:suspend (String)->Unit) {
    val context=LocalContext.current
    val scope=rememberCoroutineScope()
    var methods by remember{mutableStateOf<List<String>>(emptyList())}
    var challengeId by rememberSaveable{mutableStateOf("")}
    var maskedPhone by rememberSaveable{mutableStateOf("")}
    var code by rememberSaveable{mutableStateOf("")}
    var loading by remember{mutableStateOf(true)}
    var failed by remember{mutableStateOf(false)}
    LaunchedEffect(purpose){runCatching{vm.stepUpOptions(purpose)}.onSuccess{methods=it.methods}.onFailure{failed=true};loading=false}
    ModalBottomSheet(onDismissRequest=dismiss){Column(Modifier.fillMaxWidth().imePadding().padding(22.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
        Text(stringResource(R.string.step_up_title),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
        Text(stringResource(R.string.step_up_help),color=MaterialTheme.colorScheme.onSurfaceVariant)
        if(loading)CircularProgressIndicator()
        if(failed)Text(stringResource(R.string.step_up_unavailable),color=MaterialTheme.colorScheme.error)
        if(challengeId.isBlank()){
            if("PASSKEY" in methods)Button({scope.launch{loading=true;runCatching{
                val result=vm.stepUpOptions(purpose,"PASSKEY",currentLocale())
                val assertion=PasskeyCoordinator(context).authenticate(context,result.options!!.toString())
                val grant=vm.verifyPasskeyStepUp(purpose,JsonParser.parseString(assertion).asJsonObject).grantToken ?: error("STEP_UP_INVALID")
                verified(grant)
            }.onFailure{failed=true};loading=false}},Modifier.fillMaxWidth(),enabled=!loading){Text(stringResource(R.string.step_up_passkey))}
            if("OTP" in methods)OutlinedButton({scope.launch{loading=true;runCatching{vm.stepUpOptions(purpose,"OTP",currentLocale())}.onSuccess{challengeId=it.challengeId.orEmpty();maskedPhone=it.maskedPhone.orEmpty()}.onFailure{failed=true};loading=false}},Modifier.fillMaxWidth(),enabled=!loading){Text(stringResource(R.string.step_up_phone))}
        }else{
            Text(stringResource(R.string.step_up_sent_to,maskedPhone))
            OutlinedTextField(code,{code=it.filter(Char::isDigit).take(6)},Modifier.fillMaxWidth(),label={Text(stringResource(R.string.step_up_code))},keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.NumberPassword))
            Button({scope.launch{loading=true;runCatching{vm.verifyOtpStepUp(purpose,challengeId,code).grantToken ?: error("STEP_UP_INVALID")}.onSuccess{verified(it)}.onFailure{failed=true};loading=false}},Modifier.fillMaxWidth(),enabled=!loading&&code.length==6){Text(stringResource(R.string.step_up_verify))}
        }
        TextButton(dismiss,Modifier.fillMaxWidth()){Text(stringResource(R.string.cancel))}
    }}
}
