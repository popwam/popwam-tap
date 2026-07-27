package com.popwam.pop.data.auth

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PasskeyCreationOptionsTest {
    private fun validOptions()=JsonObject().apply {
        addProperty("challenge","Y2hhbGxlbmdl")
        add("rp",JsonObject().apply { addProperty("id","pop.popwam.com");addProperty("name","POP by POPWAM") })
        add("user",JsonObject().apply { addProperty("id","dXNlci0x");addProperty("name","user");addProperty("displayName","POP user") })
        add("pubKeyCredParams",JsonArray().apply { add(JsonObject().apply { addProperty("type","public-key");addProperty("alg",-7) }) })
        add("authenticatorSelection",JsonObject().apply { addProperty("residentKey","preferred");addProperty("userVerification","required") })
        addProperty("attestation","none")
    }
    @Test fun `raw server creation options are structurally valid for Credential Manager`() {
        assertTrue(validatePasskeyCreationOptions(validOptions(),"pop.popwam.com").valid)
    }
    @Test fun `response wrapper is rejected instead of being passed to Credential Manager`() {
        val wrapped=JsonObject().apply { addProperty("ok",true);add("options",validOptions()) }
        assertEquals("rp_missing",validatePasskeyCreationOptions(wrapped,"pop.popwam.com").classification)
    }
    @Test fun `invalid base64url user id is rejected`() {
        val options=validOptions();options.getAsJsonObject("user").addProperty("id","not base64url")
        assertEquals("user_id_invalid",validatePasskeyCreationOptions(options,"pop.popwam.com").classification)
    }
    @Test fun `conflicting resident key options are rejected`() {
        val options=validOptions();options.getAsJsonObject("authenticatorSelection").addProperty("requireResidentKey",true)
        assertEquals("resident_key_conflict",validatePasskeyCreationOptions(options,"pop.popwam.com").classification)
    }
    @Test fun `platform DOM errors retain only their safe category`() {
        assertEquals("security_error",passkeyDomErrorClassification("SecurityError"))
        assertEquals("not_allowed",passkeyDomErrorClassification("NotAllowedError"))
        assertEquals("invalid_state",passkeyDomErrorClassification("InvalidStateError"))
        assertEquals("not_supported",passkeyDomErrorClassification("NotSupportedError"))
        assertEquals("unknown_error",passkeyDomErrorClassification("UnknownError"))
    }
}
