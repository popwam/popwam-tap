@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.popwam.tap.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.nfc.NfcAdapter
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.os.LocaleListCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.popwam.tap.BuildConfig
import com.popwam.tap.R
import com.popwam.tap.data.api.*
import com.popwam.tap.hce.HceConfig
import com.popwam.tap.nfc.NfcCoordinator
import java.io.File
import java.util.Locale
import kotlinx.coroutines.delay

private enum class EntryScreen { SPLASH, WELCOME, SCAN, LOGIN }

@Composable fun PopwamApp(auth:AuthViewModel,main:MainViewModel,initialRoute:String="home"){
    val authState by auth.state.collectAsStateWithLifecycle()
    var entry by rememberSaveable { mutableStateOf(EntryScreen.SPLASH.name) }
    var pendingRoute by rememberSaveable { mutableStateOf(initialRoute) }
    var pendingActivation by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(Unit) { delay(650); if(entry==EntryScreen.SPLASH.name) entry=EntryScreen.WELCOME.name }
    if(!authState.authenticated){
        when(EntryScreen.valueOf(entry)){
            EntryScreen.SPLASH -> SplashScreen()
            EntryScreen.WELCOME -> WelcomeScreen(
                activate={entry=EntryScreen.SCAN.name},
                scan={entry=EntryScreen.SCAN.name},
                login={pendingRoute="home";entry=EntryScreen.LOGIN.name},
            )
            EntryScreen.SCAN -> PreAuthScanScreen(back={entry=EntryScreen.WELCOME.name}){value->pendingActivation=value;pendingRoute="activate";entry=EntryScreen.LOGIN.name}
            EntryScreen.LOGIN -> LoginScreen(authState,{phone->auth.send(phone,currentLocale())},auth::verify){entry=EntryScreen.WELCOME.name}
        }
        return
    }
    LaunchedEffect(authState.authenticated){main.reload();if(pendingActivation.isNotBlank()){main.inspectActivation(pendingActivation);pendingActivation=""}}
    MainNavigation(main,initialRoute=pendingRoute,onLogout={entry=EntryScreen.WELCOME.name;auth.logout()})
}

private fun currentLocale():String{val selected=AppCompatDelegate.getApplicationLocales().toLanguageTags();return if((selected.ifBlank{Locale.getDefault().language}).startsWith("ar"))"ar" else "en"}

@Composable private fun SplashScreen(){Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){Column(horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(14.dp)){Text("POPWAM",style=MaterialTheme.typography.displaySmall,fontWeight=FontWeight.Black,color=MaterialTheme.colorScheme.primary);CircularProgressIndicator(Modifier.size(28.dp),strokeWidth=2.dp)}}}

@Composable private fun WelcomeScreen(activate:()->Unit,scan:()->Unit,login:()->Unit){
    val context=LocalContext.current;val online=rememberOnline();var details by rememberSaveable{mutableStateOf(false)}
    LazyColumn(Modifier.fillMaxSize().padding(horizontal=20.dp),contentPadding=PaddingValues(vertical=24.dp),verticalArrangement=Arrangement.spacedBy(18.dp)){
        item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Text("POPWAM Tap",style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black);OutlinedButton({toggleLanguage()}){Icon(Icons.Default.Language,null);Text(stringResource(R.string.change_language))}}}
        item{Column(verticalArrangement=Arrangement.spacedBy(10.dp)){Text(stringResource(R.string.smart_title),style=MaterialTheme.typography.displaySmall,fontWeight=FontWeight.Black);Text(stringResource(R.string.welcome_description),style=MaterialTheme.typography.bodyLarge,color=MaterialTheme.colorScheme.onSurfaceVariant)}}
        item{WelcomeCardVisual()}
        item{Button(activate,Modifier.fillMaxWidth().height(54.dp)){Icon(Icons.Default.Contactless,null);Text(stringResource(R.string.activate_card))}}
        item{OutlinedButton(scan,Modifier.fillMaxWidth().height(52.dp)){Icon(Icons.Default.QrCodeScanner,null);Text(stringResource(R.string.scan_qr))}}
        item{OutlinedButton(login,Modifier.fillMaxWidth().height(52.dp)){Icon(Icons.AutoMirrored.Filled.Login,null);Text(stringResource(R.string.sign_in))}}
        item{TextButton({details=!details},Modifier.fillMaxWidth()){Text(stringResource(R.string.how_it_works));Icon(if(details)Icons.Default.ExpandLess else Icons.Default.ExpandMore,null)}}
        if(details)item{Card{Text(stringResource(R.string.how_it_works_description),Modifier.padding(18.dp),style=MaterialTheme.typography.bodyMedium)}}
        item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(7.dp)){Icon(if(online)Icons.Default.CloudDone else Icons.Default.CloudOff,null,tint=if(online)MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error);Text(stringResource(if(online)R.string.online else R.string.offline),style=MaterialTheme.typography.labelLarge)};Row{TextButton({openWeb(context,"privacy")}){Text(stringResource(R.string.privacy))};TextButton({openWeb(context,"terms")}){Text(stringResource(R.string.terms))}}}}
    }
}

