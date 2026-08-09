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
import androidx.compose.material.icons.automirrored.filled.Login
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
import com.popwam.pop.data.auth.biometricUnlockEligibility
import com.popwam.pop.hce.HceConfig
import com.popwam.pop.nfc.NfcCoordinator
import com.popwam.pop.ui.theme.AppearanceStore
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.pop.ui.home.HomeViewModel
import com.popwam.pop.ui.profile.ProfilesViewModel
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
    initialRoute:String="home",
    appearanceStore:AppearanceStore,
    phoneCountries:PhoneCountryStore,
    onThemeModeSelected:(ThemeMode)->Unit,
    onPaletteSelected:(IdentityPalette)->Unit,
){
    val authState by auth.state.collectAsStateWithLifecycle()
    LaunchedEffect(phoneCountries) { phoneCountries.refresh() }
    var destination by rememberSaveable { mutableStateOf(UnauthenticatedDestination.PHONE_AUTH.name) }
    var pendingRoute by rememberSaveable { mutableStateOf(initialRoute) }
    var pendingActivation by rememberSaveable { mutableStateOf("") }
    if(!authState.authenticated){
        when(UnauthenticatedDestination.valueOf(destination)){
            UnauthenticatedDestination.PHONE_AUTH -> LoginScreen(
                state=authState,
                auth=auth,
                phoneCountries=phoneCountries,
                changePhone=auth::changePhone,
                openHowWorks={destination=howPopWorksDestination().name},
                openLegal={kind->destination=destinationForLegal(kind).name},
            )
            UnauthenticatedDestination.HOW_POP_WORKS -> ProductIntroScreen(
                onBack={destination=UnauthenticatedDestination.PHONE_AUTH.name},
                onComplete={destination=UnauthenticatedDestination.PHONE_AUTH.name},
                helpMode=true,
            )
            UnauthenticatedDestination.TERMS -> NativeLegalScreen(PreAuthLegalKind.TERMS){destination=UnauthenticatedDestination.PHONE_AUTH.name}
            UnauthenticatedDestination.PRIVACY -> NativeLegalScreen(PreAuthLegalKind.PRIVACY){destination=UnauthenticatedDestination.PHONE_AUTH.name}
        }
        return
    }
    // Phase 4 owns the complete new-user security journey.  The retired Phase C
    // continuation UI must never reopen after a passkey operation.
    LaunchedEffect(authState.authenticated){if(pendingActivation.isNotBlank()){main.inspectActivation(pendingActivation);pendingActivation=""}}
    FigmaMainNavigation(
        main, home, profiles, initialRoute=pendingRoute, onLogout={destination=UnauthenticatedDestination.PHONE_AUTH.name;auth.logout()}, appearanceStore=appearanceStore,
        onThemeModeSelected=onThemeModeSelected, onPaletteSelected=onPaletteSelected,
    )
}

fun currentLocale():String{
    val selected=AppCompatDelegate.getApplicationLocales().toLanguageTags().substringBefore(',').ifBlank{Locale.getDefault().toLanguageTag()}
    return LocalePolicy.resolve(selected.substringBefore('-'),selected)
}

