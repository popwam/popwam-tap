package com.popwam.pop

import android.app.Application
import com.google.gson.GsonBuilder
import com.popwam.pop.data.api.AuthApi
import com.popwam.pop.data.api.PopwamApi
import com.popwam.pop.data.auth.*
import com.popwam.pop.data.repository.PopwamRepository
import com.popwam.pop.data.repository.AuthSetupRepository
import com.popwam.pop.data.localization.LocalizationAuthorityStore
import com.popwam.pop.data.launch.AndroidLaunchStatePersistence
import com.popwam.pop.data.launch.LegacyLaunchStateMigrator
import com.popwam.pop.ui.applyPopLanguage
import com.popwam.mobile.foundation.launch.PersistedLaunchStateStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import com.popwam.mobile.authentication.KtorAuthenticationRemoteDataSource
import com.popwam.mobile.authentication.PhoneExchangeDiagnostic
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.header
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

class TapApplication:Application(){lateinit var container:AppContainer;override fun onCreate(){super.onCreate();LocalizationAuthorityStore.configureCachedPolicy(this);val selected=AndroidLaunchStatePersistence.peekSelectedLanguage(this);if(selected!=null&&selected in com.popwam.pop.ui.LocalePolicy.availableLocales())applyPopLanguage(selected) else applyPopLanguage(com.popwam.pop.ui.LocalePolicy.resolve(null,""));container=AppContainer(this)}}
class AppContainer(application:Application){
    private val gson=GsonBuilder().create();val sessionStore=SecureSessionStore(application)
    private val lifecycleScope=CoroutineScope(SupervisorJob()+Dispatchers.IO)
    val launchPersistence=AndroidLaunchStatePersistence(application)
    val launchState=PersistedLaunchStateStore(launchPersistence)
    val launchMigrator=LegacyLaunchStateMigrator(application,launchPersistence,launchState)
    private fun baseClient()=OkHttpClient.Builder()
        .connectTimeout(15,TimeUnit.SECONDS)
        .readTimeout(30,TimeUnit.SECONDS)
        .addInterceptor { chain -> chain.proceed(chain.request().newBuilder().header("X-POP-App-Version",BuildConfig.VERSION_NAME.take(32)).build()) }
        .apply{if(BuildConfig.DEBUG)addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC))}
        .build()
    private val authApi=Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL).client(baseClient()).addConverterFactory(GsonConverterFactory.create(gson)).build().create(AuthApi::class.java)
    val localization=LocalizationAuthorityStore(application,authApi,launchState)
    val phoneCountries=PhoneCountryStore(application,authApi)
    val sessions=SessionRepository(authApi,sessionStore)
    private val apiClient=baseClient().newBuilder().addInterceptor(AccessTokenInterceptor(sessionStore)).authenticator(RefreshAuthenticator(sessions)).build()
    val api=Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL).client(apiClient).addConverterFactory(GsonConverterFactory.create(gson)).build().create(PopwamApi::class.java)
    val pushTokens=FcmTokenBridge(application,api,sessions)
    val analytics=FirebasePopAnalytics(application)
    val firebasePhoneAuth=AndroidFirebasePhoneAuthGateway()
    private val authenticationHttpClient=HttpClient(OkHttp) {
        expectSuccess=false
        defaultRequest { header("X-POP-App-Version",BuildConfig.VERSION_NAME.take(32)) }
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys=true;encodeDefaults=true }) }
        engine { config { connectTimeout(15,TimeUnit.SECONDS);readTimeout(30,TimeUnit.SECONDS) } }
    }
    val authenticationRemote=KtorAuthenticationRemoteDataSource(
        authenticationHttpClient,
        BuildConfig.API_BASE_URL,
        onFailure = { code, status ->
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.POP_EXCHANGE_RESPONSE, http = status, safeError = code)
        },
        onPhoneExchangeDiagnostic = { boundary, status ->
            when (boundary) {
                PhoneExchangeDiagnostic.STARTED -> AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PHONE_EXCHANGE_STARTED)
                PhoneExchangeDiagnostic.HTTP_STATUS -> AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PHONE_EXCHANGE_HTTP_STATUS, "http_${status ?: 0}")
                PhoneExchangeDiagnostic.PARSED -> AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PHONE_EXCHANGE_PARSED)
            }
        },
    )
    init { sessions.setLifecycleHooks({
        // POP OTP persistence has already completed. Supplementary work must not delay setup routing.
        lifecycleScope.launch {
            runCatching { pushTokens.uploadPendingIfAuthenticated() }
        }
    },{ pushTokens.revokeBeforeLogout() }) }
    val repository=PopwamRepository(api)
    val authSetup=AuthSetupRepository(api)
    fun persistSelectedLanguage(language:String){lifecycleScope.launch{launchState.update{it.copy(hasSelectedLanguage=true,selectedLanguageTag=language)}}}
}
