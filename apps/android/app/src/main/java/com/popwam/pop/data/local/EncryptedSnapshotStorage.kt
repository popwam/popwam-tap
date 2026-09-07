package com.popwam.pop.data.local

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.nio.ByteBuffer
import java.security.KeyStore
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

internal interface SnapshotCipher {
    fun encrypt(accountId: String, plaintext: ByteArray): String
    @Throws(SnapshotDecryptionException::class)
    fun decrypt(accountId: String, envelope: String): ByteArray
}

internal class SnapshotDecryptionException(cause: Throwable? = null) : Exception(cause)

internal class AesGcmSnapshotCipher(
    private val keyProvider: () -> SecretKey,
    private val random: SecureRandom = SecureRandom(),
) : SnapshotCipher {
    override fun encrypt(accountId: String, plaintext: ByteArray): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        // Android Keystore must generate the nonce when randomized encryption is
        // required; caller-provided IVs are intentionally rejected.
        cipher.init(Cipher.ENCRYPT_MODE, keyProvider(), random)
        val iv = cipher.iv
        check(iv.size == IV_BYTES)
        cipher.updateAAD(aad(accountId))
        val ciphertext = cipher.doFinal(plaintext)
        val envelope = ByteBuffer.allocate(1 + IV_BYTES + ciphertext.size)
            .put(FORMAT_VERSION)
            .put(iv)
            .put(ciphertext)
            .array()
        return Base64.getEncoder().encodeToString(envelope)
    }

    override fun decrypt(accountId: String, envelope: String): ByteArray = try {
        val bytes = Base64.getDecoder().decode(envelope)
        if (bytes.size <= 1 + IV_BYTES + TAG_BYTES || bytes[0] != FORMAT_VERSION) {
            throw SnapshotDecryptionException()
        }
        val iv = bytes.copyOfRange(1, 1 + IV_BYTES)
        val ciphertext = bytes.copyOfRange(1 + IV_BYTES, bytes.size)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, keyProvider(), GCMParameterSpec(TAG_BITS, iv))
        cipher.updateAAD(aad(accountId))
        cipher.doFinal(ciphertext)
    } catch (error: SnapshotDecryptionException) {
        throw error
    } catch (error: AEADBadTagException) {
        throw SnapshotDecryptionException(error)
    } catch (error: Throwable) {
        throw SnapshotDecryptionException(error)
    }

    private fun aad(accountId: String) = "$AAD_PREFIX|$accountId".toByteArray(Charsets.UTF_8)

    companion object {
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val AAD_PREFIX = "POP_LOCAL_FIRST_V1"
        private const val IV_BYTES = 12
        private const val TAG_BITS = 128
        private const val TAG_BYTES = TAG_BITS / 8
        private const val FORMAT_VERSION: Byte = 1
    }
}

internal class AndroidKeystoreSnapshotKeyProvider {
    private val lock = Any()

    fun getOrCreate(): SecretKey = synchronized(lock) {
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey) ?: generate()
    }

    private fun generate(): SecretKey {
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setKeySize(256)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return generator.generateKey()
    }

    companion object {
        private const val KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "pop_local_first_aes_gcm_v1"
    }
}

internal interface SnapshotKeyValueStorage {
    fun read(key: String): String?
    fun write(key: String, value: String): Boolean
    fun remove(key: String): Boolean
}

/** Owns encrypted writes and the one-time, verify-before-delete plaintext migration. */
internal class EncryptedSnapshotStorage(
    private val values: SnapshotKeyValueStorage,
    private val cipher: SnapshotCipher,
    private val onFailure: (String) -> Unit = {},
) {
    fun read(accountId: String, legacyKey: String, encryptedKey: String, valid: (String) -> Boolean): String? {
        values.read(encryptedKey)?.let { encrypted ->
            return decryptAndValidate(accountId, encrypted, valid).also { if(it==null)onFailure("ENCRYPTED_READ_INVALID") }
        }
        val legacy = values.read(legacyKey) ?: return null
        if (!valid(legacy)) { onFailure("LEGACY_SCHEMA_INVALID"); return null }
        val encrypted = runCatching { cipher.encrypt(accountId, legacy.toByteArray(Charsets.UTF_8)) }.getOrNull()
            ?: run { onFailure("MIGRATION_ENCRYPT_FAILED"); return null }
        if (!values.write(encryptedKey, encrypted)) { onFailure("MIGRATION_WRITE_FAILED"); return null }
        val verified = values.read(encryptedKey)?.let { decryptAndValidate(accountId, it, valid) }
        if (verified != legacy) { onFailure("MIGRATION_VERIFY_FAILED"); return null }
        if (!values.remove(legacyKey)) { onFailure("MIGRATION_DELETE_FAILED"); return null }
        return verified
    }

    fun write(accountId: String, legacyKey: String, encryptedKey: String, plaintext: String): Boolean {
        val encrypted = runCatching { cipher.encrypt(accountId, plaintext.toByteArray(Charsets.UTF_8)) }.getOrNull()
            ?: run { onFailure("ENCRYPT_FAILED"); return false }
        if (!values.write(encryptedKey, encrypted)) { onFailure("ENCRYPTED_WRITE_FAILED"); return false }
        val verified = runCatching { cipher.decrypt(accountId, values.read(encryptedKey) ?: return false).toString(Charsets.UTF_8) }
            .getOrNull()
        if (verified != plaintext) { onFailure("ENCRYPTED_VERIFY_FAILED"); return false }
        return values.remove(legacyKey).also { if(!it)onFailure("LEGACY_DELETE_FAILED") }
    }

    fun clear(legacyKey: String, encryptedKey: String): Boolean =
        values.remove(legacyKey) && values.remove(encryptedKey)

    private fun decryptAndValidate(accountId: String, encrypted: String, valid: (String) -> Boolean): String? =
        runCatching { cipher.decrypt(accountId, encrypted).toString(Charsets.UTF_8) }
            .getOrNull()
            ?.takeIf(valid)
}
