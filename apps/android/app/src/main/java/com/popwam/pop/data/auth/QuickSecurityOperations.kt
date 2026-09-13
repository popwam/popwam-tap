package com.popwam.pop.data.auth

import kotlinx.coroutines.CancellationException

/** Provider cancellation/failure never verifies a credential or unlocks local state. */
suspend fun registerServerPasskey(options:suspend()->String,create:suspend(String)->String,verify:suspend(String)->Boolean):Boolean {
    val request=options()
    val response=create(request)
    return verify(response)
}
enum class QuickUnlockResult { SUCCESS, UNAVAILABLE, CANCELLED, INVALIDATED, FAILED }
suspend fun runQuickUnlock(available:Boolean,authorize:suspend()->Unit):QuickUnlockResult {
    if(!available)return QuickUnlockResult.UNAVAILABLE
    return try {authorize();QuickUnlockResult.SUCCESS} catch(error:Exception) {
        if(error is CancellationException)throw error
        when {
            error is java.security.InvalidKeyException -> QuickUnlockResult.INVALIDATED
            error.message in setOf("BIOMETRIC_5","BIOMETRIC_10","BIOMETRIC_13") -> QuickUnlockResult.CANCELLED
            else -> QuickUnlockResult.FAILED
        }
    }
}
