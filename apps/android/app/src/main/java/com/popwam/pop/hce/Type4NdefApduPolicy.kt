package com.popwam.pop.hce

object Type4NdefApduPolicy {
    private val selectNdefApplication = hex("00A4040007D2760000850101")

    /** NFC Forum readers may omit Le or append the single short Le=00 byte. */
    fun selectsNdefApplication(command: ByteArray): Boolean =
        command.contentEquals(selectNdefApplication) ||
            command.size == selectNdefApplication.size + 1 &&
            command.last() == 0.toByte() &&
            command.copyOf(selectNdefApplication.size).contentEquals(selectNdefApplication)

    fun selectedFileId(command: ByteArray): Int? {
        if (command.size != 7 || command[0] != 0.toByte() || command[1] != 0xA4.toByte() ||
            command[2] != 0.toByte() || command[3] != 0x0C.toByte() || command[4] != 2.toByte()
        ) return null
        return ((command[5].toInt() and 0xff) shl 8) or (command[6].toInt() and 0xff)
    }

    fun read(file: ByteArray, offset: Int, shortLe: Int): ByteArray? {
        if (offset < 0 || offset > file.size || shortLe !in 0..255) return null
        val requested = if (shortLe == 0) 256 else shortLe
        return file.copyOfRange(offset, minOf(offset + requested, file.size))
    }

    private fun hex(value: String) = value.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
