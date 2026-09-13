package com.popwam.pop.ui
/** Appearance metadata is never a prerequisite for profile existence. */
internal fun bootstrapValidationError(name:String,kind:String?):String?=when {
    name.isBlank() || name.length>160 -> "PROFILE_NAME_REQUIRED"
    kind !in setOf("PERSONAL","BUSINESS") -> "PROFILE_KIND_INVALID"
    else -> null
}
