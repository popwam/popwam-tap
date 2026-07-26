package com.popwam.pop.data.auth

import androidx.activity.ComponentActivity
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.popwam.pop.BuildConfig
import java.util.concurrent.TimeUnit

enum class FirebasePhoneFailure {
    INVALID_PHONE,
    INVALID_CODE,
    SESSION_EXPIRED,
    TOO_MANY_REQUESTS,
    NETWORK,
    APP_VERIFICATION,
    RECAPTCHA,
    MISSING_ACTIVITY,
    QUOTA,
    CONFIGURATION,
    EXCHANGE,
    IDENTITY_CONFLICT,
    UNAVAILABLE,
}

sealed interface FirebasePhoneEvent {
    data class CodeSent(val verificationId:String, val resendAfterSeconds:Int = 60):FirebasePhoneEvent
    data class Verified(val idToken:String, val automatic:Boolean):FirebasePhoneEvent
    data class Failed(val reason:FirebasePhoneFailure):FirebasePhoneEvent
    data object AutoRetrievalTimedOut:FirebasePhoneEvent
}

interface FirebasePhoneAuthGateway {
    fun start(
        activity:ComponentActivity,
        phoneE164:String,
        resend:Boolean,
        callback:(FirebasePhoneEvent)->Unit,
    )
    fun verifyCode(code:String, callback:(FirebasePhoneEvent)->Unit)
    fun reset()
    fun signOut()
}

internal fun firebasePhoneFailure(
    code:String,
    network:Boolean=false,
    rateLimited:Boolean=false,
    manualCode:Boolean=false,
):FirebasePhoneFailure {
    if(rateLimited)return FirebasePhoneFailure.TOO_MANY_REQUESTS
    if(network)return FirebasePhoneFailure.NETWORK
    return when {
        code == "ERROR_INVALID_VERIFICATION_CODE" -> FirebasePhoneFailure.INVALID_CODE
        code == "ERROR_SESSION_EXPIRED" -> FirebasePhoneFailure.SESSION_EXPIRED
        code == "ERROR_INVALID_PHONE_NUMBER" -> FirebasePhoneFailure.INVALID_PHONE
        code == "ERROR_MISSING_ACTIVITY" -> FirebasePhoneFailure.MISSING_ACTIVITY
        code.contains("RECAPTCHA") -> FirebasePhoneFailure.RECAPTCHA
        code.contains("APP_NOT_AUTHORIZED") || code.contains("INVALID_APP_CREDENTIAL") -> FirebasePhoneFailure.APP_VERIFICATION
        code.contains("QUOTA") -> FirebasePhoneFailure.QUOTA
        code.contains("CONFIGURATION") || code.contains("API_KEY") -> FirebasePhoneFailure.CONFIGURATION
        manualCode -> FirebasePhoneFailure.INVALID_CODE
        else -> FirebasePhoneFailure.UNAVAILABLE
    }
}

private fun firebasePhoneFailure(error:Throwable, manualCode:Boolean=false)=firebasePhoneFailure(
    code=(error as? FirebaseAuthException)?.errorCode.orEmpty(),
    network=error is FirebaseNetworkException,
    rateLimited=error is FirebaseTooManyRequestsException,
    manualCode=manualCode,
)

class AndroidFirebasePhoneAuthGateway:FirebasePhoneAuthGateway {
    private var verificationId:String?=null
    private var resendToken:PhoneAuthProvider.ForceResendingToken?=null
    private var generation=0

    override fun start(
        activity:ComponentActivity,
        phoneE164:String,
        resend:Boolean,
        callback:(FirebasePhoneEvent)->Unit,
    ) {
        if(!BuildConfig.FIREBASE_RUNTIME_ENABLED) {
            callback(FirebasePhoneEvent.Failed(FirebasePhoneFailure.CONFIGURATION))
            return
        }
        generation+=1
        val currentGeneration=generation
        val callbacks=object:PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential:PhoneAuthCredential) {
                if(currentGeneration==generation) authenticate(credential,true,callback)
            }
            override fun onVerificationFailed(error:com.google.firebase.FirebaseException) {
                if(currentGeneration==generation) callback(FirebasePhoneEvent.Failed(firebasePhoneFailure(error)))
            }
            override fun onCodeSent(id:String, token:PhoneAuthProvider.ForceResendingToken) {
                if(currentGeneration!=generation)return
                verificationId=id
                resendToken=token
                callback(FirebasePhoneEvent.CodeSent(id))
            }
            override fun onCodeAutoRetrievalTimeOut(id:String) {
                if(currentGeneration!=generation)return
                verificationId=id
                callback(FirebasePhoneEvent.AutoRetrievalTimedOut)
            }
        }
        val builder=PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
            .setPhoneNumber(phoneE164)
            .setTimeout(60L,TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)
        if(resend) {
            val token=resendToken
            if(token==null) {
                callback(FirebasePhoneEvent.Failed(FirebasePhoneFailure.SESSION_EXPIRED))
                return
            }
            builder.setForceResendingToken(token)
        }
        PhoneAuthProvider.verifyPhoneNumber(builder.build())
    }

    override fun verifyCode(code:String, callback:(FirebasePhoneEvent)->Unit) {
        val id=verificationId
        if(id==null) {
            callback(FirebasePhoneEvent.Failed(FirebasePhoneFailure.SESSION_EXPIRED))
            return
        }
        val credential=runCatching { PhoneAuthProvider.getCredential(id,code) }.getOrElse {
            callback(FirebasePhoneEvent.Failed(firebasePhoneFailure(it,true)))
            return
        }
        authenticate(credential,false,callback)
    }

    private fun authenticate(
        credential:PhoneAuthCredential,
        automatic:Boolean,
        callback:(FirebasePhoneEvent)->Unit,
    ) {
        FirebaseAuth.getInstance().signInWithCredential(credential).addOnCompleteListener { signIn ->
            if(!signIn.isSuccessful) {
                callback(FirebasePhoneEvent.Failed(firebasePhoneFailure(signIn.exception ?: IllegalStateException(),!automatic)))
                return@addOnCompleteListener
            }
            val user=signIn.result?.user
            if(user==null) {
                callback(FirebasePhoneEvent.Failed(FirebasePhoneFailure.UNAVAILABLE))
                return@addOnCompleteListener
            }
            user.getIdToken(true).addOnCompleteListener { tokenTask ->
                val token=tokenTask.result?.token
                if(tokenTask.isSuccessful&&!token.isNullOrBlank()) callback(FirebasePhoneEvent.Verified(token,automatic))
                else callback(FirebasePhoneEvent.Failed(firebasePhoneFailure(tokenTask.exception ?: IllegalStateException())))
            }
        }
    }

    override fun reset() {
        generation+=1
        verificationId=null
        resendToken=null
    }

    override fun signOut() {
        reset()
        if(BuildConfig.FIREBASE_RUNTIME_ENABLED) runCatching { FirebaseAuth.getInstance().signOut() }
    }
}
