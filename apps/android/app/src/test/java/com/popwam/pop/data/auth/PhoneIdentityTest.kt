package com.popwam.pop.data.auth
import org.junit.Assert.assertEquals
import org.junit.Test
class PhoneIdentityTest { @Test fun egyptianForms(){listOf("+201001234567","00201001234567","201001234567","01001234567","1001234567").forEach{assertEquals("+201001234567",PhoneIdentity.normalize(it,"EG"))}};@Test fun saudiForms(){listOf("+966501234567","00966501234567","966501234567","0501234567","501234567").forEach{assertEquals("+966501234567",PhoneIdentity.normalize(it,"SA"))}} }
