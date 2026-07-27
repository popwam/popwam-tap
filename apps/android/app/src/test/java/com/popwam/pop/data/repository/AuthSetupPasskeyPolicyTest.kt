package com.popwam.pop.data.repository

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthSetupPasskeyPolicyTest {
    @Test fun `registration options reject an API error document before Credential Manager`() {
        assertFalse(passkeyRegistrationOptionsValid(JsonObject().apply { addProperty("ok",false);addProperty("error","STEP_UP_REQUIRED") }))
    }
    @Test fun `registration options require the WebAuthn creation fields`() {
        val options=JsonObject().apply {
            addProperty("challenge","opaque")
            add("rp",JsonObject().apply { addProperty("id","pop.popwam.com") })
            add("user",JsonObject().apply { addProperty("id","opaque") })
            add("pubKeyCredParams",JsonArray())
        }
        assertTrue(passkeyRegistrationOptionsValid(options))
    }
}
