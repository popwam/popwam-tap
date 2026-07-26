package com.popwam.pop.data.auth

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.popwam.pop.TapApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** FCM is independent of Google OAuth. Upload is deferred until a POP phone session exists. */
class PopMessagingService:FirebaseMessagingService(){
    override fun onNewToken(token:String){
        val bridge=(application as TapApplication).container.pushTokens
        bridge.remember(token)
        CoroutineScope(SupervisorJob()+Dispatchers.IO).launch { bridge.uploadPendingIfAuthenticated() }
    }
    override fun onMessageReceived(message:RemoteMessage){super.onMessageReceived(message)}
}
