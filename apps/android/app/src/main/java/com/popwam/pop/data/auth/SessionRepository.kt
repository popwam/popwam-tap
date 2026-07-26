package com.popwam.pop.data.auth

import android.os.Build
import com.popwam.pop.data.api.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class SessionRepository(private val authApi:AuthApi,private val store:SessionStore){private val mutex=Mutex();private var afterAuthentication:suspend()->Unit={};private var beforeLogout:suspend()->Unit={};val authenticated get()=store.snapshot()!=null;val role get()=store.snapshot()?.role
    fun setLifecycleHooks(onAuthenticated:suspend()->Unit,onBeforeLogout:suspend()->Unit){afterAuthentication=onAuthenticated;beforeLogout=onBeforeLogout}
    suspend fun initialize()=store.load()
    suspend fun exchangeFirebasePhone(idToken:String):AuthResponse{
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.POP_EXCHANGE_REQUEST)
        val response=authApi.exchangeFirebasePhone(idToken,FirebasePhoneExchangeRequest(deviceName()))
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.POP_EXCHANGE_RESPONSE,if(response.ok)"success" else "rejected")
        return acceptAuthenticated(response)
    }
    suspend fun passkeyAuthenticationOptions()=authApi.passkeyAuthenticationOptions()
    suspend fun verifyPasskey(assertion:com.google.gson.JsonObject)=acceptAuthenticated(authApi.verifyPasskey(PasskeyAuthVerifyRequest(assertion,deviceName())))
    suspend fun refresh():String?=mutex.withLock{val before=store.snapshot()?:return null;val response=runCatching{authApi.refresh(RefreshRequest(before.refreshToken,deviceName()))}.getOrNull();if(response?.ok==true){store.save(before.copy(accessToken=response.accessToken,refreshToken=response.refreshToken));response.accessToken}else{store.clear();null}}
    suspend fun logout(){val refresh=store.snapshot()?.refreshToken;runCatching{beforeLogout()};store.clear();if(refresh!=null)runCatching{authApi.logout(LogoutRequest(refresh))}}
    private suspend fun acceptAuthenticated(response:AuthResponse):AuthResponse{if(response.ok&&response.user!=null&&response.accessToken.isNotBlank()&&response.refreshToken.isNotBlank()){store.save(SessionTokens(response.accessToken,response.refreshToken,response.user.id,response.user.role));AuthRuntimeDiagnostics.mark(AuthRuntimeStage.POP_SESSION_SAVE,"success");runCatching{afterAuthentication()}};return response}
    private fun deviceName()="${Build.MANUFACTURER} ${Build.MODEL}".take(120)
}
