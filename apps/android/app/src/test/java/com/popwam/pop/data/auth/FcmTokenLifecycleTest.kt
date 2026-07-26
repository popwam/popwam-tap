package com.popwam.pop.data.auth

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FcmTokenLifecycleTest {
    @Test fun pendingTokenUploadsAfterAuthenticationAndOnRotation() { assertTrue(FcmTokenLifecycle.shouldUpload(true,"token-a"));assertTrue(FcmTokenLifecycle.shouldUpload(true,"token-b"));assertFalse(FcmTokenLifecycle.shouldUpload(false,"token-a")) }
    @Test fun logoutRevocationRequiresCurrentPopSessionAndToken() { assertTrue(FcmTokenLifecycle.shouldRevoke(true,"token"));assertFalse(FcmTokenLifecycle.shouldRevoke(true,null));assertFalse(FcmTokenLifecycle.shouldRevoke(false,"token")) }
}
