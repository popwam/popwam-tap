package com.popwam.mobile.authentication

import androidx.compose.ui.unit.LayoutDirection
import kotlin.test.Test
import kotlin.test.assertEquals

class AuthenticationInputDirectionTest {
    @Test fun `phone and otp numeric controls stay ltr for an arabic screen`() {
        assertEquals(LayoutDirection.Ltr, NumericInputLayoutDirection)
    }
}
