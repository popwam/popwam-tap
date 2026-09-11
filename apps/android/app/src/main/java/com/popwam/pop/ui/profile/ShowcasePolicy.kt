package com.popwam.pop.ui.profile

import com.popwam.pop.data.api.ProfileTemplateDto
import com.popwam.pop.data.api.StorefrontEntitlementsDto
import java.net.URI

object ShowcasePolicy {
    fun templates(catalog:List<ProfileTemplateDto>,kind:ProfileBackendKind)=catalog.filter{it.profileKind==kind.name && it.isActive}
    fun types(policy:StorefrontEntitlementsDto)=buildList {
        if(policy.storefrontEnabled){if(policy.storefrontProductsEnabled)add("PRODUCT");if(policy.storefrontServicesEnabled)add("SERVICE")}
    }
    fun canAdd(policy:StorefrontEntitlementsDto,count:Int)=types(policy).isNotEmpty() && (policy.storefrontMaxItems?.let{count<it} ?: true)
    fun priceValid(value:String)=value.isBlank() || Regex("\\d{1,12}(?:\\.\\d{1,2})?").matches(value.trim())
    fun currencyValid(value:String)=value.isBlank() || Regex("[A-Za-z]{3}").matches(value.trim())
    fun itemValid(item:ProfileService)=
        (item.nameAr.isNotBlank() || item.nameEn.isNotBlank()) && item.nameAr.length<=160 && item.nameEn.length<=160 &&
        item.descriptionAr.length<=1000 && item.descriptionEn.length<=1000 && (item.category?.length ?: 0)<=120 &&
        priceValid(item.price.orEmpty()) && currencyValid(item.currency.orEmpty()) && item.itemType in setOf("PRODUCT","SERVICE")
    fun move(ids:List<String>,id:String,delta:Int):List<String> {
        val index=ids.indexOf(id);val next=index+delta
        if(index<0 || next !in ids.indices)return ids
        return ids.toMutableList().apply{removeAt(index);add(next,id)}
    }
}

object DraftPreviewPolicy {
    fun sameOrigin(value:String,base:String)=runCatching {
        val url=URI(value);val origin=URI(base)
        url.scheme=="https" && url.host==origin.host && url.port==origin.port && url.userInfo==null
    }.getOrDefault(false)
    fun authenticatedPath(value:String,base:String,profileId:String):Boolean {
        if(!sameOrigin(value,base))return false
        val path=URI(value).path
        return path=="/mobile-preview/$profileId" || Regex("/api/profiles/${Regex.escape(profileId)}/media/[A-Za-z0-9_-]+").matches(path)
    }
}
