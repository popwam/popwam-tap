@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.popwam.pop.ui

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
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.os.LocaleListCompat
import androidx.core.content.FileProvider
import androidx.browser.customtabs.CustomTabsIntent
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.popwam.pop.BuildConfig
import com.popwam.pop.R
import com.popwam.pop.data.api.*
import com.popwam.pop.data.auth.PhoneIdentity
import com.popwam.pop.data.auth.PhoneCountryStore
import com.popwam.pop.data.auth.PasskeyCoordinator
import com.popwam.pop.data.auth.AuthRuntimeDiagnostics
import com.popwam.pop.data.auth.AuthRuntimeStage
import com.popwam.pop.nfc.NfcCoordinator
import com.popwam.pop.ui.theme.AppearanceStore
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.pop.ui.home.HomeViewModel
import com.popwam.pop.ui.components.PopOfficialLogo
import com.popwam.pop.ui.profile.ProfilesViewModel
import com.popwam.pop.ui.share.ShareViewModel
import java.io.File
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.google.gson.JsonParser

@Composable fun PopwamApp(
    auth:AuthViewModel,
    main:MainViewModel,
    home:HomeViewModel,
    profiles:ProfilesViewModel,
    share:ShareViewModel,
    initialRoute:String="home",
    appearanceStore:AppearanceStore,
    phoneCountries:PhoneCountryStore,
    onThemeModeSelected:(ThemeMode)->Unit,
    onPaletteSelected:(IdentityPalette)->Unit,
){
    val authState by auth.state.collectAsStateWithLifecycle()
    if(!authState.authenticated)return
    if(authState.setupStage !in setOf(AuthSetupStage.PUBLIC,AuthSetupStage.READY)){com.popwam.pop.ui.auth.LoginOnboardingScreen(authState,auth);return}
    FigmaMainNavigation(
        main, home, profiles, share, initialRoute=initialRoute, onLogout={share.clearForLogout();auth.logout()}, appearanceStore=appearanceStore,
        onThemeModeSelected=onThemeModeSelected, onPaletteSelected=onPaletteSelected,
    )
}

fun currentLocale():String{
    val selected=AppCompatDelegate.getApplicationLocales().toLanguageTags().substringBefore(',').ifBlank{Locale.getDefault().toLanguageTag()}
    return LocalePolicy.resolve(selected.substringBefore('-'),selected)
}

fun toggleLanguage(context:Context?=null){
    val available=LocalePolicy.availableLocales()
    val currentIndex=available.indexOf(currentLocale()).coerceAtLeast(0)
    val next=available[(currentIndex+1)%available.size]
    context?.let { persistPopLanguageChoice(it,next) }
    applyPopLanguage(next)
}
fun openWeb(context:Context,path:String){CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(context,Uri.parse("${BuildConfig.API_BASE_URL.trimEnd('/')}/$path"))}

@Composable private fun PortalScreen(title:Int,path:String,description:Int){val context=LocalContext.current;Box(Modifier.fillMaxSize().padding(20.dp),contentAlignment=Alignment.Center){Card(Modifier.fillMaxWidth()){Column(Modifier.padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(16.dp)){Text(stringResource(title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black);Text(stringResource(description),style=MaterialTheme.typography.bodyMedium,color=MaterialTheme.colorScheme.onSurfaceVariant);Button({openWeb(context,path)},Modifier.fillMaxWidth()){Icon(Icons.Default.OpenInBrowser,null);Text(stringResource(R.string.open_secure_portal))}}}}}

@Composable private fun CardsScreen(cards:List<CardDto>,open:(String)->Unit){LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Text(stringResource(R.string.my_cards),style=MaterialTheme.typography.headlineMedium)};if(cards.isEmpty())item{Text(stringResource(R.string.cards_empty))};items(cards,key={it.id}){card->Card(Modifier.fillMaxWidth().clickable{open(card.id)}){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){LtrText(card.serialNumber,MaterialTheme.typography.titleMedium);Text("${card.cardType} · ${card.cardStatus}");LtrText(card.permanentUrl,MaterialTheme.typography.bodySmall);Text("${stringResource(R.string.total_opens)}: ${card.openCount}")}}}}}

