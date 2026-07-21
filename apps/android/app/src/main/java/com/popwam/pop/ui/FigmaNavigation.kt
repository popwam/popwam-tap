package com.popwam.pop.ui

import android.content.ClipboardManager
import android.content.Context
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalContext
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FigmaMainNavigation(vm: MainViewModel, initialRoute: String = "home", onLogout: () -> Unit) {
    val nav = rememberNavController()
    val state by vm.state.collectAsStateWithLifecycle()
    val current by nav.currentBackStackEntryAsState()
    val topRoutes = PopNavigationPolicy.bottomRoutes
    val currentRoute = current?.destination?.route
    val snackbar = remember { SnackbarHostState() }
    var howItWorks by rememberSaveable { mutableStateOf(false) }
    val darkBackground = currentRoute == "home" || currentRoute?.startsWith("virtual-card/") == true
    PopSystemBars(darkBackground)
    LaunchedEffect(state.error, state.message) {
        val message = state.error ?: state.message
        if (!message.isNullOrBlank()) { snackbar.showSnackbar(message); vm.clearFeedback() }
    }
    PopDynamicBackground(when { currentRoute?.startsWith("virtual-card/")==true -> PopBackdrop.DETAILS; currentRoute=="home" -> PopBackdrop.HOME; else -> PopBackdrop.NEUTRAL }) {
    Scaffold(
        containerColor = Color.Transparent,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            if (currentRoute in topRoutes) TopAppBar(
                title = { val firstName=state.profiles.firstOrNull()?.firstName?.takeIf(String::isNotBlank);Text(firstName ?: stringResource(R.string.app_name), fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = if(darkBackground) Color.White else Color.Black),
                actions = {
                    state.uploadProgress?.let { CircularProgressIndicator(progress={it/100f},Modifier.size(24.dp),strokeWidth=2.dp) }
                    TextButton(::toggleLanguage) { Text(stringResource(R.string.change_language),fontWeight=FontWeight.Bold,color=if(darkBackground) Color(0xFFD4AF37) else MaterialTheme.colorScheme.primary) }
                },
            )
        },
        bottomBar = {
            if (currentRoute in topRoutes) NavigationBar(containerColor = Color.White, tonalElevation = 3.dp) {
                listOf(
                    Triple("home", R.string.home, Icons.Default.Home),
                    Triple("virtual-cards", R.string.nav_cards, Icons.Default.ContactPage),
                    Triple("activate", R.string.nav_scan, Icons.Default.QrCodeScanner),
                    Triple("products", R.string.nav_products, Icons.Default.Inventory2),
                    Triple("menu", R.string.nav_menu, Icons.Default.Menu),
                ).forEach { (route, label, icon) ->
                    NavigationBarItem(
                        selected = currentRoute == route,
                        onClick = { nav.navigate(route) { popUpTo("home"); launchSingleTop = true } },
                        icon = { Icon(icon, stringResource(label)) },
                        label = { Text(stringResource(label), maxLines = 1) },
                        colors = NavigationBarItemDefaults.colors(indicatorColor = Color(0xFFFFF1B8), selectedIconColor = Color(0xFF9A7412)),
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            NavHost(nav, if (initialRoute == "home" || initialRoute.startsWith("card/")) initialRoute else "home") {
                composable("home") { FigmaHome(state, vm::reload, { howItWorks=true }) { nav.navigate(it) } }
                composable("virtual-cards") { VirtualProfiles(state, vm::reload, { nav.navigate("virtual-card/$it") }, { nav.navigate("create-card/start") }) }
                composable("products") { PhysicalCards(state, vm::reload) { nav.navigate("card/$it") } }
                composable("activity") { ActivityFeed(state, vm::reload) }
                composable("menu") { PopMenu(onLogout,{nav.navigate(it)},{howItWorks=true}) }
                composable("create-card/{step}", arguments = listOf(navArgument("step") { type = NavType.StringType })) { entry ->
                    VirtualCardWizardScreen(
                        step = entry.arguments?.getString("step") ?: "start", state = state, vm = vm,
                        onBack = { nav.popBackStack() }, navigate = { nav.navigate(it) },
                        onCreated = { profileId -> nav.navigate("virtual-card/$profileId") { popUpTo("create-card/start") { inclusive = true } } },
                    )
                }
                composable("virtual-card/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry ->
                    val id = entry.arguments?.getString("id").orEmpty()
                    VirtualCardDetailsScreen(id, state, vm, { nav.popBackStack() }) { nav.navigate("profile/$id") }
                }
                composable("profile/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry ->
                    LegacyProfileEditor(state.profiles.firstOrNull { it.id == entry.arguments?.getString("id") }, vm, nav::popBackStack)
                }
                composable("card/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { entry ->
                    val id = entry.arguments?.getString("id").orEmpty(); LaunchedEffect(id) { vm.card(id) }
                    LegacyPhysicalCardDetails(state.selectedCard, state.destinations, { status, destination -> vm.updateCard(id, status, destination) }, nav::popBackStack)
                }
                composable("activate") { ActivationScannerScreen(state, vm) }
                // NFC services remain contextual for activation, device-card selection and authorized programming; there is no public NFC Tools route.
                composable("programming") { LaunchedEffect(Unit) { vm.loadProgramming() }; LegacyProgrammingList(state.programmingCards) { nav.navigate("program/$it") } }
                composable("program/{id}") { entry -> state.programmingCards.firstOrNull { it.id == entry.arguments?.getString("id") }?.let { LegacyProgramming(it, state, vm) } }
                composable("hce") { LegacyHce(state.cards) }
                composable("settings") { LegacySettings(onLogout) }
                composable("integrations") { SecurePortal(R.string.connected_accounts,"dashboard/integrations",R.string.connected_accounts_help) }
                composable("passkeys") { SecurePortal(R.string.passkeys,"dashboard/security/passkeys",R.string.passkeys_help) }
            }
        }
    }
    }
    HowItWorksSheet(howItWorks,{howItWorks=false}){howItWorks=false;nav.navigate("create-card/start")}
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RefreshScreen(loading: Boolean, refresh: () -> Unit, content: @Composable () -> Unit) {
    PullToRefreshBox(isRefreshing = loading, onRefresh = refresh, modifier = Modifier.fillMaxSize()) { content() }
}

@Composable
private fun FigmaHome(state: MainUiState, refresh: () -> Unit, howItWorks:()->Unit, go: (String) -> Unit) {
    RefreshScreen(state.loading, refresh) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item { Text(stringResource(R.string.welcome_back), color = Color(0xFFD8D0B7)); Text(state.profiles.firstOrNull()?.firstName?.takeIf(String::isNotBlank) ?: stringResource(R.string.app_name), color=Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Medium) }
            item { Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){ActionTile(R.string.vc_create,Icons.Default.ContactPage,Modifier.weight(1f)){go("create-card/start")};ActionTile(R.string.activate_product,Icons.Default.AddCircle,Modifier.weight(1f)){go("activate")};ActionTile(R.string.scan_qr,Icons.Default.QrCodeScanner,Modifier.weight(1f)){go("activate")}} }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FigmaStat(state.profiles.count { it.virtualCard != null }.toString(), stringResource(R.string.profiles), Modifier.weight(1f))
                    FigmaStat(state.cards.count { it.cardStatus == "ACTIVE" }.toString(), stringResource(R.string.active_cards), Modifier.weight(1f))
                    FigmaStat(state.cards.sumOf { it.openCount }.toString(), stringResource(R.string.total_opens), Modifier.weight(1f))
                }
            }
            item { Text(stringResource(R.string.recent_cards), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
            if (state.profiles.none { it.virtualCard != null }) item { EmptyCard(R.string.profiles_empty, Icons.Default.ContactPage) }
            items(state.profiles.filter { it.virtualCard != null }.take(4), key = { it.id }) { profile -> VirtualProfileRow(profile) { go("virtual-card/${profile.id}") } }
            item { Text(stringResource(R.string.my_products),color=Color.White,style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold) }
            if(state.cards.isEmpty()) item { EmptyCard(R.string.cards_empty,Icons.Default.Inventory2) }
            items(state.cards.take(3),key={"home-${it.id}"}){card->Surface(Modifier.fillMaxWidth().clickable{go("card/${card.id}")},shape=RoundedCornerShape(18.dp)){Row(Modifier.padding(14.dp),verticalAlignment=Alignment.CenterVertically){Icon(Icons.Default.Contactless,null,tint=Color(0xFFD4AF37));Spacer(Modifier.width(10.dp));Column(Modifier.weight(1f)){Text(card.displayLabel?:stringResource(R.string.my_products),fontWeight=FontWeight.Bold);FigmaLtrText(card.serialNumber,MaterialTheme.typography.bodySmall)};Icon(Icons.Default.ChevronRight,null)}}}
            item { Text(stringResource(R.string.latest_activity),color=Color.White,style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold);TextButton({go("activity")}){Text(stringResource(R.string.view_activity))} }
            item { OutlinedButton(howItWorks,Modifier.fillMaxWidth()){Icon(Icons.Default.HelpOutline,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.how_it_works))} }
        }
    }
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
            Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(profile.virtualCard?.name ?: profile.displayName, fontWeight = FontWeight.Bold); Text(profile.virtualCard?.template?.let { if (currentLocale() == "ar") it.nameAr else it.nameEn } ?: profile.virtualCard?.type.orEmpty(), style = MaterialTheme.typography.bodySmall, color = Color(0xFF6E6E6E)) }; Icon(Icons.Default.ChevronRight, null)
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

