package com.popwam.pop.data.auth

import android.content.Context
import android.telephony.TelephonyManager
import com.google.i18n.phonenumbers.PhoneNumberUtil
import java.util.Locale

data class CountryOption(val iso2:String,val callingCode:String,val name:String,val flag:String,val placeholder:String="")
data class PhoneCountryConfig(val iso2:String,val enabled:Boolean=true,val displayOrder:Int=0,val placeholder:String="",val name:String="",val flag:String="",val dialCode:String="")
object PhoneIdentity {
    private val util=PhoneNumberUtil.getInstance()
    fun countries(locale:Locale):List<CountryOption> = util.supportedRegions.map { iso ->
        CountryOption(
            iso2=iso,
            callingCode="+${util.getCountryCodeForRegion(iso)}",
            name=Locale.Builder().setRegion(iso).build().getDisplayCountry(locale).ifBlank { iso },
            flag=countryFlag(iso), placeholder=if(iso=="EG")"00 000 0000 00" else "Phone number",
        )
    }.sortedBy { it.name }
    /** Remote admin configuration is mapped here; this safe fallback is used only without it. */
    fun enabledCountries(locale:Locale, config:List<PhoneCountryConfig>?=null):List<CountryOption> {
        val effective=config?.filter { it.enabled } ?: listOf(PhoneCountryConfig("EG",displayOrder=1,placeholder="00 000 0000 00"),PhoneCountryConfig("SA",displayOrder=2),PhoneCountryConfig("AE",displayOrder=3))
        return countries(locale).filter { option->effective.any { it.iso2==option.iso2 } }.map { option->
            val configured=effective.first { it.iso2==option.iso2 }
            option.copy(
                callingCode=configured.dialCode.ifBlank { option.callingCode },
                name=configured.name.ifBlank { option.name },
                flag=configured.flag.ifBlank { option.flag },
                placeholder=configured.placeholder.ifBlank { option.placeholder },
            )
        }.sortedBy { option->effective.first { it.iso2==option.iso2 }.displayOrder }
    }
    fun search(countries:List<CountryOption>,query:String):List<CountryOption> {
        val normalized=query.trim()
        if(normalized.isBlank())return countries
        return countries.filter {
            it.name.contains(normalized,ignoreCase=true) ||
                it.iso2.contains(normalized,ignoreCase=true) ||
                it.callingCode.contains(normalized.replace(" ",""))
        }
    }
    fun normalize(value:String,countryIso2:String):String? = runCatching { util.parse(value,countryIso2).takeIf(util::isValidNumber)?.let { util.format(it,PhoneNumberUtil.PhoneNumberFormat.E164) } }.getOrNull()
    fun mask(phoneE164:String):String {
        val digits=phoneE164.filter(Char::isDigit)
        if(digits.length<7)return "***"
        val countryPrefix=phoneE164.take((phoneE164.length-digits.length)+minOf(3,digits.length-4))
        return "$countryPrefix ••• ••• ${digits.takeLast(4)}"
    }
    fun suggestedCountry(context:Context):String { val preferences=context.getSharedPreferences("pop_identity",Context.MODE_PRIVATE);preferences.getString("country",null)?.let{return it};val network=(context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager)?.networkCountryIso?.uppercase();return network?.takeIf(util.supportedRegions::contains)?:Locale.getDefault().country.takeIf(util.supportedRegions::contains)?:"EG" }
    fun saveCountry(context:Context,iso2:String)=context.getSharedPreferences("pop_identity",Context.MODE_PRIVATE).edit().putString("country",iso2).apply()
    internal fun countryFlag(iso2:String):String {
        val normalized=iso2.uppercase(Locale.ROOT)
        if(normalized.length!=2||normalized.any{it !in 'A'..'Z'})return ""
        return normalized.map { letter -> String(Character.toChars(0x1F1E6+(letter-'A'))) }.joinToString("")
    }
}
