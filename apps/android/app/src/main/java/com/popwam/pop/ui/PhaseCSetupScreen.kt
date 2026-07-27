package com.popwam.pop.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.activity.compose.BackHandler
import androidx.activity.ComponentActivity
import com.popwam.pop.R
import com.popwam.pop.data.api.ProfileBootstrapTemplateDto

@Composable
fun PhaseCSetupScreen(state:AuthUiState, auth:AuthViewModel, locale:String) {
    when (state.setupStage) {
        AuthSetupStage.AUTHENTICATED_CHECKING -> SetupLoading(state,auth, locale)
        AuthSetupStage.SETUP_UNAVAILABLE -> SetupLoading(state.copy(error=state.error ?: "SETUP_STATUS_UNAVAILABLE"),auth,locale)
        AuthSetupStage.LEGAL_REQUIRED -> LegalConsentScreen(state, auth, locale)
        AuthSetupStage.PROFILE_BOOTSTRAP_REQUIRED -> ProfileBootstrapScreen(state, auth, locale)
        AuthSetupStage.PASSKEY_OFFER -> PasskeyOfferScreen(auth, locale)
        AuthSetupStage.DYNAMIC_ONBOARDING -> DynamicOnboardingScreen(state,auth,locale)
        AuthSetupStage.LEGACY_COMPATIBILITY -> LegacyCompatibilityScreen(auth)
        else -> SetupLoading(state,auth, locale)
    }
}

