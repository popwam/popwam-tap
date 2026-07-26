package com.popwam.pop.ui

import com.popwam.pop.data.api.NearbySettingsResponse

enum class NearbyStage {
    LOADING,
    UNAVAILABLE,
    COMMUNITY_REQUIRED,
    CONSENT_REQUIRED,
    PROFILE_REQUIRED,
    OFF,
    READY_TO_RESUME,
    ACTIVE,
    ERROR,
}

enum class NearbyPermissionState {
    NOT_REQUESTED,
    APPROXIMATE,
    DENIED,
    SERVICES_OFF,
    UNAVAILABLE,
}

object NearbyPolicy {
    const val heartbeatMillis = 90_000L

    fun resolve(settings:NearbySettingsResponse?, hasClientSession:Boolean):NearbyStage {
        if(settings==null)return NearbyStage.LOADING
        if(!settings.ok)return if(settings.error=="NEARBY_UNAVAILABLE")NearbyStage.UNAVAILABLE else NearbyStage.ERROR
        return when(settings.stage) {
            "COMMUNITY_REQUIRED"->NearbyStage.COMMUNITY_REQUIRED
            "CONSENT_REQUIRED"->NearbyStage.CONSENT_REQUIRED
            "PROFILE_REQUIRED"->NearbyStage.PROFILE_REQUIRED
            "OFF"->NearbyStage.OFF
            "READY_TO_RESUME"->NearbyStage.READY_TO_RESUME
            "ACTIVE"->if(hasClientSession)NearbyStage.ACTIVE else NearbyStage.READY_TO_RESUME
            else->NearbyStage.UNAVAILABLE
        }
    }

    fun shouldCollect(
        stage:NearbyStage,
        lifecycleStarted:Boolean,
        screenVisible:Boolean,
        hasClientSession:Boolean,
    )=stage==NearbyStage.ACTIVE&&lifecycleStarted&&screenVisible&&hasClientSession

    fun publicRelationshipState(value:String)=when(value) {
        "NONE","OUTGOING_PENDING","INCOMING_PENDING","FRIENDS"->value
        else->"UNAVAILABLE"
    }

    fun bandLabel(value:String)=when(value) {
        "SAME_AREA"->"SAME_AREA"
        "NEARBY_AREA"->"NEARBY_AREA"
        else->"AROUND_THIS_AREA"
    }
}
