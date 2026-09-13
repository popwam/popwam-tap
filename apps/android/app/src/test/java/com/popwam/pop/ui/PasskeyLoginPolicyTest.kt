package com.popwam.pop.ui

import org.junit.Assert.*
import org.junit.Test
import java.io.IOException
import com.popwam.pop.data.repository.PasskeyOptionsHttpException
import com.popwam.pop.data.repository.PASSKEY_OPTIONS_FAILED
import com.popwam.pop.data.repository.STEP_UP_REQUIRED
import retrofit2.HttpException
import retrofit2.Response

class PasskeyLoginPolicyTest {
    private class GetCredentialCancellationException:Exception()
    private class NoCredentialException:Exception()

    @Test fun `passkey is hidden below Android 9`() { assertFalse(passkeyPlatformSupported(27));assertTrue(passkeyPlatformSupported(28)) }
    @Test fun `registration cancellation is classified`() { val error=passkeyLoginError(GetCredentialCancellationException());assertEquals(PasskeyLoginError.CANCELLED,error) }
    @Test fun `missing credential is classified`() { val error=passkeyLoginError(NoCredentialException());assertEquals(PasskeyLoginError.NO_CREDENTIAL,error) }
    @Test fun `network failure is safe and recoverable`()=assertEquals(PasskeyLoginError.NETWORK,passkeyLoginError(IOException()))
    @Test fun `step up and server options failures remain distinct typed outcomes`() {
        assertEquals(PasskeyLoginError.STEP_UP_REQUIRED,passkeyLoginError(PasskeyOptionsHttpException(428,STEP_UP_REQUIRED,HttpException(Response.error<Any>(428,okhttp3.ResponseBody.create(null,""))))))
        assertEquals(PasskeyLoginError.SERVER_UNAVAILABLE,passkeyLoginError(PasskeyOptionsHttpException(500,PASSKEY_OPTIONS_FAILED,HttpException(Response.error<Any>(500,okhttp3.ResponseBody.create(null,""))))))
    }
}
