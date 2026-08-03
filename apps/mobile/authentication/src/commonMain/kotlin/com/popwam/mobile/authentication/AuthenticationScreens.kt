package com.popwam.mobile.authentication

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.popwam.mobile.authentication.generated.resources.*
import com.popwam.mobile.designsystem.LocalPopSemanticColors
import com.popwam.mobile.designsystem.PopRadius
import com.popwam.mobile.designsystem.PopSpacing
import com.popwam.mobile.foundation.auth.AuthenticationNextAction
import com.popwam.mobile.foundation.overlay.OverlayKey
import com.popwam.mobile.foundation.overlay.OverlayState
import com.popwam.mobile.foundation.platform.BiometricCapability
import kotlinx.coroutines.delay
import org.jetbrains.compose.resources.stringResource

data class AuthenticationCountry(
    val iso2: String,
    val callingCode: String,
    val localizedName: String,
    val flag: String,
    val placeholder: String,
)

data class AuthenticationCallbacks(
    val phoneChanged: (String) -> Unit,
    val countryOpened: () -> Unit,
    val countryClosed: () -> Unit,
    val countrySelected: (String) -> Unit,
    val countrySearchChanged: (String) -> Unit,
    val continuePhone: () -> Unit,
    val requestPhoneHint: () -> Unit,
    val otpChanged: (String) -> Unit,
    val verifyOtp: () -> Unit,
    val resendOtp: () -> Unit,
    val changePhone: () -> Unit,
    val continueVerified: () -> Unit,
    val launchPasskey: () -> Unit,
    val usePhoneFallback: () -> Unit,
    val usePasskeyFallback: () -> Unit,
    val launchBiometric: () -> Unit,
    val openBiometricSettings: () -> Unit,
    val continueAccountCreated: () -> Unit,
    val retry: () -> Unit,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthenticationExperience(
    state: AuthenticationUiState,
    overlay: OverlayState,
    countries: List<AuthenticationCountry>,
    countrySearch: String,
    callbacks: AuthenticationCallbacks,
) {
    when (state.stage) {
        AuthenticationStage.COUNTRY -> CountryScreen(state, countries, countrySearch, callbacks)
        AuthenticationStage.PASSKEY -> PasskeyScreen(state, countries.firstOrNull { it.iso2 == state.countryIso2 }, callbacks)
        AuthenticationStage.BIOMETRIC -> BiometricScreen(state, countries.firstOrNull { it.iso2 == state.countryIso2 }, callbacks)
        AuthenticationStage.ACCOUNT_CREATED -> AccountCreatedScreen(state, callbacks)
        AuthenticationStage.BLOCKED -> RecoveryScreen(state, callbacks)
        else -> PhoneScreen(state, countries.firstOrNull { it.iso2 == state.countryIso2 }, callbacks)
    }

    when (overlay.active?.key) {
        OverlayKey.OTP -> OtpSheet(state, callbacks)
        OverlayKey.VERIFIED -> VerifiedSheet(state, callbacks)
        else -> Unit
    }
}

@Composable
private fun PhoneScreen(state: AuthenticationUiState, country: AuthenticationCountry?, callbacks: AuthenticationCallbacks) {
    AuthPage {
        PopAuthenticationMark(
            color = MaterialTheme.colorScheme.primary,
            description = stringResource(Res.string.auth_pop_logo),
            modifier = Modifier.size(width = 144.dp, height = 174.dp),
        )
        Spacer(Modifier.height(24.dp))
        Text(stringResource(Res.string.auth_welcome_back), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth())
        Text(stringResource(Res.string.auth_phone_help), style = MaterialTheme.typography.bodyLarge, color = LocalPopSemanticColors.current.textSecondary, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(PopSpacing.xl))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(PopSpacing.sm), verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(
                onClick = callbacks.countryOpened,
                modifier = Modifier.heightIn(min = 56.dp),
                contentPadding = PaddingValues(horizontal = PopSpacing.md),
            ) {
                Text(country?.flag.orEmpty())
                Spacer(Modifier.width(PopSpacing.xs))
                CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides LayoutDirection.Ltr) {
                    Text(country?.callingCode ?: "+", fontWeight = FontWeight.SemiBold)
                }
            }
            CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides LayoutDirection.Ltr) {
                OutlinedTextField(
                    value = state.phoneInput,
                    onValueChange = callbacks.phoneChanged,
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    placeholder = { Text(country?.placeholder ?: stringResource(Res.string.auth_phone_number)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                )
            }
        }
        state.error?.let { AuthError(it) }
        TextButton(onClick = callbacks.requestPhoneHint, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.auth_use_phone_hint)) }
        Button(
            onClick = callbacks.continuePhone,
            modifier = Modifier.fillMaxWidth().height(64.dp),
            enabled = state.operation == AuthenticationOperation.IDLE && state.phoneInput.isNotBlank(),
            shape = RoundedCornerShape(PopRadius.medium),
        ) {
            if (state.operation == AuthenticationOperation.SUBMITTING) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
            else Text(stringResource(Res.string.auth_continue), style = MaterialTheme.typography.titleLarge)
        }
        Text(stringResource(Res.string.auth_legal), style = MaterialTheme.typography.bodySmall, color = LocalPopSemanticColors.current.textSecondary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = PopSpacing.xs))
        Spacer(Modifier.weight(1f))
        TextButton(onClick = callbacks.retry, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.auth_need_help)) }
    }
}

