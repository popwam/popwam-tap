package com.popwam.pop.data.repository

object AndroidUploadPolicy {
    const val MAX_IMAGE_BYTES = 5L * 1024L * 1024L
    const val MAX_FILE_BYTES = 10L * 1024L * 1024L
    val imageTypes = setOf("image/jpeg", "image/png", "image/webp")
    val fileTypes = imageTypes + setOf("application/pdf", "text/vcard", "text/x-vcard", "text/plain")

    fun validate(mime: String, size: Long, file: Boolean): String? {
        if (mime !in if (file) fileTypes else imageTypes) return "UPLOAD_TYPE_NOT_ALLOWED"
        if (size > if (file) MAX_FILE_BYTES else MAX_IMAGE_BYTES) return "UPLOAD_TOO_LARGE"
        return null
    }
}