@Composable
private fun PopMenu(onLogout:()->Unit,navigate:(String)->Unit,howItWorks:()->Unit){
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
        item{Text(stringResource(R.string.nav_menu),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Bold)}
        item{MenuRow(Icons.Default.AccountCircle,stringResource(R.string.settings)){navigate("settings")}}
        item{MenuRow(Icons.Default.Link,stringResource(R.string.connected_accounts)){navigate("integrations")}}
        item{MenuRow(Icons.Default.Key,stringResource(R.string.passkeys)){navigate("passkeys")}}
        item{MenuRow(Icons.Default.People,stringResource(R.string.friends),null)}
        item{MenuRow(Icons.Default.PersonAdd,stringResource(R.string.nearby_users),null)}
        item{MenuRow(Icons.Default.Chat,stringResource(R.string.chats),null)}
        item{MenuRow(Icons.Default.PrivacyTip,stringResource(R.string.privacy),null)}
        item{MenuRow(Icons.Default.Security,stringResource(R.string.hce_experimental),null)}
        item{MenuRow(Icons.Default.Language,stringResource(R.string.language)){toggleLanguage()}}
        item{MenuRow(Icons.Default.HelpOutline,stringResource(R.string.how_it_works),howItWorks)}
        item{HorizontalDivider(Modifier.padding(vertical=8.dp))}
        item{Text(stringResource(R.string.about_app),fontWeight=FontWeight.Bold);Text(stringResource(R.string.app_version),color=Color(0xFF6E6E6E),style=MaterialTheme.typography.bodySmall)}
        item{OutlinedButton(onLogout,Modifier.fillMaxWidth()){Icon(Icons.Default.Logout,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.logout))}}
    }
}

