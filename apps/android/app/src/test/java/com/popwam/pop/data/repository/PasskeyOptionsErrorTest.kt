package com.popwam.pop.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PasskeyOptionsErrorTest {
    @Test fun `parses STEP_UP_REQUIRED from safe API error document`() {
        assertEquals(STEP_UP_REQUIRED,safePasskeyOptionsErrorCode("{\"ok\":false,\"error\":\"STEP_UP_REQUIRED\"}"))
    }

    @Test fun `parses PASSKEY_OPTIONS_FAILED from safe API error document`() {
        assertEquals(PASSKEY_OPTIONS_FAILED,safePasskeyOptionsErrorCode("{\"ok\":false,\"error\":\"PASSKEY_OPTIONS_FAILED\"}"))
    }

    @Test fun `ignores unknown or malformed API errors`() {
        assertNull(safePasskeyOptionsErrorCode("{\"error\":\"DATABASE_CONNECTION_STRING\"}"))
        assertNull(safePasskeyOptionsErrorCode("not json"))
    }
}
