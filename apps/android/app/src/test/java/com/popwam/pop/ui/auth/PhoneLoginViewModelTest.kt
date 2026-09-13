package com.popwam.pop.ui.auth

import com.popwam.pop.data.api.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import retrofit2.HttpException
import retrofit2.Response
import okhttp3.ResponseBody.Companion.toResponseBody

@OptIn(ExperimentalCoroutinesApi::class)
class PhoneLoginViewModelTest {
    private val dispatcher=StandardTestDispatcher()
    private var now=0L
    private class Gateway:PhoneLoginGateway {
        override suspend fun passkeyOptions()=com.google.gson.JsonObject().apply{addProperty("challenge","server")}
        override suspend fun verifyPasskey(assertion:com.google.gson.JsonObject):AuthResponse{error?.let{throw it};return AuthResponse(ok=true,accessToken="access",refreshToken="refresh",user=UserDto(id="user"))}
        var requests=0;var verifications=0;var phone="";var country="";var error:Throwable?=null
        override suspend fun request(phone:String,country:String,locale:String):OtpRequestResponse{requests++;this.phone=phone;this.country=country;error?.let{throw it};return OtpRequestResponse(true,"server-challenge",300,60)}
        override suspend fun verify(challenge:String,phone:String,code:String):AuthResponse{verifications++;error?.let{throw it};return AuthResponse(ok=true,accessToken="access",refreshToken="refresh",user=UserDto(id="user"))}
    }
    @Before fun before(){Dispatchers.setMain(dispatcher);now=0}
    @After fun after(){Dispatchers.resetMain()}
    private fun vm(gateway:Gateway)=PhoneLoginViewModel(gateway){now}.also{it.phone("01001234567");it.country("EG")}
    @Test fun `unauthenticated state begins at phone without requests`(){val gateway=Gateway();val vm=vm(gateway);assertEquals(PhoneLoginStage.PHONE,vm.state.value.stage);assertEquals(0,gateway.requests)}
    @Test fun `invalid phone prevents delivery`()=runTest(dispatcher){val g=Gateway();val vm=vm(g);vm.phone("123");vm.request("en");runCurrent();assertEquals("PHONE_INVALID",vm.state.value.error);assertEquals(0,g.requests)}
    @Test fun `country calling code normalizes before request`()=runTest(dispatcher){val g=Gateway();val vm=vm(g);vm.request("en");assertTrue(vm.state.value.loading);runCurrent();assertEquals("+201001234567",g.phone);assertEquals("EG",g.country);assertEquals(PhoneLoginStage.OTP,vm.state.value.stage);assertFalse(vm.state.value.maskedPhone.contains("1001234567"))}
    @Test fun `duplicate continue is ignored while loading`()=runTest(dispatcher){val g=Gateway();val vm=vm(g);vm.request("en");vm.request("en");runCurrent();assertEquals(1,g.requests)}
    @Test fun `paste supports only six digits and backspace`(){val vm=vm(Gateway());vm.code("12 345678");assertEquals("123456",vm.state.value.code);vm.code("12345");assertEquals("12345",vm.state.value.code);vm.code("");assertEquals("",vm.state.value.code)}
    @Test fun `Arabic numeric input normalizes to ASCII`(){assertEquals("123456",otpDigits("١٢٣٤٥٦"))}
    @Test fun `cooldown is deadline based and resend disabled before expiration`()=runTest(dispatcher){val g=Gateway();val vm=vm(g);vm.request("en");runCurrent();assertEquals(60,vm.state.value.resendSeconds(now));now=59001;assertEquals(1,vm.state.value.resendSeconds(now));vm.request("en",true);runCurrent();assertEquals(1,g.requests);now=60000;vm.request("en",true);runCurrent();assertEquals(2,g.requests);assertEquals(60,vm.state.value.resendSeconds(now))}
    @Test fun `wrong length never reaches verify endpoint`()=runTest(dispatcher){val g=Gateway();val vm=vm(g);vm.request("en");runCurrent();vm.code("123");vm.verify();runCurrent();assertEquals(0,g.verifications);assertEquals("OTP_INVALID",vm.state.value.error)}
    @Test fun `verification success navigates once and clears code`()=runTest(dispatcher){val g=Gateway();val vm=vm(g);vm.request("en");runCurrent();vm.code("123456");vm.verify();vm.verify();runCurrent();assertEquals(1,g.verifications);assertEquals(PhoneLoginStage.AUTHENTICATED,vm.state.value.stage);assertEquals("",vm.state.value.code)}
    @Test fun `invalid expired and exhausted codes remain in OTP with localized category`()=runTest(dispatcher){for(reason in listOf("OTP_INVALID","OTP_EXPIRED","OTP_ATTEMPTS_EXHAUSTED")){val g=Gateway();val vm=vm(g);vm.request("en");runCurrent();g.error=HttpException(Response.error<Any>(400,"{\"error\":\"$reason\"}".toResponseBody()));vm.code("123456");vm.verify();runCurrent();assertEquals(reason,vm.state.value.error);assertEquals(PhoneLoginStage.OTP,vm.state.value.stage);assertFalse(vm.state.value.loading)}}
    @Test fun `network failure is retryable and stays inside login`()=runTest(dispatcher){val g=Gateway().apply{error=java.io.IOException()};val vm=vm(g);vm.request("en");runCurrent();assertEquals("OFFLINE",vm.state.value.error);assertEquals(PhoneLoginStage.PHONE,vm.state.value.stage);g.error=null;vm.request("en");runCurrent();assertEquals(PhoneLoginStage.OTP,vm.state.value.stage)}
    @Test fun `server cooldown overrides local timer`()=runTest(dispatcher){val g=Gateway().apply{error=HttpException(Response.error<Any>(429,"{\"error\":\"OTP_COOLDOWN\",\"retryAfterSeconds\":90}".toResponseBody()))};val vm=vm(g);vm.request("en");runCurrent();assertEquals(90,vm.state.value.resendSeconds(now))}
    @Test fun `change number clears challenge and returns to phone`()=runTest(dispatcher){val vm=vm(Gateway());vm.request("en");runCurrent();vm.code("123456");vm.changeNumber();assertEquals(PhoneLoginStage.PHONE,vm.state.value.stage);assertEquals("",vm.state.value.challengeId);assertEquals("",vm.state.value.code)}
    @Test fun `logout reset removes auth flow state`()=runTest(dispatcher){val vm=vm(Gateway());vm.request("en");runCurrent();vm.resetAfterLogout();assertEquals(PhoneLoginStage.PHONE,vm.state.value.stage);assertEquals("",vm.state.value.phone);assertEquals("",vm.state.value.challengeId)}
    @Test fun `passkey login succeeds without sending OTP`()=runTest(dispatcher){val g=Gateway();val vm=vm(g);vm.passkey{"{}"};runCurrent();assertEquals(PhoneLoginStage.AUTHENTICATED,vm.state.value.stage);assertEquals(0,g.requests)}
    @Test fun `passkey cancellation stays login and does not send OTP`()=runTest(dispatcher){val g=Gateway();val vm=vm(g);vm.passkey{throw IllegalStateException("cancelled")};runCurrent();assertEquals(PhoneLoginStage.PHONE,vm.state.value.stage);assertEquals("PASSKEY_FALLBACK",vm.state.value.error);assertEquals(0,g.requests);vm.request("en");runCurrent();assertEquals(1,g.requests)}
    @Test fun `passkey rejection retains explicit OTP fallback`()=runTest(dispatcher){val g=Gateway().apply{error=java.io.IOException()};val vm=vm(g);vm.passkey{"{}"};runCurrent();assertEquals(PhoneLoginStage.PHONE,vm.state.value.stage);assertEquals(0,g.requests)}
}
