package com.popwam.pop.data.auth

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/** FCM is independent of Google OAuth. Upload is deferred until a POP phone session exists. */
class PopMessagingService:FirebaseMessagingService(){
    override fun onNewToken(token:String){getSharedPreferences("pop_push",MODE_PRIVATE).edit().putString("pending_fcm_token",token).apply()}
    override fun onMessageReceived(message:RemoteMessage){super.onMessageReceived(message)}
}
