package com.popwam.tap.data.auth

import android.os.Build
import com.popwam.tap.data.api.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class SessionRepository(private val authApi:AuthApi,private val store:SecureSessionStore){private val mutex=Mutex();val authenticated get()=store.snapshot()!=null;val role get()=store.snapshot()?.role
    suspend fun initialize()=store.load()
    suspend fun sendOtp(phone:String,locale:String)=authApi.sendOtp(OtpSendRequest(phone,locale,deviceName()))
    suspend fun verifyOtp(challengeId:String,code:String):AuthResponse{val response=authApi.verifyOtp(OtpVerifyRequest(challengeId,code,deviceName()));if(response.ok&&response.user!=null)store.save(SessionTokens(response.accessToken,response.refreshToken,response.user.id,response.user.role));return response}
    suspend fun refresh():String?=mutex.withLock{val before=store.snapshot()?:return null;val response=runCatching{authApi.refresh(RefreshRequest(before.refreshToken,deviceName()))}.getOrNull();if(response?.ok==true){store.save(before.copy(accessToken=response.accessToken,refreshToken=response.refreshToken));response.accessToken}else{store.clear();null}}
    suspend fun logout(){val refresh=store.snapshot()?.refreshToken;store.clear();if(refresh!=null)runCatching{authApi.logout(LogoutRequest(refresh))}}
    private fun deviceName()="${Build.MANUFACTURER} ${Build.MODEL}".take(120)
}