@Composable private fun WelcomeCardVisual(){Card(Modifier.fillMaxWidth().aspectRatio(1.65f)){Box(Modifier.fillMaxSize().padding(22.dp)){Column(Modifier.align(Alignment.TopStart)){Text("POPWAM",fontWeight=FontWeight.Black,color=MaterialTheme.colorScheme.primary);Text("NFC · QR",style=MaterialTheme.typography.labelMedium)};Icon(Icons.Default.Contactless,null,Modifier.align(Alignment.Center).size(72.dp),tint=MaterialTheme.colorScheme.primary);Box(Modifier.align(Alignment.BottomEnd).size(54.dp)){val bitmap=remember{createQrBitmap("https://go.popwam.com",180)};Image(bitmap.asImageBitmap(),stringResource(R.string.camera_preview),Modifier.fillMaxSize())}}}}

@Composable private fun PreAuthScanScreen(back:()->Unit,onScanned:(String)->Unit){var manual by rememberSaveable{mutableStateOf("")};LazyColumn(Modifier.fillMaxSize().padding(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){item{Row(verticalAlignment=Alignment.CenterVertically){IconButton(back){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.back))};Text(stringResource(R.string.scan_qr),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)}};item{QrScanner(onScanned)};item{LtrField(manual,{manual=it},R.string.manual_code,null,KeyboardType.Ascii,true)};item{Button({onScanned(manual)},Modifier.fillMaxWidth(),enabled=manual.isNotBlank()){Text(stringResource(R.string.validate_qr))}}}}

@Composable private fun rememberOnline():Boolean{val context=LocalContext.current;val manager=remember{context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager};var online by remember{mutableStateOf(manager.getNetworkCapabilities(manager.activeNetwork)?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)==true)};DisposableEffect(manager){val callback=object:ConnectivityManager.NetworkCallback(){override fun onAvailable(network:Network){online=true};override fun onLost(network:Network){online=manager.activeNetwork!=null}};manager.registerNetworkCallback(NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(),callback);onDispose{runCatching{manager.unregisterNetworkCallback(callback)}}};return online}
private fun toggleLanguage(){val next=if(currentLocale()=="ar")"en" else "ar";AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(next))}
private fun openWeb(context:Context,path:String){context.startActivity(Intent(Intent.ACTION_VIEW,Uri.parse("${BuildConfig.API_BASE_URL.trimEnd('/')}/$path")))}

@Composable private fun LoginScreen(state:AuthUiState,onSend:(String)->Unit,onVerify:(String)->Unit,back:()->Unit){var phone by remember{mutableStateOf("")};var code by remember{mutableStateOf("")};Box(Modifier.fillMaxSize().padding(24.dp),contentAlignment=Alignment.Center){Card(Modifier.fillMaxWidth()){Column(Modifier.padding(24.dp),verticalArrangement=Arrangement.spacedBy(16.dp)){Row(verticalAlignment=Alignment.CenterVertically){IconButton(back){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.back))};Text("POPWAM Tap",style=MaterialTheme.typography.headlineMedium,color=MaterialTheme.colorScheme.primary)};Text(stringResource(R.string.phone_help),style=MaterialTheme.typography.bodySmall);LtrField(phone,{phone=it},R.string.phone_number,R.string.phone_hint,KeyboardType.Phone,state.challengeId==null);if(state.challengeId==null)Button({onSend(phone)},Modifier.fillMaxWidth(),enabled=!state.loading&&phone.isNotBlank()){Text(stringResource(R.string.send_code))}else{state.maskedPhone?.let{LtrText(it)};state.developmentCode?.let{LtrText(it)};LtrField(code,{code=it.filter(Char::isDigit).take(6)},R.string.verification_code,null,KeyboardType.NumberPassword,true);Button({onVerify(code)},Modifier.fillMaxWidth(),enabled=!state.loading&&code.length==6){Text(stringResource(R.string.verify_continue))}};if(BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank())Text(stringResource(R.string.google_optional),style=MaterialTheme.typography.bodySmall);state.error?.let{ErrorText(it)};if(state.loading)LinearProgressIndicator(Modifier.fillMaxWidth())}}}}

