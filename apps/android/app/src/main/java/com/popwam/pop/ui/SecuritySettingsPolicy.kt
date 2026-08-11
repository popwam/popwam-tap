package com.popwam.pop.ui

internal val nativeSettingsSections=setOf("root","appearance","language","notifications","privacy","permissions","security","devices","sessions","passkeys","device-security","usage","account","help","about","legal")

internal val approvedMenuRoutes=MenuDestination.entries.mapTo(linkedSetOf()){it.route}

internal fun accountProjectionExposesInternalId()=false
internal fun profileVisibilityIsAccountSetting()=false
internal fun frenchPreferenceIsLocalOnly(serverLanguage:String?)=serverLanguage==null

internal fun settingsAnalyticsEvent(section:String)=when(section){
    "devices"->"devices_viewed"
    "passkeys"->"passkey_management_opened"
    "security","sessions"->"security_viewed"
    else->"settings_viewed"
}

internal fun devicePermissionState(declared:Boolean,granted:Boolean,showRationale:Boolean)=when{
    !declared->"UNAVAILABLE"
    granted->"ALLOWED"
    showRationale->"DENIED"
    else->"NOT_REQUESTED"
}

internal fun stepUpGrantUsable(value:String?)=!value.isNullOrBlank()&&value.length in 32..256
internal fun revocationRequiresLocalLogout(current:Boolean)=current
internal fun fcmCleanupControlsSecuritySuccess()=false