@Composable private fun WelcomeScreen(activate:()->Unit,scan:()->Unit,login:()->Unit){
    val context=LocalContext.current;val online=rememberOnline();var details by rememberSaveable{mutableStateOf(false)}
    PopSystemBars(false)
    PopDynamicBackground(PopBackdrop.WELCOME){LazyColumn(Modifier.fillMaxSize().padding(horizontal=20.dp),contentPadding=PaddingValues(top=WindowInsets.statusBars.asPaddingValues().calculateTopPadding()+16.dp,bottom=WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()+20.dp),verticalArrangement=Arrangement.spacedBy(18.dp)){
        item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Text(stringResource(R.string.app_name),style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Black);OutlinedButton({toggleLanguage(context)}){Text(stringResource(R.string.change_language),fontWeight=FontWeight.Bold)}}}
        item{Column(verticalArrangement=Arrangement.spacedBy(10.dp)){Text(stringResource(R.string.smart_title),style=MaterialTheme.typography.displaySmall,fontWeight=FontWeight.Black);Text(stringResource(R.string.welcome_description),style=MaterialTheme.typography.bodyLarge,color=MaterialTheme.colorScheme.onSurfaceVariant)}}
        item{WelcomeCardVisual()}
        item{Button(activate,Modifier.fillMaxWidth().height(54.dp)){Icon(Icons.Default.Contactless,null);Spacer(Modifier.width(8.dp));Text(stringResource(R.string.activate_product))}}
        item{OutlinedButton(scan,Modifier.fillMaxWidth().height(52.dp)){Icon(Icons.Default.QrCodeScanner,null);Text(stringResource(R.string.scan_qr))}}
        item{OutlinedButton(login,Modifier.fillMaxWidth().height(52.dp)){Icon(Icons.AutoMirrored.Filled.Login,null);Text(stringResource(R.string.sign_in))}}
        item{TextButton({details=true},Modifier.fillMaxWidth()){Text(stringResource(R.string.how_it_works));Icon(Icons.Default.HelpOutline,null)}}
        item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(7.dp)){Icon(if(online)Icons.Default.CloudDone else Icons.Default.CloudOff,null,tint=if(online)MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error);Text(stringResource(if(online)R.string.online else R.string.offline),style=MaterialTheme.typography.labelLarge)};Row{TextButton({openWeb(context,"privacy")}){Text(stringResource(R.string.privacy))};TextButton({openWeb(context,"terms")}){Text(stringResource(R.string.terms))}}}}
    }}
    HowItWorksSheet(details,{details=false}){details=false;activate()}
}

@Composable private fun WelcomeCardVisual(){Image(painterResource(R.drawable.pop_card_landscape_front),"POP landscape card front",Modifier.fillMaxWidth().aspectRatio(1016f/638f))}

@Composable private fun PreAuthScanScreen(back:()->Unit,onScanned:(String)->Unit){var manual by rememberSaveable{mutableStateOf("")};LazyColumn(Modifier.fillMaxSize().safeDrawingPadding().imePadding().padding(horizontal=20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){item{Row(verticalAlignment=Alignment.CenterVertically){IconButton(back){Icon(Icons.AutoMirrored.Filled.ArrowBack,stringResource(R.string.back))};Text(stringResource(R.string.scan_qr),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)}};item{QrScanner(onScanned)};item{Text(stringResource(R.string.activation_or_code),fontWeight=FontWeight.Bold)};item{LtrField(manual,{manual=it},R.string.manual_code,R.string.activation_code_hint,KeyboardType.Ascii,true)};item{Button({onScanned(manual)},Modifier.fillMaxWidth(),enabled=manual.length>=6){Text(stringResource(R.string.validate_qr))}}}}

@Composable private fun rememberOnline():Boolean{val context=LocalContext.current;val manager=remember{context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager};var online by remember{mutableStateOf(manager.getNetworkCapabilities(manager.activeNetwork)?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)==true)};DisposableEffect(manager){val callback=object:ConnectivityManager.NetworkCallback(){override fun onAvailable(network:Network){online=true};override fun onLost(network:Network){online=manager.activeNetwork!=null}};manager.registerNetworkCallback(NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(),callback);onDispose{runCatching{manager.unregisterNetworkCallback(callback)}}};return online}
fun toggleLanguage(context:Context?=null){
    val available=LocalePolicy.availableLocales()
    val currentIndex=available.indexOf(currentLocale()).coerceAtLeast(0)
    val next=available[(currentIndex+1)%available.size]
    context?.let { persistPopLanguageChoice(it,next) }
    applyPopLanguage(next)
}
fun openWeb(context:Context,path:String){CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(context,Uri.parse("${BuildConfig.API_BASE_URL.trimEnd('/')}/$path"))}