@Composable
private fun CountryScreen(state: AuthenticationUiState, countries: List<AuthenticationCountry>, query: String, callbacks: AuthenticationCallbacks) {
    Surface(Modifier.fillMaxSize(), color = LocalPopSemanticColors.current.backgroundTertiary) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().imePadding().padding(horizontal = PopSpacing.lg)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                TextButton(callbacks.countryClosed) {
                    AuthSecurityGlyph(SecurityGlyph.BACK, LocalPopSemanticColors.current.textPrimary, Modifier.size(28.dp))
                }
                Text(stringResource(Res.string.auth_choose_country), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            }
            OutlinedTextField(
                value = query,
                onValueChange = callbacks.countrySearchChanged,
                modifier = Modifier.fillMaxWidth().padding(vertical = PopSpacing.md),
                placeholder = { Text(stringResource(Res.string.auth_search_country)) },
                singleLine = true,
            )
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(PopSpacing.xs)) {
                items(countries, key = { it.iso2 }) { item ->
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(PopRadius.medium)).clickable { callbacks.countrySelected(item.iso2) }.padding(PopSpacing.md).semantics { role = Role.RadioButton },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(item.flag, style = MaterialTheme.typography.headlineSmall)
                        Text(item.localizedName, Modifier.weight(1f).padding(horizontal = PopSpacing.sm), style = MaterialTheme.typography.titleMedium)
                        CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides LayoutDirection.Ltr) { Text(item.callingCode, fontWeight = FontWeight.SemiBold) }
                        RadioButton(selected = item.iso2 == state.countryIso2, onClick = null)
                    }
                    HorizontalDivider(color = LocalPopSemanticColors.current.borderDefault)
                }
                if (countries.isEmpty()) item { Text(stringResource(Res.string.auth_no_country), Modifier.padding(PopSpacing.xl)) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OtpSheet(state: AuthenticationUiState, callbacks: AuthenticationCallbacks) {
    val policy = state.challenge?.otpConfiguration ?: return
    var seconds by remember(state.otp.providerChallengeHandle) { mutableIntStateOf(state.otp.remainingSeconds.coerceAtLeast(policy.resendAfterSeconds)) }
    LaunchedEffect(state.otp.providerChallengeHandle) { while (seconds > 0) { delay(1_000); seconds -= 1 } }
    LaunchedEffect(state.otp.value, state.operation) {
        if (policy.automaticSubmissionAllowed && state.otp.isComplete(policy.codeLength) && state.operation == AuthenticationOperation.IDLE) callbacks.verifyOtp()
    }
    ModalBottomSheet(onDismissRequest = {}, dragHandle = null, shape = RoundedCornerShape(topStart = PopRadius.medium, topEnd = PopRadius.medium)) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 25.dp, vertical = PopSpacing.xl), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(PopSpacing.lg)) {
            Text(stringResource(Res.string.auth_otp_instruction, policy.codeLength), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
            state.maskedPhone?.let { CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides LayoutDirection.Ltr) { Text(it, color = LocalPopSemanticColors.current.textSecondary) } }
            OtpField(state.otp.value, policy.codeLength, callbacks.otpChanged, state.operation == AuthenticationOperation.IDLE)
            state.error?.let { AuthError(it) }
            if (state.operation == AuthenticationOperation.VERIFYING) CircularProgressIndicator()
            if (!policy.automaticSubmissionAllowed) Button(onClick = callbacks.verifyOtp, enabled = state.otp.isComplete(policy.codeLength) && state.operation == AuthenticationOperation.IDLE, modifier = Modifier.fillMaxWidth()) { Text(stringResource(Res.string.auth_continue)) }
            TextButton(onClick = callbacks.resendOtp, enabled = seconds == 0 && state.operation == AuthenticationOperation.IDLE) {
                Text(if (seconds > 0) stringResource(Res.string.auth_resend_seconds, seconds) else stringResource(Res.string.auth_resend))
            }
            TextButton(onClick = callbacks.changePhone, enabled = state.operation == AuthenticationOperation.IDLE) { Text(stringResource(Res.string.auth_change_phone)) }
        }
    }
}