@OptIn(ExperimentalMaterial3Api::class) @Composable private fun MainNavigation(vm:MainViewModel,initialRoute:String="home",onLogout:()->Unit){val nav=rememberNavController();val state by vm.state.collectAsStateWithLifecycle();val current by nav.currentBackStackEntryAsState();val topRoutes=setOf("home","profiles","products","friends","chats");Scaffold(topBar={TopAppBar(title={Text("POPWAM Tap",fontWeight=FontWeight.Black)},actions={if(state.loading)CircularProgressIndicator(Modifier.size(22.dp),strokeWidth=2.dp);IconButton({nav.navigate("notifications")}){Icon(Icons.Default.Notifications,stringResource(R.string.notifications))};IconButton({nav.navigate("settings")}){Icon(Icons.Default.Settings,stringResource(R.string.settings))};IconButton(vm::reload){Icon(Icons.Default.Refresh,stringResource(R.string.refresh))}})},bottomBar={if(current?.destination?.route in topRoutes)NavigationBar{listOf(Triple("home",R.string.home,Icons.Default.Home),Triple("profiles",R.string.my_profiles,Icons.Default.Person),Triple("products",R.string.my_products,Icons.Default.ShoppingBag),Triple("friends",R.string.friends,Icons.Default.People),Triple("chats",R.string.chats,Icons.Default.Chat)).forEach{(route,label,icon)->NavigationBarItem(selected=current?.destination?.route==route,onClick={nav.navigate(route){popUpTo("home");launchSingleTop=true}},icon={Icon(icon,stringResource(label))},label={Text(stringResource(label),maxLines=1)})}}}){padding->Box(Modifier.padding(padding)){NavHost(nav,initialRoute){composable("home"){HomeScreen(state,{nav.navigate(it)},onLogout)};composable("cards"){CardsScreen(state.cards){nav.navigate("card/$it")}};composable("card/{id}",arguments=listOf(navArgument("id"){type=NavType.StringType})){entry->val id=entry.arguments?.getString("id")!!;LaunchedEffect(id){vm.card(id)};CardDetailScreen(state.selectedCard,state.destinations,{status,dest->vm.updateCard(id,status,dest)},{nav.popBackStack()})};composable("profiles"){ProfilesScreen(state.profiles,{nav.navigate("profile/$it")},{nav.navigate("profile/new")})};composable("profile/{id}"){entry->ProfileEditor(state.profiles.firstOrNull{it.id==entry.arguments?.getString("id")},vm,nav::popBackStack)};composable("products"){PortalScreen(R.string.my_products,"dashboard/products",R.string.products_portal_help)};composable("friends"){PortalScreen(R.string.friends,"dashboard/friends",R.string.friends_portal_help)};composable("chats"){PortalScreen(R.string.chats,"dashboard/chats",R.string.chats_portal_help)};composable("notifications"){PortalScreen(R.string.notifications,"dashboard",R.string.notifications_portal_help)};composable("activate"){ActivationScreen(state,vm)};composable("nfc"){NfcToolsScreen(state,vm,{nav.navigate("programming")},{nav.navigate("hce")})};composable("programming"){LaunchedEffect(Unit){vm.loadProgramming()};ProgrammingList(state.programmingCards){nav.navigate("program/$it")}};composable("program/{id}"){entry->state.programmingCards.firstOrNull{it.id==entry.arguments?.getString("id")}?.let{ProgrammingScreen(it,state,vm)}};composable("hce"){HceScreen(state.cards)};composable("settings"){SettingsScreen(onLogout)}};Feedback(state,vm::clearFeedback)}}}

@Composable private fun PortalScreen(title:Int,path:String,description:Int){val context=LocalContext.current;Box(Modifier.fillMaxSize().padding(20.dp),contentAlignment=Alignment.Center){Card(Modifier.fillMaxWidth()){Column(Modifier.padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(16.dp)){Text(stringResource(title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black);Text(stringResource(description),style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onSurfaceVariant);Button({openWeb(context,path)},Modifier.fillMaxWidth()){Icon(Icons.Default.OpenInBrowser,null);Text(stringResource(R.string.open_secure_portal))}}}}}

@Composable private fun HomeScreen(state:MainUiState,go:(String)->Unit,onLogout:()->Unit){val context=LocalContext.current;val active=state.cards.count{it.cardStatus=="ACTIVE"};val opens=state.cards.sumOf{it.openCount};val recent=state.cards.mapNotNull{it.lastOpenedAt}.maxOrNull();val activeProfile=state.profiles.firstOrNull();val shareCard=state.cards.firstOrNull();LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){item{Text(stringResource(R.string.home),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)};item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){Text(stringResource(R.string.active_profile),style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.primary);Text(activeProfile?.displayName?:stringResource(R.string.no_active_profile),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold);Text(if(HceConfig.enabled(context))stringResource(R.string.hce_active) else stringResource(R.string.hce_inactive),style=MaterialTheme.typography.bodySmall);if(shareCard!=null)Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){OutlinedButton({share(context,shareCard.permanentUrl)},Modifier.weight(1f)){Icon(Icons.Default.Share,null);Text(stringResource(R.string.share))};OutlinedButton({go("card/${shareCard.id}")},Modifier.weight(1f)){Icon(Icons.Default.QrCode,null);Text(stringResource(R.string.share_qr))}}}}};item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)){DashboardStat(stringResource(R.string.my_cards),state.cards.size.toString(),Modifier.weight(1f));DashboardStat(stringResource(R.string.active_cards),active.toString(),Modifier.weight(1f));DashboardStat(stringResource(R.string.total_opens),opens.toString(),Modifier.weight(1f))}};item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){Text(stringResource(R.string.recent_activity),style=MaterialTheme.typography.labelLarge,color=MaterialTheme.colorScheme.primary);LtrText(recent?:stringResource(R.string.no_recent_activity),MaterialTheme.typography.bodyMedium)}}};item{Text(stringResource(R.string.quick_actions),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold)};items(listOf(Triple("activate",R.string.activate_card,Icons.Default.QrCodeScanner),Triple("cards",R.string.my_cards,Icons.Default.CreditCard),Triple("profiles",R.string.my_profiles,Icons.Default.Person),Triple("nfc",R.string.nfc_tools,Icons.Default.Nfc),Triple("hce",R.string.virtual_card,Icons.Default.Contactless))){(route,label,icon)->Card(Modifier.fillMaxWidth().clickable{go(route)}){Row(Modifier.padding(18.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(14.dp)){Icon(icon,null,tint=MaterialTheme.colorScheme.primary);Text(stringResource(label),style=MaterialTheme.typography.titleMedium)}}};item{OutlinedButton(onLogout,Modifier.fillMaxWidth()){Text(stringResource(R.string.logout))}}}}

