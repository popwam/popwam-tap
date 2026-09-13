package com.popwam.pop.data.auth

import android.os.Build
import com.popwam.pop.data.api.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.HttpException

class SessionRepository(private val authApi:AuthApi,private val store:SessionStore){private val mutex=Mutex();private var afterAuthentication:suspend()->Unit={};private var beforeLogout:suspend()->Unit={};val authenticated get()=store.snapshot()!=null;val role get()=store.snapshot()?.role
    val needsOnboarding get()=store.snapshot()?.needsOnboarding==true
    suspend fun completeOnboarding(refreshSnapshot:Boolean=true){store.snapshot()?.let{store.save(it.copy(needsOnboarding=false))};if(refreshSnapshot)runCatching{afterAuthentication()}}
    fun setLifecycleHooks(onAuthenticated:suspend()->Unit,onBeforeLogout:suspend()->Unit){afterAuthentication=onAuthenticated;beforeLogout=onBeforeLogout}
    suspend fun initialize():SessionTokens? {
        store.load() ?: return null
        validateStoredSession()
        return store.snapshot()
    }
    suspend fun validateStoredSession():Boolean {
        val tokens=store.snapshot() ?: return false
        if(storedSessionBeyondRecovery(tokens)){logout();return false}
        if(accessTokenExpired(tokens.accessToken))refresh()
        return store.snapshot()!=null
    }
    suspend fun requestOtp(phone:String,country:String,locale:String)=authApi.requestOtp(OtpRequest(phone,country,locale))
    suspend fun verifyOtp(challenge:String,phone:String,code:String)=acceptAuthenticated(authApi.verifyOtp(OtpVerifyRequest(challenge,phone,code,deviceName())))
    suspend fun passkeyAuthenticationOptions():com.google.gson.JsonObject {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_AUTH_OPTIONS_REQUEST)
        return try {
            authApi.passkeyAuthenticationOptions().also { options->
                if(!passkeyAuthenticationOptionsValid(options)) throw IllegalStateException("PASSKEY_OPTIONS_INVALID")
                AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_AUTH_OPTIONS_RESPONSE,"success")
            }
        } catch(error:Throwable) {
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_AUTH_OPTIONS_RESPONSE,error,(error as? HttpException)?.code())
            throw error
        }
    }
    suspend fun verifyPasskey(assertion:com.google.gson.JsonObject):AuthResponse {
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_AUTH_VERIFY_REQUEST)
        return try {
            val result=authApi.verifyPasskey(PasskeyAuthVerifyRequest(assertion,deviceName()))
            if(result.ok) AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_AUTH_VERIFY_RESPONSE,"success")
            else AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_AUTH_VERIFY_RESPONSE,safeError=result.error)
            acceptAuthenticated(result,passkey=true)
        } catch(error:Throwable) {
            AuthRuntimeDiagnostics.failure(AuthRuntimeStage.PASSKEY_AUTH_VERIFY_RESPONSE,error,(error as? HttpException)?.code())
            throw error
        }
    }
    suspend fun refresh(rejectedAccessToken:String?=null):String? {
        var invalidated = false
        val token = mutex.withLock {
            val before = store.snapshot() ?: return@withLock null
            if(rejectedAccessToken!=null && before.accessToken!=rejectedAccessToken) return@withLock before.accessToken
            val response = try {
                authApi.refresh(RefreshRequest(before.refreshToken, deviceName()))
            } catch (error: Throwable) {
                // Transport failure and server availability are not proof that the
                // secure local session is invalid. Keep offline access intact.
                val status = (error as? HttpException)?.code()
                if (status in setOf(400, 401, 403)) {
                    store.clear()
                    invalidated = true
                }
                return@withLock null
            }
            if (response?.ok == true) {
                store.save(before.copy(accessToken = response.accessToken, refreshToken = response.refreshToken,refreshExpiresAt=System.currentTimeMillis()+response.refreshExpiresIn*1000L))
                response.accessToken
            } else {
                store.clear()
                invalidated = true
                null
            }
        }
        if (invalidated) runCatching { beforeLogout() }
        return token
    }
    suspend fun logout(){val refresh=store.snapshot()?.refreshToken;runCatching{beforeLogout()};store.clear();if(refresh!=null)runCatching{authApi.logout(LogoutRequest(refresh))}}
    private suspend fun acceptAuthenticated(response:AuthResponse,passkey:Boolean=false):AuthResponse{if(response.ok&&response.user!=null&&response.accessToken.isNotBlank()&&response.refreshToken.isNotBlank()){store.save(SessionTokens(response.accessToken,response.refreshToken,response.user.id,response.user.role,true,System.currentTimeMillis()+response.refreshExpiresIn*1000L));AuthRuntimeDiagnostics.mark(AuthRuntimeStage.POP_SESSION_SAVE,"success");if(passkey)AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_SESSION_SAVE,"success");runCatching{afterAuthentication()}};return response}
    private fun deviceName()="${Build.MANUFACTURER} ${Build.MODEL}".take(120)
}

/** The app sends only server-issued WebAuthn JSON to Credential Manager. */
fun passkeyAuthenticationOptionsValid(options:com.google.gson.JsonObject)=options.has("challenge")&&options.has("rpId")

/** Expiry is a refresh scheduling hint only; server verification remains authoritative. */
internal fun accessTokenExpired(token:String,now:Long=System.currentTimeMillis()):Boolean=runCatching {
    val payload=String(java.util.Base64.getUrlDecoder().decode(token.split('.')[1]))
    com.google.gson.JsonParser.parseString(payload).asJsonObject.get("exp").asLong*1000L<=now
}.getOrDefault(true)

internal fun storedSessionBeyondRecovery(tokens:SessionTokens,now:Long=System.currentTimeMillis()):Boolean {
    val deadline=if(tokens.refreshExpiresAt>0)tokens.refreshExpiresAt else runCatching {
        val payload=String(java.util.Base64.getUrlDecoder().decode(tokens.accessToken.split('.')[1]))
        com.google.gson.JsonParser.parseString(payload).asJsonObject.get("exp").asLong*1000L+30L*24*60*60*1000
    }.getOrDefault(0L)
    return deadline<=now
}
