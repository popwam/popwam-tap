package com.popwam.pop.ui.profile

import androidx.compose.ui.unit.LayoutDirection
import com.google.i18n.phonenumbers.PhoneNumberUtil
import com.google.gson.JsonElement

object ProfilePolicy {
    private val supportedEditorModules = setOf("IDENTITY", "ABOUT", "CONTACT", "SOCIAL", "LINKS", "SERVICES", "PORTFOLIO", "GALLERY", "BRANCHES")

    fun sections(content:ProfileContent):List<ProfileEditorSection> = buildList {
        add(ProfileEditorSection.BASIC_INFORMATION)
        add(ProfileEditorSection.ABOUT)
        add(ProfileEditorSection.CONTACT_LINKS)
        if(editableCapabilities(content).isNotEmpty()) add(ProfileEditorSection.TYPE_DETAILS)
        if (content.modules.any { it.supported && it.key in setOf("GALLERY", "PORTFOLIO") } || content.media.isNotEmpty()) add(ProfileEditorSection.MEDIA)
        add(ProfileEditorSection.TEMPLATE)
        add(ProfileEditorSection.VISIBILITY)
        if (content.summary.backendKind == ProfileBackendKind.BUSINESS) add(ProfileEditorSection.SERVICES)
        if (content.modules.any { it.supported && it.key == "BRANCHES" }) add(ProfileEditorSection.LOCATIONS)
    }



    fun canEditModule(module:ProfileModule)=module.supported && module.key in supportedEditorModules
    fun editableCapabilities(content:ProfileContent)=content.fieldCapabilities.filter{it.classification==ProfileDataClassification.PUBLIC_PROFILE}
    fun nextModuleVisibility(value:String)=when(value){"PUBLIC"->"FRIENDS";"FRIENDS"->"ONLY_ME";else->"PUBLIC"}
    fun canArchive(profile:OwnedProfile,profiles:List<OwnedProfile>)=profiles.size>1 && (!profile.isPrimary || profiles.any { it.id!=profile.id })
    fun normalizedSlug(value:String)=value.trim().lowercase().replace(Regex("[\\s_]+"),"-").replace(Regex("[^a-z0-9-]"),"").replace(Regex("-+"),"-").trim('-').take(63)
    fun validLink(type:String,value:String)=when(type){
        "PHONE","WHATSAPP_PRIVATE","WHATSAPP_BUSINESS"->ProfileFormValidation.validInternationalPhone(value)
        "EMAIL"->Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(value.trim())
        else->runCatching{java.net.URI(value.trim()).let{it.scheme in setOf("http","https")&&!it.host.isNullOrBlank()}}.getOrDefault(false)
    }
    fun fixedValueDirection(field:String,screenDirection:LayoutDirection)=if(field in setOf("phone","url","website","username","slug","code","email")) LayoutDirection.Ltr else screenDirection
}

enum class ProfileFormField(val key:String) {
    DISPLAY_NAME("display-name"), DISPLAY_LABEL("display-label"), DISPLAY_NAME_AR("display-name-ar"), DISPLAY_NAME_EN("display-name-en"),
    FIRST_NAME("first-name"), LAST_NAME("last-name"), PROFESSION("profession"), CUSTOM_PROFESSION("custom-profession"),
    COMPANY("company"), INDUSTRY_AR("industry-ar"), INDUSTRY_EN("industry-en"),
    TITLE_AR("title-ar"), TITLE_EN("title-en"), ORGANIZATION_AR("organization-ar"), ORGANIZATION_EN("organization-en"),
    HEADLINE("headline"), BIO("bio"), ABOUT_AR("about-ar"), ABOUT_EN("about-en"), DESCRIPTION_AR("description-ar"), DESCRIPTION_EN("description-en"),
    PHONE("phone"), ALTERNATE_PHONE("alternate-phone"), EMAIL("email"), WEBSITE("website"), WHATSAPP("whatsapp"), WHATSAPP_PRIVATE("whatsapp-private"), LOCATION("location"), ADDRESS_AR("address-ar"), ADDRESS_EN("address-en"), SLUG("slug"),
    CREATE_NAME("create-name"), LINK_TITLE("link-title"), LINK_VALUE("link-value"),
    SERVICE_NAME("service-name"), SERVICE_DESCRIPTION("service-description"), SERVICE_URL("service-url"),
    LOCATION_NAME("location-name"), LOCATION_ADDRESS("location-address"), LOCATION_PHONE("location-phone"), LOCATION_MAP_URL("location-map-url"),
    DOCUMENT_TITLE_AR("document-title-ar"), DOCUMENT_TITLE_EN("document-title-en"),
}

