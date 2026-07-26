package com.popwam.pop.ui

internal val nativeSettingsSections=setOf("root","appearance","notifications","privacy","permissions","security","devices","sessions","passkeys","usage","account","help")

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