@Deprecated("Firebase Phone Auth replaced this server OTP presentation")
@Suppress("unused")
@Composable private fun LegacyServerOtpLoginScreen(
    state:AuthUiState,
    auth:AuthViewModel,
    onSend:(String,String,String)->Unit,
    onCountry:(String)->Unit,
    onVerify:(String)->Unit,
    changePhone:()->Unit,
    openHowWorks:()->Unit,
    openLegal:(PreAuthLegalKind)->Unit,
){
    val context=LocalContext.current
    val locale=currentLocale()
    val options=remember(locale){PhoneIdentity.enabledCountries(Locale.forLanguageTag(locale))}
    var country by rememberSaveable{mutableStateOf(PhoneIdentity.suggestedCountry(context))}
    var countryPicker by rememberSaveable{mutableStateOf(false)}
    var channel by rememberSaveable{mutableStateOf("sms")}
    var phone by rememberSaveable{mutableStateOf("")}
    var code by rememberSaveable{mutableStateOf("")}
    var invalidPhone by rememberSaveable{mutableStateOf(false)}
    LaunchedEffect(country){PhoneIdentity.saveCountry(context,country);onCountry(country)}
    LaunchedEffect(state.channels){if(state.channels.isNotEmpty()&&channel !in state.channels)channel=state.channels.first()}
    PopSystemBars(MaterialTheme.colorScheme.background.red < .2f)
    Surface(Modifier.fillMaxSize(),color=MaterialTheme.colorScheme.background){
        LazyColumn(
            Modifier.fillMaxSize().safeDrawingPadding().imePadding().padding(horizontal=24.dp),
            contentPadding=PaddingValues(top=28.dp,bottom=28.dp),
            verticalArrangement=Arrangement.spacedBy(16.dp),
        ){
        item{
            Row(verticalAlignment=Alignment.CenterVertically){
                Column(Modifier.weight(1f)){
                    Text(stringResource(R.string.pop_brand_short),style=MaterialTheme.typography.displaySmall,fontWeight=FontWeight.Black,color=MaterialTheme.colorScheme.primary)
                    Text(stringResource(R.string.pop_slogan),style=MaterialTheme.typography.titleMedium,color=MaterialTheme.colorScheme.onSurfaceVariant)
                }
                FilledTonalIconButton({toggleLanguage(context)}){Icon(Icons.Default.Language,stringResource(R.string.language))}
            }
        }
        item{
            Text(stringResource(R.string.phone_auth_title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)
            Text(stringResource(R.string.phone_auth_help),style=MaterialTheme.typography.bodyLarge,color=MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if(passkeyPlatformSupported(android.os.Build.VERSION.SDK_INT)) {
            state.passkeyError?.let { item{Text(stringResource(passkeyErrorString(it)),color=MaterialTheme.colorScheme.error)} }
            item{HorizontalDivider()}
        }
        item{Text(stringResource(R.string.use_phone_instead),style=MaterialTheme.typography.labelLarge)}
        item{Text(stringResource(R.string.phone_help),style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)}
        item{
            val selected=options.firstOrNull{it.iso2==country}
            OutlinedButton(
                {countryPicker=true},
                Modifier.fillMaxWidth().heightIn(min=54.dp),
                enabled=state.challengeId==null,
                contentPadding=PaddingValues(horizontal=16.dp),
            ){
                Text(selected?.flag.orEmpty(),style=MaterialTheme.typography.titleLarge)
                Spacer(Modifier.width(10.dp))
                Text(selected?.name?:country,Modifier.weight(1f),textAlign=androidx.compose.ui.text.style.TextAlign.Start)
                Text(selected?.callingCode.orEmpty(),fontWeight=FontWeight.Bold)
                Spacer(Modifier.width(4.dp))
                Icon(Icons.Default.ExpandMore,null)
            }
        }
        item{
            LtrField(phone,{phone=it;invalidPhone=false},R.string.phone_number,R.string.phone_national_hint,KeyboardType.Phone,state.challengeId==null)
            if(invalidPhone)Text(stringResource(R.string.phone_invalid),color=MaterialTheme.colorScheme.error,style=MaterialTheme.typography.bodySmall)
        }
        if(state.challengeId==null){
            if(state.channels.size>1)item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){state.channels.forEach{item->FilterChip(selected=channel==item,onClick={channel=item},label={Text(stringResource(if(item=="whatsapp")R.string.channel_whatsapp else R.string.channel_sms))},modifier=Modifier.weight(1f))}}}
            item{
                Button({
                    val normalized=PhoneIdentity.normalize(phone,country)
                    if(normalized==null)invalidPhone=true else onSend(normalized,country,channel)
                },Modifier.fillMaxWidth().heightIn(min=54.dp),enabled=!state.loading&&phone.isNotBlank()&&state.channels.isNotEmpty()){Text(stringResource(R.string.send_code))}
            }
        }
        state.error?.let{item{ErrorText(it)}}
        item{
            TextButton(openHowWorks,Modifier.fillMaxWidth()){Icon(Icons.Default.HelpOutline,null);Spacer(Modifier.width(6.dp));Text(stringResource(R.string.how_pop_works))}
        }
        item{
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.Center){
                TextButton({openLegal(PreAuthLegalKind.PRIVACY)}){Text(stringResource(R.string.privacy))}
                TextButton({openLegal(PreAuthLegalKind.TERMS)}){Text(stringResource(R.string.terms))}
            }
        }
        if(state.loading)item{LinearProgressIndicator(Modifier.fillMaxWidth())}
    }}
    if(countryPicker)CountryPickerDialog(options,country,{country=it;countryPicker=false}){countryPicker=false}
    if(state.challengeId!=null)ModalBottomSheet(onDismissRequest={}){Column(Modifier.fillMaxWidth().padding(24.dp).imePadding(),verticalArrangement=Arrangement.spacedBy(16.dp)){Text(stringResource(R.string.verification_code),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black);state.maskedPhone?.let{LtrText(it)};LtrField(code,{code=it.filter(Char::isDigit).take(6)},R.string.verification_code,null,KeyboardType.NumberPassword,true);Button({onVerify(code)},Modifier.fillMaxWidth(),enabled=!state.loading&&code.length==6){Text(stringResource(R.string.verify_continue))};TextButton(changePhone,Modifier.fillMaxWidth()){Text(stringResource(R.string.back))}}}
}