@Composable
private fun OtpField(value: String, length: Int, onChange: (String) -> Unit, enabled: Boolean) {
    BasicTextField(
        value = value,
        onValueChange = { onChange(it.filter(Char::isDigit).take(length)) },
        enabled = enabled,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        decorationBox = { inner ->
            Box(Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    repeat(length) { index ->
                        Box(
                            Modifier.weight(1f).height(54.dp).clip(RoundedCornerShape(PopRadius.small)).background(LocalPopSemanticColors.current.surfaceSecondary),
                            contentAlignment = Alignment.Center,
                        ) { Text(value.getOrNull(index)?.toString().orEmpty(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
                    }
                }
                Box(Modifier.size(1.dp)) { inner() }
            }
        },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VerifiedSheet(state: AuthenticationUiState, callbacks: AuthenticationCallbacks) {
    ModalBottomSheet(onDismissRequest = {}, dragHandle = null, shape = RoundedCornerShape(topStart = PopRadius.small, topEnd = PopRadius.small)) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 25.dp, vertical = PopSpacing.xxl).semantics { liveRegion = LiveRegionMode.Assertive },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PopSpacing.md),
        ) {
            AuthSecurityGlyph(SecurityGlyph.CHECK, LocalPopSemanticColors.current.success, Modifier.size(72.dp))
            Text(stringResource(Res.string.auth_verified_title), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Text(stringResource(Res.string.auth_verified_body), color = LocalPopSemanticColors.current.textSecondary, textAlign = TextAlign.Center)
            Button(callbacks.continueVerified, Modifier.fillMaxWidth().height(56.dp), enabled = state.operation == AuthenticationOperation.IDLE) { Text(stringResource(Res.string.auth_continue)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PasskeyScreen(state: AuthenticationUiState, country: AuthenticationCountry?, callbacks: AuthenticationCallbacks) {
    val enrolling = state.challenge?.nextAction == AuthenticationNextAction.ENROLL_PASSKEY
    if (enrolling) {
        PhoneScreen(state, country, callbacks)
        ModalBottomSheet(onDismissRequest = {}, dragHandle = null, shape = RoundedCornerShape(topStart = PopRadius.medium, topEnd = PopRadius.medium)) {
            Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 25.dp, vertical = PopSpacing.xl), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(PopSpacing.lg)) {
                AuthSecurityGlyph(SecurityGlyph.KEY, MaterialTheme.colorScheme.primary, Modifier.size(55.dp))
                Text(stringResource(Res.string.auth_add_passkey), style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                SecurityBenefit(stringResource(Res.string.auth_passkey_no_password), stringResource(Res.string.auth_passkey_no_password_body))
                SecurityBenefit(stringResource(Res.string.auth_passkey_compatible), stringResource(Res.string.auth_passkey_compatible_body))
                SecurityBenefit(stringResource(Res.string.auth_passkey_safe), stringResource(Res.string.auth_passkey_safe_body))
                state.error?.let { AuthError(it) }
                Button(callbacks.launchPasskey, Modifier.fillMaxWidth().height(56.dp), enabled = state.operation == AuthenticationOperation.IDLE) {
                    if (state.operation != AuthenticationOperation.IDLE) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text(stringResource(Res.string.auth_continue))
                }
            }
        }
        return
    }
    SecurityPage(
        glyph = SecurityGlyph.KEY,
        title = stringResource(if (enrolling) Res.string.auth_add_passkey else Res.string.auth_use_passkey),
        action = callbacks.launchPasskey,
        actionEnabled = state.operation == AuthenticationOperation.IDLE,
        error = state.error,
    ) {
        SecurityBenefit(stringResource(Res.string.auth_passkey_no_password), stringResource(Res.string.auth_passkey_no_password_body))
        SecurityBenefit(stringResource(Res.string.auth_passkey_compatible), stringResource(Res.string.auth_passkey_compatible_body))
        SecurityBenefit(stringResource(Res.string.auth_passkey_safe), stringResource(Res.string.auth_passkey_safe_body))
        if (!enrolling) TextButton(callbacks.usePhoneFallback, Modifier.fillMaxWidth()) { Text(stringResource(Res.string.auth_use_phone_instead)) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BiometricScreen(state: AuthenticationUiState, country: AuthenticationCountry?, callbacks: AuthenticationCallbacks) {
    val enrolling = state.challenge?.nextAction == AuthenticationNextAction.ENROLL_BIOMETRIC
    val capability = state.biometricCapability
    val title = when (capability) {
        BiometricCapability.FINGERPRINT -> Res.string.auth_setup_fingerprint
        BiometricCapability.FACE -> Res.string.auth_setup_face
        else -> if (enrolling) Res.string.auth_setup_biometric else Res.string.auth_authenticate_biometric
    }
    if (enrolling) {
        PhoneScreen(state, country, callbacks)
        ModalBottomSheet(onDismissRequest = {}, dragHandle = null, shape = RoundedCornerShape(topStart = PopRadius.medium, topEnd = PopRadius.medium)) {
            Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 37.dp, vertical = PopSpacing.xl), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(PopSpacing.lg)) {
                Text(stringResource(title), style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                AuthSecurityGlyph(SecurityGlyph.BIOMETRIC, MaterialTheme.colorScheme.primary, Modifier.size(86.dp))
                Text(stringResource(Res.string.auth_biometric_body), color = LocalPopSemanticColors.current.textSecondary, textAlign = TextAlign.Center)
                state.error?.let { AuthError(it) }
                if (capability == BiometricCapability.AVAILABLE_NOT_ENROLLED || capability == BiometricCapability.SECURITY_UPDATE_REQUIRED || capability == BiometricCapability.PERMANENTLY_LOCKED) {
                    OutlinedButton(callbacks.openBiometricSettings, Modifier.fillMaxWidth().height(56.dp)) { Text(stringResource(Res.string.auth_open_settings)) }
                }
                Button(callbacks.launchBiometric, Modifier.fillMaxWidth().height(56.dp), enabled = state.operation == AuthenticationOperation.IDLE) { Text(stringResource(Res.string.auth_continue)) }
            }
        }
        return
    }
    SecurityPage(SecurityGlyph.BIOMETRIC, stringResource(title), callbacks.launchBiometric, state.operation == AuthenticationOperation.IDLE, state.error) {
        Text(stringResource(Res.string.auth_biometric_body), color = LocalPopSemanticColors.current.textSecondary, textAlign = TextAlign.Center)
        if (capability == BiometricCapability.AVAILABLE_NOT_ENROLLED || capability == BiometricCapability.SECURITY_UPDATE_REQUIRED || capability == BiometricCapability.PERMANENTLY_LOCKED) {
            OutlinedButton(callbacks.openBiometricSettings, Modifier.fillMaxWidth().height(56.dp)) { Text(stringResource(Res.string.auth_open_settings)) }
        }
        if (!enrolling && state.challenge?.allowedMethods?.contains(com.popwam.mobile.foundation.auth.AuthenticationMethod.PASSKEY) == true) {
            TextButton(callbacks.usePasskeyFallback, Modifier.fillMaxWidth()) { Text(stringResource(Res.string.auth_use_passkey_instead)) }
        }
    }
}

@Composable
private fun AccountCreatedScreen(state: AuthenticationUiState, callbacks: AuthenticationCallbacks) {
    Surface(Modifier.fillMaxSize(), color = LocalPopSemanticColors.current.backgroundTertiary) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(horizontal = 25.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            PopAuthenticationMark(MaterialTheme.colorScheme.primary, stringResource(Res.string.auth_pop_logo), Modifier.padding(top = 34.dp).size(width = 144.dp, height = 174.dp))
            Spacer(Modifier.height(16.dp))
            AuthSecurityGlyph(SecurityGlyph.CHECK, LocalPopSemanticColors.current.success, Modifier.size(86.dp))
            Spacer(Modifier.height(42.dp))
            Text(stringResource(Res.string.auth_all_set), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Text(stringResource(Res.string.auth_account_ready), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = LocalPopSemanticColors.current.textSecondary, textAlign = TextAlign.Center, modifier = Modifier.padding(top = PopSpacing.xl))
            Spacer(Modifier.weight(1f))
            Button(callbacks.continueAccountCreated, Modifier.fillMaxWidth().height(64.dp).padding(bottom = 0.dp), enabled = !state.navigationConsumed) { Text(stringResource(Res.string.auth_continue), style = MaterialTheme.typography.titleLarge) }
            Spacer(Modifier.height(PopSpacing.xl))
        }
    }
}

@Composable
private fun RecoveryScreen(state: AuthenticationUiState, callbacks: AuthenticationCallbacks) {
    Surface(Modifier.fillMaxSize(), color = LocalPopSemanticColors.current.backgroundTertiary) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(PopSpacing.xl), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            state.error?.let { AuthError(it) }
            Button(callbacks.retry) { Text(stringResource(Res.string.auth_retry)) }
        }
    }
}

@Composable
private fun SecurityPage(glyph: SecurityGlyph, title: String, action: () -> Unit, actionEnabled: Boolean, error: AuthenticationError?, content: @Composable () -> Unit) {
    Surface(Modifier.fillMaxSize(), color = LocalPopSemanticColors.current.backgroundTertiary) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(horizontal = 25.dp, vertical = PopSpacing.xl), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(PopSpacing.lg)) {
            AuthSecurityGlyph(glyph, MaterialTheme.colorScheme.primary, Modifier.size(92.dp))
            Text(title, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            content()
            error?.let { AuthError(it) }
            Spacer(Modifier.weight(1f))
            Button(action, Modifier.fillMaxWidth().height(56.dp), enabled = actionEnabled, shape = RoundedCornerShape(PopRadius.medium)) {
                if (!actionEnabled) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text(stringResource(Res.string.auth_continue))
            }
        }
    }
}

@Composable
private fun SecurityBenefit(title: String, body: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(PopSpacing.md), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = .12f)), contentAlignment = Alignment.Center) {
            AuthSecurityGlyph(SecurityGlyph.CHECK, MaterialTheme.colorScheme.primary, Modifier.size(24.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
            Text(body, style = MaterialTheme.typography.bodyMedium, color = LocalPopSemanticColors.current.textSecondary)
        }
    }
}

@Composable
private fun AuthPage(content: @Composable ColumnScope.() -> Unit) {
    Surface(Modifier.fillMaxSize(), color = LocalPopSemanticColors.current.backgroundTertiary) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().imePadding().padding(horizontal = 31.dp, vertical = 24.dp), horizontalAlignment = Alignment.CenterHorizontally, content = content)
    }
}