@Composable private fun DashboardStat(label:String,value:String,modifier:Modifier=Modifier){Card(modifier){Column(Modifier.padding(horizontal=10.dp,vertical=16.dp),horizontalAlignment=Alignment.CenterHorizontally){Text(value,style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black);Text(label,style=MaterialTheme.typography.labelSmall,maxLines=1)}}}

@Composable private fun CardsScreen(cards:List<CardDto>,open:(String)->Unit){LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Text(stringResource(R.string.my_cards),style=MaterialTheme.typography.headlineMedium)};if(cards.isEmpty())item{Text(stringResource(R.string.cards_empty))};items(cards,key={it.id}){card->Card(Modifier.fillMaxWidth().clickable{open(card.id)}){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){LtrText(card.serialNumber,MaterialTheme.typography.titleMedium);Text("${card.cardType} · ${card.cardStatus}");LtrText(card.permanentUrl,MaterialTheme.typography.bodySmall);Text("${stringResource(R.string.total_opens)}: ${card.openCount}")}}}}}

@Composable private fun CardDetailScreen(card:CardDetailDto?,destinations:List<DestinationDto>,update:(String?,String?)->Unit,back:()->Unit){if(card==null){Loading();return};var menu by remember{mutableStateOf(false)};var showQr by remember{mutableStateOf(false)};val context=LocalContext.current;LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Row(verticalAlignment=Alignment.CenterVertically){IconButton(back){Icon(Icons.AutoMirrored.Filled.ArrowBack,null)};Text(stringResource(R.string.my_cards),style=MaterialTheme.typography.headlineSmall)}};item{InfoCard(card)};item{Text(stringResource(R.string.active_destination),style=MaterialTheme.typography.titleMedium);Box{OutlinedButton({menu=true},Modifier.fillMaxWidth()){Text(card.activeDestination?.title?:stringResource(R.string.select_profile))};DropdownMenu(menu,{menu=false}){destinations.forEach{destination->DropdownMenuItem(text={Text(destination.titleAr?:destination.titleEn?:destination.title)},onClick={menu=false;update(null,destination.id)})}}}};item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){OutlinedButton({copy(context,card.permanentUrl)},Modifier.weight(1f)){Icon(Icons.Default.ContentCopy,null);Text(stringResource(R.string.copy_url))};OutlinedButton({showQr=true},Modifier.weight(1f)){Icon(Icons.Default.QrCode,null);Text(stringResource(R.string.share_qr))}}};item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){Button({update(if(card.cardStatus=="PAUSED")"ACTIVE" else "PAUSED",null)},Modifier.weight(1f)){Text(stringResource(if(card.cardStatus=="PAUSED")R.string.restore else R.string.pause))};Button({update("LOST",null)},Modifier.weight(1f),colors=ButtonDefaults.buttonColors(containerColor=MaterialTheme.colorScheme.error)){Text(stringResource(R.string.mark_lost))}}};item{Text("${stringResource(R.string.total_opens)}: ${card.openCount}");Text("${stringResource(R.string.last_opened)}: ${card.lastOpenedAt?:stringResource(R.string.never)}")}};if(showQr)QrDialog(card.permanentUrl){showQr=false}}

@Composable private fun InfoCard(card:CardDetailDto){Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){LabelValue(R.string.serial,card.serialNumber,true);LabelValue(R.string.card_type,card.cardType);LabelValue(R.string.card_status,card.cardStatus);LabelValue(R.string.assignment_status,card.assignmentStatus);LabelValue(R.string.permanent_url,card.permanentUrl,true)}}}

@Composable private fun ProfilesScreen(profiles:List<ProfileDto>,open:(String)->Unit,create:()->Unit){LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Text(stringResource(R.string.profiles),style=MaterialTheme.typography.headlineMedium);FilledIconButton(create){Icon(Icons.Default.Add,stringResource(R.string.new_profile))}}};items(profiles,key={it.id}){profile->Card(Modifier.fillMaxWidth().clickable{open(profile.id)}){Column(Modifier.padding(16.dp)){Text(profile.displayName,style=MaterialTheme.typography.titleMedium);Text(if(profile.type=="ORGANIZATION")stringResource(R.string.organization) else stringResource(R.string.personal));Text(profile.theme,style=MaterialTheme.typography.bodySmall)}}}}}

