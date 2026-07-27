package com.popwam.pop.data.auth

import android.content.Context
import com.google.gson.Gson
import com.popwam.pop.data.api.AuthApi
import com.popwam.pop.data.api.PlatformPhoneCountryDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private const val COUNTRY_CACHE = "phone_country_bootstrap"
private const val COUNTRY_CACHE_VALUE = "last_successful"

/** Resolves the three deliberate sources without ever merging fallback entries
 * into a successful server response. An empty successful response is likewise
 * authoritative and lets product configuration intentionally expose no phone
 * countries. */
internal fun resolvePhoneCountryConfiguration(remote: List<PhoneCountryConfig>?, cached: List<PhoneCountryConfig>?): List<PhoneCountryConfig> =
    remote ?: cached ?: listOf(
        PhoneCountryConfig("EG", displayOrder=1, placeholder="00 000 0000 00"),
        PhoneCountryConfig("SA", displayOrder=2),
        PhoneCountryConfig("AE", displayOrder=3),
    )

class PhoneCountryStore(context: Context, private val api: AuthApi) {
    private val preferences=context.getSharedPreferences(COUNTRY_CACHE,Context.MODE_PRIVATE)
    private val gson=Gson()
    private val cached=preferences.getString(COUNTRY_CACHE_VALUE,null)?.let { raw -> runCatching { gson.fromJson(raw,Array<PhoneCountryConfig>::class.java).toList() }.getOrNull() }
    private val _countries=MutableStateFlow(resolvePhoneCountryConfiguration(null,cached))
    val countries: StateFlow<List<PhoneCountryConfig>> = _countries.asStateFlow()

    suspend fun refresh() {
        val response=runCatching { api.platformBootstrap() }.getOrNull() ?: return
        if(!response.ok) return
        val remote=response.phoneCountries.map(::mapCountry).filter { it.enabled && it.iso2.length==2 && it.dialCode.startsWith("+") }.sortedBy { it.displayOrder }
        // Store successful empty configurations too: empty is an intentional admin decision.
        preferences.edit().putString(COUNTRY_CACHE_VALUE,gson.toJson(remote)).apply()
        _countries.value=resolvePhoneCountryConfiguration(remote,cached=null)
    }

    private fun mapCountry(country: PlatformPhoneCountryDto):PhoneCountryConfig {
        val name=country.localizedNames.entries.firstOrNull { it.key.equals(java.util.Locale.getDefault().language,true) }?.value ?: country.name
        return PhoneCountryConfig(country.iso2.uppercase(),true,country.displayOrder,country.phonePlaceholder.orEmpty(),name,country.flagEmoji.orEmpty(),country.dialCode)
    }
}
