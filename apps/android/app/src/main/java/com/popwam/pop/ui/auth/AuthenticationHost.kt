package com.popwam.pop.ui.auth

import android.app.Activity
import android.content.Intent
import android.provider.Settings
import androidx.activity.compose.LocalActivity
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.BackHandler
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.android.gms.auth.api.identity.GetPhoneNumberHintIntentRequest
import com.google.android.gms.auth.api.identity.Identity
import com.popwam.mobile.authentication.AuthenticationCallbacks
import com.popwam.mobile.authentication.AuthenticationCountry
import com.popwam.mobile.authentication.AuthenticationExperience
import com.popwam.mobile.authentication.AuthenticationStage
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.pop.data.auth.PhoneCountryStore
import com.popwam.pop.data.auth.PhoneIdentity
import com.popwam.pop.ui.currentLocale
import java.util.Locale

@Composable
fun AuthenticationHost(
    viewModel:AuthenticationFlowViewModel,
    countriesStore:PhoneCountryStore,
    onAuthenticated:()->Unit,
    onProfileSetup:(PopDestination.ProfileSetup)->Unit,
) {
    val activity=requireNotNull(LocalActivity.current as? FragmentActivity) {
        "AuthenticationHost requires a FragmentActivity"
    }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val overlay by viewModel.overlays.collectAsStateWithLifecycle()
    val query by viewModel.countrySearch.collectAsStateWithLifecycle()
    val configured by countriesStore.countries.collectAsStateWithLifecycle()
    val allCountries=remember(configured,currentLocale()) {
        PhoneIdentity.enabledCountries(Locale.forLanguageTag(currentLocale()),configured)
    }
    val visible=remember(allCountries,query) {
        PhoneIdentity.search(allCountries,query).map { AuthenticationCountry(it.iso2,it.callingCode,it.name,it.flag,it.placeholder) }
    }
    val phoneHint=rememberLauncherForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
        if(result.resultCode==Activity.RESULT_OK)runCatching {
            Identity.getSignInClient(activity).getPhoneNumberFromIntent(result.data)
        }.getOrNull()?.let(viewModel::updatePhone)
    }

    BackHandler(enabled=state.stage!=AuthenticationStage.PHONE) {
        when(state.stage) {
            AuthenticationStage.COUNTRY -> viewModel.closeCountry()
            AuthenticationStage.OTP -> viewModel.changePhone()
            else -> Unit
        }
    }

    LaunchedEffect(state.stage) {
        if(state.stage==AuthenticationStage.AUTHENTICATED)onAuthenticated()
        if(state.stage==AuthenticationStage.BIOMETRIC)viewModel.refreshBiometric(activity)
    }

    AuthenticationExperience(
        state=state,
        overlay=overlay,
        countries=visible,
        countrySearch=query,
        callbacks=AuthenticationCallbacks(
            phoneChanged=viewModel::updatePhone,
            countryOpened=viewModel::openCountry,
            countryClosed=viewModel::closeCountry,
            countrySelected={viewModel.selectCountry(activity,it)},
            countrySearchChanged=viewModel::searchCountry,
            continuePhone={viewModel.continuePhone(activity)},
            requestPhoneHint={
                Identity.getSignInClient(activity).getPhoneNumberHintIntent(GetPhoneNumberHintIntentRequest.builder().build())
                    .addOnSuccessListener { pending -> phoneHint.launch(IntentSenderRequest.Builder(pending).build()) }
            },
            otpChanged=viewModel::updateOtp,
            verifyOtp=viewModel::verifyOtp,
            resendOtp={viewModel.resend(activity)},
            changePhone=viewModel::changePhone,
            continueVerified=viewModel::continueVerified,
            launchPasskey={viewModel.launchPasskey(activity)},
            usePhoneFallback={viewModel.usePhoneFallback(activity)},
            usePasskeyFallback=viewModel::usePasskeyFallback,
            launchBiometric={viewModel.launchBiometric(activity)},
            openBiometricSettings={
                val intent=if(android.os.Build.VERSION.SDK_INT>=30)Intent(Settings.ACTION_BIOMETRIC_ENROLL).putExtra(Settings.EXTRA_BIOMETRIC_AUTHENTICATORS_ALLOWED,androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG) else Intent(Settings.ACTION_SECURITY_SETTINGS)
                activity.startActivity(intent)
            },
            continueAccountCreated={viewModel.accountCreatedDestination()?.let(onProfileSetup)},
            retry=viewModel::retry,
        ),
    )
}
