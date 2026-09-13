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
        var verifiedCode:String?=null
        var refreshResponse=AuthResponse(ok=true,accessToken="access-2",refreshToken="refresh-2")
        var refreshError:Throwable?=null
        override suspend fun requestOtp(body:OtpRequest)=OtpRequestResponse(true,"challenge",300,60)
        override suspend fun verifyOtp(body:OtpVerifyRequest):AuthResponse{verifiedCode=body.code;return passkey}
        override suspend fun passkeyAuthenticationOptions()=JsonObject().apply{addProperty("challenge","opaque")}
        override suspend fun verifyPasskey(body:PasskeyAuthVerifyRequest)=passkey
        override suspend fun refresh(body:RefreshRequest):AuthResponse{refreshError?.let{throw it};return refreshResponse}
        override suspend fun logout(body:LogoutRequest):ApiResult{logoutCalls++;return ApiResult(ok=true)}
    }
    private fun success()=AuthResponse(ok=true,accessToken="access",refreshToken="refresh",user=UserDto(id="user-1",email="user@example.invalid",role="USER"))

    @Test fun `stored POP session restores without another OTP request`()=runTest {
        val tokens=SessionTokens("header."+java.util.Base64.getUrlEncoder().withoutPadding().encodeToString("{\"exp\":4102444800}".toByteArray())+".sig","refresh","user-1","USER",refreshExpiresAt=4102444800000L)
        val api=Api(success());val repository=SessionRepository(api,Store(tokens))
        assertEquals(tokens,repository.initialize());assertTrue(repository.authenticated);assertNull(api.verifiedCode)
    }
    @Test fun `network refresh failure retains session and pending onboarding`()=runTest {
        val tokens=SessionTokens("access","refresh","user-1","USER",needsOnboarding=true)
        val store=Store(tokens);val api=Api(success()).apply{refreshError=java.io.IOException()};val repository=SessionRepository(api,store)
        assertNull(repository.refresh());assertEquals(tokens,store.tokens);assertTrue(repository.needsOnboarding)
    }
    @Test fun `first user setup marker persists and clears after onboarding`()=runTest {
        val store=Store();val repository=SessionRepository(Api(success().copy(needsOnboarding=true)),store);var syncs=0
        repository.setLifecycleHooks({syncs++},{})
        repository.verifyOtp("challenge","+201001234567","123456");assertTrue(repository.needsOnboarding)
        repository.completeOnboarding();assertFalse(repository.needsOnboarding);assertTrue(repository.authenticated);assertEquals(2,syncs)
    }

    @Test fun `successful assertion stores normal POP mobile tokens and runs lifecycle hooks`()=runTest {
        val store=Store();val repository=SessionRepository(Api(success()),store);var hooks=0
        repository.setLifecycleHooks({hooks++},{})
        val response=repository.verifyPasskey(JsonObject())
        assertTrue(response.ok);assertEquals("user-1",store.tokens?.userId);assertEquals("access",store.tokens?.accessToken);assertEquals(1,hooks)
    }
    @Test fun `server rejection stores no session`()=runTest {
        val store=Store();val repository=SessionRepository(Api(AuthResponse(ok=false,error="PASSKEY_AUTH_FAILED")),store)
        assertFalse(repository.verifyPasskey(JsonObject()).ok);assertNull(store.tokens)
    }
    @Test fun `authentication options must contain the real WebAuthn challenge and RP identifier`() {
        assertTrue(passkeyAuthenticationOptionsValid(JsonObject().apply { addProperty("challenge","opaque");addProperty("rpId","pop.popwam.com") }))
        assertFalse(passkeyAuthenticationOptionsValid(JsonObject().apply { addProperty("ok",false);addProperty("error","PASSKEY_UNAVAILABLE") }))
    }
    @Test fun `OTP verification stores only the resulting POP session`()=runTest {
        val store=Store();val api=Api(success());val repository=SessionRepository(api,store)
        assertTrue(repository.verifyOtp("challenge","+201001234567","123456").ok)
        assertEquals("123456",api.verifiedCode)
        assertEquals("user-1",store.tokens?.userId)
        assertFalse(store.tokens.toString().contains("123456"))
    }
    @Test fun `Post-login failure after passkey success retains POP session`()=runTest {
        val store=Store();val repository=SessionRepository(Api(success()),store)
        repository.setLifecycleHooks({throw IllegalStateException("bootstrap unavailable")},{})
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