enum class ProfileValidationCode { REQUIRED, TOO_LONG, TOO_MANY_ITEMS, INVALID_PHONE, INVALID_EMAIL, INVALID_URL, INVALID_SLUG, INVALID_NUMBER, INVALID_TIME, INVALID_SELECTION, UNSUPPORTED }

data class ProfileValidationResult(
    val errors: Map<ProfileFormField,ProfileValidationCode> = emptyMap(),
) {
    val valid:Boolean get()=errors.isEmpty()
    val firstInvalidField:String? get()=errors.keys.firstOrNull()?.key
    operator fun get(field:ProfileFormField)=errors[field]
}

/** Client-side feedback mirrors deployed limits; backend validation remains authoritative. */
object ProfileFormValidation {
    private val emailPattern=Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
    private val phoneUtil=PhoneNumberUtil.getInstance()

    fun identity(
        displayName:String,displayLabel:String,displayNameAr:String,displayNameEn:String,
        titleAr:String,titleEn:String,organizationAr:String,organizationEn:String,isBusiness:Boolean,
        firstName:String="",lastName:String="",profession:String="PERSONAL",customProfession:String="",
        company:String="",industryAr:String="",industryEn:String="",validateProfession:Boolean=false,
    )=result {
        required(ProfileFormField.DISPLAY_NAME,displayName,120)
        optional(ProfileFormField.DISPLAY_LABEL,displayLabel,80)
        optional(ProfileFormField.DISPLAY_NAME_AR,displayNameAr,120)
        optional(ProfileFormField.DISPLAY_NAME_EN,displayNameEn,120)
        optional(ProfileFormField.TITLE_AR,titleAr,120)
        optional(ProfileFormField.TITLE_EN,titleEn,120)
        optional(ProfileFormField.FIRST_NAME,firstName,80)
        optional(ProfileFormField.LAST_NAME,lastName,80)
        optional(ProfileFormField.CUSTOM_PROFESSION,customProfession,120)
        optional(ProfileFormField.COMPANY,company,160)
        optional(ProfileFormField.INDUSTRY_AR,industryAr,160)
        optional(ProfileFormField.INDUSTRY_EN,industryEn,160)
        if(validateProfession && profession !in ProfileIdentityPolicy.professions)put(ProfileFormField.PROFESSION,ProfileValidationCode.INVALID_SELECTION)
        if(isBusiness){optional(ProfileFormField.ORGANIZATION_AR,organizationAr,120);optional(ProfileFormField.ORGANIZATION_EN,organizationEn,120)}
    }

    fun about(title:String,bio:String,bioAr:String,bioEn:String,descriptionAr:String,descriptionEn:String)=result {
        optional(ProfileFormField.HEADLINE,title,120)
        optional(ProfileFormField.BIO,bio,2000)
        optional(ProfileFormField.ABOUT_AR,bioAr,2000)
        optional(ProfileFormField.ABOUT_EN,bioEn,2000)
        optional(ProfileFormField.DESCRIPTION_AR,descriptionAr,3000)
        optional(ProfileFormField.DESCRIPTION_EN,descriptionEn,3000)
    }

    fun contact(phone:String,alternatePhone:String,email:String,website:String,whatsapp:String,whatsappPrivate:String,location:String,addressAr:String,addressEn:String)=result {
        phone(ProfileFormField.PHONE,phone)
        phone(ProfileFormField.ALTERNATE_PHONE,alternatePhone)
        email(ProfileFormField.EMAIL,email)
        url(ProfileFormField.WEBSITE,website)
        phone(ProfileFormField.WHATSAPP,whatsapp)
        phone(ProfileFormField.WHATSAPP_PRIVATE,whatsappPrivate)
        optional(ProfileFormField.LOCATION,location,300)
        optional(ProfileFormField.ADDRESS_AR,addressAr,500)
        optional(ProfileFormField.ADDRESS_EN,addressEn,500)
    }

