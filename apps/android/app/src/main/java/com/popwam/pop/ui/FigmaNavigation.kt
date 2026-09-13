package com.popwam.pop.ui

import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import coil3.compose.AsyncImage
import com.popwam.pop.R
import com.popwam.pop.ui.theme.AppearanceStore
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.pop.ui.home.HomeDestination
import com.popwam.pop.ui.home.HomeEvent
import com.popwam.pop.ui.home.HomePrimaryTab
import com.popwam.pop.ui.home.HomeRoute
import com.popwam.pop.ui.home.HomeViewModel
import com.popwam.pop.ui.home.selectedHomeTab
import com.popwam.pop.hce.HceConfig
import com.popwam.pop.ui.profile.*
import com.popwam.pop.ui.share.ActiveShareProfile
import com.popwam.pop.ui.share.ShareCenterScreen as ProductionShareCenterScreen
import com.popwam.pop.ui.share.ShareInitialPanel
import com.popwam.pop.ui.share.ShareProfileAccess
import com.popwam.pop.ui.share.ShareActivationScreen as ProductionShareActivationScreen
import com.popwam.pop.ui.share.ShareEffect
import com.popwam.pop.ui.share.ShareViewModel
import com.popwam.pop.ui.components.PopApprovedAsset

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FigmaMainNavigation(
    vm: MainViewModel,
    home: HomeViewModel,
    profiles: ProfilesViewModel,
    share: ShareViewModel,
    initialRoute: String = "home",
    onLogout: () -> Unit,
    appearanceStore:AppearanceStore,
    onThemeModeSelected:(ThemeMode)->Unit,
    onPaletteSelected:(IdentityPalette)->Unit,
) {
    val context = LocalContext.current
    val nav = rememberNavController()
    val state by vm.state.collectAsStateWithLifecycle()
    val homeState by home.state.collectAsStateWithLifecycle()
    val profileState by profiles.state.collectAsStateWithLifecycle()
    val shareState by share.state.collectAsStateWithLifecycle()
    val current by nav.currentBackStackEntryAsState()
    val topRoutes = PopNavigationPolicy.bottomRoutes
    val currentRoute = current?.destination?.route
    LaunchedEffect(homeState.activeProfileId) {
        homeState.activeProfileId?.let { id ->
            if (profileState.activeProfileId != id) profiles.onEvent(ProfileEvent.SelectProfile(id))
        }
    }
    val activeShareProfile = homeState.activeProfileId?.let { id ->
        val owned = profileState.profiles.firstOrNull { it.id == id }
        val homeProfile = homeState.profiles.firstOrNull { it.id == id }
        ActiveShareProfile(
            id = id,
            name = owned?.name ?: homeProfile?.name,
            access = ShareProfileAccess.from(owned?.visibility ?: homeProfile?.visibility),
            lifecycle = owned?.lifecycle ?: homeProfile?.lifecycle,
            type = owned?.backendKind?.name?.lowercase()?.replaceFirstChar(Char::uppercase),
        )
    }
    LaunchedEffect(shareState.hce.requested, shareState.hce.activeForProfile, shareState.hce.availability) {
        HceConfig.refreshPreferredService(context)
    }
    LaunchedEffect(share) {
        share.effects.collect { if (it == ShareEffect.SessionExpired) onLogout() }
    }
    LaunchedEffect(profiles) {
        profiles.effects.collect { effect ->
            when(effect){
                is ProfileEffect.Navigate -> when(val destination=effect.destination){
                    ProfileDestination.List->nav.navigate("profiles")
                    ProfileDestination.Create->nav.navigate("profiles/create")
                    is ProfileDestination.View->nav.navigate("profile/${destination.id}")
                    is ProfileDestination.PublicPreview->nav.navigate("profile/public-preview/${destination.id}")
                    is ProfileDestination.Editor->nav.navigate("profile/${destination.id}/edit")
                    is ProfileDestination.Section->nav.navigate("profile/${destination.id}/edit/${destination.section.name}")
                    is ProfileDestination.Share->nav.navigate("profile/share/${destination.id}")
                    is ProfileDestination.Qr->nav.navigate("profile/qr/${destination.id}")
                    is ProfileDestination.Nfc->nav.navigate("profile/nfc/${destination.id}")
                }
                ProfileEffect.SessionExpired->onLogout()
                ProfileEffect.ConfirmDiscard->Unit
            }
        }
    }
    BackHandler(enabled=currentRoute in topRoutes) {
        // Root destinations are switched through the bottom bar; one system
        // Back press must not terminate the authenticated app unexpectedly.
    }
    val snackbar = remember { SnackbarHostState() }
    var howItWorks by rememberSaveable { mutableStateOf(false) }
    val darkBackground = MaterialTheme.colorScheme.background.luminance() < .5f || currentRoute?.startsWith("virtual-card/") == true
    PopSystemBars(darkBackground)
    val phaseGFeedback = when(state.error ?: state.message){
        "ACTIVATION_COOLDOWN"->stringResource(R.string.share_activation_cooldown)
        "ACTIVATION_UNAVAILABLE","ACTIVATION_CONFLICT"->stringResource(R.string.share_activation_failed)
        "CARD_LIMIT_REACHED"->stringResource(R.string.share_activation_limit)
        "SHARE_TARGET_UPDATED"->stringResource(R.string.share_target_updated)
        "PRODUCT_STATUS_UPDATED"->stringResource(R.string.share_status_updated)
        "PRODUCT_ACTIVATED"->stringResource(R.string.share_product_activated)
        "REPORT_RECEIVED"->stringResource(R.string.friends_report_received)
        "QUOTA_REQUESTED"->stringResource(R.string.quota_request_submitted)
        "SEARCH_QUERY_INVALID"->stringResource(R.string.friends_search_minimum)
        "REQUEST_FAILED"->stringResource(R.string.generic_error)
        "FRIENDS_POLICY_REQUIRED","FRIENDS_POLICY_UNAVAILABLE","FRIENDS_REQUEST_FAILED","RELATIONSHIP_UNAVAILABLE","REQUEST_UNAVAILABLE","FRIEND_REQUEST_LIMITED","FRIEND_REQUEST_COOLDOWN","FRIENDSHIP_REQUIRED","REPORT_INVALID","REPORT_LIMITED","BLOCK_UNAVAILABLE"->stringResource(R.string.friends_action_failed)
        "NEARBY_UNAVAILABLE","NEARBY_COMMUNITY_REQUIRED","NEARBY_CONSENT_UNAVAILABLE","NEARBY_CONSENT_REQUIRED","NEARBY_PROFILE_REQUIRED","NEARBY_PRESENCE_REQUIRED","NEARBY_SESSION_STALE","NEARBY_LOCATION_INVALID","NEARBY_RATE_LIMITED","NEARBY_MOVEMENT_LIMITED","NEARBY_REQUEST_FAILED"->stringResource(R.string.nearby_action_failed)
        else->state.error ?: state.message
    }
    LaunchedEffect(phaseGFeedback) {
        val message = phaseGFeedback
        if (!message.isNullOrBlank()) {
            if(state.error.isNullOrBlank())snackbar.showPopTransient(message)
            else snackbar.showSnackbar(message,duration=SnackbarDuration.Indefinite)
            vm.clearFeedback()
        }
    }
    PopDynamicBackground(when { currentRoute?.startsWith("virtual-card/")==true -> PopBackdrop.DETAILS; else -> PopBackdrop.NEUTRAL }) {
    Scaffold(
        containerColor = Color.Transparent,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {},
        bottomBar = {
            if (currentRoute in topRoutes) PopPrimaryNavigationBar(selectedHomeTab(currentRoute)) { route -> nav.navigate(route) { popUpTo("home"); launchSingleTop = true } }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            NavHost(nav, if (initialRoute == "home" || initialRoute.startsWith("card/")) initialRoute else "home") {
                composable("home") {
                    HomeRoute(home, navigate = { destination ->
                        when (destination) {
                            HomeDestination.Search -> nav.navigate("friends/search")
                            HomeDestination.Notifications -> nav.navigate("settings/notifications")
                            HomeDestination.AddProfile -> nav.navigate("profiles/create")
                            HomeDestination.Share -> nav.navigate("share")
                            HomeDestination.Menu -> nav.navigate("menu")
                            is HomeDestination.Profile -> nav.navigate("profile/${destination.id}")
                            is HomeDestination.PublicProfile -> nav.navigate("public-preview/${Uri.encode(destination.slug)}")
                        }
                    }, onSessionExpired = onLogout)
                }
                composable("profiles") { ProfileListScreen(profileState,profiles::onEvent) }
                composable("profiles/create") { ProfileCreationScreen(profileState,nav::popBackStack,profiles::onEvent) }
                composable("my-profile") {
                    val activeId = profileState.activeProfileId ?: profileState.profiles.firstOrNull()?.id
                    if (activeId == null) ProfileListScreen(profileState, profiles::onEvent)
                    else ProfileViewScreen(profileState, activeId, {}, profiles::onEvent, topLevel = true) { nav.navigate("settings/notifications") }
                }
                composable("share") { ProductionShareCenterScreen(shareState,share,activeShareProfile,{nav.navigate("share-activate")},{nav.navigate(it)},onBack=nav::popBackStack) }
                composable("profile/share/{id}",arguments=listOf(navArgument("id"){type=NavType.StringType})){entry->
                    val id=entry.arguments?.getString("id").orEmpty()
                    val owned=profileState.profiles.firstOrNull{it.id==id}
                    val selected=ActiveShareProfile(id,owned?.name,ShareProfileAccess.from(owned?.visibility),owned?.lifecycle,owned?.backendKind?.name?.lowercase()?.replaceFirstChar(Char::uppercase))
                    LaunchedEffect(id){home.selectActiveProfile(id)}
                    ProductionShareCenterScreen(shareState,share,selected,{nav.navigate("share-activate")},{nav.navigate(it)},onBack=nav::popBackStack)
                }
                composable("profile/qr/{id}",arguments=listOf(navArgument("id"){type=NavType.StringType})){entry->
                    val id=entry.arguments?.getString("id").orEmpty();val owned=profileState.profiles.firstOrNull{it.id==id};val selected=ActiveShareProfile(id,owned?.name,ShareProfileAccess.from(owned?.visibility),owned?.lifecycle,owned?.backendKind?.name?.lowercase()?.replaceFirstChar(Char::uppercase))
                    LaunchedEffect(id){home.selectActiveProfile(id)}
                    ProductionShareCenterScreen(shareState,share,selected,{nav.navigate("share-activate")},{nav.navigate(it)},ShareInitialPanel.QR,nav::popBackStack)
                }
                composable("profile/nfc/{id}",arguments=listOf(navArgument("id"){type=NavType.StringType})){entry->
                    val id=entry.arguments?.getString("id").orEmpty();val owned=profileState.profiles.firstOrNull{it.id==id};val selected=ActiveShareProfile(id,owned?.name,ShareProfileAccess.from(owned?.visibility),owned?.lifecycle,owned?.backendKind?.name?.lowercase()?.replaceFirstChar(Char::uppercase))
                    LaunchedEffect(id){home.selectActiveProfile(id)}
                    ProductionShareCenterScreen(shareState,share,selected,{nav.navigate("share-activate")},{nav.navigate(it)},ShareInitialPanel.HCE,nav::popBackStack)
                }
                composable("share-activate") { ProductionShareActivationScreen(shareState,share){nav.popBackStack()} }
                composable("virtual-cards") { VirtualProfiles(state, vm::reload, { nav.navigate("virtual-card/$it") }, { nav.navigate("profiles/create") }) }
                composable("products") { PhysicalCards(state, vm::reload) { nav.navigate("card/$it") } }
                composable("activity") { ActivityFeed(state, vm::reload) }
                composable("menu") {
                    val active = profileState.profiles.firstOrNull { it.id == profileState.activeProfileId }
                    val activeContent = profileState.content?.takeIf { it.summary.id == active?.id }
                    PopMenuScreen(
                        profile = active?.let { MenuProfileContext(
                            name=it.name,
                            subtitle=it.subtitle,
                            avatarUrl=it.avatarUrl,
                            type=it.backendKind.name.lowercase().replaceFirstChar(Char::uppercase),
                            verified=it.verification==ProfileVerificationState.VERIFIED,
                            publicUrl=activeContent?.slug?.takeIf(String::isNotBlank)?.let { slug->"https://pop.popwam.com/$slug" },
                            completionPercent=if(it.completion.publishReady)100 else 0,
                        ) },
                        navigate = { nav.navigate(it) },
                        logout = onLogout,
                    )
                }
                composable("friends") { FriendsScreen(state,vm) }
                composable("friends/{tab}",arguments=listOf(navArgument("tab"){type=NavType.StringType})){entry->FriendsScreen(state,vm,entry.arguments?.getString("tab") ?: "friends")}
                composable("nearby") { NearbyScreen(state,vm){nav.navigate(it)} }
                composable("virtual-card/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry ->
                    val id = entry.arguments?.getString("id").orEmpty()
                    VirtualCardDetailsScreen(id, state, vm, { nav.popBackStack() }, { nav.navigate("profile/$id") }) { nav.navigate("profile-publish/$id") }
                }
                composable("profile-publish/{id}",arguments=listOf(navArgument("id"){type=NavType.StringType})){entry->ProfileEditorSectionScreen(profileState,entry.arguments?.getString("id").orEmpty(),ProfileEditorSection.VISIBILITY,nav::popBackStack,profiles::onEvent)}
                composable("profile/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry ->
                    ProfileViewScreen(profileState,entry.arguments?.getString("id").orEmpty(),nav::popBackStack,profiles::onEvent)
                }
                composable("profile/public-preview/{id}",arguments=listOf(navArgument("id"){type=NavType.StringType})){entry->
                    val id=entry.arguments?.getString("id").orEmpty()
                    val slug=profileState.content?.takeIf{it.summary.id==id}?.slug
                    if(slug.isNullOrBlank())nav.popBackStack() else PublicProfilePreviewDialog("https://pop.popwam.com/$slug",nav::popBackStack)
                }
                composable("public-preview/{slug}",arguments=listOf(navArgument("slug"){type=NavType.StringType})){entry->PublicProfilePreviewDialog("https://pop.popwam.com/${entry.arguments?.getString("slug").orEmpty()}",nav::popBackStack)}
                composable("profile/{id}/edit",arguments=listOf(navArgument("id"){type=NavType.StringType})){entry->ProfileEditorHubScreen(profileState,entry.arguments?.getString("id").orEmpty(),nav::popBackStack,profiles::onEvent)}
                composable("profile/{id}/edit/{section}",arguments=listOf(navArgument("id"){type=NavType.StringType},navArgument("section"){type=NavType.StringType})){entry->val section=runCatching{ProfileEditorSection.valueOf(entry.arguments?.getString("section").orEmpty())}.getOrDefault(ProfileEditorSection.BASIC_INFORMATION);ProfileEditorSectionScreen(profileState,entry.arguments?.getString("id").orEmpty(),section,nav::popBackStack,profiles::onEvent)}
                composable("card/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry ->
                    val id = entry.arguments?.getString("id").orEmpty(); LaunchedEffect(id) { vm.card(id) }
                    var confirmLost by remember{mutableStateOf(false)}
                    var verifyLost by remember{mutableStateOf(false)}
                    Box(Modifier.fillMaxSize()){
                        LegacyPhysicalCardDetails(state.selectedCard, state.destinations, { status, destination -> vm.updateCard(id, status, destination) }, nav::popBackStack)
                        if(state.selectedCard?.cardStatus in setOf("ACTIVE","PAUSED"))ExtendedFloatingActionButton({confirmLost=true},Modifier.align(Alignment.BottomEnd).padding(20.dp),containerColor=MaterialTheme.colorScheme.error){Icon(Icons.Default.ReportProblem,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.settings_report_lost))}
                    }
                    if(confirmLost)AlertDialog(onDismissRequest={confirmLost=false},title={Text(stringResource(R.string.settings_report_lost_confirm))},confirmButton={TextButton({confirmLost=false;verifyLost=true}){Text(stringResource(R.string.continue_label))}},dismissButton={TextButton({confirmLost=false}){Text(stringResource(R.string.cancel))}})
                    if(verifyLost)StepUpSheet(vm,"PRODUCT_LOST",{verifyLost=false}){grant->vm.reportProductLost(id,grant);verifyLost=false}
                }
                composable("activate") { ActivationScannerScreen(state, vm) }
                // NFC services remain contextual for activation, device-card selection and authorized programming; there is no public NFC Tools route.
                composable("programming") { LaunchedEffect(Unit) { vm.loadProgramming() }; LegacyProgrammingList(state.programmingCards) { nav.navigate("program/$it") } }
                composable("program/{id}") { entry -> state.programmingCards.firstOrNull { it.id == entry.arguments?.getString("id") }?.let { LegacyProgramming(it, state, vm) } }
                composable("hce") { ProductionShareCenterScreen(shareState,share,activeShareProfile,{nav.navigate("share-activate")},{nav.navigate(it)},ShareInitialPanel.HCE,nav::popBackStack) }
                composable("settings") { SecuritySettingsScreen("root",state,vm,appearanceStore,onThemeModeSelected,onPaletteSelected,{if(it.startsWith("friends")||it.startsWith("legal/")||it=="nearby"||it=="profiles")nav.navigate(it) else nav.navigate("settings/$it")},nav::popBackStack,onLogout,{howItWorks=true}) }
                composable("settings/{section}",arguments=listOf(navArgument("section"){type=NavType.StringType})){entry->SecuritySettingsScreen(entry.arguments?.getString("section") ?: "root",state,vm,appearanceStore,onThemeModeSelected,onPaletteSelected,{if(it.startsWith("friends")||it.startsWith("legal/")||it=="nearby"||it=="profiles")nav.navigate(it) else nav.navigate("settings/$it")},nav::popBackStack,onLogout,{howItWorks=true})}
                composable("integrations") { SecurePortal(R.string.connected_accounts,"dashboard/integrations",R.string.connected_accounts_help) }
                composable("passkeys") { SecuritySettingsScreen("passkeys",state,vm,appearanceStore,onThemeModeSelected,onPaletteSelected,{nav.navigate("settings/$it")},nav::popBackStack,onLogout,{howItWorks=true}) }
                composable("legal/terms"){NativeLegalScreen(PreAuthLegalKind.TERMS,onBack=nav::popBackStack)}
                composable("legal/privacy"){NativeLegalScreen(PreAuthLegalKind.PRIVACY,onBack=nav::popBackStack)}
            }
        }
    }
    }
    HowItWorksSheet(howItWorks,{howItWorks=false}){howItWorks=false;nav.navigate("profiles/create")}
}

