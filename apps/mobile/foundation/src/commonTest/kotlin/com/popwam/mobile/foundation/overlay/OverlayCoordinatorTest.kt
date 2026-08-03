package com.popwam.mobile.foundation.overlay

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class OverlayCoordinatorTest {
    @Test
    fun actionRequiredOverlayCannotBeDismissedByTheUser() {
        val coordinator = OverlayCoordinator()
        coordinator.present(
            OverlayEntry(
                id = "required-passkey",
                key = OverlayKey.AUTHENTICATION_STATUS,
                presentation = OverlayPresentation.BOTTOM_SHEET,
                dismissPolicy = OverlayDismissPolicy.ACTION_REQUIRED,
            ),
        )

        assertFalse(coordinator.dismiss())
        assertEquals("required-passkey", coordinator.state.value.active?.id)
        assertTrue(coordinator.dismiss(forced = true))
        assertNull(coordinator.state.value.active)
    }
}

