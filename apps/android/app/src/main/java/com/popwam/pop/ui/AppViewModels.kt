package com.popwam.pop.ui

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.nfc.Tag
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.popwam.pop.data.api.ActivationInspectResponse
import com.popwam.pop.data.api.CardDetailDto
import com.popwam.pop.data.api.CardDto
import com.popwam.pop.data.api.DestinationDto
import com.popwam.pop.data.api.DestinationWriteRequest
import com.popwam.pop.data.api.ProfileDto
import com.popwam.pop.data.api.ProfileTemplateDto
import com.popwam.pop.data.api.ProfileWriteRequest
import com.popwam.pop.data.api.VirtualCardCreateRequest
import com.popwam.pop.data.api.WalletCapabilitiesDto
import com.popwam.pop.data.api.VerifyNfcResponse
import com.popwam.pop.data.auth.SessionRepository
import com.popwam.pop.data.repository.PopwamRepository
import com.popwam.pop.data.repository.AndroidUploadPolicy
import com.popwam.pop.nfc.NfcResult
import com.popwam.pop.nfc.NfcTagManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.ByteArrayOutputStream

data class AuthUiState(
    val authenticated: Boolean = false,
    val challengeId: String? = null,
    val maskedPhone: String? = null,
    val developmentCode: String? = null,
    val loading: Boolean = false,
    val error: String? = null,
)

class AuthViewModel(private val sessions: SessionRepository) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState(authenticated = sessions.authenticated))
    val state = _state.asStateFlow()

    fun send(phone: String, locale: String) = viewModelScope.launch {
        working {
            val result = sessions.sendOtp(phone, locale)
            _state.value = if (result.ok) {
                _state.value.copy(
                    challengeId = result.challengeId,
                    maskedPhone = result.maskedPhone,
                    developmentCode = result.developmentCode,
                    error = null,
                )
            } else {
                _state.value.copy(error = result.error)
            }
        }
    }

    fun verify(code: String) = viewModelScope.launch {
        val id = _state.value.challengeId ?: return@launch
        working {
            val result = sessions.verifyOtp(id, code)
            _state.value = _state.value.copy(
                authenticated = result.ok,
                error = result.error,
            )
        }
    }

    fun logout() = viewModelScope.launch {
        sessions.logout()
        _state.value = AuthUiState()
    }

    private suspend fun working(block: suspend () -> Unit) {
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            block()
        } catch (_: Exception) {
            _state.value = _state.value.copy(error = "REQUEST_FAILED")
        } finally {
            _state.value = _state.value.copy(loading = false)
        }
    }
}

data class MainUiState(
    val cards: List<CardDto> = emptyList(),
    val profiles: List<ProfileDto> = emptyList(),
    val templates: List<ProfileTemplateDto> = emptyList(),
    val planSlug: String = "free",
    val wallet: WalletCapabilitiesDto = WalletCapabilitiesDto(),
    val selectedCard: CardDetailDto? = null,
    val destinations: List<DestinationDto> = emptyList(),
    val programmingCards: List<CardDto> = emptyList(),
    val activation: ActivationInspectResponse? = null,
    val nfcUri: String? = null,
    val nfcVerification: VerifyNfcResponse? = null,
    val loading: Boolean = false,
    val uploadProgress: Int? = null,
    val uploadedUrl: String? = null,
    val message: String? = null,
    val error: String? = null,
)

