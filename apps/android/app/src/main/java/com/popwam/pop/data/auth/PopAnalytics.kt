package com.popwam.pop.data.auth

interface PopAnalytics {
    fun track(event:String, properties:Map<String,String> = emptyMap())
}