@Composable private fun ProfileEditor(profile:ProfileDto?,vm:MainViewModel,back:()->Unit){val context=LocalContext.current;var type by remember(profile){mutableStateOf(profile?.type?:"PERSONAL")};var ar by remember(profile){mutableStateOf(profile?.displayNameAr?:profile?.organizationNameAr?:"")};var en by remember(profile){mutableStateOf(profile?.displayNameEn?:profile?.organizationNameEn?:"")};var bioAr by remember(profile){mutableStateOf(profile?.bioAr?:profile?.descriptionAr?:"")};var bioEn by remember(profile){mutableStateOf(profile?.bioEn?:profile?.descriptionEn?:"")};var phone by remember(profile){mutableStateOf(profile?.phone?:"")};var email by remember(profile){mutableStateOf(profile?.email?:"")};var website by remember(profile){mutableStateOf(profile?.website?:"")};var whatsapp by remember(profile){mutableStateOf(profile?.whatsappBusiness?:"")};var theme by remember(profile){mutableStateOf(profile?.theme?:"CLASSIC_DARK")};val avatar=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){it?.let{uri->profile?.id?.let{id->vm.upload(context,id,uri,if(type=="ORGANIZATION")"logo" else "avatar")}}};val cover=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){it?.let{uri->profile?.id?.let{id->vm.upload(context,id,uri,"cover")}}};val file=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){it?.let{uri->profile?.id?.let{id->vm.upload(context,id,uri,"file",true)}}};LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Row(verticalAlignment=Alignment.CenterVertically){IconButton(back){Icon(Icons.AutoMirrored.Filled.ArrowBack,null)};Text(stringResource(if(profile==null)R.string.new_profile else R.string.edit_profile),style=MaterialTheme.typography.headlineSmall)}};item{SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()){listOf("PERSONAL" to R.string.personal,"ORGANIZATION" to R.string.organization).forEachIndexed{i,(value,label)->SegmentedButton(selected=type==value,onClick={type=value},shape=SegmentedButtonDefaults.itemShape(i,2)){Text(stringResource(label))}}}};item{Field(ar,{ar=it},R.string.arabic_name)};item{Field(en,{en=it},R.string.english_name)};item{Field(bioAr,{bioAr=it},R.string.arabic_bio,true)};item{Field(bioEn,{bioEn=it},R.string.english_bio,true)};item{Field(phone,{phone=it},R.string.phone,false,KeyboardType.Phone)};item{Field(whatsapp,{whatsapp=it},R.string.whatsapp,false,KeyboardType.Phone)};item{Field(email,{email=it},R.string.email,false,KeyboardType.Email)};item{Field(website,{website=it},R.string.website)};item{ThemeChooser(theme){theme=it}};if(profile!=null)item{Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){OutlinedButton({avatar.launch("image/*")},Modifier.weight(1f)){Text(stringResource(R.string.image_logo))};OutlinedButton({cover.launch("image/*")},Modifier.weight(1f)){Text(stringResource(R.string.cover_image))}}};if(profile!=null)item{OutlinedButton({file.launch("*/*")},Modifier.fillMaxWidth()){Text(stringResource(R.string.links_files))}};profile?.uploads?.let{files->items(files,key={it.id}){item->LtrText(item.displayTitleAr?:item.displayTitleEn?:item.originalFilename)}};if(profile!=null)item{DestinationManager(profile,vm)};item{Text(stringResource(R.string.vcard_current),style=MaterialTheme.typography.bodySmall)};item{Button({vm.saveProfile(profile?.id,ProfileWriteRequest(type=type,displayNameAr=ar,displayNameEn=en,bioAr=if(type=="PERSONAL")bioAr else null,bioEn=if(type=="PERSONAL")bioEn else null,descriptionAr=if(type=="ORGANIZATION")bioAr else null,descriptionEn=if(type=="ORGANIZATION")bioEn else null,phone=phone,whatsapp=whatsapp,email=email,website=website,theme=theme))},Modifier.fillMaxWidth()){Text(stringResource(R.string.save))}}}}

@Composable private fun ActivationScreen(state:MainUiState,vm:MainViewModel){var manual by remember{mutableStateOf("")};var selectedProfile by remember{mutableStateOf("")};val activation=state.activation;LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.scan_qr),style=MaterialTheme.typography.headlineMedium)};if(activation?.ok!=true){item{QrScanner{vm.inspectActivation(it)}};item{Field(manual,{manual=it},R.string.activation_code)};item{Button({vm.inspectActivation(manual)},Modifier.fillMaxWidth()){Text(stringResource(R.string.validate_qr))}};item{Text(stringResource(R.string.activation_security),style=MaterialTheme.typography.bodySmall)}}else{activation.card?.let{card->item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){LtrText(card.serialNumber,MaterialTheme.typography.titleMedium);Text(card.cardType);LtrText(card.permanentUrl)}}}};item{Text(stringResource(R.string.select_profile),style=MaterialTheme.typography.titleMedium)};items(state.profiles,key={it.id}){profile->Row(Modifier.fillMaxWidth().clickable{selectedProfile=profile.id}.padding(8.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(selectedProfile==profile.id,{selectedProfile=profile.id});Text(profile.displayName)}};item{Button({vm.claim(selectedProfile.ifBlank{state.profiles.firstOrNull()?.id.orEmpty()})},Modifier.fillMaxWidth(),enabled=state.profiles.isNotEmpty()){Text(stringResource(R.string.claim_card))}}}}}

