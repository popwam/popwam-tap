package com.popwam.pop.data.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import kotlinx.coroutines.flow.first
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private val Context.secureSessionDataStore by preferencesDataStore("secure_session")

data class SessionTokens(val accessToken:String,val refreshToken:String,val userId:String,val role:String,val needsOnboarding:Boolean=false,val refreshExpiresAt:Long=0)

private data class StoredAuthentication(val version:Int=2,val full:SessionTokens?=null)

interface SessionStore {
    fun snapshot():SessionTokens?
    suspend fun load():SessionTokens?
    suspend fun save(tokens:SessionTokens)
    suspend fun clear()
}

/** Preserves the existing encrypted v2 record and Keystore alias; retired enrollment fields are ignored. */
class SecureSessionStore(private val context:Context):SessionStore {
    private val gson=Gson()
    private val key=stringPreferencesKey("encrypted_tokens")
    private val wrappedKey=stringPreferencesKey("biometric_wrapped_key")
    @Volatile private var wrappingBlob:String?=null
    @Volatile private var unlockedKey:SecretKey?=null
    val biometricLocked get()=wrappingBlob!=null && unlockedKey==null
    val biometricEnabled get()=wrappingBlob!=null
    private val _locked=kotlinx.coroutines.flow.MutableStateFlow(false)
    val locked: kotlinx.coroutines.flow.StateFlow<Boolean> = _locked

    @Volatile private var current:SessionTokens?=null

    fun lockForBackground() {
        if(!biometricEnabled)return
        current=null;unlockedKey=null;_locked.value=true
    }
    override fun snapshot():SessionTokens?=current

    override suspend fun load():SessionTokens? {
        wrappingBlob=context.secureSessionDataStore.data.first()[wrappedKey]
        if(biometricLocked){_locked.value=true;return null}
        val stored=readStored()
        current=stored.full
        return current
    }

    override suspend fun save(tokens:SessionTokens) {
        writeStored(StoredAuthentication(full=tokens))
        if(!biometricLocked)current=tokens
    }

    override suspend fun clear() {
        context.secureSessionDataStore.edit{it.remove(key);it.remove(wrappedKey)}
        wrappingBlob=null;unlockedKey=null;_locked.value=false
        runCatching{KeyStore.getInstance("AndroidKeyStore").apply{load(null)}.deleteEntry(BIOMETRIC_ALIAS)}
        current=null
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

    fun biometricCipher(enabling:Boolean):Cipher {
        val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}
        val secret=if(enabling) {
            store.deleteEntry(BIOMETRIC_ALIAS)
            KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").run {
                val spec=KeyGenParameterSpec.Builder(BIOMETRIC_ALIAS,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256).setUserAuthenticationRequired(true).setInvalidatedByBiometricEnrollment(true)
                if(android.os.Build.VERSION.SDK_INT>=30)spec.setUserAuthenticationParameters(0,KeyProperties.AUTH_BIOMETRIC_STRONG)
                else @Suppress("DEPRECATION") spec.setUserAuthenticationValidityDurationSeconds(-1)
                init(spec.build());generateKey()
            }
        } else store.getKey(BIOMETRIC_ALIAS,null) as SecretKey
        return Cipher.getInstance("AES/GCM/NoPadding").apply {
            if(enabling)init(Cipher.ENCRYPT_MODE,secret)
            else {val bytes=android.util.Base64.decode(wrappingBlob,android.util.Base64.NO_WRAP);init(Cipher.DECRYPT_MODE,secret,GCMParameterSpec(128,bytes.copyOfRange(0,12)))}
        }
    }
    suspend fun finishBiometric(cipher:Cipher,enabling:Boolean) {
        if(enabling) {
            val tokens=current ?: error("SESSION_REQUIRED")
            val bytes=ByteArray(32).also{java.security.SecureRandom().nextBytes(it)}
            val wrapped=android.util.Base64.encodeToString(cipher.iv+cipher.doFinal(bytes),android.util.Base64.NO_WRAP)
            val sessionKey=javax.crypto.spec.SecretKeySpec(bytes,"AES")
            bytes.fill(0)
            // Both entries commit together: no unprotected duplicate of the session remains.
            val encrypted=encryptWithKey(gson.toJson(StoredAuthentication(full=tokens)),sessionKey)
            context.secureSessionDataStore.edit{it[key]=encrypted;it[wrappedKey]=wrapped}
            unlockedKey=sessionKey;wrappingBlob=wrapped
        } else {
            val bytes=android.util.Base64.decode(wrappingBlob,android.util.Base64.NO_WRAP)
            val plain=cipher.doFinal(bytes.copyOfRange(12,bytes.size))
            unlockedKey=javax.crypto.spec.SecretKeySpec(plain,"AES");plain.fill(0)
            load()
        }
        if(enabling)_locked.value=false
    }
    fun finishUnlockGate(){_locked.value=false}
    private fun secretKey():SecretKey {
        if(wrappingBlob!=null)return unlockedKey ?: error("BIOMETRIC_LOCKED")
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

    private fun encrypt(plain:String)=encryptWithKey(plain,secretKey())
    private fun encryptWithKey(plain:String,secret:SecretKey):String {
        val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE,secret)
        return android.util.Base64.encodeToString(cipher.iv+cipher.doFinal(plain.toByteArray()),android.util.Base64.NO_WRAP)
    }

    private fun decrypt(blob:String):String {
        val bytes=android.util.Base64.decode(blob,android.util.Base64.NO_WRAP)
        require(bytes.size>12)
        val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE,secretKey(),GCMParameterSpec(128,bytes.copyOfRange(0,12)))
        return String(cipher.doFinal(bytes.copyOfRange(12,bytes.size)))
    }

    companion object{private const val ALIAS="popwam_mobile_session_v1";private const val BIOMETRIC_ALIAS="popwam_biometric_wrap_v1"}
}
