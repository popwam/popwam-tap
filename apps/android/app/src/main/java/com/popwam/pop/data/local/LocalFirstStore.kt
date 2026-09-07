package com.popwam.pop.data.local

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.popwam.pop.data.api.CardsResponse
import com.popwam.pop.data.api.DiscoveryResponse
import com.popwam.pop.data.api.ProfileEditorResponse
import com.popwam.pop.data.api.ProfileSelectorResponse
import com.popwam.pop.data.api.ProfilesResponse
import com.popwam.pop.data.api.PublishingStatusResponse
import com.popwam.pop.data.api.ShareProductsResponse
import com.popwam.pop.data.api.ShareTargetsResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.security.MessageDigest

data class CachedShareData(
    val targets: ShareTargetsResponse = ShareTargetsResponse(),
    val products: ShareProductsResponse = ShareProductsResponse(),
    val syncedAt: Long = 0L,
)

data class AccountLocalState(
    val schemaVersion: Int = 1,
    val accountId: String = "",
    val locale: String = "en",
    val profiles: ProfilesResponse? = null,
    val cards: CardsResponse? = null,
    val selector: ProfileSelectorResponse? = null,
    val editors: Map<String, ProfileEditorResponse> = emptyMap(),
    val publishing: Map<String, PublishingStatusResponse> = emptyMap(),
    val share: Map<String, CachedShareData> = emptyMap(),
    val discovery: DiscoveryResponse? = null,
    val lastSuccessfulSyncAt: Long = 0L,
) {
    fun hasRenderableCore(): Boolean = profiles?.ok == true && selector?.ok == true
    fun isFresh(now: Long, ttlMillis: Long): Boolean =
        lastSuccessfulSyncAt > 0L && now - lastSuccessfulSyncAt in 0 until ttlMillis
}

/**
 * Small account-scoped JSON snapshots are sufficient for the current read model.
 * Authentication secrets remain exclusively in SecureSessionStore.
 */
class LocalFirstStore(context: Context, private val gson: Gson) {
    private val preferences = context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
    private val mutex = Mutex()
    private val encryptedStorage = EncryptedSnapshotStorage(
        values = object : SnapshotKeyValueStorage {
            override fun read(key: String) = preferences.getString(key, null)
            override fun write(key: String, value: String): Boolean = preferences.edit().putString(key, value).commit()
            override fun remove(key: String): Boolean = preferences.edit().remove(key).commit()
        },
        cipher = AesGcmSnapshotCipher(AndroidKeystoreSnapshotKeyProvider()::getOrCreate),
        onFailure = { code -> Log.w(TAG,code) },
    )

    suspend fun read(accountId: String): AccountLocalState? = withContext(Dispatchers.IO) {
        val raw = encryptedStorage.read(accountId,legacyKey(accountId),encryptedKey(accountId)) { valid(accountId,it) }
            ?: return@withContext null
        decode(accountId,raw)
    }

    suspend fun update(accountId: String, transform: (AccountLocalState) -> AccountLocalState): AccountLocalState = mutex.withLock {
        withContext(Dispatchers.IO) {
            val current = encryptedStorage.read(accountId,legacyKey(accountId),encryptedKey(accountId)) { valid(accountId,it) }
                ?.let { decode(accountId,it) }
                ?: AccountLocalState(accountId = accountId)
            transform(current).copy(schemaVersion = SCHEMA_VERSION, accountId = accountId).also { next ->
                check(encryptedStorage.write(accountId,legacyKey(accountId),encryptedKey(accountId),gson.toJson(next))) {
                    "LOCAL_CACHE_ENCRYPTED_WRITE_FAILED"
                }
            }
        }
    }

    suspend fun clearAccount(accountId: String) = withContext(Dispatchers.IO) {
        encryptedStorage.clear(legacyKey(accountId),encryptedKey(accountId))
    }

    private fun legacyKey(accountId: String) = "account_${accountHash(accountId)}"
    private fun encryptedKey(accountId: String) = "encrypted_account_${accountHash(accountId)}"

    private fun accountHash(accountId: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(accountId.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    private fun valid(accountId:String,raw:String)=decode(accountId,raw)!=null
    private fun decode(accountId:String,raw:String)=runCatching { gson.fromJson(raw,AccountLocalState::class.java) }
        .getOrNull()
        ?.takeIf { it.schemaVersion==SCHEMA_VERSION && it.accountId==accountId }

    companion object {
        const val DEFAULT_SYNC_TTL_MILLIS = 24L * 60L * 60L * 1_000L
        private const val SCHEMA_VERSION = 1
        private const val PREFERENCES = "pop_local_first"
        private const val TAG = "PopLocalFirstStorage"
    }
}