@Composable private fun NfcToolsScreen(state:MainUiState,vm:MainViewModel,program:()->Unit,hce:()->Unit){val context=LocalContext.current;val adapter=NfcAdapter.getDefaultAdapter(context);LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.nfc_tools),style=MaterialTheme.typography.headlineMedium)};item{Text(stringResource(R.string.scan_activation_separately),style=MaterialTheme.typography.bodySmall)};if(adapter==null)item{ErrorText("NFC_UNAVAILABLE")}else if(!adapter.isEnabled)item{Button({context.startActivity(Intent(Settings.ACTION_NFC_SETTINGS))}){Text(stringResource(R.string.nfc_disabled))}}else item{Button({NfcCoordinator.register(vm::readAndVerify)},Modifier.fillMaxWidth()){Icon(Icons.Default.Nfc,null);Text(stringResource(R.string.read_verify_nfc))}};state.nfcUri?.let{uri->item{LabelValue(R.string.read_uri,uri,true)}};state.nfcVerification?.card?.let{card->item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text(if(state.nfcVerification.exactMatch)stringResource(R.string.exact_match) else stringResource(R.string.mismatch));LtrText(card.serialNumber);Text(card.assignmentStatus);Text(card.cardStatus)}}}};item{OutlinedButton(program,Modifier.fillMaxWidth()){Text(stringResource(R.string.write_nfc))}};item{OutlinedButton(hce,Modifier.fillMaxWidth()){Text(stringResource(R.string.hce_title))}}}}

@Composable private fun ProgrammingList(cards:List<CardDto>,open:(String)->Unit){LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Text(stringResource(R.string.programming_cards),style=MaterialTheme.typography.headlineMedium)};items(cards,key={it.id}){card->Card(Modifier.fillMaxWidth().clickable{open(card.id)}){Column(Modifier.padding(16.dp)){LtrText(card.serialNumber,MaterialTheme.typography.titleMedium);LtrText(card.permanentUrl);Text(card.cardType)}}}}}

@Composable private fun ProgrammingScreen(card:CardDto,state:MainUiState,vm:MainViewModel){var lockText by remember{mutableStateOf("")};LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.write_nfc),style=MaterialTheme.typography.headlineMedium)};item{LtrText(card.serialNumber,MaterialTheme.typography.titleLarge);LtrText(card.permanentUrl)};item{Text(stringResource(R.string.approach_tag))};item{Button({NfcCoordinator.register{vm.write(it,card)}},Modifier.fillMaxWidth()){Text(stringResource(R.string.write_nfc))}};item{HorizontalDivider();Text(stringResource(R.string.lock_warning),color=MaterialTheme.colorScheme.error)};item{OutlinedTextField(lockText,{lockText=it},label={Text(stringResource(R.string.type_lock))},modifier=Modifier.fillMaxWidth())};item{Button({NfcCoordinator.register{vm.lock(it,card)}},Modifier.fillMaxWidth(),enabled=lockText=="LOCK",colors=ButtonDefaults.buttonColors(containerColor=MaterialTheme.colorScheme.error)){Text(stringResource(R.string.lock_confirm))}};state.message?.let{item{Text(it)}}}}

@Composable private fun HceScreen(cards:List<CardDto>){val context=LocalContext.current;var enabled by remember{mutableStateOf(HceConfig.enabled(context))};var selected by remember{mutableStateOf(HceConfig.url(context)?:cards.firstOrNull()?.permanentUrl.orEmpty())};val supported=context.packageManager.hasSystemFeature("android.hardware.nfc.hce");LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.hce_title),style=MaterialTheme.typography.headlineMedium)};item{Text(stringResource(R.string.hce_explanation))};item{Text(stringResource(R.string.hce_compatibility),style=MaterialTheme.typography.bodySmall)};if(!supported)item{ErrorText("NFC_UNAVAILABLE")};items(cards,key={it.id}){card->Row(Modifier.fillMaxWidth().clickable{selected=card.permanentUrl}.padding(8.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(selected==card.permanentUrl,{selected=card.permanentUrl});Column{LtrText(card.serialNumber);LtrText(card.permanentUrl,MaterialTheme.typography.bodySmall)}}};item{Button({enabled=!enabled;HceConfig.save(context,enabled,selected)},Modifier.fillMaxWidth(),enabled=supported&&selected.isNotBlank()){Text(stringResource(if(enabled)R.string.disable_hce else R.string.enable_hce))}}}}

@Composable private fun SettingsScreen(logout:()->Unit){LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.settings),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)};item{Text(stringResource(R.string.language),style=MaterialTheme.typography.titleMedium)};item{OutlinedButton({AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())},Modifier.fillMaxWidth()){Text(stringResource(R.string.device_language))}};item{OutlinedButton({AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags("ar"))},Modifier.fillMaxWidth()){Text(stringResource(R.string.arabic))}};item{OutlinedButton({AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags("en"))},Modifier.fillMaxWidth()){Text(stringResource(R.string.english))}};item{Text(stringResource(R.string.privacy_note))};item{Button(logout,Modifier.fillMaxWidth()){Text(stringResource(R.string.logout))}}}}

@Composable private fun ThemeChooser(value:String,onChange:(String)->Unit){var menu by remember{mutableStateOf(false)};Box{OutlinedButton({menu=true},Modifier.fillMaxWidth()){Text("${stringResource(R.string.theme)}: $value")};DropdownMenu(menu,{menu=false}){listOf("CLASSIC_DARK","CLASSIC_LIGHT","ELEGANT_DARK","ELEGANT_LIGHT","BUSINESS_DARK","BUSINESS_LIGHT").forEach{theme->DropdownMenuItem(text={Text(theme)},onClick={menu=false;onChange(theme)})}}}}