@Composable private fun SetupPage(content:@Composable ColumnScope.()->Unit) {
    Box(Modifier.fillMaxSize().safeDrawingPadding().imePadding(), contentAlignment=Alignment.Center) {
        Card(Modifier.fillMaxWidth().padding(20.dp)) {
            Column(Modifier.padding(24.dp), verticalArrangement=Arrangement.spacedBy(16.dp), content=content)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun SetupLoading(state:AuthUiState,auth:AuthViewModel,locale:String) {
    ModalBottomSheet(onDismissRequest={}) { Column(Modifier.fillMaxWidth().padding(24.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){Text(if(state.error==null)stringResource(R.string.setup_checking) else "We couldn't finish signing you in.",style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black);if(state.error==null)Row(verticalAlignment=Alignment.CenterVertically){CircularProgressIndicator(Modifier.size(22.dp),strokeWidth=2.dp);Spacer(Modifier.width(12.dp));Text("Verifying your account…",color=MaterialTheme.colorScheme.onSurfaceVariant)};TextButton({auth.refreshSetup(locale)}){Text(stringResource(R.string.retry))}} }
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
    var page by rememberSaveable(state.profileKind,state.categorySlug) {
        mutableStateOf(if(state.profileKind==null) "name" else if(state.categorySlug==null) "category" else "template")
    }
    val canGoBack=page!="name"
    BackHandler(enabled=canGoBack) {
        page=when(page) { "template" -> "category"; "category" -> "kind"; else -> "name" }
    }
    Scaffold(
        modifier=Modifier.fillMaxSize().safeDrawingPadding().imePadding(),
        containerColor=MaterialTheme.colorScheme.surface,
        bottomBar={
            Surface(shadowElevation=10.dp,color=MaterialTheme.colorScheme.surface.copy(alpha=.96f)) {
                Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal=20.dp,vertical=12.dp),horizontalArrangement=Arrangement.spacedBy(12.dp)) {
                    if(canGoBack) {
                        OutlinedButton(onClick={ page=when(page) { "template" -> "category"; "category" -> "kind"; else -> "name" } },modifier=Modifier.size(52.dp),contentPadding=PaddingValues(0.dp)) {
                            Icon(Icons.Outlined.ArrowBack,contentDescription=stringResource(R.string.back))
                        }
                    }
                    when(page) {
                        "name" -> Button(onClick={page="kind"},enabled=state.profileName.isNotBlank(),modifier=Modifier.weight(1f).heightIn(min=52.dp)) { Text(stringResource(R.string.continue_label)) }
                        "template" -> Button(onClick={auth.submitBootstrap(locale)},enabled=!state.loading&&state.categorySlug!=null&&state.templates.isNotEmpty()&&state.templateId!=null,modifier=Modifier.weight(1f).heightIn(min=52.dp)) { Text(stringResource(R.string.bootstrap_use_template)) }
                        else -> Spacer(Modifier.weight(1f))
                    }
                }
            }
        },
    ) { padding ->
        LazyColumn(
            modifier=Modifier.fillMaxSize().padding(padding).padding(horizontal=20.dp),
            contentPadding=PaddingValues(top=28.dp,bottom=20.dp),
            verticalArrangement=Arrangement.spacedBy(18.dp),
        ) {
            item {
                Text(stringResource(R.string.onboarding_title),style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.primary)
                when(page) {
                    "name" -> BootstrapNameContent(state,auth)
                    "kind" -> BootstrapKindContent(auth,locale,onSelected={page="category"})
                    "category" -> BootstrapCategoryContent(state,auth,locale,onSelected={page="template"})
                    else -> BootstrapTemplateContent(state,auth,locale)
                }
            }
            if(state.loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            state.error?.let {
                item {
                    Column(verticalArrangement=Arrangement.spacedBy(4.dp)) {
                        Text(stringResource(R.string.generic_error),color=MaterialTheme.colorScheme.error)
                        TextButton(onClick={
                            when {
                                state.categorySlug!=null -> auth.selectCategory(state.categorySlug,locale)
                                state.profileKind!=null -> auth.selectProfileKind(state.profileKind,locale)
                            }
                        }) { Text(stringResource(R.string.retry)) }
                    }
                }
            }
        }
    }
}

@Composable private fun BootstrapNameContent(state:AuthUiState,auth:AuthViewModel) = Column(verticalArrangement=Arrangement.spacedBy(14.dp)) {
    Text(stringResource(R.string.bootstrap_name_title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)
    Text(stringResource(R.string.bootstrap_name_description),color=MaterialTheme.colorScheme.onSurfaceVariant)
    OutlinedTextField(
        value=state.profileName,onValueChange=auth::setProfileName,singleLine=true,
        label={Text(stringResource(R.string.bootstrap_name))},
        modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(18.dp),
    )
}

@Composable private fun BootstrapKindContent(auth:AuthViewModel,locale:String,onSelected:()->Unit) = Column(verticalArrangement=Arrangement.spacedBy(12.dp)) {
    Text(stringResource(R.string.bootstrap_kind_title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)
    Text(stringResource(R.string.bootstrap_kind_description),color=MaterialTheme.colorScheme.onSurfaceVariant)
    BootstrapChoiceCard(Icons.Outlined.AccountCircle,stringResource(R.string.bootstrap_personal),stringResource(R.string.bootstrap_personal_description)) { auth.selectProfileKind("PERSONAL",locale);onSelected() }
    BootstrapChoiceCard(Icons.Outlined.Business,stringResource(R.string.bootstrap_business),stringResource(R.string.bootstrap_business_description)) { auth.selectProfileKind("BUSINESS",locale);onSelected() }
}

@Composable private fun BootstrapChoiceCard(icon:ImageVector,title:String,description:String,onClick:()->Unit) {
    ElevatedCard(onClick=onClick,modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(24.dp),colors=CardDefaults.elevatedCardColors(containerColor=MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha=.76f))) {
        Row(Modifier.padding(20.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(16.dp)) {
            Surface(shape=RoundedCornerShape(16.dp),color=MaterialTheme.colorScheme.primaryContainer) { Icon(icon,null,Modifier.padding(13.dp).size(28.dp),tint=MaterialTheme.colorScheme.onPrimaryContainer) }
            Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(4.dp)) { Text(title,style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold);Text(description,color=MaterialTheme.colorScheme.onSurfaceVariant) }
            Icon(Icons.Outlined.ChevronRight,null,tint=MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable private fun BootstrapCategoryContent(state:AuthUiState,auth:AuthViewModel,locale:String,onSelected:()->Unit) = Column(verticalArrangement=Arrangement.spacedBy(12.dp)) {
    Text(stringResource(R.string.bootstrap_category_title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)
    Text(stringResource(R.string.bootstrap_category_description),color=MaterialTheme.colorScheme.onSurfaceVariant)
    if(state.categories.isEmpty() && !state.loading) Text(stringResource(R.string.bootstrap_categories_empty),color=MaterialTheme.colorScheme.error)
    state.categories.forEach { category ->
        val title=if(locale=="ar") category.nameAr ?: category.nameEn.orEmpty() else category.nameEn ?: category.nameAr.orEmpty()
        val detail=if(locale=="ar") category.descriptionAr ?: category.descriptionEn.orEmpty() else category.descriptionEn ?: category.descriptionAr.orEmpty()
        BootstrapChoiceCard(Icons.Outlined.Palette,title,detail.ifBlank { stringResource(R.string.bootstrap_category_fallback_description) }) { auth.selectCategory(category.slug,locale);onSelected() }
    }
}

@Composable private fun BootstrapTemplateContent(state:AuthUiState,auth:AuthViewModel,locale:String) {
    var fullPreviewId by rememberSaveable { mutableStateOf<String?>(null) }
    val templates=state.templates
    val initial=templates.indexOfFirst { it.id==state.templateId }.coerceAtLeast(0)
    val pager=rememberPagerState(initialPage=initial,pageCount={templates.size})
    LaunchedEffect(pager.currentPage,templates) { templates.getOrNull(pager.currentPage)?.id?.let(auth::selectTemplate) }
    Column(verticalArrangement=Arrangement.spacedBy(14.dp)) {
        Text(stringResource(R.string.bootstrap_template_title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)
        Text(stringResource(R.string.bootstrap_template_description),color=MaterialTheme.colorScheme.onSurfaceVariant)
        if(templates.isEmpty()&&!state.loading) Text(stringResource(R.string.bootstrap_templates_empty),color=MaterialTheme.colorScheme.error)
        if(templates.isNotEmpty()) {
            HorizontalPager(state=pager,contentPadding=PaddingValues(horizontal=18.dp),pageSpacing=14.dp,modifier=Modifier.fillMaxWidth().height(390.dp)) { index ->
                val template=templates[index]
                val selected=template.id==state.templateId
                ElevatedCard(
                    onClick={auth.selectTemplate(template.id)},
                    modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(28.dp),
                    colors=CardDefaults.elevatedCardColors(containerColor=if(selected)MaterialTheme.colorScheme.secondaryContainer.copy(alpha=.72f) else MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha=.7f)),
                    elevation=CardDefaults.elevatedCardElevation(if(selected)8.dp else 1.dp),
                ) {
                    Column(Modifier.fillMaxSize().padding(14.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                        TemplateMiniPreview(template,Modifier.weight(1f).fillMaxWidth().clip(RoundedCornerShape(20.dp)).clickable { fullPreviewId=template.id })
                        Text(templateDisplayName(template,locale),style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold,textAlign=TextAlign.Center,modifier=Modifier.fillMaxWidth())
                        TextButton(onClick={fullPreviewId=template.id},modifier=Modifier.align(Alignment.CenterHorizontally)) { Text(stringResource(R.string.bootstrap_preview_template)) }
                    }
                }
            }
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.Center) { templates.indices.forEach { index -> Box(Modifier.padding(4.dp).size(if(index==pager.currentPage)8.dp else 6.dp).clip(RoundedCornerShape(9.dp)).background(if(index==pager.currentPage)MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant)) } }
        }
    }
    fullPreviewId?.let { id -> templates.firstOrNull { it.id==id }?.let { TemplateFullPreview(it,locale,onDismiss={fullPreviewId=null},onUse={auth.selectTemplate(it.id);fullPreviewId=null}) } }
}

@Composable private fun TemplateFullPreview(template:ProfileBootstrapTemplateDto,locale:String,onDismiss:()->Unit,onUse:()->Unit) {
    Dialog(onDismissRequest=onDismiss) {
        Surface(Modifier.fillMaxWidth().fillMaxHeight(.88f),shape=RoundedCornerShape(28.dp),color=MaterialTheme.colorScheme.surface) {
            Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
                Row(verticalAlignment=Alignment.CenterVertically) { IconButton(onClick=onDismiss) { Icon(Icons.Outlined.ArrowBack,stringResource(R.string.back)) }; Text(templateDisplayName(template,locale),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold) }
                TemplateMiniPreview(template,Modifier.weight(1f).fillMaxWidth().clip(RoundedCornerShape(24.dp)),expanded=true)
                Button(onClick=onUse,modifier=Modifier.fillMaxWidth().heightIn(min=52.dp)) { Text(stringResource(R.string.bootstrap_use_template)) }
            }
        }
    }
}

@Composable private fun TemplateMiniPreview(template:ProfileBootstrapTemplateDto,modifier:Modifier=Modifier,expanded:Boolean=false) {
    val config=template.configuration
    val background=config.background.toComposeColor(MaterialTheme.colorScheme.surfaceContainerHighest)
    val panel=config.panel.toComposeColor(MaterialTheme.colorScheme.surface)
    val text=config.text.toComposeColor(MaterialTheme.colorScheme.onSurface)
    val accent=config.accent.toComposeColor(MaterialTheme.colorScheme.primary)
    val rounded=if(config.radius.startsWith("0")) 4.dp else 24.dp
    Column(modifier.background(background).padding(if(expanded)28.dp else 16.dp),horizontalAlignment=if(config.headerAlign=="start") Alignment.Start else Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(if(expanded)15.dp else 9.dp)) {
        if(config.coverStyle!="minimal") Box(Modifier.fillMaxWidth().height(if(expanded)72.dp else 42.dp).clip(RoundedCornerShape(rounded)).background(accent.copy(alpha=.7f)))
        Surface(shape=RoundedCornerShape(50.dp),color=accent,modifier=Modifier.size(if(expanded)68.dp else 44.dp)) {}
        Text(stringResource(R.string.template_preview_sample_name),color=text,style=if(expanded)MaterialTheme.typography.titleLarge else MaterialTheme.typography.titleSmall,fontWeight=FontWeight.Bold)
        Text(stringResource(R.string.template_preview_sample_title),color=text.copy(alpha=.72f),style=MaterialTheme.typography.labelSmall)
        repeat(if(expanded)4 else 3) { index ->
            Surface(color=panel,shape=RoundedCornerShape(if(config.buttonRadius.startsWith("99")) 30.dp else 12.dp),modifier=Modifier.fillMaxWidth().height(if(expanded)42.dp else 28.dp)) { Box(contentAlignment=if(config.linkLayout=="grid") Alignment.Center else Alignment.CenterStart,modifier=Modifier.padding(horizontal=12.dp)) { Box(Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(accent.copy(alpha=if(index==0)1f else .55f))) } }
        }
    }
}

private fun String.toComposeColor(fallback:Color)=runCatching { Color(android.graphics.Color.parseColor(this)) }.getOrDefault(fallback)
private fun templateDisplayName(template:ProfileBootstrapTemplateDto,locale:String)=if(locale=="ar") template.nameAr ?: template.nameEn.orEmpty() else template.nameEn ?: template.nameAr.orEmpty()

@Composable private fun PasskeyOfferScreen(auth:AuthViewModel,locale:String) {
    val context=LocalContext.current
    val activity=context as? ComponentActivity
    val state by auth.state.collectAsState()
    LaunchedEffect(Unit) { auth.passkeyPromptShown() }
    SetupPage {
        Text(stringResource(R.string.passkey_title),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
        Text(stringResource(R.string.passkey_description))
        state.passkeyError?.let { Text(stringResource(passkeyOfferErrorString(it)),color=MaterialTheme.colorScheme.error) }
        Button({ auth.registerPasskey(activity,locale) },Modifier.fillMaxWidth(),enabled=!state.passkeyLoading) { Text(stringResource(R.string.passkey_set_up)) }
        TextButton({auth.skipPasskey(locale)},Modifier.fillMaxWidth()) { Text(stringResource(R.string.passkey_not_now)) }
    }
}

private fun passkeyOfferErrorString(error:PasskeyLoginError)=when(error) {
    PasskeyLoginError.CANCELLED->R.string.passkey_login_cancelled
    PasskeyLoginError.UNAVAILABLE->R.string.passkey_login_unavailable
    PasskeyLoginError.NO_CREDENTIAL->R.string.passkey_login_no_credential
    PasskeyLoginError.NETWORK->R.string.passkey_login_network
    PasskeyLoginError.STEP_UP_REQUIRED->R.string.passkey_login_failed
    PasskeyLoginError.AUTHENTICATION_FAILED->R.string.passkey_login_failed
    PasskeyLoginError.SERVER_UNAVAILABLE->R.string.passkey_login_server
}

@Composable private fun LegacyCompatibilityScreen(auth:AuthViewModel) = SetupPage {
    Text(stringResource(R.string.legacy_title),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
    Text(stringResource(R.string.legacy_description))
    Button(auth::continueLegacyCompatibility,Modifier.fillMaxWidth()) { Text(stringResource(R.string.continue_label)) }
}
