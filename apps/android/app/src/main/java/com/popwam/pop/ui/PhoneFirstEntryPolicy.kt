package com.popwam.pop.ui

enum class PhoneEntryStage { PHONE, OTP, AUTHENTICATED }

fun phoneEntryStage(challengeId: String?, authenticated: Boolean): PhoneEntryStage = when {
    authenticated -> PhoneEntryStage.AUTHENTICATED
    challengeId != null -> PhoneEntryStage.OTP
    else -> PhoneEntryStage.PHONE
}

fun canSubmitOtp(code: String, loading: Boolean) = !loading && code.length == 6 && code.all(Char::isDigit)
