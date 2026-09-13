package com.popwam.pop.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.popwam.pop.data.api.*
import com.popwam.pop.data.auth.PhoneIdentity
import com.popwam.pop.data.auth.SessionRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import com.google.gson.JsonParser

enum class PhoneLoginStage { PHONE, OTP, AUTHENTICATED }
data class PhoneLoginState(
    val stage:PhoneLoginStage=PhoneLoginStage.PHONE,
    val phone:String="", val country:String="EG", val code:String="",
    val canonicalPhone:String="", val challengeId:String="", val maskedPhone:String="",
    val resendAt:Long=0, val expiresAt:Long=0, val loading:Boolean=false,
    val error:String?=null,
) {
    fun resendSeconds(now:Long)=((resendAt-now+999)/1000).coerceAtLeast(0).toInt()
}
fun otpDigits(raw:String)=raw.mapNotNull { it.digitToIntOrNull()?.digitToChar() }.take(6).joinToString("")
interface PhoneLoginGateway {
    suspend fun passkeyOptions():com.google.gson.JsonObject=error("PASSKEY_UNAVAILABLE")
    suspend fun verifyPasskey(assertion:com.google.gson.JsonObject):AuthResponse=error("PASSKEY_UNAVAILABLE")
    suspend fun request(phone:String,country:String,locale:String):OtpRequestResponse
    suspend fun verify(challenge:String,phone:String,code:String):AuthResponse
}
class SessionPhoneLoginGateway(private val sessions:SessionRepository):PhoneLoginGateway {
    override suspend fun passkeyOptions()=sessions.passkeyAuthenticationOptions()
    override suspend fun verifyPasskey(assertion:com.google.gson.JsonObject)=sessions.verifyPasskey(assertion)
    override suspend fun request(phone:String,country:String,locale:String)=sessions.requestOtp(phone,country,locale)
    override suspend fun verify(challenge:String,phone:String,code:String)=sessions.verifyOtp(challenge,phone,code)
}

class PhoneLoginViewModel(private val gateway:PhoneLoginGateway, private val now:()->Long={android.os.SystemClock.elapsedRealtime()}):ViewModel() {
    private val mutable=MutableStateFlow(PhoneLoginState())
    val state=mutable.asStateFlow()
    fun phone(value:String){if(!mutable.value.loading)mutable.value=mutable.value.copy(phone=value.take(64),error=null)}
    fun country(value:String){if(!mutable.value.loading)mutable.value=mutable.value.copy(country=value,error=null)}
    fun code(value:String){if(!mutable.value.loading)mutable.value=mutable.value.copy(code=otpDigits(value),error=null)}
    fun changeNumber(){if(!mutable.value.loading)mutable.value=PhoneLoginState(country=mutable.value.country,phone=mutable.value.phone)}
    fun resetAfterLogout(){mutable.value=PhoneLoginState(country=mutable.value.country)}
    fun request(locale:String,resend:Boolean=false) {
        val before=mutable.value
        if(before.loading || (resend && before.resendSeconds(now())>0))return
        val normalized=PhoneIdentity.normalize(before.phone,before.country)
        if(normalized==null){mutable.value=before.copy(error="PHONE_INVALID");return}
        mutable.value=before.copy(loading=true,error=null)
        viewModelScope.launch {
            try {
                val response=gateway.request(normalized,before.country,locale)
                check(response.ok && response.challengeId.isNotBlank())
                mutable.value=before.copy(stage=PhoneLoginStage.OTP,canonicalPhone=normalized,maskedPhone=PhoneIdentity.mask(normalized),
                    challengeId=response.challengeId,code="",resendAt=now()+response.resendAfterSeconds*1000L,
                    expiresAt=now()+response.expiresInSeconds*1000L,loading=false,error=null)
            } catch(error:Throwable){failed(error)}
        }
    }
    fun verify() {
        val before=mutable.value
        if(before.loading || before.stage!=PhoneLoginStage.OTP)return
        if(before.code.length!=6){mutable.value=before.copy(error="OTP_INVALID");return}
        mutable.value=before.copy(loading=true,error=null)
        viewModelScope.launch {
            try {
                val result=gateway.verify(before.challengeId,before.canonicalPhone,before.code)
                check(result.ok && result.user!=null && result.accessToken.isNotBlank() && result.refreshToken.isNotBlank())
                mutable.value=before.copy(stage=PhoneLoginStage.AUTHENTICATED,code="",loading=false,error=null)
            } catch(error:Throwable){failed(error)}
        }
    }
    fun passkey(authenticate:suspend(String)->String) {
        if(mutable.value.loading)return
        mutable.value=mutable.value.copy(loading=true,error=null)
        viewModelScope.launch {
            try {
                val options=gateway.passkeyOptions()
                val assertion=authenticate(options.toString())
                val result=gateway.verifyPasskey(JsonParser.parseString(assertion).asJsonObject)
                check(result.ok && result.user!=null && result.accessToken.isNotBlank() && result.refreshToken.isNotBlank())
                mutable.value=mutable.value.copy(stage=PhoneLoginStage.AUTHENTICATED,loading=false,error=null)
            } catch(error:Throwable) {
                if(error is CancellationException)throw error
                mutable.value=mutable.value.copy(loading=false,error="PASSKEY_FALLBACK")
            }
        }
    }
    private fun failed(error:Throwable) {
        if(error is CancellationException)throw error
        val body=(error as? HttpException)?.response()?.errorBody()?.string()
        val json=runCatching{JsonParser.parseString(body).asJsonObject}.getOrNull()
        val reason=runCatching{json?.get("error")?.asString}.getOrNull()
        val retry=runCatching{json?.get("retryAfterSeconds")?.asInt}.getOrNull()?.coerceIn(0,3600)?:0
        mutable.value=mutable.value.copy(loading=false,error=if(error is java.io.IOException)"OFFLINE" else reason?:"OTP_UNAVAILABLE",
            resendAt=if(retry>0)now()+retry*1000L else mutable.value.resendAt)
    }
}
class PhoneLoginFactory(private val gateway:PhoneLoginGateway):ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST") override fun <T:ViewModel> create(modelClass:Class<T>):T=PhoneLoginViewModel(gateway) as T
}
