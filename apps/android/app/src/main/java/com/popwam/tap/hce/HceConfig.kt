package com.popwam.tap.hce
import android.content.Context
object HceConfig{private const val FILE="hce_public_config";fun enabled(context:Context)=context.getSharedPreferences(FILE,Context.MODE_PRIVATE).getBoolean("enabled",false);fun url(context:Context)=context.getSharedPreferences(FILE,Context.MODE_PRIVATE).getString("public_url",null);fun save(context:Context,enabled:Boolean,url:String?){context.getSharedPreferences(FILE,Context.MODE_PRIVATE).edit().putBoolean("enabled",enabled).putString("public_url",url).apply()}}