@Composable private fun PublicProfilePreviewDialog(url:String,dismiss:()->Unit){
    Dialog(onDismissRequest=dismiss,properties=DialogProperties(usePlatformDefaultWidth=false)){
        Surface(Modifier.fillMaxWidth(.94f).fillMaxHeight(.9f),shape=RoundedCornerShape(22.dp),color=MaterialTheme.colorScheme.surface){
            Column(Modifier.fillMaxSize()){
                Row(Modifier.fillMaxWidth().padding(horizontal=12.dp,vertical=8.dp),verticalAlignment=Alignment.CenterVertically){Text(stringResource(R.string.profile_preview),Modifier.weight(1f),style=MaterialTheme.typography.titleMedium);TextButton(dismiss){Text(stringResource(R.string.profile_preview_close))}}
                var loading by remember(url){mutableStateOf(true)}
                Box(Modifier.fillMaxSize()){
                    AndroidView(factory={context->WebView(context).apply{
                        settings.javaScriptEnabled=false;settings.domStorageEnabled=false;settings.allowFileAccess=false;settings.allowContentAccess=false;settings.mixedContentMode=android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
                        webViewClient=object:WebViewClient(){override fun shouldOverrideUrlLoading(view:WebView,request:WebResourceRequest):Boolean{return request.url.scheme!="https"||request.url.host!="pop.popwam.com"};override fun onPageFinished(view:WebView?,loadedUrl:String?){loading=false}}
                        loadUrl(url)
                    }},update={if(it.url!=url)it.loadUrl(url)},modifier=Modifier.fillMaxSize())
                    if(loading)CircularProgressIndicator(Modifier.align(Alignment.Center))
                }
            }
        }
    }
}

