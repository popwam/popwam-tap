package com.popwam.pop.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalePolicyTest {
    @Test fun arabicDeviceUsesArabicOnFirstLaunch(){assertEquals("ar",LocalePolicy.resolve(null,"ar-EG"));assertTrue(LocalePolicy.isRtl("ar"))}
    @Test fun frenchDeviceUsesFrenchOnFirstLaunch(){assertEquals("fr",LocalePolicy.resolve(null,"fr-FR"));assertFalse(LocalePolicy.isRtl("fr"))}
    @Test fun nonArabicDeviceUsesEnglishOnFirstLaunch(){assertEquals("en",LocalePolicy.resolve(null,"de-DE"));assertFalse(LocalePolicy.isRtl("en"))}
    @Test fun explicitChoiceSurvivesDeviceLanguageChanges(){assertEquals("ar",LocalePolicy.resolve("ar","en-US"));assertEquals("en",LocalePolicy.resolve("en","ar-EG"));assertEquals("fr",LocalePolicy.resolve("fr","ar-EG"))}
}
