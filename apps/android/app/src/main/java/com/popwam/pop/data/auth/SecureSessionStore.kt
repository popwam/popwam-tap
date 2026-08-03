package com.popwam.pop.data.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.popwam.mobile.authentication.AuthenticationSessionVault
import com.popwam.mobile.authentication.RestorableAuthenticationState
import com.popwam.mobile.foundation.auth.AuthenticatedSession
import kotlinx.coroutines.flow.first
import java.security.KeyStore
import java.time.Instant
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private val Context.secureSessionDataStore by preferencesDataStore("secure_session")

data class SessionTokens(val accessToken:String,val refreshToken:String,val userId:String,val role:String)

private data class RestrictedSession(
    val token: String,
    val expiresAt: String,
    val completionKey: String? = null,
)

private data class StoredAuthentication(
    val version: Int = 2,
    val full: SessionTokens? = null,
    val restricted: RestrictedSession? = null,
    val restoration: RestorableAuthenticationState? = null,
)

interface SessionStore {
    fun snapshot():SessionTokens?
    suspend fun load():SessionTokens?
    suspend fun save(tokens:SessionTokens)
    suspend fun clear()
}

/**
 * The full and enrollment-only credentials share one encrypted record. Upgrading
 * therefore commits the full session and removes the restricted token in a
 * single DataStore transaction; a crash cannot leave both credentials active.
 */
class SecureSessionStore(private val context:Context):SessionStore, AuthenticationSessionVault {
    private val gson=Gson()
    private val key=stringPreferencesKey("encrypted_tokens")
    @Volatile private var current:SessionTokens?=null

    override fun snapshot():SessionTokens?=current

    override suspend fun load():SessionTokens? {
        val stored=readStored()
        current=stored.full
        return current
    }

    override suspend fun save(tokens:SessionTokens) {
        writeStored(StoredAuthentication(full=tokens))
        current=tokens
    }

    override suspend fun clear() {
        context.secureSessionDataStore.edit{it.remove(key)}
        current=null
    }

    override suspend fun readRestrictedToken():String? {
        val restricted=readStored().restricted ?: return null
        val valid=runCatching { Instant.parse(restricted.expiresAt).isAfter(Instant.now()) }.getOrDefault(false)
        if(!valid) clearRestrictedToken()
        return restricted.token.takeIf { valid }
    }

    override suspend fun saveRestrictedToken(token:String,expiresAt:String) {
        val stored=readStored()
        writeStored(stored.copy(full=null,restricted=RestrictedSession(token,expiresAt,stored.restricted?.completionKey)))
        current=null
    }

    override suspend fun commitFullSession(session:AuthenticatedSession) {
        val tokens=SessionTokens(session.accessToken,session.refreshToken,session.userId,session.role)
        writeStored(StoredAuthentication(full=tokens,restricted=null))
        current=tokens
    }

    override suspend fun clearRestrictedToken() {
        val stored=readStored()
        if(stored.restricted!=null)writeStored(stored.copy(restricted=null))
    }

    override suspend fun readRestoration():RestorableAuthenticationState?=readStored().restoration

    override suspend fun saveRestoration(state:RestorableAuthenticationState?) {
        val stored=readStored()
        writeStored(stored.copy(restoration=state))
    }

    override suspend fun readOrCreateCompletionKey():String {
        val stored=readStored()
        val restricted=stored.restricted ?: error("ENROLLMENT_SESSION_REQUIRED")
        restricted.completionKey?.let{return it}
        val generated=ByteArray(32).also(java.security.SecureRandom()::nextBytes).let {
            android.util.Base64.encodeToString(it,android.util.Base64.URL_SAFE or android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING)
        }
        writeStored(stored.copy(restricted=restricted.copy(completionKey=generated)))
        return generated
    }

    private suspend fun readStored():StoredAuthentication {
        val blob=context.secureSessionDataStore.data.first()[key] ?: return StoredAuthentication()
        val plain=runCatching { decrypt(blob) }.getOrNull() ?: return StoredAuthentication()
        return runCatching { gson.fromJson(plain,StoredAuthentication::class.java) }
            .getOrNull()
            ?.takeIf { it.version==2 }
            ?: runCatching { StoredAuthentication(full=gson.fromJson(plain,SessionTokens::class.java)) }.getOrDefault(StoredAuthentication())
    }

    private suspend fun writeStored(value:StoredAuthentication) {
        context.secureSessionDataStore.edit { preferences -> preferences[key]=encrypt(gson.toJson(value)) }
    }

    private fun secretKey():SecretKey {
        val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
        return (store.getKey(ALIAS,null) as? SecretKey) ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build())
            generateKey()
        }
    }

    private fun encrypt(plain:String):String {
        val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE,secretKey())
        return android.util.Base64.encodeToString(cipher.iv+cipher.doFinal(plain.toByteArray()),android.util.Base64.NO_WRAP)
    }

    private fun decrypt(blob:String):String {
        val bytes=android.util.Base64.decode(blob,android.util.Base64.NO_WRAP)
        require(bytes.size>12)
        val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE,secretKey(),GCMParameterSpec(128,bytes.copyOfRange(0,12)))
        return String(cipher.doFinal(bytes.copyOfRange(12,bytes.size)))
    }

    companion object{private const val ALIAS="popwam_mobile_session_v1"}
}
