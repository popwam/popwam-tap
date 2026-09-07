package com.popwam.pop.data.local

import java.util.Base64
import javax.crypto.spec.SecretKeySpec
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class EncryptedSnapshotStorageTest {
    private val key = SecretKeySpec(ByteArray(32) { (it + 1).toByte() }, "AES")
    private val cipher = AesGcmSnapshotCipher(keyProvider = { key })
    private val accountA = "test-account-a"
    private val accountB = "test-account-b"
    private val fixture = """{"schemaVersion":1,"accountId":"test-account-a","profiles":[{"displayName":"Sample Person"}]}"""
    private val valid: (String) -> Boolean = { it.contains("\"schemaVersion\":1") && it.contains("\"accountId\":\"$accountA\"") }

    @Test fun `plaintext encrypts to a persisted envelope`() {
        val values = FakeValues()
        val storage = EncryptedSnapshotStorage(values,cipher)
        assertTrue(storage.write(accountA,"legacy","encrypted",fixture))
        assertTrue(values.data["encrypted"].orEmpty().isNotBlank())
    }

    @Test fun `persisted envelope contains no recognizable profile json`() {
        val envelope = cipher.encrypt(accountA,fixture.toByteArray())
        assertFalse(envelope.contains("Sample Person"))
        assertFalse(envelope.contains("displayName"))
        assertFalse(envelope.contains(accountA))
    }

    @Test fun `decrypt restores original valid snapshot`() {
        assertEquals(fixture,cipher.decrypt(accountA,cipher.encrypt(accountA,fixture.toByteArray())).toString(Charsets.UTF_8))
    }

    @Test(expected = SnapshotDecryptionException::class)
    fun `tampered ciphertext fails authentication`() {
        val bytes = Base64.getDecoder().decode(cipher.encrypt(accountA,fixture.toByteArray()))
        bytes[bytes.lastIndex] = (bytes.last().toInt() xor 1).toByte()
        cipher.decrypt(accountA,Base64.getEncoder().encodeToString(bytes))
    }

    @Test(expected = SnapshotDecryptionException::class)
    fun `account A envelope cannot decrypt as account B`() {
        cipher.decrypt(accountB,cipher.encrypt(accountA,fixture.toByteArray()))
    }

    @Test fun `logout clear removes encrypted and legacy account values`() {
        val values = FakeValues(mutableMapOf("legacy" to fixture,"encrypted" to cipher.encrypt(accountA,fixture.toByteArray())))
        assertTrue(EncryptedSnapshotStorage(values,cipher).clear("legacy","encrypted"))
        assertTrue(values.data.isEmpty())
    }

    @Test fun `legacy plaintext migrates and is removed after verified encryption`() {
        val values = FakeValues(mutableMapOf("legacy" to fixture))
        val storage = EncryptedSnapshotStorage(values,cipher)
        assertEquals(fixture,storage.read(accountA,"legacy","encrypted",valid))
        assertNull(values.data["legacy"])
        assertFalse(values.data["encrypted"].orEmpty().contains("Sample Person"))
        assertEquals(fixture,storage.read(accountA,"legacy","encrypted",valid))
    }

    @Test fun `failed encrypted write creates no plaintext fallback`() {
        val values = FakeValues(failWrites=true)
        assertFalse(EncryptedSnapshotStorage(values,cipher).write(accountA,"legacy","encrypted",fixture))
        assertNull(values.data["legacy"])
        assertNull(values.data["encrypted"])
    }
}

private class FakeValues(
    val data: MutableMap<String,String> = mutableMapOf(),
    private val failWrites: Boolean = false,
) : SnapshotKeyValueStorage {
    override fun read(key:String)=data[key]
    override fun write(key:String,value:String):Boolean {
        if(failWrites)return false
        data[key]=value
        return true
    }
    override fun remove(key:String):Boolean {
        data.remove(key)
        return true
    }
}
