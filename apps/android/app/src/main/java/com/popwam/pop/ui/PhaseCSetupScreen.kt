package com.popwam.pop.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.gson.JsonParser
import com.popwam.pop.R
import com.popwam.pop.data.auth.PasskeyCoordinator
import kotlinx.coroutines.launch

@Composable
fun PhaseCSetupScreen(state:AuthUiState, auth:AuthViewModel, locale:String) {
    when (state.setupStage) {
        AuthSetupStage.AUTHENTICATED_CHECKING -> SetupLoading(auth, locale)
        AuthSetupStage.LEGAL_REQUIRED -> LegalConsentScreen(state, auth, locale)
        AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED -> ProfileBootstrapScreen(state, auth, locale)
        AuthSetupStage.PASSKEY_OFFER -> PasskeyOfferScreen(auth, locale)
        AuthSetupStage.DYNAMIC_ONBOARDING -> DynamicOnboardingScreen(state,auth,locale)
        AuthSetupStage.LEGACY_COMPATIBILITY -> LegacyCompatibilityScreen(auth)
        else -> SetupLoading(auth, locale)
    }
}

@Composable private fun SetupPage(content:@Composable ColumnScope.()->Unit) {
    Box(Modifier.fillMaxSize().safeDrawingPadding().imePadding(), contentAlignment=Alignment.Center) {
        Card(Modifier.fillMaxWidth().padding(20.dp)) {
            Column(Modifier.padding(24.dp), verticalArrangement=Arrangement.spacedBy(16.dp), content=content)
        }
    }
}