@Composable private fun CardDetailScreen(card:CardDetailDto?,destinations:List<DestinationDto>,update:(String?,String?)->Unit,back:()->Unit){
    if(card==null){Loading();return}
    var menu by remember{mutableStateOf(false)}
    var showQr by remember{mutableStateOf(false)}
    val context=LocalContext.current
    val mutable=card.cardStatus=="ACTIVE"||card.cardStatus=="PAUSED"
    LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
        item{Row(verticalAlignment=Alignment.CenterVertically){IconButton(back){Icon(Icons.AutoMirrored.Filled.ArrowBack,null)};Text(stringResource(R.string.my_cards),style=MaterialTheme.typography.headlineSmall)}}
        item{InfoCard(card)}
        item{Text(stringResource(R.string.active_destination),style=MaterialTheme.typography.titleMedium);Box{OutlinedButton({menu=true},Modifier.fillMaxWidth(),enabled=mutable){Text(card.activeDestination?.title?:stringResource(R.string.select_profile))};DropdownMenu(menu,{menu=false}){destinations.forEach{destination->DropdownMenuItem(text={Text(destination.titleAr?:destination.titleEn?:destination.title)},onClick={menu=false;update(null,destination.id)})}}}}
        item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){OutlinedButton({copy(context,card.permanentUrl)},Modifier.weight(1f)){Icon(Icons.Default.ContentCopy,null);Text(stringResource(R.string.copy_url))};OutlinedButton({showQr=true},Modifier.weight(1f)){Icon(Icons.Default.QrCode,null);Text(stringResource(R.string.share_qr))}}}
        if(mutable)item{Button({update(if(card.cardStatus=="PAUSED")"ACTIVE" else "PAUSED",null)},Modifier.fillMaxWidth()){Text(stringResource(if(card.cardStatus=="PAUSED")R.string.restore else R.string.pause))}}
        item{Text("${stringResource(R.string.total_opens)}: ${card.openCount}");Text("${stringResource(R.string.last_opened)}: ${card.lastOpenedAt?:stringResource(R.string.never)}")}
    }
    if(showQr)QrDialog(card.permanentUrl){showQr=false}
}

@Composable private fun InfoCard(card:CardDetailDto){Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){LabelValue(R.string.serial,card.serialNumber,true);LabelValue(R.string.card_type,card.cardType);LabelValue(R.string.card_status,card.cardStatus);LabelValue(R.string.assignment_status,card.assignmentStatus);LabelValue(R.string.permanent_url,card.permanentUrl,true)}}}

@Composable private fun ActivationScreen(state:MainUiState,vm:MainViewModel){var manual by remember{mutableStateOf("")};var selectedProfile by remember{mutableStateOf("")};val activation=state.activation;LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.scan_qr),style=MaterialTheme.typography.headlineMedium)};if(activation?.ok!=true){item{QrScanner{vm.inspectActivation(it)}};item{Field(manual,{manual=it},R.string.activation_code)};item{Button({vm.inspectActivation(manual)},Modifier.fillMaxWidth()){Text(stringResource(R.string.validate_qr))}};item{Text(stringResource(R.string.activation_security),style=MaterialTheme.typography.bodySmall)}}else{activation.card?.let{card->item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){LtrText(card.serialNumber,MaterialTheme.typography.titleMedium);Text(card.cardType);LtrText(card.permanentUrl)}}}};item{Text(stringResource(R.string.select_profile),style=MaterialTheme.typography.titleMedium)};items(state.profiles,key={it.id}){profile->Row(Modifier.fillMaxWidth().clickable{selectedProfile=profile.id}.padding(8.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(selectedProfile==profile.id,{selectedProfile=profile.id});Text(profile.displayName)}};item{Button({vm.claim(selectedProfile.ifBlank{state.profiles.firstOrNull()?.id.orEmpty()})},Modifier.fillMaxWidth(),enabled=state.profiles.isNotEmpty()){Text(stringResource(R.string.claim_card))}}}}}

@Composable private fun NfcToolsScreen(state:MainUiState,vm:MainViewModel,program:()->Unit,hce:()->Unit){val context=LocalContext.current;val adapter=NfcAdapter.getDefaultAdapter(context);LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.nfc_tools),style=MaterialTheme.typography.headlineMedium)};item{Text(stringResource(R.string.scan_activation_separately),style=MaterialTheme.typography.bodySmall)};if(adapter==null)item{ErrorText("NFC_UNAVAILABLE")}else if(!adapter.isEnabled)item{Button({context.startActivity(Intent(Settings.ACTION_NFC_SETTINGS))}){Text(stringResource(R.string.nfc_disabled))}}else item{Button({NfcCoordinator.register(vm::readAndVerify)},Modifier.fillMaxWidth()){Icon(Icons.Default.Nfc,null);Text(stringResource(R.string.read_verify_nfc))}};state.nfcUri?.let{uri->item{LabelValue(R.string.read_uri,uri,true)}};state.nfcVerification?.card?.let{card->item{Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp)){Text(if(state.nfcVerification.exactMatch)stringResource(R.string.exact_match) else stringResource(R.string.mismatch));LtrText(card.serialNumber);Text(card.assignmentStatus);Text(card.cardStatus)}}}};item{OutlinedButton(program,Modifier.fillMaxWidth()){Text(stringResource(R.string.write_nfc))}};item{OutlinedButton(hce,Modifier.fillMaxWidth()){Text(stringResource(R.string.hce_title))}}}}

