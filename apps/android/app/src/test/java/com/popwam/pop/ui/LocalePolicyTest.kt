package com.popwam.pop.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalePolicyTest {
    @Test fun deviceArabicCannotEnableAnUnpublishedLocale(){LocalePolicy.configure("en",listOf("en"),emptySet());assertEquals("en",LocalePolicy.resolve(null,"ar-EG"));assertFalse(LocalePolicy.isRtl("ar"))}
    @Test fun exactPublishedLocalesAreAvailable(){LocalePolicy.configure("en",listOf("en","ar"),setOf("ar"));assertEquals(listOf("en","ar"),LocalePolicy.availableLocales());assertEquals("ar",LocalePolicy.resolve("ar","en-US"));assertTrue(LocalePolicy.isRtl("ar"))}
    @Test fun disabledBundledFrenchIsNotResolved(){LocalePolicy.configure("en",listOf("en","ar"),setOf("ar"));assertEquals("en",LocalePolicy.resolve("fr","fr-FR"));assertFalse(LocalePolicy.isRtl("fr"))}
    @Test fun explicitPublishedChoiceSurvivesDeviceLanguageChanges(){LocalePolicy.configure("en",listOf("en","ar","fr"),setOf("ar"));assertEquals("ar",LocalePolicy.resolve("ar","en-US"));assertEquals("en",LocalePolicy.resolve("en","ar-EG"));assertEquals("fr",LocalePolicy.resolve("fr","ar-EG"))}
}
