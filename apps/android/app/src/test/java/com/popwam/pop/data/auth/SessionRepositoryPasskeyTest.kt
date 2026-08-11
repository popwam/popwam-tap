package com.popwam.pop.data.auth

import com.google.gson.JsonObject
import com.google.gson.JsonArray
import com.popwam.pop.data.api.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

class SessionRepositoryPasskeyTest {
    private class Store(initial:SessionTokens?=null):SessionStore {
        var tokens=initial
        override fun snapshot()=tokens
        override suspend fun load()=tokens
        override suspend fun save(tokens:SessionTokens){this.tokens=tokens}
        override suspend fun clear(){tokens=null}
    }
    private class Api(var passkey:AuthResponse):AuthApi {
        override suspend fun localizationBootstrap()=LocalizationBootstrapResponse(ok=true,availableLocales=listOf(LocalizationLocaleDto()))
        override suspend fun platformBootstrap()=PlatformBootstrapResponse(ok=true)
        var logoutCalls=0
        var exchangedToken:String?=null
        var refreshResponse=AuthResponse(ok=true,accessToken="access-2",refreshToken="refresh-2")
        override suspend fun exchangeFirebasePhone(firebaseIdToken:String,body:FirebasePhoneExchangeRequest):AuthResponse{exchangedToken=firebaseIdToken;return passkey}
        override suspend fun passkeyAuthenticationOptions()=JsonObject().apply{addProperty("challenge","opaque")}
        override suspend fun verifyPasskey(body:PasskeyAuthVerifyRequest)=passkey
        override suspend fun refresh(body:RefreshRequest)=refreshResponse
        override suspend fun logout(body:LogoutRequest):ApiResult{logoutCalls++;return ApiResult(ok=true)}
    }
    private fun success()=AuthResponse(ok=true,accessToken="access",refreshToken="refresh",user=UserDto(id="user-1",email="user@example.invalid",role="USER"))

    @Test fun `successful assertion stores normal POP mobile tokens and runs lifecycle hooks`()=runTest {
        val store=Store();val repository=SessionRepository(Api(success()),store);var hooks=0
        repository.setLifecycleHooks({hooks++},{})
        val response=repository.verifyPasskey(JsonObject())
        assertTrue(response.ok);assertEquals(SessionTokens("access","refresh","user-1","USER"),store.tokens);assertEquals(1,hooks)
    }
    @Test fun `server rejection stores no session`()=runTest {
        val store=Store();val repository=SessionRepository(Api(AuthResponse(ok=false,error="PASSKEY_AUTH_FAILED")),store)
        assertFalse(repository.verifyPasskey(JsonObject()).ok);assertNull(store.tokens)
    }
    @Test fun `authentication options must contain the real WebAuthn challenge and RP identifier`() {
        assertTrue(passkeyAuthenticationOptionsValid(JsonObject().apply { addProperty("challenge","opaque");addProperty("rpId","pop.popwam.com") }))
        assertFalse(passkeyAuthenticationOptionsValid(JsonObject().apply { addProperty("ok",false);addProperty("error","PASSKEY_UNAVAILABLE") }))
    }
    @Test fun `Firebase proof exchange stores only the resulting POP session`()=runTest {
        val store=Store();val api=Api(success());val repository=SessionRepository(api,store)
        assertTrue(repository.exchangeFirebasePhone("firebase-proof").ok)
        assertEquals("firebase-proof",api.exchangedToken)
        assertEquals("user-1",store.tokens?.userId)
        assertFalse(store.tokens.toString().contains("firebase-proof"))
    }
    @Test fun `Firebase failure after passkey success retains POP session`()=runTest {
        val store=Store();val repository=SessionRepository(Api(success()),store)
        repository.setLifecycleHooks({throw IllegalStateException("firebase unavailable")},{})
        repository.verifyPasskey(JsonObject());assertNotNull(store.tokens)
    }
    @Test fun `FCM failure after passkey success retains POP session`()=runTest {
        val store=Store();val repository=SessionRepository(Api(success()),store)
        repository.setLifecycleHooks({throw java.io.IOException("fcm unavailable")},{})
        repository.verifyPasskey(JsonObject());assertNotNull(store.tokens)
    }
    @Test fun `refresh and logout behavior is unchanged`()=runTest {
        val store=Store(SessionTokens("access","refresh","user-1","USER"));val api=Api(success());val repository=SessionRepository(api,store)
        assertEquals("access-2",repository.refresh());assertEquals("refresh-2",store.tokens?.refreshToken)
        repository.logout();assertNull(store.tokens);assertEquals(1,api.logoutCalls)
    }
    @Test fun `failed refresh invalidates local session before logout lifecycle hook`()=runTest {
        val store=Store(SessionTokens("access","refresh","user-1","USER"));val api=Api(success()).apply{refreshResponse=AuthResponse(ok=false,error="SESSION_EXPIRED")};val repository=SessionRepository(api,store);var hooks=0
        repository.setLifecycleHooks({}, {assertFalse(repository.authenticated);hooks++})
        assertNull(repository.refresh());assertNull(store.tokens);assertEquals(1,hooks)
    }
}
