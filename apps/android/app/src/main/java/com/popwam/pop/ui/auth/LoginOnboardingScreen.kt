package com.popwam.pop.ui.auth

import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import coil3.compose.AsyncImage
import com.popwam.pop.R
import com.popwam.pop.TapApplication
import com.popwam.pop.data.auth.BiometricCoordinator
import com.popwam.pop.ui.*
import com.popwam.pop.ui.profile.DraftTemplatePreview
import kotlinx.coroutines.launch

@Composable fun LoginOnboardingScreen(state:AuthUiState,auth:AuthViewModel) {
    val locale=currentLocale();val context=LocalContext.current
    val store=(context.applicationContext as TapApplication).container.sessionStore
    val biometric=remember{(context as? FragmentActivity)?.let{BiometricCoordinator(it,store)}}
    val scope=rememberCoroutineScope()
    var biometricEnabled by remember{mutableStateOf(store.biometricEnabled)}
    var biometricBusy by remember{mutableStateOf(false)}
    var biometricError by remember{mutableStateOf(false)}
    var preview by remember{mutableStateOf<String?>(null)}
    val stage=state.setupStage
    val step=when(stage){AuthSetupStage.LEGAL_REQUIRED->1;AuthSetupStage.IDENTITY->2;AuthSetupStage.ACCOUNT_TYPE->3;AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED->4;AuthSetupStage.TEMPLATE_CHOICE->5;else->6}
    val title=when(stage){AuthSetupStage.LEGAL_REQUIRED->R.string.p7_legal_title;AuthSetupStage.IDENTITY->R.string.p7_identity_title;AuthSetupStage.ACCOUNT_TYPE->R.string.p7_type_title;AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED->R.string.p7_profile_title;AuthSetupStage.TEMPLATE_CHOICE->R.string.p7_template_title;AuthSetupStage.SECURITY_SETUP->R.string.p7_security_title;AuthSetupStage.COMPLETION->R.string.p7_ready_title;else->R.string.wa_auth_setup}
    val helper=when(stage){AuthSetupStage.LEGAL_REQUIRED->R.string.p7_legal_help;AuthSetupStage.IDENTITY->R.string.p7_identity_help;AuthSetupStage.ACCOUNT_TYPE->R.string.p7_type_help;AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED->R.string.p7_profile_help;AuthSetupStage.TEMPLATE_CHOICE->R.string.p7_template_help;AuthSetupStage.SECURITY_SETUP->R.string.p7_security_help;AuthSetupStage.COMPLETION->R.string.p7_ready_help;else->R.string.p7_loading}
    val icon=when(stage){AuthSetupStage.LEGAL_REQUIRED->Icons.Default.VerifiedUser;AuthSetupStage.IDENTITY->Icons.Default.Person;AuthSetupStage.ACCOUNT_TYPE->Icons.Default.Badge;AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED->Icons.Default.AddCard;AuthSetupStage.TEMPLATE_CHOICE->Icons.Default.Palette;AuthSetupStage.SECURITY_SETUP->Icons.Default.Lock;AuthSetupStage.COMPLETION->Icons.Default.CheckCircle;else->Icons.Default.Person}
    val canBack=stage in setOf(AuthSetupStage.ACCOUNT_TYPE,AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED,AuthSetupStage.COMPLETION)
    BackHandler(canBack){auth.back()}
    AuthStepLayout(stringResource(title),stringResource(helper),icon,step,back=if(canBack)auth::back else null) {
        when(stage) {
            AuthSetupStage.LEGAL_REQUIRED->{
                state.legalDocuments.forEach{document->OutlinedCard(Modifier.fillMaxWidth()){TextButton({openWeb(context,document.path.trimStart('/'))}){Icon(Icons.Default.Description,null);Spacer(Modifier.width(12.dp));Text(document.title)}}}
                AuthPrimary(stringResource(R.string.wa_auth_agree),!state.loading&&state.setupStatus?.legalReady==true){auth.acceptLegal(locale)}
            }
            AuthSetupStage.IDENTITY->{
                OutlinedTextField(state.accountName,auth::setAccountName,Modifier.fillMaxWidth(),singleLine=true,label={Text(stringResource(R.string.wa_auth_name))},leadingIcon={Icon(Icons.Default.Person,null)})
                AuthPrimary(stringResource(R.string.wa_auth_continue),!state.loading&&state.accountName.isNotBlank()){auth.saveName(locale)}
            }
            AuthSetupStage.ACCOUNT_TYPE->{
                listOf("PERSONAL","BUSINESS").forEach{kind->
                    val enabled=state.setupStatus?.accountTypes?.any{it.key==kind&&it.enabled}==true
                    val selected=state.profileKind==kind
                    Card(Modifier.fillMaxWidth().selectable(selected,enabled=enabled,role=Role.RadioButton,onClick={auth.selectProfileKind(kind)}),shape=RoundedCornerShape(22.dp),colors=CardDefaults.cardColors(containerColor=if(selected)MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainer)){
                        Row(Modifier.padding(20.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(16.dp)){
                            Icon(if(kind=="PERSONAL")Icons.Default.Person else Icons.Default.Business,null,Modifier.size(32.dp))
                            Column(Modifier.weight(1f)){Text(stringResource(if(kind=="PERSONAL")R.string.wa_auth_personal else R.string.wa_auth_business),style=MaterialTheme.typography.titleLarge);Text(stringResource(if(kind=="PERSONAL")R.string.p7_personal_help else R.string.p7_business_help));if(!enabled)Text(stringResource(R.string.p7_plan_locked),style=MaterialTheme.typography.labelMedium)}
                            Icon(if(!enabled)Icons.Default.Lock else if(selected)Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,null)
                        }
                    }
                }
                AuthPrimary(stringResource(R.string.wa_auth_continue),!state.loading&&state.setupStatus?.accountTypes?.any{it.key==state.profileKind&&it.enabled}==true){auth.saveKind(locale)}
            }
            AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED->{
                OutlinedTextField(state.profileName,auth::setProfileName,Modifier.fillMaxWidth(),singleLine=true,label={Text(stringResource(R.string.p7_profile_name))},leadingIcon={Icon(Icons.Default.Badge,null)})
                Text(stringResource(if(state.profileKind=="BUSINESS")R.string.wa_auth_business else R.string.wa_auth_personal),style=MaterialTheme.typography.labelLarge)
                AuthPrimary(stringResource(R.string.p7_create),!state.loading&&state.profileName.isNotBlank()){auth.submitBootstrap(locale)}
            }
            AuthSetupStage.TEMPLATE_CHOICE->{
                if(state.catalogUnavailable)Text(stringResource(R.string.p7_catalog_offline))
                state.templates.forEach{template->
                    val selected=state.templateId==template.id
                    OutlinedCard(Modifier.fillMaxWidth(),shape=RoundedCornerShape(22.dp)){
                        Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
                            if(template.previewImageUrl!=null)AsyncImage(template.previewImageUrl,null,Modifier.fillMaxWidth().height(160.dp))
                            else Surface(Modifier.fillMaxWidth().height(112.dp),shape=RoundedCornerShape(14.dp),color=runCatching{androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor(template.configuration.background))}.getOrDefault(MaterialTheme.colorScheme.primaryContainer)){
                                Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){Icon(Icons.Default.AccountCircle,null,Modifier.size(32.dp),tint=MaterialTheme.colorScheme.primary);repeat(2){Surface(Modifier.fillMaxWidth(if(it==0).6f else .85f).height(12.dp),shape=RoundedCornerShape(6.dp),color=MaterialTheme.colorScheme.primary.copy(alpha=.3f)){}}}
                            }
                            Text(if(locale=="ar")template.nameAr else template.nameEn,style=MaterialTheme.typography.titleMedium)
                            Text(stringResource(templateFamilyResource(template.family)),style=MaterialTheme.typography.labelMedium)
                            if(!template.allowed)Text(stringResource(R.string.p7_plan_locked))
                            Row(horizontalArrangement=Arrangement.spacedBy(12.dp)){
                                OutlinedButton({preview=template.id},enabled=template.allowed){Text(stringResource(R.string.p7_preview))}
                                Button({auth.selectTemplate(template.id,locale)},enabled=template.allowed&&template.isActive&&!state.loading&&!selected){Text(stringResource(if(selected)R.string.p7_selected else R.string.p7_select))}
                            }
                        }
                    }
                }
                AuthPrimary(stringResource(R.string.wa_auth_continue),!state.loading){auth.continueToSecurity()}
                TextButton({auth.continueToSecurity()},enabled=!state.loading){Text(stringResource(R.string.p7_keep_default))}
            }
            AuthSetupStage.SECURITY_SETUP->{
                Card {Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
                    Icon(Icons.Default.Key,null,Modifier.size(32.dp));Text(stringResource(R.string.p7_passkey_title),style=MaterialTheme.typography.titleLarge);Text(stringResource(R.string.p7_passkey_help))
                    if(state.passkeyRegistered||state.setupStatus?.passkeyCount!=0&&state.setupStatus?.passkeyCount!=null)Text(stringResource(R.string.p7_enabled))
                    else OutlinedButton({auth.registerPasskey(context as? ComponentActivity,locale)},enabled=!state.passkeyLoading){Text(stringResource(R.string.p7_enable))}
                    if(state.passkeyError!=null)Text(stringResource(R.string.p7_passkey_fallback))
                }}
                Card {Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
                    Icon(Icons.Default.Fingerprint,null,Modifier.size(32.dp));Text(stringResource(R.string.p7_biometric_title),style=MaterialTheme.typography.titleLarge);Text(stringResource(R.string.p7_biometric_help))
                    if(biometricEnabled)Text(stringResource(R.string.p7_enabled))
                    else if(biometric?.available()==true)OutlinedButton({biometricBusy=true;scope.launch{try{biometric.authenticate(true);biometricEnabled=true;biometricError=false}catch(_:Exception){biometricError=true}finally{biometricBusy=false}}},enabled=!biometricBusy){Text(stringResource(R.string.p7_enable))}
                    else Text(stringResource(R.string.p7_biometric_unavailable))
                    if(biometricError)Text(stringResource(R.string.p7_biometric_failed))
                }}
                AuthPrimary(stringResource(R.string.wa_auth_continue),!state.passkeyLoading&&!biometricBusy){auth.ready()}
                TextButton(auth::ready,enabled=!state.passkeyLoading&&!biometricBusy){Text(stringResource(R.string.p7_not_now))}
            }
            AuthSetupStage.COMPLETION->{
                Card(Modifier.fillMaxWidth()){Column(Modifier.padding(24.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
                    Text(state.profileName,style=MaterialTheme.typography.titleLarge)
                    Text(stringResource(if(state.profileKind=="BUSINESS")R.string.wa_auth_business else R.string.wa_auth_personal))
                    Text(state.templates.find{it.id==state.templateId}?.let{if(locale=="ar")it.nameAr else it.nameEn}?:state.setupStatus?.templateName?:stringResource(R.string.p7_default_template))
                }}
                AuthPrimary(stringResource(R.string.p7_enter),!state.loading){auth.enterApp()}
            }
            else->{CircularProgressIndicator();if(state.error!=null)AuthPrimary(stringResource(R.string.wa_auth_retry)){auth.refreshSetup(locale)}}
        }
        if(state.loading||state.passkeyLoading)LinearProgressIndicator(Modifier.fillMaxWidth())
        if(state.error!=null)Text(stringResource(R.string.wa_auth_setup_failed),color=MaterialTheme.colorScheme.error)
        TextButton({auth.logout()},enabled=!state.loading&&!biometricBusy&&!state.passkeyLoading){Text(stringResource(R.string.logout))}
    }
    preview?.let{id->state.setupStatus?.primaryProfileId?.let{DraftTemplatePreview(it,id){preview=null}}}
}
private fun templateFamilyResource(family:String)=when(family){"personal"->R.string.p7_family_personal;"professional"->R.string.p7_family_professional;"business"->R.string.p7_family_business;"agency"->R.string.p7_family_agency;"brand"->R.string.p7_family_brand;"tech"->R.string.p7_family_tech;else->R.string.p7_family_storefront}
