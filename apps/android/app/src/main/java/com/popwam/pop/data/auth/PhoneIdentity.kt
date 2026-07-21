package com.popwam.pop.data.auth

import android.content.Context
import android.telephony.TelephonyManager
import com.google.i18n.phonenumbers.PhoneNumberUtil
import java.util.Locale

data class CountryOption(val iso2:String,val callingCode:String,val name:String)
object PhoneIdentity {
    private val util=PhoneNumberUtil.getInstance()
    fun countries(locale:Locale):List<CountryOption> = util.supportedRegions.map { iso -> CountryOption(iso,"+${util.getCountryCodeForRegion(iso)}",Locale("",iso).getDisplayCountry(locale)) }.sortedBy { it.name }
    fun normalize(value:String,countryIso2:String):String? = runCatching { util.parse(value,countryIso2).takeIf(util::isValidNumber)?.let { util.format(it,PhoneNumberUtil.PhoneNumberFormat.E164) } }.getOrNull()
    fun suggestedCountry(context:Context):String { val preferences=context.getSharedPreferences("pop_identity",Context.MODE_PRIVATE);preferences.getString("country",null)?.let{return it};val network=(context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager)?.networkCountryIso?.uppercase();return network?.takeIf(util.supportedRegions::contains)?:Locale.getDefault().country.takeIf(util.supportedRegions::contains)?:"EG" }
    fun saveCountry(context:Context,iso2:String)=context.getSharedPreferences("pop_identity",Context.MODE_PRIVATE).edit().putString("country",iso2).apply()
}
