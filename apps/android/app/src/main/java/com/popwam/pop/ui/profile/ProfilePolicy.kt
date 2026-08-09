package com.popwam.pop.ui.profile

import androidx.compose.ui.unit.LayoutDirection

object ProfilePolicy {
    private val supportedEditorModules = setOf("IDENTITY", "ABOUT", "CONTACT", "SOCIAL", "LINKS", "SERVICES", "PORTFOLIO", "GALLERY", "BRANCHES")

    fun categoryKind(profileKind:String,categoryKey:String?):ProfileCategoryKind {
        val key = categoryKey.orEmpty().lowercase()
        return when {
            "restaurant" in key || "food" in key -> ProfileCategoryKind.RESTAURANT
            "clinic" in key || "medical" in key || "health" in key -> ProfileCategoryKind.CLINIC
            "professional" in key -> ProfileCategoryKind.PROFESSIONAL
            "service" in key -> ProfileCategoryKind.SERVICES
            "creator" in key || "public" in key -> ProfileCategoryKind.CREATOR
            profileKind == "BUSINESS" -> ProfileCategoryKind.BUSINESS
            profileKind == "PERSONAL" -> ProfileCategoryKind.PERSONAL
            else -> ProfileCategoryKind.OTHER
        }
    }

    fun sections(content:ProfileContent):List<ProfileEditorSection> = buildList {
        add(ProfileEditorSection.BASIC_INFORMATION)
        add(ProfileEditorSection.ABOUT)
        add(ProfileEditorSection.CONTACT_LINKS)
        if (content.modules.any { it.supported && it.key in setOf("GALLERY", "PORTFOLIO") } || content.media.isNotEmpty()) add(ProfileEditorSection.MEDIA)
        add(ProfileEditorSection.APPEARANCE)
        add(ProfileEditorSection.VISIBILITY)
        if (content.modules.any { it.supported && it.key == "SERVICES" }) add(ProfileEditorSection.SERVICES)
        if (content.modules.any { it.supported && it.key == "BRANCHES" }) add(ProfileEditorSection.LOCATIONS)
        add(ProfileEditorSection.VERIFICATION)
    }

    /** Explicit boundary for approved concepts that have no current persisted
     * module. Production UI does not render or pretend to save these fields. */
    fun pendingCapabilities(kind:ProfileCategoryKind)=when(kind){
        ProfileCategoryKind.PROFESSIONAL,ProfileCategoryKind.SERVICES->setOf(ProfilePendingCapability.EDUCATION,ProfilePendingCapability.EXPERIENCE,ProfilePendingCapability.SKILLS,ProfilePendingCapability.PROJECTS,ProfilePendingCapability.CERTIFICATES)
        ProfileCategoryKind.BUSINESS->setOf(ProfilePendingCapability.WORKING_HOURS,ProfilePendingCapability.TEAM)
        ProfileCategoryKind.RESTAURANT->setOf(ProfilePendingCapability.WORKING_HOURS,ProfilePendingCapability.MENU,ProfilePendingCapability.DELIVERY_RESERVATION)
        ProfileCategoryKind.CLINIC->setOf(ProfilePendingCapability.WORKING_HOURS,ProfilePendingCapability.DOCTORS,ProfilePendingCapability.BOOKING,ProfilePendingCapability.LICENSE_VERIFICATION)
        else->emptySet()
    }

    fun canEditModule(module:ProfileModule)=module.supported && module.key in supportedEditorModules
    fun nextModuleVisibility(value:String)=when(value){"PUBLIC"->"FRIENDS";"FRIENDS"->"ONLY_ME";else->"PUBLIC"}
    fun canArchive(profile:OwnedProfile,profiles:List<OwnedProfile>)=profiles.size>1 && (!profile.isPrimary || profiles.any { it.id!=profile.id })
    fun normalizedSlug(value:String)=value.trim().lowercase().replace(Regex("[\\s_]+"),"-").replace(Regex("[^a-z0-9-]"),"").replace(Regex("-+"),"-").trim('-').take(63)
    fun validLink(type:String,value:String)=when(type){
        "PHONE","WHATSAPP_PRIVATE","WHATSAPP_BUSINESS"->Regex("^\\+?[0-9 ()-]{7,24}$").matches(value.trim())
        "EMAIL"->Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(value.trim())
        else->runCatching{java.net.URI(value.trim()).let{it.scheme in setOf("http","https")&&!it.host.isNullOrBlank()}}.getOrDefault(false)
    }
    fun fixedValueDirection(field:String,screenDirection:LayoutDirection)=if(field in setOf("phone","url","website","username","slug","code","email")) LayoutDirection.Ltr else screenDirection
}

object ProfilePublishingPolicy {
    fun canPublish(ready:Boolean,reviewed:Boolean,busy:Boolean)=ready&&reviewed&&!busy
}
