package com.popwam.pop.ui

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

class PasskeyLoginPolicyTest {
    private class GetCredentialCancellationException:Exception()
    private class NoCredentialException:Exception()

    @Test fun `returning entry is passkey first with phone fallback`()=assertEquals(listOf("PASSKEY","PHONE"),returningAuthActionOrder)
    @Test fun `passkey is hidden below Android 9`() { assertFalse(passkeyPlatformSupported(27));assertTrue(passkeyPlatformSupported(28)) }
    @Test fun `cancellation keeps phone fallback`() { val error=passkeyLoginError(GetCredentialCancellationException());assertEquals(PasskeyLoginError.CANCELLED,error);assertTrue(phoneFallbackAvailable(error)) }
    @Test fun `unavailable credential keeps phone fallback`() { val error=passkeyLoginError(NoCredentialException());assertEquals(PasskeyLoginError.NO_CREDENTIAL,error);assertTrue(phoneFallbackAvailable(error)) }
    @Test fun `network failure is safe and recoverable`()=assertEquals(PasskeyLoginError.NETWORK,passkeyLoginError(IOException()))
}