    fun visibility(slug:String)=result {
        val normalized=ProfilePolicy.normalizedSlug(slug)
        if(normalized.length<3 || normalized!=slug.trim().lowercase())put(ProfileFormField.SLUG,ProfileValidationCode.INVALID_SLUG)
    }

    fun creation(name:String)=result { required(ProfileFormField.CREATE_NAME,name,120) }

    fun link(type:String,title:String,value:String)=result {
        required(ProfileFormField.LINK_TITLE,title,120)
        required(ProfileFormField.LINK_VALUE,value,2048)
        if(value.isNotBlank()&&!ProfilePolicy.validLink(type,value))put(
            ProfileFormField.LINK_VALUE,
            when(type){"PHONE","WHATSAPP_PRIVATE","WHATSAPP_BUSINESS"->ProfileValidationCode.INVALID_PHONE;"EMAIL"->ProfileValidationCode.INVALID_EMAIL;else->ProfileValidationCode.INVALID_URL},
        )
    }

    fun service(name:String,description:String,url:String)=result {
        required(ProfileFormField.SERVICE_NAME,name,160)
        optional(ProfileFormField.SERVICE_DESCRIPTION,description,1000)
        url(ProfileFormField.SERVICE_URL,url)
    }

    fun location(name:String,address:String,phone:String,mapUrl:String)=result {
        required(ProfileFormField.LOCATION_NAME,name,160)
        optional(ProfileFormField.LOCATION_ADDRESS,address,500)
        phone(ProfileFormField.LOCATION_PHONE,phone)
        url(ProfileFormField.LOCATION_MAP_URL,mapUrl)
    }

    fun document(titleAr:String,titleEn:String)=result {
        optional(ProfileFormField.DOCUMENT_TITLE_AR,titleAr,120)
        optional(ProfileFormField.DOCUMENT_TITLE_EN,titleEn,120)
    }

    fun normalizedEmail(value:String)=value.trim().lowercase()
    fun validInternationalPhone(value:String):Boolean {
        val trimmed=value.trim()
        return trimmed.startsWith('+') && runCatching{phoneUtil.isValidNumber(phoneUtil.parse(trimmed,"ZZ"))}.getOrDefault(false)
    }
    fun normalizedPhone(value:String):String {
        val trimmed=value.trim()
        if(!trimmed.startsWith('+'))return trimmed
        return runCatching{
            val parsed=phoneUtil.parse(trimmed,"ZZ")
            if(phoneUtil.isValidNumber(parsed))phoneUtil.format(parsed,PhoneNumberUtil.PhoneNumberFormat.E164)else trimmed
        }.getOrDefault(trimmed)
    }
    fun normalizedHttpUrl(value:String):String {
        val trimmed=value.trim()
        if(trimmed.isBlank())return ""
        return if(Regex("^[a-zA-Z][a-zA-Z0-9+.-]*://").containsMatchIn(trimmed))trimmed else "https://$trimmed"
    }

    private fun result(block:ValidationBuilder.()->Unit)=ProfileValidationResult(linkedMapOf<ProfileFormField,ProfileValidationCode>().also { ValidationBuilder(it).block() })

    private class ValidationBuilder(private val errors:MutableMap<ProfileFormField,ProfileValidationCode>){
        fun put(field:ProfileFormField,code:ProfileValidationCode){errors.putIfAbsent(field,code)}
        fun required(field:ProfileFormField,value:String,maximum:Int){if(value.trim().isEmpty())put(field,ProfileValidationCode.REQUIRED)else optional(field,value,maximum)}
        fun optional(field:ProfileFormField,value:String,maximum:Int){if(value.trim().length>maximum)put(field,ProfileValidationCode.TOO_LONG)}
        fun phone(field:ProfileFormField,value:String){
            optional(field,value,32)
            if(value.isBlank())return
            val trimmed=value.trim()
            if(!validInternationalPhone(trimmed))put(field,ProfileValidationCode.INVALID_PHONE)
        }
        fun email(field:ProfileFormField,value:String){optional(field,value,254);if(value.isNotBlank()&&!emailPattern.matches(value.trim()))put(field,ProfileValidationCode.INVALID_EMAIL)}
        fun url(field:ProfileFormField,value:String){if(value.isBlank())return;val normalized=normalizedHttpUrl(value);if(normalized.length>2048||!ProfilePolicy.validLink("WEBSITE",normalized))put(field,ProfileValidationCode.INVALID_URL)}
    }
}

