package com.popwam.tap.nfc

import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

sealed interface NfcResult {
    data class Success(val uri: String, val locked: Boolean = false) : NfcResult
    data class Failure(val reason: NfcFailure) : NfcResult
}

enum class NfcFailure {
    UNSUPPORTED,
    READ_ONLY,
    TOO_SMALL,
    CONNECT_FAILED,
    WRITE_FAILED,
    VERIFY_FAILED,
    LOCK_UNSUPPORTED,
    LOCK_FAILED,
    NO_URI,
}

class NfcTagManager {
    suspend fun read(tag: Tag): NfcResult = withContext(Dispatchers.IO) {
        val ndef = Ndef.get(tag)
            ?: return@withContext NfcResult.Failure(NfcFailure.UNSUPPORTED)
        try {
            ndef.connect()
            val uri = firstUri(ndef.ndefMessage)
                ?: return@withContext NfcResult.Failure(NfcFailure.NO_URI)
            NfcResult.Success(uri, locked = !ndef.isWritable)
        } catch (_: Exception) {
            NfcResult.Failure(NfcFailure.CONNECT_FAILED)
        } finally {
            runCatching { ndef.close() }
        }
    }

    suspend fun writeAndVerify(tag: Tag, uri: String): NfcResult = withContext(Dispatchers.IO) {
        if (!PermanentUrlPolicy.isValid(uri)) {
            return@withContext NfcResult.Failure(NfcFailure.VERIFY_FAILED)
        }
        val message = NdefMessage(arrayOf(NdefRecord.createUri(uri)))
        var ndef = Ndef.get(tag)

        if (ndef == null) {
            val formatable = NdefFormatable.get(tag)
                ?: return@withContext NfcResult.Failure(NfcFailure.UNSUPPORTED)
            try {
                formatable.connect()
                formatable.format(message)
            } catch (_: Exception) {
                return@withContext NfcResult.Failure(NfcFailure.WRITE_FAILED)
            } finally {
                runCatching { formatable.close() }
            }
            ndef = Ndef.get(tag)
                ?: return@withContext NfcResult.Failure(NfcFailure.VERIFY_FAILED)
        }

        val connectedNdef = ndef
        try {
            connectedNdef.connect()
            if (!connectedNdef.isWritable) {
                return@withContext NfcResult.Failure(NfcFailure.READ_ONLY)
            }
            if (connectedNdef.maxSize < message.toByteArray().size) {
                return@withContext NfcResult.Failure(NfcFailure.TOO_SMALL)
            }
            connectedNdef.writeNdefMessage(message)
            val verified = firstUri(connectedNdef.ndefMessage)
            if (verified == uri) {
                NfcResult.Success(uri)
            } else {
                NfcResult.Failure(NfcFailure.VERIFY_FAILED)
            }
        } catch (_: Exception) {
            NfcResult.Failure(NfcFailure.WRITE_FAILED)
        } finally {
            runCatching { connectedNdef.close() }
        }
    }

    suspend fun verifyAndLock(tag: Tag, expectedUri: String): NfcResult =
        withContext(Dispatchers.IO) {
            if (!PermanentUrlPolicy.isValid(expectedUri)) {
                return@withContext NfcResult.Failure(NfcFailure.VERIFY_FAILED)
            }
            val ndef = Ndef.get(tag)
                ?: return@withContext NfcResult.Failure(NfcFailure.UNSUPPORTED)
            try {
                ndef.connect()
                if (firstUri(ndef.ndefMessage) != expectedUri) {
                    return@withContext NfcResult.Failure(NfcFailure.VERIFY_FAILED)
                }
                if (!ndef.canMakeReadOnly()) {
                    return@withContext NfcResult.Failure(NfcFailure.LOCK_UNSUPPORTED)
                }
                if (!ndef.makeReadOnly()) {
                    return@withContext NfcResult.Failure(NfcFailure.LOCK_FAILED)
                }
                NfcResult.Success(expectedUri, locked = true)
            } catch (_: Exception) {
                NfcResult.Failure(NfcFailure.LOCK_FAILED)
            } finally {
                runCatching { ndef.close() }
            }
        }

    private fun firstUri(message: NdefMessage?): String? =
        message?.records?.firstNotNullOfOrNull { record ->
            runCatching { record.toUri()?.toString() }.getOrNull()
        }
}