@Composable
private fun PopPrimaryNavigationBar(selected: HomePrimaryTab, navigate: (String) -> Unit) {
    Box(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 36.dp, vertical = 8.dp), contentAlignment = Alignment.Center) {
        Surface(
            modifier = Modifier.fillMaxWidth().widthIn(max = 320.dp).heightIn(min = 62.dp),
            shape = RoundedCornerShape(26.dp),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 8.dp,
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .45f)),
        ) {
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 5.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    listOf(
                        Triple(HomePrimaryTab.HOME, "home", Pair(R.string.home, R.drawable.pop_approved_nav_home)),
                        Triple(HomePrimaryTab.PROFILE, "my-profile", Pair(R.string.my_profile, R.drawable.pop_logo_official)),
                        Triple(HomePrimaryTab.MENU, "menu", Pair(R.string.nav_menu, R.drawable.pop_approved_nav_menu)),
                    ).forEach { (tab, route, item) ->
                        val selectedColor = if (selected == tab) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        Column(
                            Modifier.widthIn(min = 84.dp).heightIn(min = 52.dp).clip(RoundedCornerShape(18.dp)).clickable { navigate(route) },
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            PopApprovedAsset(
                                item.second,
                                stringResource(item.first),
                                Modifier.size(if (tab == HomePrimaryTab.PROFILE) 47.dp else 32.dp),
                                if (tab == HomePrimaryTab.PROFILE) null else selectedColor,
                            )
                            Spacer(Modifier.size(3.dp).background(if (selected == tab) MaterialTheme.colorScheme.primary else Color.Transparent, CircleShape))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PopBottomNavigationReviewScreen(selected:HomePrimaryTab=HomePrimaryTab.HOME,content:@Composable ()->Unit){
    Scaffold(containerColor=MaterialTheme.colorScheme.background,bottomBar={PopPrimaryNavigationBar(selected){}}){padding->Box(Modifier.fillMaxSize().padding(padding)){content()}}
}

@Composable
private fun FutureHomeDestination(message: String, back: () -> Unit) {
    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(28.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Icon(Icons.Default.PersonAdd, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.primary)
            Text(message, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedButton(back) { Text(stringResource(R.string.back)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RefreshScreen(loading: Boolean, refresh: () -> Unit, content: @Composable () -> Unit) {
    PullToRefreshBox(isRefreshing = loading, onRefresh = refresh, modifier = Modifier.fillMaxSize()) { content() }
}

@Composable
private fun ActivationScannerScreen(state: MainUiState, vm: MainViewModel) {
    var code by rememberSaveable { mutableStateOf("") }
    var submitted by rememberSaveable { mutableStateOf(false) }
    var selectedProfile by rememberSaveable { mutableStateOf("") }
    val context = LocalContext.current
    val valid = code.trim().let { it.length in 6..512 && (it.startsWith("POP-", true) || it.startsWith("https://", true) || it.all { char -> char.isLetterOrDigit() || char in "-_" }) }
    LazyColumn(Modifier.fillMaxSize().imePadding(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text(stringResource(R.string.activate_product), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold) }
        if (state.activation?.ok != true) {
            item { QrScanner { code = it; submitted = true; vm.inspectActivation(it) } }
            item { Text(stringResource(R.string.activation_or_code), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
            item {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                    OutlinedTextField(code, { code = it.trim().take(512); submitted = false }, Modifier.fillMaxWidth(), singleLine = true, label = { Text(stringResource(R.string.activation_code)) }, placeholder = { Text(stringResource(R.string.activation_code_hint)) }, isError = submitted && !valid, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Ascii))
                }
            }
            if (submitted && !valid) item { Text(stringResource(R.string.activation_code_invalid), color = MaterialTheme.colorScheme.error) }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton({ val clip=(context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).primaryClip?.getItemAt(0)?.coerceToText(context)?.toString().orEmpty();code=clip.take(512);submitted=false }, Modifier.weight(1f)) { Text(stringResource(R.string.paste_code)) }
                    Button({ submitted = true; if(valid) vm.inspectActivation(code.trim()) }, Modifier.weight(1f), enabled = !state.loading) { if(state.loading) CircularProgressIndicator(Modifier.size(20.dp),strokeWidth=2.dp) else Text(stringResource(R.string.validate_qr)) }
                }
            }
        } else {
            state.activation.card?.let { card -> item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) { FigmaLtrText(card.serialNumber, MaterialTheme.typography.titleMedium); Text(card.cardType); FigmaLtrText(card.permanentUrl, MaterialTheme.typography.bodySmall) } } } }
            item { Text(stringResource(R.string.select_profile), style = MaterialTheme.typography.titleMedium) }
            items(state.profiles, key = { it.id }) { profile -> Row(Modifier.fillMaxWidth().clickable { selectedProfile=profile.id }.padding(8.dp), verticalAlignment = Alignment.CenterVertically) { RadioButton(selectedProfile==profile.id,{selectedProfile=profile.id});Text(profile.displayName) } }
            item { Button({ vm.claim(selectedProfile.ifBlank { state.profiles.firstOrNull()?.id.orEmpty() }) },Modifier.fillMaxWidth(),enabled=state.profiles.isNotEmpty()&&!state.loading){Text(stringResource(R.string.claim_card))} }
        }
    }
}

@Composable private fun FigmaStat(value: String, label: String, modifier: Modifier) { Surface(modifier, shape = RoundedCornerShape(20.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) { Column(Modifier.padding(vertical = 16.dp, horizontal = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text(label, style = MaterialTheme.typography.labelSmall, color = Color(0xFF6E6E6E), maxLines = 1) } } }
@Composable private fun ActionTile(label: Int, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier, click: () -> Unit) { Surface(modifier.clickable(onClick = click), shape = RoundedCornerShape(20.dp), color = Color(0xFFFCFCFC), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) { Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { Icon(icon, null, tint = Color(0xFF6D3DD7)); Text(stringResource(label), fontWeight = FontWeight.Medium) } } }

@Composable
private fun PhysicalCards(state: MainUiState, refresh: () -> Unit, open: (String) -> Unit) = RefreshScreen(state.loading, refresh) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(stringResource(R.string.my_cards), style = MaterialTheme.typography.headlineMedium) }
        if (state.cards.isEmpty()) item { EmptyCard(R.string.cards_empty, Icons.Default.CreditCard) }
        items(state.cards, key = { it.id }) { card -> Surface(Modifier.fillMaxWidth().clickable { open(card.id) }, shape = RoundedCornerShape(22.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) { Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(48.dp).background(Color(0xFFFFF6D5), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.Contactless, null, tint = Color(0xFFD4AF37)) }; Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(card.displayLabel ?: stringResource(R.string.my_products),fontWeight=FontWeight.Bold);FigmaLtrText(card.serialNumber, MaterialTheme.typography.bodySmall); Text("${card.cardType} · ${card.cardStatus}", color = Color(0xFF6E6E6E), style = MaterialTheme.typography.bodySmall) }; Icon(Icons.Default.ChevronRight, null) } } }
    }
}

