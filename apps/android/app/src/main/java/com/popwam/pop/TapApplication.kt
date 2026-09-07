package com.popwam.pop

import android.app.Application
import com.google.gson.GsonBuilder
import com.popwam.pop.data.api.AuthApi
import com.popwam.pop.data.api.PopwamApi
import com.popwam.pop.data.api.ProfileRuntimeDiagnostics
import com.popwam.pop.data.auth.*
import com.popwam.pop.data.repository.PopwamRepository
import com.popwam.pop.data.repository.LocalFirstRepository
import com.popwam.pop.data.local.LocalFirstStore
import com.popwam.pop.data.repository.AuthSetupRepository
import com.popwam.pop.data.localization.LocalizationAuthorityStore
import com.popwam.pop.data.launch.AndroidLaunchStatePersistence
import com.popwam.pop.data.launch.LegacyLaunchStateMigrator
import com.popwam.pop.hce.HceConfig
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
import coil3.ImageLoader
import coil3.SingletonImageLoader
import coil3.network.okhttp.OkHttpNetworkFetcherFactory

class TapApplication:Application(),SingletonImageLoader.Factory{
    lateinit var container:AppContainer
    override fun onCreate(){super.onCreate();LocalizationAuthorityStore.configureCachedPolicy(this);val selected=AndroidLaunchStatePersistence.peekSelectedLanguage(this);if(selected!=null&&selected in com.popwam.pop.ui.LocalePolicy.availableLocales())applyPopLanguage(selected) else applyPopLanguage(com.popwam.pop.ui.LocalePolicy.resolve(null,""));container=AppContainer(this)}
    override fun newImageLoader(context:android.content.Context)=ImageLoader.Builder(context).components{add(OkHttpNetworkFetcherFactory(callFactory={container.apiClient}))}.build()
}
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
    val apiClient=baseClient().newBuilder()
        .addInterceptor(AccessTokenInterceptor(sessionStore))
        .apply { if (BuildConfig.DEBUG) addInterceptor(ProfileRuntimeDiagnostics.httpInterceptor()) }
        .authenticator(RefreshAuthenticator(sessions))
        .build()
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
    val repository=PopwamRepository(api)
    val localStore=LocalFirstStore(application,gson)
    val localFirst=LocalFirstRepository(repository,localStore,{sessionStore.snapshot()?.userId},lifecycleScope)
    init { sessions.setLifecycleHooks({
        // A newly authenticated account is not handed to Home until its minimum
        // offline read model is safely persisted.
        localFirst.core(null,com.popwam.pop.ui.currentLocale())
        // Push registration is non-critical and remains event-driven after sign-in.
        lifecycleScope.launch {
            runCatching { pushTokens.uploadPendingIfAuthenticated() }
        }
    },{
        HceConfig.clearForLogout(application)
        pushTokens.revokeBeforeLogout()
        localFirst.clearCurrentAccount()
    }) }
    val authSetup=AuthSetupRepository(api)
    fun persistSelectedLanguage(language:String){lifecycleScope.launch{launchState.update{it.copy(hasSelectedLanguage=true,selectedLanguageTag=language)}}}
}
