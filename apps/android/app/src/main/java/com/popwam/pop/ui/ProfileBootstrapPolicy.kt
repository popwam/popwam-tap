package com.popwam.pop.ui

import com.popwam.pop.data.api.ProfileBootstrapTemplateDto

/** UI validation only. The Phase C endpoint remains the final category/template authority. */
internal fun bootstrapValidationError(name:String,kind:String?,category:String?,templates:List<ProfileBootstrapTemplateDto>,templateId:String?):String? = when {
    name.isBlank() -> "PROFILE_NAME_REQUIRED"
    kind !in setOf("PERSONAL","BUSINESS") -> "PROFILE_KIND_INVALID"
    category.isNullOrBlank() -> "PROFILE_CATEGORY_REQUIRED"
    templates.isEmpty() -> "PROFILE_TEMPLATES_UNAVAILABLE"
    templateId.isNullOrBlank() || templates.none { it.id==templateId } -> "PROFILE_TEMPLATE_INCOMPATIBLE"
    else -> null
}