enum class ProfileDocumentValidation { VALID, EMPTY, TOO_LARGE, INVALID_TYPE }
object ProfileDocumentPolicy {
    const val maxBytes=10L*1024L*1024L
    val mimeTypes=arrayOf("application/pdf","text/vcard","text/x-vcard","text/plain","image/jpeg","image/png","image/webp")
    private val extensions=mapOf(
        "pdf" to setOf("application/pdf"),"vcf" to setOf("text/vcard","text/x-vcard"),"txt" to setOf("text/plain"),
        "jpg" to setOf("image/jpeg"),"jpeg" to setOf("image/jpeg"),"png" to setOf("image/png"),"webp" to setOf("image/webp"),
    )
    fun validate(fileName:String,mimeType:String,sizeBytes:Long):ProfileDocumentValidation {
        if(sizeBytes<=0)return ProfileDocumentValidation.EMPTY
        if(sizeBytes>maxBytes)return ProfileDocumentValidation.TOO_LARGE
        val extension=fileName.substringAfterLast('.',"").lowercase()
        return if(mimeType.lowercase() in extensions[extension].orEmpty())ProfileDocumentValidation.VALID else ProfileDocumentValidation.INVALID_TYPE
    }
}

/** Visibility of the persisted identity fields varies by profile category; storage and navigation stay shared. */
object ProfileIdentityPolicy {
    val professions=listOf(
        "PERSONAL","BUSINESS_OWNER","COMPANY","DEVELOPER","DESIGNER","CREATOR","MARKETER",
        "REAL_ESTATE","DOCTOR","LAWYER","MUSICIAN","PHOTOGRAPHER","FREELANCER","RESTAURANT","SHOP",
    )
    fun showsPersonalName(kind:ProfileBackendKind)=kind==ProfileBackendKind.PERSONAL
    fun showsProfession(kind:ProfileBackendKind)=kind==ProfileBackendKind.PERSONAL
    fun showsCompany(kind:ProfileBackendKind)=true
    fun showsIndustry(kind:ProfileBackendKind)=kind==ProfileBackendKind.BUSINESS

}

data class ProfileStructuredValidationResult(
    val errors:Map<String,ProfileValidationCode> = emptyMap(),
){
    val valid:Boolean get()=errors.isEmpty()
    val firstInvalidField:String? get()=errors.keys.firstOrNull()
}

object ProfileStructuredPolicy {
    private val clock=Regex("^([01]\\d|2[0-3]):[0-5]\\d$")
    private val technicalHints=listOf("url","email","year","code","slug","phone","number","registration")
    val weekDays=listOf("monday","tuesday","wednesday","thursday","friday","saturday","sunday")

    fun valueType(raw:String)=runCatching{ProfileStructuredValueType.valueOf(raw)}.getOrDefault(ProfileStructuredValueType.UNKNOWN)
    fun fieldId(capabilityKey:String,part:String?=null)="structured-$capabilityKey${part?.let{"-$it"}.orEmpty()}"
    fun isTechnical(capability:ProfileFieldCapability,part:String?=null)=capability.valueType in setOf(ProfileStructuredValueType.URL,ProfileStructuredValueType.EMAIL,ProfileStructuredValueType.INTEGER) || technicalHints.any { hint->hint in (part ?: capability.key).lowercase() }