@Composable private fun SecurePortal(title:Int,path:String,help:Int){val context=LocalContext.current;Box(Modifier.fillMaxSize().padding(20.dp),contentAlignment=Alignment.Center){Surface(Modifier.fillMaxWidth(),shape=RoundedCornerShape(22.dp),border=androidx.compose.foundation.BorderStroke(1.dp,Color(0xFFEDEDED))){Column(Modifier.padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(16.dp)){Icon(Icons.Default.Security,null,tint=Color(0xFFD4AF37));Text(stringResource(title),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold);Text(stringResource(help),color=Color(0xFF6E6E6E));Button({openWeb(context,path)},Modifier.fillMaxWidth()){Icon(Icons.Default.OpenInBrowser,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.open_secure_portal))}}}}}

@Composable private fun MenuRow(icon:androidx.compose.ui.graphics.vector.ImageVector,label:String,click:(()->Unit)?){val modifier=if(click!=null)Modifier.fillMaxWidth().clickable(onClick=click) else Modifier.fillMaxWidth();Row(modifier.padding(vertical=13.dp),verticalAlignment=Alignment.CenterVertically){Icon(icon,null,tint=Color(0xFFD4AF37));Spacer(Modifier.width(14.dp));Text(label,Modifier.weight(1f));if(click!=null)Icon(Icons.Default.ChevronRight,null,tint=Color(0xFF999999))}}

@Composable private fun EmptyCard(text: Int, icon: androidx.compose.ui.graphics.vector.ImageVector) { Surface(Modifier.fillMaxWidth(), color = Color(0xFFFCFCFC), shape = RoundedCornerShape(22.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDEDED))) { Column(Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) { Icon(icon, null, Modifier.size(38.dp), tint = Color(0xFFB0B0B0)); Text(stringResource(text), color = Color(0xFF6E6E6E), textAlign = androidx.compose.ui.text.style.TextAlign.Center) } } }

@Composable fun FigmaLtrText(value: String, style: TextStyle = MaterialTheme.typography.bodyMedium) { CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) { Text(value, style = style) } }