@Composable private fun SetupLoading(auth:AuthViewModel,locale:String) = SetupPage {
    Text(stringResource(R.string.setup_checking),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
    CircularProgressIndicator()
    TextButton({auth.refreshSetup(locale)},Modifier.fillMaxWidth()) { Text(stringResource(R.string.retry)) }
}

@Composable private fun LegalConsentScreen(state:AuthUiState,auth:AuthViewModel,locale:String) {
    var acknowledged by rememberSaveable { mutableStateOf(false) }
    var openDocumentId by rememberSaveable { mutableStateOf<String?>(null) }
    val openDocument=state.legalDocuments.firstOrNull{it.id==openDocumentId}
    if(openDocument!=null){
        val kind=if(openDocument.documentType=="TERMS")PreAuthLegalKind.TERMS else PreAuthLegalKind.PRIVACY
        NativeLegalScreen(kind,openDocument.version){openDocumentId=null}
        return
    }
    SetupPage {
        Text(stringResource(R.string.app_name),style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.primary)
        Text(stringResource(R.string.legal_title),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
        Text(stringResource(R.string.legal_description))
        state.legalDocuments.forEach { document ->
            val kind=when(document.documentType) { "TERMS" -> PreAuthLegalKind.TERMS; "PRIVACY" -> PreAuthLegalKind.PRIVACY; else -> null }
            if(kind!=null) ListItem(headlineContent={Text(if(kind==PreAuthLegalKind.TERMS) stringResource(R.string.terms) else stringResource(R.string.privacy))},supportingContent={Text(stringResource(R.string.legal_version_format,document.version))},trailingContent={TextButton({openDocumentId=document.id}){Text(stringResource(R.string.read))}})
        }
        Row(verticalAlignment=Alignment.CenterVertically,modifier=Modifier.clickable { acknowledged=!acknowledged }) {
            Checkbox(checked=acknowledged,onCheckedChange={acknowledged=it})
            Text(stringResource(R.string.legal_acknowledge),modifier=Modifier.padding(start=8.dp))
        }
        state.error?.let { Text(stringResource(R.string.generic_error),color=MaterialTheme.colorScheme.error) }
        Button({auth.acceptLegal(locale)},Modifier.fillMaxWidth(),enabled=acknowledged && !state.loading) { Text(stringResource(R.string.continue_label)) }
    }
}

@Composable private fun ProfileBootstrapScreen(state:AuthUiState,auth:AuthViewModel,locale:String) {
    var step by rememberSaveable { mutableIntStateOf(if(state.profileKind==null) 1 else if(state.categorySlug==null) 2 else 3) }
    SetupPage {
        Text(stringResource(R.string.bootstrap_title),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
        Text(stringResource(R.string.bootstrap_step,step,4),style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.primary)
        when(step) {
            1 -> {
                OutlinedTextField(state.profileName,auth::setProfileName,label={Text(stringResource(R.string.bootstrap_name))},modifier=Modifier.fillMaxWidth(),singleLine=true)
                Button({step=2},Modifier.fillMaxWidth(),enabled=state.profileName.isNotBlank()){Text(stringResource(R.string.continue_label))}
            }
            2 -> {
                Text(stringResource(R.string.bootstrap_kind))
                Button({auth.selectProfileKind("PERSONAL",locale);step=3},Modifier.fillMaxWidth()){Text(stringResource(R.string.bootstrap_personal))}
                OutlinedButton({auth.selectProfileKind("BUSINESS",locale);step=3},Modifier.fillMaxWidth()){Text(stringResource(R.string.bootstrap_business))}
            }
            3 -> {
                Text(stringResource(R.string.bootstrap_category))
                if(state.categories.isEmpty() && !state.loading) Text(stringResource(R.string.bootstrap_categories_empty))
                LazyColumn(Modifier.heightIn(max=260.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
                    items(state.categories.size) { index ->
                        val category=state.categories[index]
                        OutlinedButton({auth.selectCategory(category.slug,locale);step=4},Modifier.fillMaxWidth()) { Text(if(locale=="ar") category.nameAr ?: category.nameEn.orEmpty() else category.nameEn ?: category.nameAr.orEmpty()) }
                    }
                }
                TextButton({auth.selectProfileKind(state.profileKind ?: "PERSONAL",locale)},Modifier.fillMaxWidth()){Text(stringResource(R.string.retry))}
            }
            else -> {
                Text(stringResource(R.string.bootstrap_template))
                if(state.templates.isEmpty() && !state.loading) Text(stringResource(R.string.bootstrap_templates_empty))
                state.templates.forEach { template ->
                    FilterChip(selected=state.templateId==template.id,onClick={auth.selectTemplate(template.id)},label={Text(if(locale=="ar") template.nameAr ?: template.nameEn.orEmpty() else template.nameEn ?: template.nameAr.orEmpty())},modifier=Modifier.fillMaxWidth())
                }
                state.error?.let { Text(stringResource(R.string.generic_error),color=MaterialTheme.colorScheme.error) }
                Button({auth.submitBootstrap(locale)},Modifier.fillMaxWidth(),enabled=!state.loading&&state.categorySlug!=null&&state.templates.isNotEmpty()&&state.templateId!=null){Text(stringResource(R.string.finish_setup))}
                TextButton({state.categorySlug?.let { auth.selectCategory(it,locale) }},Modifier.fillMaxWidth()){Text(stringResource(R.string.retry))}
            }
        }
        if(state.loading) LinearProgressIndicator(Modifier.fillMaxWidth())
    }
}

@Composable private fun PasskeyOfferScreen(auth:AuthViewModel,locale:String) {
    val context=LocalContext.current
    val scope=rememberCoroutineScope()
    var error by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(Unit) { auth.passkeyPromptShown() }
    SetupPage {
        Text(stringResource(R.string.passkey_title),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
        Text(stringResource(R.string.passkey_description))
        if(error) Text(stringResource(R.string.passkey_unavailable),color=MaterialTheme.colorScheme.error)
        Button({ scope.launch {
            runCatching {
                val options=auth.passkeyRegistrationOptions()
                val response=PasskeyCoordinator(context).register(context,options.toString())
                auth.completePasskeyRegistration(JsonParser.parseString(response).asJsonObject,locale)
            }.onFailure { error=true }
        } },Modifier.fillMaxWidth()) { Text(stringResource(R.string.passkey_set_up)) }
        TextButton({auth.skipPasskey(locale)},Modifier.fillMaxWidth()) { Text(stringResource(R.string.passkey_not_now)) }
    }
}

@Composable private fun LegacyCompatibilityScreen(auth:AuthViewModel) = SetupPage {
    Text(stringResource(R.string.legacy_title),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
    Text(stringResource(R.string.legacy_description))
    Button(auth::continueLegacyCompatibility,Modifier.fillMaxWidth()) { Text(stringResource(R.string.continue_label)) }
}
