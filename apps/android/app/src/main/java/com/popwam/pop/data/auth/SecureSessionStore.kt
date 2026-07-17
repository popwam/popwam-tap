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
data class SessionTokens(val accessToken:String,val refreshToken:String,val userId:String,val role:String)

class SecureSessionStore(private val context:Context) {
    private val gson=Gson(); private val key=stringPreferencesKey("encrypted_tokens")
    @Volatile private var current:SessionTokens?=null
    fun snapshot():SessionTokens?=current
    suspend fun load():SessionTokens?{val blob=context.secureSessionDataStore.data.first()[key];current=blob?.let{runCatching{gson.fromJson(decrypt(it),SessionTokens::class.java)}.getOrNull()};return current}
    suspend fun save(tokens:SessionTokens){context.secureSessionDataStore.edit{it[key]=encrypt(gson.toJson(tokens))};current=tokens}
    suspend fun clear(){context.secureSessionDataStore.edit{it.remove(key)};current=null}
    private fun secretKey():SecretKey{val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)};return (store.getKey(ALIAS,null) as? SecretKey)?:KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").run{init(KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());generateKey()}}
    private fun encrypt(plain:String):String{val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,secretKey());return android.util.Base64.encodeToString(cipher.iv+cipher.doFinal(plain.toByteArray()),android.util.Base64.NO_WRAP)}
    private fun decrypt(blob:String):String{val bytes=android.util.Base64.decode(blob,android.util.Base64.NO_WRAP);val iv=bytes.copyOfRange(0,12);val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,secretKey(),GCMParameterSpec(128,iv));return String(cipher.doFinal(bytes.copyOfRange(12,bytes.size)))}
    companion object{private const val ALIAS="popwam_mobile_session_v1"}
}