@Composable
private fun LoginScreen(
    state:AuthUiState,
    auth:AuthViewModel,
    phoneCountries:PhoneCountryStore,
    changePhone:()->Unit,
    openHowWorks:()->Unit,
    openLegal:(PreAuthLegalKind)->Unit,
) {
    val context=LocalContext.current
    val activity=context as? ComponentActivity
    val scope=rememberCoroutineScope()
    val locale=currentLocale()
    val countryConfig by phoneCountries.countries.collectAsStateWithLifecycle()
    val options=remember(locale,countryConfig){PhoneIdentity.enabledCountries(Locale.forLanguageTag(locale),countryConfig)}
    var country by rememberSaveable{mutableStateOf(PhoneIdentity.suggestedCountry(context))}
    var countryPicker by rememberSaveable{mutableStateOf(false)}
    var phone by rememberSaveable{mutableStateOf("")}
    var phoneE164 by rememberSaveable{mutableStateOf("")}
    var code by rememberSaveable{mutableStateOf("")}
    var invalidPhone by rememberSaveable{mutableStateOf(false)}
    // No biometric-bound POP credential exists yet. Keep the control explicitly disabled
    // rather than treating a fingerprint callback as account authentication.
    val biometricEligibility=remember(context) {
        biometricUnlockEligibility(
            hasLocalPopAuthority=false,
            canAuthenticate=androidx.biometric.BiometricManager.from(context).canAuthenticate(androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG),
        )
    }
    LaunchedEffect(biometricEligibility) { AuthRuntimeDiagnostics.mark(AuthRuntimeStage.BIOMETRIC_ELIGIBILITY,biometricEligibility.name.lowercase()) }
    LaunchedEffect(options){if(options.none { it.iso2==country }) country=options.firstOrNull()?.iso2 ?: ""}
    LaunchedEffect(country){if(country.isNotBlank())PhoneIdentity.saveCountry(context,country)}

    if(state.challengeId!=null) {
        BackHandler(onBack=changePhone)
        PhoneOtpScreen(
            state=state,
            code=code,
            onCode={code=it.filter(Char::isDigit).take(6)},
            verify={auth.verifyPhoneCode(code,currentLocale())},
            resend={
                if(activity!=null&&phoneE164.isNotBlank()) {
                    auth.startPhoneVerification(activity,phoneE164,currentLocale(),resend=true)
                }
            },
            changePhone={
                code=""
                changePhone()
            },
        )
        return
    }

    BackHandler { /* The auth entry is a root destination. */ }
    PopSystemBars(MaterialTheme.colorScheme.background.red < .2f)
    Surface(Modifier.fillMaxSize(),color=MaterialTheme.colorScheme.background) {
        LazyColumn(
            Modifier.fillMaxSize().safeDrawingPadding().imePadding().padding(horizontal=24.dp),
            contentPadding=PaddingValues(vertical=24.dp),
            verticalArrangement=Arrangement.spacedBy(18.dp,Alignment.CenterVertically),
        ) {
            item { Column(Modifier.fillMaxWidth(),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(6.dp)){Icon(painterResource(R.drawable.pop_logo),null,Modifier.size(82.dp),tint=MaterialTheme.colorScheme.primary);Text("POP",style=MaterialTheme.typography.displaySmall,fontWeight=FontWeight.Black);Text(stringResource(R.string.pop_slogan),color=MaterialTheme.colorScheme.onSurfaceVariant)} }
            item {
                val selected=options.firstOrNull{it.iso2==country}
                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp),verticalAlignment=Alignment.CenterVertically){OutlinedButton({countryPicker=true},Modifier.heightIn(min=54.dp),enabled=options.isNotEmpty(),contentPadding=PaddingValues(horizontal=12.dp)){Text(selected?.flag.orEmpty());Spacer(Modifier.width(5.dp));Text(selected?.callingCode?:"+");Icon(Icons.Default.ExpandMore,null)};Box(Modifier.weight(1f)){LtrField(phone,{phone=it.filter{c->c.isDigit()||c in " -()"};invalidPhone=false},R.string.phone_number,null,KeyboardType.Phone,true,selected?.placeholder)}}
                if(invalidPhone)Text(stringResource(R.string.phone_invalid),color=MaterialTheme.colorScheme.error,style=MaterialTheme.typography.bodySmall)
            }
            item {
                Button({
                    val normalized=PhoneIdentity.normalize(phone,country)
                    if(normalized==null||activity==null)invalidPhone=true else { phoneE164=normalized; auth.startPhoneVerification(activity,normalized,currentLocale()) }
                },Modifier.fillMaxWidth().heightIn(min=54.dp),enabled=!state.loading&&phone.isNotBlank()&&country.isNotBlank()){Text(stringResource(R.string.send_code))}
            }
            state.phoneFailure?.let { failure->
                item { Text(stringResource(phoneAuthErrorString(failure)),color=MaterialTheme.colorScheme.error) }
            }
            item {
                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.Center) {
                    TextButton({openLegal(PreAuthLegalKind.PRIVACY)}){Text(stringResource(R.string.privacy))}
                    TextButton({openLegal(PreAuthLegalKind.TERMS)}){Text(stringResource(R.string.terms))}
                }
            }
            if(state.loading)item{LinearProgressIndicator(Modifier.fillMaxWidth())}
        }
    }
    if(countryPicker)CountryPickerDialog(options,country,{country=it;countryPicker=false}){countryPicker=false}
}

