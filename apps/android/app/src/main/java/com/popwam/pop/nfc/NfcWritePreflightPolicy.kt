package com.popwam.pop.nfc

object NfcWritePreflightPolicy {
    fun failure(isWritable: Boolean, capacityBytes: Int, payloadBytes: Int): NfcFailure? = when {
        !isWritable -> NfcFailure.READ_ONLY
        payloadBytes < 1 -> NfcFailure.VERIFY_FAILED
        capacityBytes < payloadBytes -> NfcFailure.TOO_SMALL
        else -> null
    }
}
