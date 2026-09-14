package com.popwam.pop.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.unit.sp
import com.popwam.pop.data.auth.PasskeyCoordinator
import androidx.activity.ComponentActivity
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.popwam.pop.R
import com.popwam.pop.data.auth.PhoneCountryStore
import com.popwam.pop.data.auth.PhoneIdentity
import com.popwam.pop.ui.components.PopOfficialLogo
import com.popwam.pop.ui.currentLocale
import com.popwam.pop.ui.NativeLegalScreen
import com.popwam.pop.ui.PreAuthLegalKind
import java.util.Locale
import kotlinx.coroutines.delay

@Composable
fun PhoneLoginScreen(viewModel:PhoneLoginViewModel,countriesStore:PhoneCountryStore,onAuthenticated:()->Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val configured by countriesStore.countries.collectAsStateWithLifecycle()
    val locale=currentLocale()
    val countries=remember(configured,locale){PhoneIdentity.enabledCountries(Locale.forLanguageTag(locale),configured)}
    var welcome by rememberSaveable { mutableStateOf(true) }
    var picker by rememberSaveable { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var legal by remember { mutableStateOf<PreAuthLegalKind?>(null) }
    var clock by remember { mutableLongStateOf(android.os.SystemClock.elapsedRealtime()) }
    val context=LocalContext.current
    val focus=LocalFocusManager.current
    LaunchedEffect(state.resendAt){while(true){clock=android.os.SystemClock.elapsedRealtime();delay(1000)}}
    LaunchedEffect(state.stage){if(state.stage==PhoneLoginStage.AUTHENTICATED){viewModel.resetAfterLogout();onAuthenticated()}}
    BackHandler(state.stage==PhoneLoginStage.OTP && !state.loading){viewModel.changeNumber()}
    val passkeyAction={viewModel.passkey { options->PasskeyCoordinator(context).authenticate(context as ComponentActivity,options) }}
    if(welcome && state.stage==PhoneLoginStage.PHONE) {
        AuthStepLayout(stringResource(R.string.p7_welcome_title),stringResource(R.string.p7_welcome_help),Icons.Default.AutoAwesome) {
            AuthPrimary(stringResource(R.string.p7_start),!state.loading){welcome=false}
            if(android.os.Build.VERSION.SDK_INT>=28)OutlinedButton(passkeyAction,Modifier.fillMaxWidth(),enabled=!state.loading){Icon(Icons.Default.Key,null);Spacer(Modifier.width(12.dp));Text(stringResource(R.string.p7_passkey_login))}
            if(state.loading)LinearProgressIndicator(Modifier.fillMaxWidth())
            state.error?.let{Text(stringResource(loginErrorResource(it)),color=MaterialTheme.colorScheme.error)}
        }
    } else {
        val otp=state.stage==PhoneLoginStage.OTP
        AuthStepLayout(stringResource(if(otp)R.string.wa_auth_code_title else R.string.p7_phone_title),
            stringResource(if(otp)R.string.wa_auth_sent else R.string.wa_auth_description),if(otp)Icons.Default.Chat else Icons.Default.Phone,
            back={if(otp)viewModel.changeNumber() else welcome=true}) {
            if(!otp) {
                Column(Modifier.fillMaxWidth(),verticalArrangement=Arrangement.spacedBy(12.dp)){
                    OutlinedButton({picker=true},Modifier.fillMaxWidth(),enabled=!state.loading){Text(countries.firstOrNull{it.iso2==state.country}?.let{"${it.flag} ${it.name} (${it.callingCode})"}?:stringResource(R.string.wa_auth_country))}
                    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr){OutlinedTextField(state.phone,viewModel::phone,Modifier.fillMaxWidth(),singleLine=true,enabled=!state.loading,label={Text(stringResource(R.string.wa_auth_phone))},keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Phone,imeAction=ImeAction.Done),keyboardActions=KeyboardActions(onDone={focus.clearFocus()}),leadingIcon={Icon(Icons.Default.Phone,null)})}
                }
                AuthPrimary(stringResource(R.string.wa_auth_continue),!state.loading&&countries.any{it.iso2==state.country}&&state.resendSeconds(clock)==0){viewModel.request(locale)}
                if(android.os.Build.VERSION.SDK_INT>=28)TextButton(passkeyAction,enabled=!state.loading){Text(stringResource(R.string.p7_passkey_login))}
                Text(stringResource(R.string.wa_auth_legal),style=MaterialTheme.typography.bodySmall)
                Row{TextButton({legal=PreAuthLegalKind.TERMS}){Text(stringResource(R.string.terms))};TextButton({legal=PreAuthLegalKind.PRIVACY}){Text(stringResource(R.string.privacy))}}
            } else {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr){
                    Text(state.maskedPhone,style=MaterialTheme.typography.titleMedium)
                    // One native input supports six-digit paste, accessibility and predictable backspace.
                    OutlinedTextField(state.code,viewModel::code,Modifier.fillMaxWidth(),singleLine=true,enabled=!state.loading,
                        textStyle=MaterialTheme.typography.headlineMedium.copy(letterSpacing=4.sp),label={Text(stringResource(R.string.wa_auth_code))},
                        placeholder={Text("— — — — — —")},keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.NumberPassword,imeAction=ImeAction.Done),keyboardActions=KeyboardActions(onDone={focus.clearFocus()}))
                }
                AuthPrimary(stringResource(R.string.wa_auth_verify),!state.loading&&state.code.length==6){viewModel.verify()}
                TextButton({viewModel.request(locale,true)},enabled=!state.loading&&state.resendSeconds(clock)==0){Text(if(state.resendSeconds(clock)>0)stringResource(R.string.wa_auth_countdown,state.resendSeconds(clock)) else stringResource(R.string.wa_auth_resend))}
                TextButton(viewModel::changeNumber,enabled=!state.loading){Text(stringResource(R.string.wa_auth_change))}
            }
            if(!otp&&state.resendSeconds(clock)>0)Text(stringResource(R.string.wa_auth_countdown,state.resendSeconds(clock)))
            if(state.loading)LinearProgressIndicator(Modifier.fillMaxWidth())
            state.error?.let{Text(stringResource(loginErrorResource(it)),color=MaterialTheme.colorScheme.error)}
        }
    }
    run {
        if(picker)AlertDialog(onDismissRequest={picker=false},confirmButton={TextButton({picker=false}){Text(stringResource(R.string.wa_auth_close))}},title={Text(stringResource(R.string.wa_auth_country))},text={Column {
            OutlinedTextField(query,{query=it},label={Text(stringResource(R.string.wa_auth_search))},singleLine=true)
            LazyColumn(Modifier.heightIn(max=360.dp)){items(PhoneIdentity.search(countries,query),key={it.iso2}){country->TextButton({viewModel.country(country.iso2);PhoneIdentity.saveCountry(context,country.iso2);picker=false}){Text("${country.flag} ${country.name} (${country.callingCode})")}}}
        }})
        legal?.let{kind->Dialog(onDismissRequest={legal=null},properties=DialogProperties(usePlatformDefaultWidth=false)){Surface(Modifier.fillMaxSize()){NativeLegalScreen(kind){legal=null}}}}
    }
}
internal fun loginErrorResource(error:String):Int {
    if(error.startsWith("PASSKEY_"))return com.popwam.pop.ui.passkeyErrorResource(runCatching{com.popwam.pop.ui.PasskeyLoginError.valueOf(error.removePrefix("PASSKEY_"))}.getOrDefault(com.popwam.pop.ui.PasskeyLoginError.AUTHENTICATION_FAILED))
    return when(error) {
    "PHONE_INVALID","PHONE_COUNTRY_UNAVAILABLE"->R.string.wa_auth_invalid_phone
    "OTP_INVALID"->R.string.wa_auth_invalid_code
    "OTP_EXPIRED","OTP_USED"->R.string.wa_auth_expired
    "OTP_ATTEMPTS_EXHAUSTED"->R.string.wa_auth_attempts
    "OTP_COOLDOWN","OTP_RATE_LIMITED"->R.string.wa_auth_wait
    "OFFLINE"->R.string.wa_auth_offline
    "OTP_DELIVERY_FAILED","OTP_PROVIDER_TIMEOUT"->R.string.wa_auth_send_failed
    else->R.string.wa_auth_unavailable
}
}