@Composable
private fun PhoneOtpScreen(
    state:AuthUiState,
    code:String,
    onCode:(String)->Unit,
    verify:()->Unit,
    resend:()->Unit,
    changePhone:()->Unit,
) {
    var secondsLeft by remember(state.challengeId){mutableIntStateOf(state.resendAfterSeconds)}
    LaunchedEffect(state.challengeId,state.resendAfterSeconds) {
        secondsLeft=state.resendAfterSeconds
        while(secondsLeft>0) {
            delay(1_000)
            secondsLeft-=1
        }
    }
    LaunchedEffect(code,state.loading) { if(code.length==6 && !state.loading) verify() }
    PopSystemBars(MaterialTheme.colorScheme.background.red < .2f)
    Surface(Modifier.fillMaxSize(),color=MaterialTheme.colorScheme.background) {
        LazyColumn(
            Modifier.fillMaxSize().safeDrawingPadding().imePadding().padding(horizontal=24.dp),
            contentPadding=PaddingValues(vertical=24.dp),
            verticalArrangement=Arrangement.spacedBy(18.dp,Alignment.CenterVertically),
            horizontalAlignment=Alignment.CenterHorizontally,
        ) {
            item { Icon(painterResource(R.drawable.pop_logo),null,Modifier.size(78.dp),tint=MaterialTheme.colorScheme.primary) }
            item {
                Text(stringResource(R.string.verify_phone_title),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)
            }
            state.maskedPhone?.let { masked->item{LtrText(masked,MaterialTheme.typography.titleMedium)} }
            item { OtpSixDigitField(code,onCode,!state.loading) }
            state.phoneFailure?.let { failure->
                item { Text(stringResource(phoneAuthErrorString(failure)),color=MaterialTheme.colorScheme.error) }
            }
            item {
                TextButton(resend,enabled=secondsLeft==0&&!state.loading) {
                    Text(if(secondsLeft>0)stringResource(R.string.resend_countdown,secondsLeft) else stringResource(R.string.resend_code))
                }
            }
            item { TextButton(changePhone){Text(stringResource(R.string.change_phone))} }
            if(state.loading)item{Row(verticalAlignment=Alignment.CenterVertically){CircularProgressIndicator(Modifier.size(20.dp),strokeWidth=2.dp);Spacer(Modifier.width(10.dp));Text("Verifying…",color=MaterialTheme.colorScheme.onSurfaceVariant)}}
        }
    }
}

