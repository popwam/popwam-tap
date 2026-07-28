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
            addProperty("challenge","Y2hhbGxlbmdl")
            add("rp",JsonObject().apply { addProperty("id","pop.popwam.com");addProperty("name","POP by POPWAM") })
            add("user",JsonObject().apply { addProperty("id","dXNlci0x");addProperty("name","user");addProperty("displayName","POP user") })
            add("pubKeyCredParams",JsonArray().apply { add(JsonObject().apply { addProperty("type","public-key");addProperty("alg",-7) }) })
            add("authenticatorSelection",JsonObject().apply { addProperty("residentKey","required");addProperty("requireResidentKey",true);addProperty("userVerification","required") })
        }
        assertTrue(passkeyRegistrationOptionsValid(options))
    }
}
