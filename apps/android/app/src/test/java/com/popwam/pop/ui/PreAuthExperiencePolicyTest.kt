package com.popwam.pop.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.io.File

class PreAuthExperiencePolicyTest {
    @Test fun `terms privacy and help use internal destinations`() {
        assertEquals(UnauthenticatedDestination.TERMS,destinationForLegal(PreAuthLegalKind.TERMS))
        assertEquals(UnauthenticatedDestination.PRIVACY,destinationForLegal(PreAuthLegalKind.PRIVACY))
        assertEquals(UnauthenticatedDestination.HOW_POP_WORKS,howPopWorksDestination())
    }

    @Test fun `legacy help pager is not a first launch state authority`() {
        val source=File("src/main/java/com/popwam/pop/ui/PreAuthExperience.kt").readText()
        assertFalse(source.contains("class PreAuthStore"))
        assertFalse(source.contains("enum class PreAuthStage"))
        assertFalse(source.contains("fun LanguageSelectionScreen"))
    }
}