    fun validate(capability:ProfileFieldCapability,value:JsonElement):ProfileStructuredValidationResult {
        val errors=linkedMapOf<String,ProfileValidationCode>()
        fun error(part:String?=null,code:ProfileValidationCode){errors.putIfAbsent(fieldId(capability.key,part),code)}
        fun string(part:String?=null):String = when {
            part==null && value.isJsonPrimitive -> value.asString
            value.isJsonObject -> value.asJsonObject.get(part)?.takeUnless{it.isJsonNull}?.asString.orEmpty()
            else -> ""
        }.trim()
        fun required(part:String?=null){if(string(part).isBlank())error(part,ProfileValidationCode.REQUIRED)}
        fun year(part:String){val raw=string(part);if(raw.isNotBlank()&&(raw.toIntOrNull()?.let{it in 1900..2200}!=true))error(part,ProfileValidationCode.INVALID_NUMBER)}
        when(capability.valueType){
            ProfileStructuredValueType.TEXT,ProfileStructuredValueType.LONG_TEXT->{if(capability.requiredForCompletion)required();val max=if(capability.valueType==ProfileStructuredValueType.LONG_TEXT)3000 else 160;if(string().length>max)error(code=ProfileValidationCode.TOO_LONG)}
            ProfileStructuredValueType.URL->{if(capability.requiredForCompletion)required();if(string().isNotBlank()&&!ProfilePolicy.validLink("WEBSITE",ProfileFormValidation.normalizedHttpUrl(string())))error(code=ProfileValidationCode.INVALID_URL)}
            ProfileStructuredValueType.EMAIL->{if(capability.requiredForCompletion)required();if(string().isNotBlank()&&!ProfilePolicy.validLink("EMAIL",string()))error(code=ProfileValidationCode.INVALID_EMAIL)}
            ProfileStructuredValueType.INTEGER->{if(capability.requiredForCompletion)required();if(string().isNotBlank()&&string().toIntOrNull()==null)error(code=ProfileValidationCode.INVALID_NUMBER)}
            ProfileStructuredValueType.STRING_LIST->{val items=if(value.isJsonArray)value.asJsonArray.mapNotNull{runCatching{it.asString.trim()}.getOrNull()?.takeIf(String::isNotBlank)}else emptyList();if(capability.requiredForCompletion&&items.isEmpty())error(code=ProfileValidationCode.REQUIRED);if(items.size>capability.maxItems)error(code=ProfileValidationCode.TOO_MANY_ITEMS)}
            ProfileStructuredValueType.EDUCATION->{required("institution");year("startYear");year("endYear")}
            ProfileStructuredValueType.EXPERIENCE->{required("organization");required("role");year("startYear");year("endYear")}
            ProfileStructuredValueType.PROJECT->{required("name");val url=string("url");if(url.isNotBlank()&&!ProfilePolicy.validLink("WEBSITE",ProfileFormValidation.normalizedHttpUrl(url)))error("url",ProfileValidationCode.INVALID_URL)}
            ProfileStructuredValueType.WEEKLY_HOURS->{
                if(!value.isJsonObject||weekDays.none{value.asJsonObject.has(it)})error(code=ProfileValidationCode.REQUIRED)
                else weekDays.forEach{day->val hours=value.asJsonObject.getAsJsonObject(day)?:return@forEach;val closed=hours.get("closed")?.takeUnless{it.isJsonNull}?.asBoolean==true;if(!closed){if(!clock.matches(hours.get("open")?.asString.orEmpty()))error("$day-open",ProfileValidationCode.INVALID_TIME);if(!clock.matches(hours.get("close")?.asString.orEmpty()))error("$day-close",ProfileValidationCode.INVALID_TIME)}}
            }
            ProfileStructuredValueType.UNKNOWN->error(code=ProfileValidationCode.UNSUPPORTED)
        }
        return ProfileStructuredValidationResult(errors)
    }

    fun displayValue(entry:ProfileStructuredEntry):String=when{
        entry.value.isJsonPrimitive->entry.value.asString
        entry.value.isJsonArray->entry.value.asJsonArray.joinToString(" · "){runCatching{it.asString}.getOrDefault("")}
        entry.value.isJsonObject->entry.value.asJsonObject.entrySet().mapNotNull{(key,item)->item.takeUnless{it.isJsonNull}?.let{"${key.replace('_',' ')}: ${if(it.isJsonPrimitive)it.asString else "…"}"}}.joinToString(" · ")
        else->""
    }
}

object ProfilePublishingPolicy {
    fun canPublish(ready:Boolean,reviewed:Boolean,busy:Boolean)=ready&&reviewed&&!busy
}
