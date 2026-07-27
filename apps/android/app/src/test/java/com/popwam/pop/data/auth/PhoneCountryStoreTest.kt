package com.popwam.pop.data.auth

import org.junit.Assert.assertEquals
import org.junit.Test

class PhoneCountryStoreTest {
    @Test fun `successful remote configuration is authoritative and is never merged with fallback`() {
        assertEquals(listOf("EG"),resolvePhoneCountryConfiguration(listOf(PhoneCountryConfig("EG",displayOrder=1,dialCode="+20")),null).map { it.iso2 })
        assertEquals(emptyList<String>(),resolvePhoneCountryConfiguration(emptyList(),listOf(PhoneCountryConfig("SA"))).map { it.iso2 })
    }
    @Test fun `cached configuration is used when remote is unavailable`() {
        assertEquals(listOf("AE"),resolvePhoneCountryConfiguration(null,listOf(PhoneCountryConfig("AE"))).map { it.iso2 })
    }
    @Test fun `emergency fallback is used only without remote or cached configuration`() {
        assertEquals(listOf("EG","SA","AE"),resolvePhoneCountryConfiguration(null,null).map { it.iso2 })
    }
}
