package com.popwam.pop.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Looper
import androidx.core.content.ContextCompat
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

data class NearbyCoordinate(val latitude:Double,val longitude:Double)

class NearbyLocationController(context:Context) {
    private val appContext=context.applicationContext
    private val manager=appContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private val permissionPreferences=appContext.getSharedPreferences("nearby_permission_state",Context.MODE_PRIVATE)

    fun permissionState():NearbyPermissionState=when {
        ContextCompat.checkSelfPermission(appContext,Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED->NearbyPermissionState.APPROXIMATE
        permissionPreferences.getBoolean("requested",false)->NearbyPermissionState.DENIED
        else->NearbyPermissionState.NOT_REQUESTED
    }

    fun markPermissionRequested(){permissionPreferences.edit().putBoolean("requested",true).apply()}

    fun servicesEnabled():Boolean=if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.P)manager.isLocationEnabled
    else runCatching { manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)||manager.isProviderEnabled(LocationManager.GPS_PROVIDER) }.getOrDefault(false)

    private fun provider():String?=listOf(LocationManager.NETWORK_PROVIDER,LocationManager.PASSIVE_PROVIDER,LocationManager.GPS_PROVIDER)
        .firstOrNull { runCatching { manager.isProviderEnabled(it) }.getOrDefault(false) }

    @SuppressLint("MissingPermission")
    @Suppress("DEPRECATION")
    suspend fun currentApproximateLocation():NearbyCoordinate {
        if(permissionState()!=NearbyPermissionState.APPROXIMATE)throw IllegalStateException("NEARBY_PERMISSION_REQUIRED")
        if(!servicesEnabled())throw IllegalStateException("NEARBY_LOCATION_SERVICES_OFF")
        val selected=provider() ?: throw IllegalStateException("NEARBY_LOCATION_UNAVAILABLE")
        val location:Location=suspendCancellableCoroutine { continuation->
            if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.R){
                val signal=CancellationSignal()
                manager.getCurrentLocation(selected,signal,appContext.mainExecutor){result->
                    if(!continuation.isActive)return@getCurrentLocation
                    if(result==null)continuation.resumeWithException(IllegalStateException("NEARBY_LOCATION_UNAVAILABLE"))
                    else continuation.resume(result)
                }
                continuation.invokeOnCancellation { signal.cancel() }
            }else{
                @Suppress("DEPRECATION")
                val listener=object:LocationListener{
                    override fun onLocationChanged(result:Location){if(continuation.isActive)continuation.resume(result);manager.removeUpdates(this)}
                    override fun onProviderDisabled(provider:String){if(continuation.isActive)continuation.resumeWithException(IllegalStateException("NEARBY_LOCATION_SERVICES_OFF"));manager.removeUpdates(this)}
                    override fun onProviderEnabled(provider:String)=Unit
                    @Deprecated("Deprecated in Android") override fun onStatusChanged(provider:String?,status:Int,extras:Bundle?)=Unit
                }
                @Suppress("DEPRECATION")
                manager.requestSingleUpdate(selected,listener,Looper.getMainLooper())
                continuation.invokeOnCancellation { manager.removeUpdates(listener) }
            }
        }
        return NearbyCoordinate(location.latitude,location.longitude)
    }
}