@Composable
private fun AuthError(error: AuthenticationError) {
    val text = when (error) {
        AuthenticationError.OFFLINE -> Res.string.auth_offline
        AuthenticationError.RATE_LIMITED -> Res.string.auth_rate_limited
        AuthenticationError.EMPTY_PHONE,
        AuthenticationError.INCOMPLETE_PHONE,
        AuthenticationError.INVALID_COUNTRY,
        AuthenticationError.IMPOSSIBLE_NUMBER,
        AuthenticationError.INVALID_LENGTH,
        AuthenticationError.INVALID_PHONE -> Res.string.auth_invalid_phone
        AuthenticationError.PASSKEY_CANCELLED -> Res.string.auth_passkey_cancelled
        AuthenticationError.BIOMETRIC_NOT_ENROLLED -> Res.string.auth_biometric_not_enrolled
        AuthenticationError.BIOMETRIC_CANCELLED -> Res.string.auth_biometric_cancelled
        AuthenticationError.BIOMETRIC_TEMPORARILY_LOCKED -> Res.string.auth_biometric_locked
        AuthenticationError.BIOMETRIC_PERMANENTLY_LOCKED,
        AuthenticationError.BIOMETRIC_SECURITY_UPDATE_REQUIRED -> Res.string.auth_biometric_recovery
        else -> Res.string.auth_generic_error
    }
    Text(stringResource(text), color = LocalPopSemanticColors.current.errorText, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite }, textAlign = TextAlign.Center)
}