@Composable
private fun VirtualProfiles(state: MainUiState, refresh: () -> Unit, open: (String) -> Unit, create: () -> Unit) = RefreshScreen(state.loading, refresh) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Text(stringResource(R.string.profiles), Modifier.weight(1f), style = MaterialTheme.typography.headlineMedium); FilledIconButton(create, colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color(0xFF6D3DD7))) { Icon(Icons.Default.Add, stringResource(R.string.vc_create), tint = Color.White) } } }
        val profiles = state.profiles.filter { it.virtualCard != null }
        if (profiles.isEmpty()) item { EmptyCard(R.string.profiles_empty, Icons.Default.Person) }
        items(profiles, key = { it.id }) { VirtualProfileRow(it) { open(it.id) } }
    }
}

@Composable
private fun VirtualProfileRow(profile: com.popwam.pop.data.api.ProfileDto, click: () -> Unit) {
    Surface(Modifier.fillMaxWidth().clickable(onClick = click), shape = RoundedCornerShape(22.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            val image = if (profile.type == "ORGANIZATION") profile.logoUrl ?: profile.avatarUrl else profile.avatarUrl
            if (!image.isNullOrBlank()) AsyncImage(image, null, Modifier.size(58.dp).clip(CircleShape), contentScale = ContentScale.Crop) else Box(Modifier.size(58.dp).background(Color(0xFFF1EAFF), CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Default.Person, null, tint = Color(0xFF6D3DD7)) }
            Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(profile.virtualCard?.name ?: profile.displayName, fontWeight = FontWeight.Bold); Text(profile.virtualCard?.template?.let { if (currentLocale() == "ar") it.nameAr else it.nameEn } ?: stringResource(R.string.p7_default_template), style = MaterialTheme.typography.bodySmall, color = Color(0xFF6E6E6E)) }; Icon(Icons.Default.ChevronRight, null)
        }
    }
}

