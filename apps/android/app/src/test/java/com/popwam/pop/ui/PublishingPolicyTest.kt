package com.popwam.pop.ui

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PublishingPolicyTest {
    @Test fun `first publish requires review and readiness`() {
        assertFalse(PublishingPolicy.canPublish(true,true,false,false))
        assertFalse(PublishingPolicy.canPublish(false,true,true,false))
        assertTrue(PublishingPolicy.canPublish(true,true,true,false))
    }

    @Test fun `republish does not repeat first publish review`() {
        assertTrue(PublishingPolicy.canPublish(true,false,false,false))
    }

    @Test fun `double taps are blocked while request is running`() {
        assertFalse(PublishingPolicy.canPublish(true,false,true,true))
    }
}