@Composable
internal fun OtpSixDigitField(value:String,onValueChange:(String)->Unit,enabled:Boolean=true) {
    val accessibility=stringResource(R.string.otp_accessibility)
    BasicTextField(
        value=value,
        onValueChange={onValueChange(it.filter(Char::isDigit).take(6))},
        modifier=Modifier.fillMaxWidth().semantics{contentDescription=accessibility},
        enabled=enabled,
        singleLine=true,
        keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.NumberPassword),
        cursorBrush=SolidColor(MaterialTheme.colorScheme.primary),
        decorationBox={innerTextField->
            Box(Modifier.fillMaxWidth()) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement=Arrangement.spacedBy(8.dp),
                    verticalAlignment=Alignment.CenterVertically,
                ) {
                    repeat(6){index->
                        Surface(
                            Modifier.weight(1f).aspectRatio(0.86f),
                            shape=MaterialTheme.shapes.medium,
                            color=MaterialTheme.colorScheme.surfaceVariant,
                            border=BorderStroke(
                                if(index==value.length)2.dp else 1.dp,
                                if(index==value.length)MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                            ),
                        ) {
                            Box(contentAlignment=Alignment.Center) {
                                Text(value.getOrNull(index)?.toString().orEmpty(),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
                            }
                        }
                    }
                }
                Box(Modifier.size(1.dp).alpha(0f)){innerTextField()}
            }
        },
    )
}

private fun phoneAuthErrorString(failure:com.popwam.pop.data.auth.FirebasePhoneFailure)=when(failure) {
    com.popwam.pop.data.auth.FirebasePhoneFailure.INVALID_PHONE->R.string.firebase_phone_invalid
    com.popwam.pop.data.auth.FirebasePhoneFailure.INVALID_CODE->R.string.firebase_code_invalid
    com.popwam.pop.data.auth.FirebasePhoneFailure.SESSION_EXPIRED->R.string.firebase_session_expired
    com.popwam.pop.data.auth.FirebasePhoneFailure.TOO_MANY_REQUESTS->R.string.firebase_too_many_requests
    com.popwam.pop.data.auth.FirebasePhoneFailure.NETWORK->R.string.firebase_network_error
    com.popwam.pop.data.auth.FirebasePhoneFailure.APP_VERIFICATION->R.string.firebase_app_verification_error
    com.popwam.pop.data.auth.FirebasePhoneFailure.RECAPTCHA->R.string.firebase_recaptcha_error
    com.popwam.pop.data.auth.FirebasePhoneFailure.MISSING_ACTIVITY->R.string.firebase_activity_error
    com.popwam.pop.data.auth.FirebasePhoneFailure.QUOTA->R.string.firebase_quota_error
    com.popwam.pop.data.auth.FirebasePhoneFailure.CONFIGURATION->R.string.firebase_configuration_error
    com.popwam.pop.data.auth.FirebasePhoneFailure.EXCHANGE->R.string.firebase_exchange_error
    com.popwam.pop.data.auth.FirebasePhoneFailure.IDENTITY_CONFLICT->R.string.firebase_identity_conflict
    com.popwam.pop.data.auth.FirebasePhoneFailure.UNAVAILABLE->R.string.firebase_unavailable
}

