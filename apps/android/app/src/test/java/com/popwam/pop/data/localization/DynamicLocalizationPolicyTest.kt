package com.popwam.pop.data.localization

import com.popwam.pop.ui.LocaleDescriptor
import com.popwam.pop.ui.LocalePolicy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DynamicLocalizationPolicyTest {
    private val arabic=CachedTranslationPack(
        code="ar",
        revision=9,
        translations=mapOf(
            "android.profile.share" to "مشاركة",
            "android.items.count" to "%1\$d عناصر",
            "android.bad.format" to "%q",
        ),
        updatedAtEpochMillis=1234,
    )

    @Test fun `cached selected language wins without network`() {
        assertEquals("مشاركة",resolveTranslation("ar",mapOf("ar" to arabic),"android.profile.share","Share"))
    }

    @Test fun `never downloaded selected language uses English fallback`() {
        assertEquals("Save",resolveTranslation("de",emptyMap(),"android.common.save","Save"))
    }

    @Test fun `one missing key falls back without replacing the rest of the pack`() {
        val packs=mapOf("ar" to arabic)
        assertEquals("مشاركة",resolveTranslation("ar",packs,"android.profile.share","Share"))
        assertEquals("Cancel",resolveTranslation("ar",packs,"android.common.cancel","Cancel"))
    }

    @Test fun `invalid remote formatting falls back per key`() {
        assertEquals("3 items",resolveTranslation("ar",mapOf("ar" to arabic),"android.bad.format","3 items",3))
        assertEquals("3 عناصر",resolveTranslation("ar",mapOf("ar" to arabic),"android.items.count","3 items",3))
    }

    @Test fun `disabled language leaves cached renderability but is not selectable`() {
        val descriptor=LocaleDescriptor("ar","Arabic","العربية",true,9)
        LocalePolicy.configure("en",emptyList(),listOf(descriptor))
        assertTrue(LocalePolicy.canRender("ar"))
        assertTrue(LocalePolicy.isRtl("ar"))
        assertFalse("ar" in LocalePolicy.availableLocales())
        assertEquals("ar",LocalePolicy.resolve("ar",""))
    }
}
