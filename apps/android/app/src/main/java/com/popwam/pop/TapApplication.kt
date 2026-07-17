package com.popwam.pop

import android.app.Application
import com.google.gson.GsonBuilder
import com.popwam.pop.data.api.AuthApi
import com.popwam.pop.data.api.PopwamApi
import com.popwam.pop.data.auth.*
import com.popwam.pop.data.repository.PopwamRepository
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class TapApplication:Application(){lateinit var container:AppContainer;override fun onCreate(){super.onCreate();container=AppContainer(this);runBlocking{container.sessions.initialize()}}}
class AppContainer(application:Application){
    private val gson=GsonBuilder().create();val sessionStore=SecureSessionStore(application)
    private fun baseClient()=OkHttpClient.Builder().connectTimeout(15,TimeUnit.SECONDS).readTimeout(30,TimeUnit.SECONDS).apply{if(BuildConfig.DEBUG)addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC))}.build()
    private val authApi=Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL).client(baseClient()).addConverterFactory(GsonConverterFactory.create(gson)).build().create(AuthApi::class.java)
    val sessions=SessionRepository(authApi,sessionStore)
    private val apiClient=baseClient().newBuilder().addInterceptor(AccessTokenInterceptor(sessionStore)).authenticator(RefreshAuthenticator(sessions)).build()
    val api=Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL).client(apiClient).addConverterFactory(GsonConverterFactory.create(gson)).build().create(PopwamApi::class.java)
    val repository=PopwamRepository(api)
}
