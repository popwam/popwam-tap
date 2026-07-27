package com.popwam.pop.data.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Locale

class EnabledPhoneCountriesTest {
    @Test fun `fallback exposes only enabled POP countries in configured order`() {
        assertEquals(listOf("EG","SA","AE"),PhoneIdentity.enabledCountries(Locale.ENGLISH).map { it.iso2 })
    }
    @Test fun `remote config filters disabled countries and honors order`() {
        val result=PhoneIdentity.enabledCountries(Locale.ENGLISH,listOf(PhoneCountryConfig("AE",displayOrder=1),PhoneCountryConfig("EG",enabled=false)))
        assertEquals(listOf("AE"),result.map { it.iso2 }); assertTrue(result.single().callingCode.startsWith("+"))
    }
}