@Composable
private fun CountryPickerDialog(
    countries:List<com.popwam.pop.data.auth.CountryOption>,
    selected:String,
    onSelect:(String)->Unit,
    onDismiss:()->Unit,
){
    var query by rememberSaveable{mutableStateOf("")}
    val filtered=remember(countries,query){PhoneIdentity.search(countries,query)}
    ModalBottomSheet(onDismissRequest=onDismiss) {
                Column(Modifier.fillMaxWidth().heightIn(max=620.dp).imePadding().padding(horizontal=18.dp)){
                    Text(stringResource(R.string.choose_country),style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Black)
                    OutlinedTextField(
                        value=query,
                        onValueChange={query=it},
                        modifier=Modifier.fillMaxWidth().padding(horizontal=18.dp,vertical=10.dp),
                        label={Text(stringResource(R.string.search_countries))},
                        leadingIcon={Icon(Icons.Default.Search,null)},
                        singleLine=true,
                    )
                    LazyColumn(Modifier.fillMaxWidth().weight(1f),contentPadding=PaddingValues(bottom=24.dp)){
                        items(filtered,key={it.iso2}){item->
                            ListItem(
                                modifier=Modifier.fillMaxWidth().clickable{onSelect(item.iso2)},
                                headlineContent={Text(item.name,fontWeight=if(item.iso2==selected)FontWeight.Bold else FontWeight.Normal)},
                                supportingContent={Text(item.iso2)},
                                leadingContent={Text(item.flag,style=MaterialTheme.typography.headlineSmall)},
                                trailingContent={Row(verticalAlignment=Alignment.CenterVertically){Text(item.callingCode,fontWeight=FontWeight.Bold);RadioButton(item.iso2==selected,null)}},
                            )
                        }
                        if(filtered.isEmpty())item{Text(stringResource(R.string.no_country_results),Modifier.padding(24.dp),color=MaterialTheme.colorScheme.onSurfaceVariant)}
                    }
                }
            }
}
private fun passkeyErrorString(error:PasskeyLoginError)=when(error){
    PasskeyLoginError.CANCELLED->R.string.passkey_login_cancelled
    PasskeyLoginError.UNAVAILABLE->R.string.passkey_login_unavailable
    PasskeyLoginError.NO_CREDENTIAL->R.string.passkey_login_no_credential
    PasskeyLoginError.NETWORK->R.string.passkey_login_network
    PasskeyLoginError.STEP_UP_REQUIRED->R.string.passkey_login_failed
    PasskeyLoginError.AUTHENTICATION_FAILED->R.string.passkey_login_failed
    PasskeyLoginError.SERVER_UNAVAILABLE->R.string.passkey_login_server
}

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

@Composable private fun HceScreen(cards:List<CardDto>){val context=LocalContext.current;var enabled by remember{mutableStateOf(HceConfig.enabled(context))};var selected by remember{mutableStateOf(HceConfig.url(context)?:cards.firstOrNull()?.permanentUrl.orEmpty())};val supported=context.packageManager.hasSystemFeature("android.hardware.nfc.hce");LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.hce_title),style=MaterialTheme.typography.headlineMedium)};item{Text(stringResource(R.string.hce_explanation))};item{Text(stringResource(R.string.hce_compatibility),style=MaterialTheme.typography.bodySmall)};if(!supported)item{ErrorText("NFC_UNAVAILABLE")};items(cards,key={it.id}){card->Row(Modifier.fillMaxWidth().clickable{selected=card.permanentUrl}.padding(8.dp),verticalAlignment=Alignment.CenterVertically){RadioButton(selected==card.permanentUrl,{selected=card.permanentUrl});Column{LtrText(card.serialNumber);LtrText(card.permanentUrl,MaterialTheme.typography.bodySmall)}}};item{Button({enabled=!enabled;HceConfig.save(context,enabled,selected)},Modifier.fillMaxWidth(),enabled=supported&&selected.isNotBlank()){Text(stringResource(if(enabled)R.string.disable_hce else R.string.enable_hce))}}}}

@Composable private fun SettingsScreen(logout:()->Unit){LazyColumn(Modifier.fillMaxSize().padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){item{Text(stringResource(R.string.settings),style=MaterialTheme.typography.headlineMedium,fontWeight=FontWeight.Black)};item{Text(stringResource(R.string.language),style=MaterialTheme.typography.titleMedium)};item{OutlinedButton({AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())},Modifier.fillMaxWidth()){Text(stringResource(R.string.device_language))}};item{OutlinedButton({AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags("ar"))},Modifier.fillMaxWidth()){Text(stringResource(R.string.arabic))}};item{OutlinedButton({AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags("en"))},Modifier.fillMaxWidth()){Text(stringResource(R.string.english))}};item{Text(stringResource(R.string.privacy_note))};item{Button(logout,Modifier.fillMaxWidth()){Text(stringResource(R.string.logout))}}}}

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
@Composable fun LegacyHce(cards:List<CardDto>)=HceScreen(cards)
@Composable fun LegacySettings(logout:()->Unit)=SettingsScreen(logout)
