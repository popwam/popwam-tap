package com.popwam.pop.hce
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.nfc.NfcAdapter
import android.nfc.cardemulation.CardEmulation
object HceConfig{
    private const val FILE="hce_public_config"
    fun enabled(context:Context)=context.getSharedPreferences(FILE,Context.MODE_PRIVATE).getBoolean("enabled",false)
    fun url(context:Context)=context.getSharedPreferences(FILE,Context.MODE_PRIVATE).getString("public_url",null)
    fun activeHceVirtualCardId(context:Context)=context.getSharedPreferences(FILE,Context.MODE_PRIVATE).getString("activeHceVirtualCardId",null)
    fun activeShareTargetId(context:Context)=context.getSharedPreferences(FILE,Context.MODE_PRIVATE).getString("activeShareTargetId",null)
    fun save(context:Context,enabled:Boolean,url:String?,virtualCardId:String?=null,shareTargetId:String?=null){
        context.getSharedPreferences(FILE,Context.MODE_PRIVATE).edit()
            .putBoolean("enabled",enabled)
            .putString("public_url",url)
            .putString("activeHceVirtualCardId",virtualCardId)
            .putString("activeShareTargetId",shareTargetId)
            .apply()
        val activity=context as? Activity ?: return
        val adapter=NfcAdapter.getDefaultAdapter(activity) ?: return
        runCatching {
            val manager=CardEmulation.getInstance(adapter)
            if(enabled)manager.setPreferredService(activity,ComponentName(activity,PopwamHostApduService::class.java))
            else manager.unsetPreferredService(activity)
        }
    }
}
