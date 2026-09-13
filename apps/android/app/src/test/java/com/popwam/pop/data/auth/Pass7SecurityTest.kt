package com.popwam.pop.data.auth
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test
class Pass7SecurityTest {
    @Test fun `registration requests server options then verifies platform response`()=runTest {
        val events=mutableListOf<String>()
        assertTrue(registerServerPasskey({events+="options";"server"},{assertEquals("server",it);events+="provider";"response"},{assertEquals("response",it);events+="verify";true}))
        assertEquals(listOf("options","provider","verify"),events)
    }
    @Test fun `registration cancel never verifies`()=runTest {
        var verified=false
        try{registerServerPasskey({"server"},{throw IllegalStateException("cancel")},{verified=true;true});fail()}catch(_:IllegalStateException){}
        assertFalse(verified)
    }
    @Test fun `registration rejection is not local enrollment`()=runTest {assertFalse(registerServerPasskey({"server"},{"response"},{false}))}
    @Test fun `biometric unavailable never opens authority`()=runTest {assertEquals(QuickUnlockResult.UNAVAILABLE,runQuickUnlock(false){fail()})}
    @Test fun `biometric enabled and succeeds`()=runTest {var unlocked=false;assertEquals(QuickUnlockResult.SUCCESS,runQuickUnlock(true){unlocked=true});assertTrue(unlocked)}
    @Test fun `biometric cancellation retains fallback`()=runTest {assertEquals(QuickUnlockResult.CANCELLED,runQuickUnlock(true){throw IllegalStateException("BIOMETRIC_13")})}
    @Test fun `changed enrollment invalidates credential not account`()=runTest {assertEquals(QuickUnlockResult.INVALIDATED,runQuickUnlock(true){throw java.security.InvalidKeyException()})}
    @Test fun `biometric failure is not success`()=runTest {assertEquals(QuickUnlockResult.FAILED,runQuickUnlock(true){throw IllegalStateException()})}
    @Test fun `expired recovery cannot be bypassed by biometrics`(){assertTrue(storedSessionBeyondRecovery(SessionTokens("a","r","u","USER",refreshExpiresAt=1000),1001))}
    @Test fun `valid stored session retains local launch`(){assertFalse(storedSessionBeyondRecovery(SessionTokens("a","r","u","USER",refreshExpiresAt=2000),1001))}
}
