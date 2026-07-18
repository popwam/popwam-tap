package com.popwam.pop.data.repository

import org.junit.Assert.*
import org.junit.Test

class AndroidUploadPolicyTest {
    @Test fun acceptsSupportedImages() { listOf("image/jpeg","image/png","image/webp").forEach { assertNull(AndroidUploadPolicy.validate(it, 1024, false)) } }
    @Test fun rejectsOversizedAndDisallowedFiles() { assertEquals("UPLOAD_TOO_LARGE",AndroidUploadPolicy.validate("image/jpeg",AndroidUploadPolicy.MAX_IMAGE_BYTES+1,false));assertEquals("UPLOAD_TYPE_NOT_ALLOWED",AndroidUploadPolicy.validate("application/x-msdownload",10,true)) }
}
