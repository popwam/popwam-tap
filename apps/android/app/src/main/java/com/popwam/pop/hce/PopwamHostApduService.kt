package com.popwam.pop.hce

import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import com.popwam.pop.nfc.PermanentUrlPolicy

/**
 * Minimal NFC Forum Type 4 Tag emulation. It exposes one NDEF URI record only;
 * it does not implement payment, EMV, identity, or private-data protocols.
 */
class PopwamHostApduService : HostApduService() {
    private var selected = SelectedFile.NONE

    override fun processCommandApdu(commandApdu: ByteArray, extras: Bundle?): ByteArray {
        if (!HceConfig.enabled(this)) return NOT_FOUND
        val url = HceConfig.url(this)
            ?.takeIf(PermanentUrlPolicy::isValid)
            ?: return NOT_FOUND

        if (commandApdu.contentEquals(SELECT_APP)) {
            selected = SelectedFile.NONE
            return OK
        }

        if (isSelectFile(commandApdu)) {
            val id = ((commandApdu[5].toInt() and 0xff) shl 8) or
                (commandApdu[6].toInt() and 0xff)
            selected = when (id) {
                0xE103 -> SelectedFile.CC
                0xE104 -> SelectedFile.NDEF
                else -> SelectedFile.NONE
            }
            return if (selected == SelectedFile.NONE) NOT_FOUND else OK
        }

        if (isReadBinary(commandApdu)) {
            val offset = ((commandApdu[2].toInt() and 0xff) shl 8) or
                (commandApdu[3].toInt() and 0xff)
            val length = commandApdu[4].toInt() and 0xff
            val file = when (selected) {
                SelectedFile.CC -> CC_FILE
                SelectedFile.NDEF -> ndefFile(url)
                SelectedFile.NONE -> return CONDITIONS
            }
            if (offset > file.size) return WRONG_PARAMS
            return file.copyOfRange(offset, minOf(offset + length, file.size)) + OK
        }

        return NOT_FOUND
    }

    override fun onDeactivated(reason: Int) {
        selected = SelectedFile.NONE
    }

    private fun ndefFile(url: String): ByteArray {
        val bytes = NdefMessage(arrayOf(NdefRecord.createUri(url))).toByteArray()
        return byteArrayOf((bytes.size shr 8).toByte(), bytes.size.toByte()) + bytes
    }

    private fun isSelectFile(command: ByteArray) =
        command.size >= 7 &&
            command[0] == 0.toByte() &&
            command[1] == 0xA4.toByte() &&
            command[2] == 0.toByte()

    private fun isReadBinary(command: ByteArray) =
        command.size >= 5 &&
            command[0] == 0.toByte() &&
            command[1] == 0xB0.toByte()

    private enum class SelectedFile { NONE, CC, NDEF }

    companion object {
        private fun hex(value: String) = value.chunked(2)
            .map { it.toInt(16).toByte() }
            .toByteArray()

        private val SELECT_APP = hex("00A4040007D276000085010100")
        private val OK = hex("9000")
        private val NOT_FOUND = hex("6A82")
        private val WRONG_PARAMS = hex("6B00")
        private val CONDITIONS = hex("6985")
        private val CC_FILE = hex("000F2000FF00FF0406E1040FFF00FF")
    }
}
