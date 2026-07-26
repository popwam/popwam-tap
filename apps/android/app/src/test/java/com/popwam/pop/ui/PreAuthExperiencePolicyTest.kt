package com.popwam.pop.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class PreAuthExperiencePolicyTest {
    @Test fun `English only fresh install skips language`() {
        assertEquals(PreAuthStage.APPEARANCE,resolvePreAuthStage(PreAuthSnapshot(),authenticated=false,availableLanguages=setOf("en")))
    }

    @Test fun `multiple published languages start with language`() {
        assertEquals(PreAuthStage.LANGUAGE,resolvePreAuthStage(PreAuthSnapshot(),authenticated=false,availableLanguages=setOf("en","ar")))
    }

    @Test fun `language leads to appearance`() {
        assertEquals(PreAuthStage.APPEARANCE,resolvePreAuthStage(PreAuthSnapshot(language="ar"),authenticated=false,availableLanguages=setOf("en","ar")))
    }

    @Test fun `appearance leads to intro`() {
        assertEquals(
            PreAuthStage.INTRO,
            resolvePreAuthStage(PreAuthSnapshot(language="fr",appearance="SYSTEM"),authenticated=false),
        )
    }

    @Test fun `completed current intro leads to phone auth without replay`() {
        val complete=PreAuthSnapshot("en","DARK",CURRENT_POP_INTRO_VERSION)
        assertEquals(PreAuthStage.AUTH,resolvePreAuthStage(complete,authenticated=false))
        assertEquals(PreAuthStage.AUTH,resolvePreAuthStage(complete,authenticated=false,introVersion=CURRENT_POP_INTRO_VERSION))
    }

    @Test fun `future intro version is deliberate and not tied to app version`() {
        val old=PreAuthSnapshot("en","LIGHT",introVersionSeen=1)
        assertEquals(PreAuthStage.INTRO,resolvePreAuthStage(old,authenticated=false,introVersion=2))
    }

    @Test fun `existing authenticated user bypasses incomplete local first launch`() {
        assertEquals(PreAuthStage.AUTH,resolvePreAuthStage(PreAuthSnapshot(),authenticated=true))
    }

    @Test fun `terms privacy and help use internal destinations`() {
        assertEquals(UnauthenticatedDestination.TERMS,destinationForLegal(PreAuthLegalKind.TERMS))
        assertEquals(UnauthenticatedDestination.PRIVACY,destinationForLegal(PreAuthLegalKind.PRIVACY))
        assertEquals(UnauthenticatedDestination.HOW_POP_WORKS,howPopWorksDestination())
    }
}