@Composable
private fun AllLinks(state: MainUiState, refresh: () -> Unit, openProfile: (String) -> Unit) = RefreshScreen(state.loading, refresh) {
    val links = state.profiles.flatMap { profile -> profile.destinations.filter { it.type !in setOf("PROFILE", "VCF") }.map { profile to it } }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Text(stringResource(R.string.all_links), style = MaterialTheme.typography.headlineMedium) }
        if (links.isEmpty()) item { EmptyCard(R.string.links_empty, Icons.Default.Link) }
        items(links, key = { it.second.id }) { (profile, link) -> Surface(Modifier.fillMaxWidth().clickable { openProfile(profile.id) }, shape = RoundedCornerShape(18.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) { Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Public, null, tint = Color(0xFF6D3DD7)); Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) { Text(link.titleAr ?: link.titleEn ?: link.title, fontWeight = FontWeight.Medium); FigmaLtrText(link.url, MaterialTheme.typography.bodySmall) }; Icon(Icons.Default.DragIndicator, null, tint = Color(0xFFB0B0B0)) } } }
    }
}

@Composable
private fun ActivityFeed(state: MainUiState, refresh: () -> Unit) = RefreshScreen(state.loading, refresh) {
    val active = state.cards.filter { it.openCount > 0 }.sortedByDescending { it.lastOpenedAt }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(stringResource(R.string.nav_activity), style = MaterialTheme.typography.headlineMedium) }
        item { Surface(Modifier.fillMaxWidth(), color = Color(0xFFFCFCFC), shape = RoundedCornerShape(22.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) { Column(Modifier.padding(20.dp)) { Text(stringResource(R.string.opens_this_account), color = Color(0xFF6E6E6E)); Text(state.cards.sumOf { it.openCount }.toString(), style = MaterialTheme.typography.displaySmall, color = Color(0xFF6D3DD7), fontWeight = FontWeight.Bold) } } }
        if (active.isEmpty()) item { EmptyCard(R.string.activity_empty, Icons.Default.ShowChart) }
        items(active, key = { it.id }) { card -> Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) { Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Visibility, null, tint = Color(0xFF6D3DD7)); Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) { FigmaLtrText(card.serialNumber); Text(card.lastOpenedAt ?: stringResource(R.string.never), color = Color(0xFF6E6E6E), style = MaterialTheme.typography.bodySmall) }; Text(card.openCount.toString(), fontWeight = FontWeight.Bold) } } }
    }
}