@Composable private fun ProgrammingList(cards:List<CardDto>,open:(String)->Unit){LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){item{Text(stringResource(R.string.programming_cards),style=MaterialTheme.typography.headlineMedium)};items(cards,key={it.id}){card->Card(Modifier.fillMaxWidth().clickable{open(card.id)}){Column(Modifier.padding(16.dp)){LtrText(card.serialNumber,MaterialTheme.typography.titleMedium);LtrText(card.permanentUrl);Text(card.cardType)}}}}}

@Composable private fun ProgrammingScreen(card:CardDto,state:MainUiState,vm:MainViewModel){var lockText by remember{mutableStateOf("")};LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.write_nfc),style=MaterialTheme.typography.headlineMedium)};item{LtrText(card.serialNumber,MaterialTheme.typography.titleLarge);LtrText(card.permanentUrl)};item{Text(stringResource(R.string.approach_tag))};item{Button({NfcCoordinator.register{vm.write(it,card)}},Modifier.fillMaxWidth()){Text(stringResource(R.string.write_nfc))}};item{HorizontalDivider();Text(stringResource(R.string.lock_warning),color=MaterialTheme.colorScheme.error)};item{OutlinedTextField(lockText,{lockText=it},label={Text(stringResource(R.string.type_lock))},modifier=Modifier.fillMaxWidth())};item{Button({NfcCoordinator.register{vm.lock(it,card)}},Modifier.fillMaxWidth(),enabled=lockText=="LOCK",colors=ButtonDefaults.buttonColors(containerColor=MaterialTheme.colorScheme.error)){Text(stringResource(R.string.lock_confirm))}};state.message?.let{item{Text(it)}}}}


@Composable private fun Field(value:String,onChange:(String)->Unit,label:Int,multiline:Boolean=false,keyboard:KeyboardType=KeyboardType.Text){if(keyboard==KeyboardType.Phone||keyboard==KeyboardType.Email||keyboard==KeyboardType.Uri)CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr){OutlinedTextField(value,onChange,label={Text(stringResource(label))},modifier=Modifier.fillMaxWidth(),minLines=if(multiline)3 else 1,keyboardOptions=KeyboardOptions(keyboardType=keyboard))}else OutlinedTextField(value,onChange,label={Text(stringResource(label))},modifier=Modifier.fillMaxWidth(),minLines=if(multiline)3 else 1,keyboardOptions=KeyboardOptions(keyboardType=keyboard))}
@Composable private fun LtrField(value:String,onChange:(String)->Unit,label:Int,placeholder:Int?,keyboard:KeyboardType,enabled:Boolean,placeholderText:String?=null){CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr){OutlinedTextField(value,onChange,label={Text(stringResource(label))},placeholder={Text(placeholderText ?: placeholder?.let{stringResource(it)}.orEmpty())},keyboardOptions=KeyboardOptions(keyboardType=keyboard),modifier=Modifier.fillMaxWidth(),enabled=enabled)}}
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

@Composable fun LegacyPhysicalCardDetails(card:CardDetailDto?,destinations:List<DestinationDto>,update:(String?,String?)->Unit,back:()->Unit)=CardDetailScreen(card,destinations,update,back)
@Composable fun LegacyActivation(state:MainUiState,vm:MainViewModel)=ActivationScreen(state,vm)
@Composable fun LegacyNfcTools(state:MainUiState,vm:MainViewModel,program:()->Unit,hce:()->Unit)=NfcToolsScreen(state,vm,program,hce)
@Composable fun LegacyProgrammingList(cards:List<CardDto>,open:(String)->Unit)=ProgrammingList(cards,open)
@Composable fun LegacyProgramming(card:CardDto,state:MainUiState,vm:MainViewModel)=ProgrammingScreen(card,state,vm)