class MainViewModel(
    private val repo: PopwamRepository,
    val role: String?,
) : ViewModel() {
    private val nfc = NfcTagManager()
    private val _state = MutableStateFlow(MainUiState())
    val state = _state.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        if (_state.value.loading) return
        viewModelScope.launch { working {
            val cards = repo.cards()
            val profiles = repo.profiles()
            val templates = repo.templates()
            _state.value = _state.value.copy(cards = cards.cards, profiles = profiles.profiles, templates = templates.templates, planSlug = templates.planSlug, wallet = profiles.wallet)
        } }
    }

    fun card(id: String) = viewModelScope.launch {
        working {
            val result = repo.card(id)
            _state.value = _state.value.copy(
                selectedCard = result.card,
                destinations = result.destinations,
            )
        }
    }

    fun updateCard(id: String, status: String? = null, destinationId: String? = null) =
        viewModelScope.launch {
            working {
                val result = repo.updateCard(id, status, destinationId)
                if (result.ok) {
                    card(id)
                    reload()
                } else {
                    fail(result.error)
                }
            }
        }

    fun inspectActivation(value: String) = viewModelScope.launch {
        working {
            val result = repo.inspectActivation(value)
            _state.value = _state.value.copy(activation = result)
            if (!result.ok) fail(result.error)
        }
    }

    fun claim(profileId: String) = viewModelScope.launch {
        val token = _state.value.activation?.claimToken ?: return@launch
        working {
            val result = repo.claim(token, profileId)
            if (result.ok) {
                _state.value = _state.value.copy(message = "CARD_CLAIMED", activation = null)
                reload()
            } else {
                fail(result.error)
            }
        }
    }

    fun saveProfile(id: String?, body: ProfileWriteRequest) = viewModelScope.launch {
        working {
            val result = if (id == null) {
                val created = repo.createProfile(body)
                val createdId = created.profile?.id
                if (!created.ok || createdId == null) {
                    fail(created.error ?: "PROFILE_SAVE_FAILED")
                    return@working
                }
                repo.updateProfile(createdId, body)
            } else {
                repo.updateProfile(id, body)
            }
            if (result.ok) {
                _state.value = _state.value.copy(message = "PROFILE_SAVED")
                reload()
            } else {
                fail(result.error ?: "PROFILE_SAVE_FAILED")
            }
        }
    }

    fun createVirtualCard(
        context: Context,
        body: VirtualCardCreateRequest,
        avatarUri: Uri?,
        logoUri: Uri?,
        onCreated: (String) -> Unit,
    ) = viewModelScope.launch {
        working {
            val created = repo.createVirtualCard(body)
            val profile = created.profile
            if (!created.ok || profile == null) {
                fail(created.error ?: "PROFILE_SAVE_FAILED")
                return@working
            }
            suspend fun upload(uri: Uri, kind: String) {
                val resolver = context.contentResolver
                val mime = resolver.getType(uri) ?: "image/jpeg"
                val name = uri.lastPathSegment?.substringAfterLast('/') ?: "$kind.jpg"
                val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return
                val result = repo.uploadMedia(profile.id, kind, name, mime, bytes)
                if (!result.ok) throw IllegalStateException(result.error ?: "UPLOAD_FAILED")
            }
            avatarUri?.let { upload(it, "avatar") }
            logoUri?.let { upload(it, "logo") }
            _state.value = _state.value.copy(message = "PROFILE_SAVED")
            reload()
            onCreated(profile.id)
        }
    }

    fun selectTemplate(virtualCardId: String, templateId: String, onComplete: () -> Unit = {}) = viewModelScope.launch {
        working {
            val result = repo.selectTemplate(virtualCardId, templateId)
            if (!result.ok) {
                fail(result.error)
                return@working
            }
            reload()
            onComplete()
        }
    }

    fun openGoogleWallet(virtualCardId: String, onReady: (String) -> Unit) = viewModelScope.launch {
        working {
            val result = repo.googleWallet(virtualCardId)
            if (!result.ok || result.url.isNullOrBlank()) fail(result.error) else onReady(result.url)
        }
    }

    fun loadProgramming() = viewModelScope.launch {
        working {
            val result = repo.programmingCards()
            _state.value = _state.value.copy(programmingCards = result.cards)
            if (!result.ok) fail(result.error)
        }
    }

    fun readAndVerify(tag: Tag) = viewModelScope.launch {
        working {
            when (val result = nfc.read(tag)) {
                is NfcResult.Success -> {
                    val verification = repo.verifyNfc(result.uri)
                    _state.value = _state.value.copy(
                        nfcUri = result.uri,
                        nfcVerification = verification,
                    )
                }
                is NfcResult.Failure -> fail("NFC_${result.reason}")
            }
        }
    }

    fun write(tag: Tag, card: CardDto) = viewModelScope.launch {
        working {
            when (val result = nfc.writeAndVerify(tag, card.permanentUrl)) {
                is NfcResult.Success -> {
                    val marked = repo.markProgrammed(card.id, result.uri)
                    if (marked.ok) {
                        _state.value = _state.value.copy(message = "NFC_PROGRAMMED")
                    } else {
                        fail(marked.error)
                    }
                }
                is NfcResult.Failure -> fail("NFC_${result.reason}")
            }
        }
    }

    fun lock(tag: Tag, card: CardDto) = viewModelScope.launch {
        working {
            when (val result = nfc.verifyAndLock(tag, card.permanentUrl)) {
                is NfcResult.Success -> {
                    val marked = repo.markLocked(card.id, result.uri)
                    if (marked.ok) {
                        _state.value = _state.value.copy(message = "NFC_LOCKED")
                    } else {
                        fail(marked.error)
                    }
                }
                is NfcResult.Failure -> fail("NFC_${result.reason}")
            }
        }
    }

    fun upload(
        context: Context,
        profileId: String,
        uri: Uri,
        kind: String,
        file: Boolean = false,
    ) = viewModelScope.launch {
        working {
            val resolver = context.contentResolver
            val mime = resolver.getType(uri) ?: "application/octet-stream"
            var name = uri.lastPathSegment?.substringAfterLast('/') ?: "upload"
            var size = -1L
            resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE), null, null, null)?.use { cursor -> if(cursor.moveToFirst()){cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME).takeIf{it>=0}?.let{name=cursor.getString(it)};cursor.getColumnIndex(OpenableColumns.SIZE).takeIf{it>=0}?.let{size=cursor.getLong(it)}} }
            AndroidUploadPolicy.validate(mime,size.coerceAtLeast(0),file)?.let { fail(it);return@working }
            val max = if(file) AndroidUploadPolicy.MAX_FILE_BYTES else AndroidUploadPolicy.MAX_IMAGE_BYTES
            _state.value=_state.value.copy(uploadProgress=0,uploadedUrl=null)
            val bytes = resolver.openInputStream(uri)?.use { input ->
                val output=ByteArrayOutputStream();val buffer=ByteArray(64*1024);var total=0L
                while(true){val read=input.read(buffer);if(read<0)break;total+=read;if(total>max)throw IllegalArgumentException("UPLOAD_TOO_LARGE");output.write(buffer,0,read);if(size>0)_state.value=_state.value.copy(uploadProgress=((total*100/size).coerceIn(0,99)).toInt())};output.toByteArray()
            } ?: throw IllegalArgumentException("FILE_READ_FAILED")
            try {
                val result = if (file) repo.uploadFile(profileId, "", "", name, mime, bytes) else repo.uploadMedia(profileId, kind, name, mime, bytes)
                if (result.ok) { _state.value = _state.value.copy(message = "UPLOAD_COMPLETE",uploadProgress=100,uploadedUrl=result.url);reload() } else fail(result.error)
            } catch (error: HttpException) {
                fail(when(error.code()){401->"AUTH_EXPIRED";403->"UPLOAD_FORBIDDEN";413->"UPLOAD_TOO_LARGE";415->"UPLOAD_TYPE_NOT_ALLOWED";else->"UPLOAD_FAILED_${error.code()}"})
            } finally {
                _state.value=_state.value.copy(uploadProgress=null)
            }
        }
    }

    fun addDestination(profileId: String, body: DestinationWriteRequest) = viewModelScope.launch {
        working {
            val result = repo.createDestination(profileId, body)
            if (result.ok) {
                _state.value = _state.value.copy(message = "DESTINATION_SAVED")
                reload()
            } else {
                fail(result.error)
            }
        }
    }

    fun deleteDestination(id: String) = viewModelScope.launch {
        working {
            val result = repo.deleteDestination(id)
            if (result.ok) reload() else fail(result.error)
        }
    }

    fun clearFeedback() {
        _state.value = _state.value.copy(
            message = null,
            error = null,
            nfcUri = null,
            nfcVerification = null,
        )
    }

    private fun fail(value: String?) {
        _state.value = _state.value.copy(error = value ?: "REQUEST_FAILED")
    }

    private suspend fun working(block: suspend () -> Unit) {
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            block()
        } catch (error: Exception) {
            fail(error.message?.takeIf { it in setOf("UPLOAD_TOO_LARGE","UPLOAD_TYPE_NOT_ALLOWED","FILE_READ_FAILED") } ?: "REQUEST_FAILED")
        } finally {
            _state.value = _state.value.copy(loading = false)
        }
    }
}

class AuthFactory(
    private val sessions: SessionRepository,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        AuthViewModel(sessions) as T
}

class MainFactory(
    private val repo: PopwamRepository,
    private val role: String?,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        MainViewModel(repo, role) as T
}