@Composable private fun SecurePortal(title:Int,path:String,help:Int){val context=LocalContext.current;Box(Modifier.fillMaxSize().padding(20.dp),contentAlignment=Alignment.Center){Surface(Modifier.fillMaxWidth(),shape=RoundedCornerShape(22.dp),border=androidx.compose.foundation.BorderStroke(1.dp,Color(0xFFEDEDED))){Column(Modifier.padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(16.dp)){Icon(Icons.Default.Security,null,tint=Color(0xFFD4AF37));Text(stringResource(title),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold);Text(stringResource(help),color=Color(0xFF6E6E6E));Button({openWeb(context,path)},Modifier.fillMaxWidth()){Icon(Icons.Default.OpenInBrowser,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.open_secure_portal))}}}}}

@Composable private fun EmptyCard(text: Int, icon: androidx.compose.ui.graphics.vector.ImageVector) { Surface(Modifier.fillMaxWidth(), color = Color(0xFFFCFCFC), shape = RoundedCornerShape(22.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) { Column(Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) { Icon(icon, null, Modifier.size(38.dp), tint = Color(0xFFB0B0B0)); Text(stringResource(text), color = Color(0xFF6E6E6E), textAlign = androidx.compose.ui.text.style.TextAlign.Center) } } }

@Composable fun FigmaLtrText(value: String, style: TextStyle = MaterialTheme.typography.bodyMedium) { CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) { Text(value, style = style) } }
