package com.popwam.pop.data.auth
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Locale
class PhoneIdentityTest {
    @Test fun egyptianForms(){listOf("+201001234567","00201001234567","201001234567","01001234567","1001234567").forEach{assertEquals("+201001234567",PhoneIdentity.normalize(it,"EG"))}}
    @Test fun saudiForms(){listOf("+966501234567","00966501234567","966501234567","0501234567","501234567").forEach{assertEquals("+966501234567",PhoneIdentity.normalize(it,"SA"))}}
    @Test fun `country data comes from full libphonenumber metadata`(){val countries=PhoneIdentity.countries(Locale.ENGLISH);assertTrue(countries.size>200);assertEquals("+20",countries.first{it.iso2=="EG"}.callingCode);assertEquals("+33",countries.first{it.iso2=="FR"}.callingCode)}
    @Test fun `country search accepts name ISO and dialing code`(){val countries=PhoneIdentity.countries(Locale.ENGLISH);assertEquals("EG",PhoneIdentity.search(countries,"Egypt").single().iso2);assertEquals("FR",PhoneIdentity.search(countries,"FR").first{it.iso2=="FR"}.iso2);assertTrue(PhoneIdentity.search(countries,"+20").any{it.iso2=="EG"})}
    @Test fun `country flag is derived from ISO rather than maintained data`(){assertEquals("🇪🇬",PhoneIdentity.countryFlag("EG"));assertEquals("🇫🇷",PhoneIdentity.countryFlag("fr"))}
}