private data class SelectableIcon(val key: String, val category: String)

private val destinationIcons = listOf(
    SelectableIcon("phone", "contact"),
    SelectableIcon("email", "contact"),
    SelectableIcon("contact", "contact"),
    SelectableIcon("linkedin", "social"),
    SelectableIcon("instagram", "social"),
    SelectableIcon("facebook", "social"),
    SelectableIcon("x", "social"),
    SelectableIcon("building", "business"),
    SelectableIcon("briefcase", "business"),
    SelectableIcon("website", "business"),
    SelectableIcon("file", "documents"),
    SelectableIcon("pdf", "documents"),
    SelectableIcon("vcard", "documents"),
    SelectableIcon("location", "location"),
    SelectableIcon("map", "location"),
    SelectableIcon("whatsapp", "communication"),
    SelectableIcon("message", "communication"),
    SelectableIcon("shop", "shopping"),
    SelectableIcon("cart", "shopping"),
    SelectableIcon("video", "media"),
    SelectableIcon("music", "media"),
    SelectableIcon("link", "custom"),
)

@Composable
private fun DestinationManager(profile: ProfileDto, vm: MainViewModel) {
    var showEditor by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(stringResource(R.string.links_files), style = MaterialTheme.typography.titleMedium)
            FilledIconButton(onClick = { showEditor = true }) {
                Icon(Icons.Default.AddLink, contentDescription = stringResource(R.string.add_link))
            }
        }
        profile.destinations.forEach { destination ->
            Card(Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(destination.titleAr ?: destination.titleEn ?: destination.title)
                        LtrText(destination.url, MaterialTheme.typography.bodySmall)
                        Text(destination.iconKey ?: destination.type, style = MaterialTheme.typography.labelSmall)
                    }
                    if (destination.type !in setOf("PROFILE", "VCF")) {
                        IconButton(onClick = { vm.deleteDestination(destination.id) }) {
                            Icon(Icons.Default.Delete, contentDescription = stringResource(R.string.delete))
                        }
                    }
                }
            }
        }
    }
    if (showEditor) {
        DestinationEditor(
            onDismiss = { showEditor = false },
            onSave = { body ->
                vm.addDestination(profile.id, body)
                showEditor = false
            },
        )
    }
}

