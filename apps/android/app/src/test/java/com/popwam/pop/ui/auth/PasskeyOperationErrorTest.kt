package com.popwam.pop.ui.auth

import com.popwam.mobile.authentication.AuthenticationError
import org.junit.Assert.assertEquals
import org.junit.Test

class PasskeyOperationErrorTest {
    @Test fun `native passkey outcomes remain recoverable and typed`() {
        assertEquals(AuthenticationError.PASSKEY_CANCELLED,passkeyOperationError("CreateCredentialCancellationException"))
        assertEquals(AuthenticationError.PASSKEY_UNAVAILABLE,passkeyOperationError("NoCredentialException"))
        assertEquals(AuthenticationError.CONFIGURATION,passkeyOperationError("GetCredentialProviderConfigurationException"))
        assertEquals(AuthenticationError.PASSKEY_REJECTED,passkeyOperationError("GetPublicKeyCredentialDomException"))
    }
}
