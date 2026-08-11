package com.popwam.pop.hce

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class Type4NdefApduPolicyTest {
    @Test fun `select application accepts omitted or zero short Le only`() {
        assertEquals(true, Type4NdefApduPolicy.selectsNdefApplication(hex("00A4040007D2760000850101")))
        assertEquals(true, Type4NdefApduPolicy.selectsNdefApplication(hex("00A4040007D276000085010100")))
        assertEquals(false, Type4NdefApduPolicy.selectsNdefApplication(hex("00A4040007D276000085010101")))
        assertEquals(false, Type4NdefApduPolicy.selectsNdefApplication(hex("00A4040007D27600008501010000")))
        assertEquals(false, Type4NdefApduPolicy.selectsNdefApplication(hex("00A4040006D27600008501")))
    }

    @Test fun `short Le zero requests up to 256 bounded by file`() {
        val file = ByteArray(300) { (it and 0xff).toByte() }
        assertEquals(256, Type4NdefApduPolicy.read(file, 0, 0)?.size)
        assertEquals(20, Type4NdefApduPolicy.read(file, 280, 0)?.size)
        assertArrayEquals(byteArrayOf(), Type4NdefApduPolicy.read(file, 300, 0))
        assertNull(Type4NdefApduPolicy.read(file, 301, 0))
    }

    @Test fun `select file validates full bounded command before reading id`() {
        assertEquals(0xE103, Type4NdefApduPolicy.selectedFileId(hex("00A4000C02E103")))
        assertEquals(0xE104, Type4NdefApduPolicy.selectedFileId(hex("00A4000C02E104")))
        assertNull(Type4NdefApduPolicy.selectedFileId(hex("00A4000C02E1")))
        assertNull(Type4NdefApduPolicy.selectedFileId(hex("00A4000002E104")))
    }

    private fun hex(value: String) = value.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
