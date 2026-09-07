package com.popwam.pop.data.auth

import android.os.Build
import com.popwam.pop.data.api.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.HttpException

class SessionRepository(private val authApi:AuthApi,private val store:SessionStore){private val mutex=Mutex();private var afterAuthentication:suspend()->Unit={};private var beforeLogout:suspend()->Unit={};val authenticated get()=store.snapshot()!=null;val role get()=store.snapshot()?.role
    fun setLifecycleHooks(onAuthenticated:suspend()->Unit,onBeforeLogout:suspend()->Unit){afterAuthentication=onAuthenticated;beforeLogout=onBeforeLogout}
    suspend fun initialize()=store.load()
    suspend fun exchangeFirebasePhone(idToken:String):AuthResponse{
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.POP_EXCHANGE_REQUEST)
        val response=try { authApi.exchangeFirebasePhone(idToken,FirebasePhoneExchangeRequest(deviceName())) } catch(error:Throwable) { AuthRuntimeDiagnostics.failure(AuthRuntimeStage.POP_EXCHANGE_RESPONSE,error,(error as? HttpException)?.code()); throw error }
        AuthRuntimeDiagnostics.mark(AuthRuntimeStage.POP_EXCHANGE_RESPONSE,if(response.ok)"success" else "rejected")
        if(!response.ok) AuthRuntimeDiagnostics.failure(AuthRuntimeStage.POP_EXCHANGE_RESPONSE,safeError=response.error)
        return acceptAuthenticated(response)
    }
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
                store.save(before.copy(accessToken = response.accessToken, refreshToken = response.refreshToken))
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
    private suspend fun acceptAuthenticated(response:AuthResponse,passkey:Boolean=false):AuthResponse{if(response.ok&&response.user!=null&&response.accessToken.isNotBlank()&&response.refreshToken.isNotBlank()){store.save(SessionTokens(response.accessToken,response.refreshToken,response.user.id,response.user.role));AuthRuntimeDiagnostics.mark(AuthRuntimeStage.POP_SESSION_SAVE,"success");if(passkey)AuthRuntimeDiagnostics.mark(AuthRuntimeStage.PASSKEY_SESSION_SAVE,"success");runCatching{afterAuthentication()}};return response}
    private fun deviceName()="${Build.MANUFACTURER} ${Build.MODEL}".take(120)
}

/** The app sends only server-issued WebAuthn JSON to Credential Manager. */
fun passkeyAuthenticationOptionsValid(options:com.google.gson.JsonObject)=options.has("challenge")&&options.has("rpId")