@Composable
private fun DestinationEditor(
    onDismiss: () -> Unit,
    onSave: (DestinationWriteRequest) -> Unit,
) {
    var titleAr by remember { mutableStateOf("") }
    var titleEn by remember { mutableStateOf("") }
    var value by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("WEBSITE") }
    var iconKey by remember { mutableStateOf("website") }
    var iconSearch by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("all") }
    var typeMenu by remember { mutableStateOf(false) }
    val categories = listOf(
        "all" to R.string.category_all,
        "contact" to R.string.category_contact,
        "social" to R.string.category_social,
        "business" to R.string.category_business,
        "documents" to R.string.category_documents,
        "location" to R.string.category_location,
        "communication" to R.string.category_communication,
        "shopping" to R.string.category_shopping,
        "media" to R.string.category_media,
        "custom" to R.string.category_custom,
    )
    val visibleIcons = destinationIcons.filter {
        (category == "all" || it.category == category) &&
            (iconSearch.isBlank() || it.key.contains(iconSearch, ignoreCase = true))
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.add_link)) },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item { Field(titleAr, { titleAr = it }, R.string.arabic_name) }
                item { Field(titleEn, { titleEn = it }, R.string.english_name) }
                item { Field(value, { value = it }, R.string.link_url) }
                item {
                    Box {
                        OutlinedButton(onClick = { typeMenu = true }, modifier = Modifier.fillMaxWidth()) {
                            Text("${stringResource(R.string.link_type)}: $type")
                        }
                        DropdownMenu(expanded = typeMenu, onDismissRequest = { typeMenu = false }) {
                            listOf("WEBSITE", "SOCIAL", "PHONE", "EMAIL", "WHATSAPP_PRIVATE", "LOCATION", "CUSTOM_URL").forEach {
                                DropdownMenuItem(
                                    text = { Text(it) },
                                    onClick = { type = it; typeMenu = false },
                                )
                            }
                        }
                    }
                }
                item { Field(iconSearch, { iconSearch = it }, R.string.search_icons) }
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(categories.size) { index ->
                            val item = categories[index]
                            FilterChip(
                                selected = category == item.first,
                                onClick = { category = item.first },
                                label = { Text(stringResource(item.second)) },
                            )
                        }
                    }
                }
                items(visibleIcons.chunked(3)) { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        row.forEach { item ->
                            FilterChip(
                                selected = iconKey == item.key,
                                onClick = { iconKey = item.key },
                                label = { Text(item.key) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                        repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = value.isNotBlank() && (titleAr.isNotBlank() || titleEn.isNotBlank()),
                onClick = {
                    onSave(
                        DestinationWriteRequest(
                            type = type,
                            url = value,
                            titleAr = titleAr.ifBlank { null },
                            titleEn = titleEn.ifBlank { null },
                            iconKey = iconKey,
                        ),
                    )
                },
            ) { Text(stringResource(R.string.save)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) }
        },
    )
}
@Composable private fun Field(value:String,onChange:(String)->Unit,label:Int,multiline:Boolean=false,keyboard:KeyboardType=KeyboardType.Text){if(keyboard==KeyboardType.Phone||keyboard==KeyboardType.Email||keyboard==KeyboardType.Uri)CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr){OutlinedTextField(value,onChange,label={Text(stringResource(label))},modifier=Modifier.fillMaxWidth(),minLines=if(multiline)3 else 1,keyboardOptions=KeyboardOptions(keyboardType=keyboard))}else OutlinedTextField(value,onChange,label={Text(stringResource(label))},modifier=Modifier.fillMaxWidth(),minLines=if(multiline)3 else 1,keyboardOptions=KeyboardOptions(keyboardType=keyboard))}
@Composable private fun LtrField(value:String,onChange:(String)->Unit,label:Int,placeholder:Int?,keyboard:KeyboardType,enabled:Boolean){CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr){OutlinedTextField(value,onChange,label={Text(stringResource(label))},placeholder=placeholder?.let{{Text(stringResource(it))}},keyboardOptions=KeyboardOptions(keyboardType=keyboard),modifier=Modifier.fillMaxWidth(),enabled=enabled)}}
@Composable private fun LabelValue(label:Int,value:String,ltr:Boolean=false){Column{Text(stringResource(label),style=MaterialTheme.typography.labelMedium);if(ltr)LtrText(value)else Text(value)}}
@Composable private fun LtrText(value:String,style:androidx.compose.ui.text.TextStyle=LocalTextStyle.current){CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr){Text(value,style=style)}}
@Composable private fun Loading(){Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){CircularProgressIndicator()}}
@Composable private fun ErrorText(code:String){Text(when{code.contains("LIMIT")->stringResource(R.string.limit_reached);code.contains("AUTH")->stringResource(R.string.auth_expired);code.contains("ALREADY_ACTIVATED")||code.contains("ALREADY_CLAIMED")->stringResource(R.string.activated_card);code.contains("USED")->stringResource(R.string.used_qr);code.contains("SUSPENDED")||code.contains("PAUSED")->stringResource(R.string.suspended_card);code.contains("ACTIVATION_INVALID")||code.contains("QR_INVALID")->stringResource(R.string.invalid_qr);code.contains("UNAVAILABLE")->stringResource(R.string.nfc_unavailable);else->stringResource(R.string.generic_error)},color=MaterialTheme.colorScheme.error)}
@Composable private fun Feedback(state:MainUiState,clear:()->Unit){if(state.error!=null||state.message!=null)AlertDialog(onDismissRequest=clear,confirmButton={TextButton(clear){Text(stringResource(R.string.close))}},text={if(state.error!=null)ErrorText(state.error)else Text(stringResource(when(state.message){"CARD_CLAIMED"->R.string.card_claimed;"PROFILE_SAVED"->R.string.profile_saved;"UPLOAD_COMPLETE"->R.string.upload_complete;"DESTINATION_SAVED"->R.string.destination_saved;"NFC_PROGRAMMED"->R.string.write_success;"NFC_LOCKED"->R.string.lock_success;else->R.string.generic_error}))})}
private fun copy(context:Context,value:String){(context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("POPWAM",value))}
@Composable
private fun QrDialog(value: String, close: () -> Unit) {
    val context = LocalContext.current
    val bitmap = remember(value) { createQrBitmap(value,700) }
    AlertDialog(
        onDismissRequest = close,
        confirmButton = {
            TextButton(onClick = { shareQr(context, value, bitmap) }) {
                Text(stringResource(R.string.share_qr))
            }
        },
        dismissButton = {
            TextButton(onClick = close) { Text(stringResource(R.string.close)) }
        },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Image(
                    bitmap.asImageBitmap(),
                    contentDescription = stringResource(R.string.share_qr),
                    modifier = Modifier.fillMaxWidth().aspectRatio(1f),
                )
                LtrText(value)
            }
        },
    )
}

private fun createQrBitmap(value:String,size:Int):android.graphics.Bitmap{val matrix=QRCodeWriter().encode(value,BarcodeFormat.QR_CODE,size,size);return android.graphics.Bitmap.createBitmap(size,size,android.graphics.Bitmap.Config.RGB_565).apply{for(x in 0 until size)for(y in 0 until size)setPixel(x,y,if(matrix[x,y])android.graphics.Color.BLACK else android.graphics.Color.WHITE)}}

private fun share(context:Context,value:String){val intent=Intent(Intent.ACTION_SEND).apply{type="text/plain";putExtra(Intent.EXTRA_TEXT,value)};context.startActivity(Intent.createChooser(intent,context.getString(R.string.share)))}

private fun shareQr(context: Context, value: String, bitmap: android.graphics.Bitmap) {
    val directory = File(context.cacheDir, "shared").apply { mkdirs() }
    val file = File(directory, "popwam-card-qr.png")
    file.outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_TEXT, value)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, context.getString(R.string.share_qr)))
}
