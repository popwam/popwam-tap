package com.popwam.pop.data.repository

import com.popwam.pop.data.api.CardsResponse
import com.popwam.pop.data.api.DiscoveryResponse
import com.popwam.pop.data.api.DiscoveryProfileDto
import com.popwam.pop.data.api.ProfileEditorResponse
import com.popwam.pop.data.api.ProfileSelectorResponse
import com.popwam.pop.data.api.ProfilesResponse
import com.popwam.pop.data.api.PublishingStatusResponse
import com.popwam.pop.data.api.ShareProfileSummaryDto
import com.popwam.pop.data.api.ShareTargetDto
import com.popwam.pop.data.api.ShareTargetsResponse
import com.popwam.pop.data.local.AccountLocalState
import com.popwam.pop.data.local.CachedShareData
import com.popwam.pop.data.local.LocalFirstSnapshotStore
import com.popwam.pop.data.local.LocalFirstStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class LocalFirstRepository(
    private val remote: PopwamRepository,
    private val store: LocalFirstSnapshotStore,
    private val accountIdProvider: () -> String?,
    private val backgroundScope: CoroutineScope,
    private val now: () -> Long = System::currentTimeMillis,
    val syncTtlMillis: Long = LocalFirstStore.DEFAULT_SYNC_TTL_MILLIS,
) {
    private val coreMutex = Mutex()
    private val shareMutex = Mutex()
    private var backgroundSyncAccount: String? = null

    suspend fun core(selectedProfileId: String?, locale: String, force: Boolean = false): AccountLocalState {
        val accountId = requireNotNull(accountIdProvider()) { "AUTHENTICATED_ACCOUNT_REQUIRED" }
        val cached = store.read(accountId)
        if (!force && cached?.hasRenderableCore() == true) {
            val selected = selectedProfileId ?: cached.selector?.selectedProfileId
            if (selected == null || cached.editors.containsKey(selected)) {
                if (!cached.isFresh(now(), syncTtlMillis)) scheduleBackgroundSync(accountId, selected, locale)
                if (selected != null && selected != cached.selector?.selectedProfileId) persistSelection(accountId, selected)
                return store.read(accountId) ?: cached
            }
            return loadRequestedProfile(accountId, cached, selected, locale)
        }
        return syncCore(accountId, selectedProfileId, locale, force)
    }

    suspend fun cachedShare(profileId: String): CachedShareData? {
        val accountId = accountIdProvider() ?: return null
        return store.read(accountId)?.share?.get(profileId)
    }

    suspend fun discovery(locale: String, query: String? = null, force: Boolean = false): DiscoveryResponse {
        val accountId = requireNotNull(accountIdProvider()) { "AUTHENTICATED_ACCOUNT_REQUIRED" }
        if (query == null && !force) store.read(accountId)?.discovery?.takeIf { it.ok }?.let { return it }
        val result = if(query==null) remote.discovery(locale,null) else runCatching { remote.discovery(locale,query) }.getOrElse {
            val people=remote.searchFriends(locale,query)
            if(!people.ok) error(people.error ?: "DISCOVERY_UNAVAILABLE")
            DiscoveryResponse(ok=true,profiles=people.results.map { item->DiscoveryProfileDto(item.key,item.profile.slug,item.profile.name,item.profile.title,item.profile.avatarUrl,"PERSON") })
        }
        if (!result.ok) error(result.error ?: "DISCOVERY_UNAVAILABLE")
        if (query == null) store.update(accountId) { it.copy(discovery = result) }
        return result
    }

    suspend fun share(profileId: String, locale: String, force: Boolean = false): CachedShareData {
        val accountId = requireNotNull(accountIdProvider()) { "AUTHENTICATED_ACCOUNT_REQUIRED" }
        val cached = store.read(accountId)?.share?.get(profileId)
        if (!force && cached != null && now() - cached.syncedAt in 0 until syncTtlMillis) return cached
        // A published profile's canonical URL is already part of the encrypted core
        // snapshot. It is sufficient for local QR/share and avoids a Share preload.
        if (!force && cached == null) offlineShareFallback(accountId,profileId)?.let { return it }
        return shareMutex.withLock {
            val rechecked = store.read(accountId)?.share?.get(profileId)
            if (!force && rechecked != null && now() - rechecked.syncedAt in 0 until syncTtlMillis) return@withLock rechecked
            val targets = runCatching { remote.shareTargets(profileId, locale) }.getOrElse {
                return@withLock offlineShareFallback(accountId, profileId) ?: throw it
            }
            if (!targets.ok) error(targets.error ?: "SHARE_TARGETS_FAILED")
            val products = runCatching { remote.shareProducts() }.getOrElse { com.popwam.pop.data.api.ShareProductsResponse() }
            val result = CachedShareData(targets, products, now())
            store.update(accountId) { it.copy(share = it.share + (profileId to result)) }
            result
        }
    }

    // Called only on explicit picker entry; never from core/startup/Share.
    suspend fun templateCatalog(): com.popwam.pop.data.api.TemplatesResponse {
        val accountId = requireNotNull(accountIdProvider())
        val cached = store.read(accountId)
        if (!templateCatalogNeedsRefresh(cached?.templateCatalog?.ok == true, cached?.templateCatalogSyncedAt ?: 0L, now())) return cached!!.templateCatalog!!
        val result = try { remote.templates().also { if (!it.ok) error(it.error ?: "PROFILE_TEMPLATE_UNAVAILABLE") } }
            catch (error: Exception) {
                if (error is retrofit2.HttpException && error.code() == 401) throw error
                return cached?.templateCatalog?.takeIf { it.ok } ?: throw error
            }
        if (accountIdProvider() == accountId) store.update(accountId) { it.copy(templateCatalog = result, templateCatalogSyncedAt = now()) }
        return result
    }

    suspend fun cachedEditor(profileId:String):ProfileEditorResponse? {
        val accountId=accountIdProvider() ?: return null
        return store.read(accountId)?.editors?.get(profileId)
    }

    fun currentAccountId(): String? = accountIdProvider()

    suspend fun persistEditor(accountId: String, profileId: String, editor: ProfileEditorResponse) {
        if (accountIdProvider() != accountId || !editor.ok || editor.profile.id != profileId) return
        coreMutex.withLock {
            if (accountIdProvider() == accountId) store.update(accountId) { old ->
                val current = old.editors[profileId]
                if (current != null && current.profile.draftRevision > editor.profile.draftRevision) old
                else old.copy(editors = old.editors + (profileId to editor), publishing = old.publishing - profileId)
            }
        }
    }

    suspend fun clearCurrentAccount() {
        accountIdProvider()?.let { store.clearAccount(it) }
    }

    private suspend fun offlineShareFallback(accountId: String, profileId: String): CachedShareData? {
        val core = store.read(accountId) ?: return null
        val selector = core.selector?.profiles?.firstOrNull { it.id == profileId } ?: return null
        val profile = core.profiles?.profiles?.firstOrNull { it.id == profileId } ?: return null
        val slug = profile.slug?.takeIf(String::isNotBlank) ?: return null
        if (selector.lifecycle != "PUBLISHED") return null
        val label = selector.publicName.ifBlank { selector.label }
        val target = ShareTargetDto(
            id = profileId,
            type = "PROFILE",
            label = label,
            canonicalUrl = com.popwam.pop.PublicProfileUrls.profile(slug),
            hceCompatible = true,
        )
        return CachedShareData(
            targets = ShareTargetsResponse(
                ok = true,
                profile = ShareProfileSummaryDto(profileId, label, selector.lifecycle),
                shareable = true,
                targets = listOf(target),
            ),
            syncedAt = 0L,
        )
    }

    suspend fun invalidateProfile(profileId: String) {
        val accountId = accountIdProvider() ?: return
        store.update(accountId) {
            it.copy(
                editors = it.editors - profileId,
                publishing = it.publishing - profileId,
                share = it.share - profileId,
            )
        }
    }

    private suspend fun syncCore(accountId: String, requestedProfileId: String?, locale: String, force: Boolean): AccountLocalState = coreMutex.withLock {
        val existing = store.read(accountId)
        if (!force && existing?.hasRenderableCore() == true && requestedProfileId?.let(existing.editors::containsKey) != false) return@withLock existing
        supervisorScope {
            val profilesJob = async { remote.profiles() }
            val cardsJob = async { remote.cards() }
            val selectorJob = async { remote.profileSelector(requestedProfileId) }
            val discoveryJob = async { runCatching { remote.discovery(locale) }.getOrNull() }
            val profiles = profilesJob.await()
            val selector = selectorJob.await()
            if (!profiles.ok) error(profiles.error ?: "PROFILE_LIST_UNAVAILABLE")
            if (!selector.ok) error(selector.error ?: "PROFILE_SELECTOR_UNAVAILABLE")
            val cards = cardsJob.await()
            val discovery = discoveryJob.await()
            if (!cards.ok) error(cards.error ?: "CARDS_UNAVAILABLE")
            val selected = requestedProfileId ?: selector.selectedProfileId ?: selector.profiles.firstOrNull()?.id
            val editor = selected?.let { remote.profileEditor(it, locale) }
            if (selected != null && editor?.ok != true) error(editor?.error ?: "PROFILE_CONTENT_UNAVAILABLE")
            store.update(accountId) { old ->
                old.copy(
                    locale = locale,
                    profiles = profiles,
                    cards = cards,
                    selector = selector.copy(selectedProfileId = selected),
                    editors = if (selected != null && editor?.ok == true) old.editors + (selected to editor) else old.editors,
                    discovery = discovery?.takeIf { it.ok } ?: old.discovery,
                    lastSuccessfulSyncAt = now(),
                )
            }
        }
    }

    private suspend fun loadRequestedProfile(accountId: String, cached: AccountLocalState, profileId: String, locale: String): AccountLocalState = coreMutex.withLock {
        store.read(accountId)?.takeIf { it.editors.containsKey(profileId) }?.let { current ->
            persistSelection(accountId, profileId)
            return@withLock store.read(accountId) ?: current
        }
        val editor = remote.profileEditor(profileId, locale)
        if (!editor.ok) error(editor.error ?: "PROFILE_CONTENT_UNAVAILABLE")
        store.update(accountId) { old ->
            old.copy(
                locale = locale,
                selector = old.selector?.copy(selectedProfileId = profileId),
                editors = old.editors + (profileId to editor),
            )
        }
    }

    private suspend fun persistSelection(accountId: String, profileId: String) {
        store.update(accountId) { it.copy(selector = it.selector?.copy(selectedProfileId = profileId)) }
    }

    private fun scheduleBackgroundSync(accountId: String, selectedProfileId: String?, locale: String) {
        if (backgroundSyncAccount == accountId) return
        backgroundSyncAccount = accountId
        backgroundScope.launch {
            try {
                coreMutex.withLock {
                    val current = store.read(accountId) ?: return@withLock
                    supervisorScope {
                        val profilesJob = async { remote.profiles() }
                        val cardsJob = async { runCatching { remote.cards() }.getOrNull() }
                        val selectorJob = async { remote.profileSelector(selectedProfileId) }
                        val discoveryJob = async { runCatching { remote.discovery(locale) }.getOrNull() }
                        val profiles = profilesJob.await()
                        val selector = selectorJob.await()
                        val cards = cardsJob.await()
                        val discovery = discoveryJob.await()
                        if (!profiles.ok || !selector.ok || cards?.ok != true) return@supervisorScope
                        val selected = selectedProfileId ?: selector.selectedProfileId ?: selector.profiles.firstOrNull()?.id
                        val editor = selected?.let { runCatching { remote.profileEditor(it, locale) }.getOrNull() }
                        store.update(accountId) { old -> old.copy(
                            locale = locale,
                            profiles = profiles,
                            cards = cards,
                            selector = selector.copy(selectedProfileId = selected),
                            editors = if (selected != null && editor?.ok == true) old.editors + (selected to editor) else old.editors,
                            discovery = discovery?.takeIf { it.ok } ?: old.discovery,
                            lastSuccessfulSyncAt = now(),
                        ) }
                    }
                }
            } finally {
                backgroundSyncAccount = null
            }
        }
    }
}

internal fun templateCatalogNeedsRefresh(hasCache: Boolean, syncedAt: Long, now: Long, ttl: Long = 24L * 60 * 60 * 1000): Boolean =
    !hasCache || syncedAt <= 0 || now - syncedAt !in 0 until ttl
