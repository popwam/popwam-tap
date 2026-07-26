package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NearbyAndroidContractTest {
    private fun source(path:String)=File(path).readText()

    @Test fun `manifest requests only coarse foreground location`() {
        val manifest=source("src/main/AndroidManifest.xml")
        assertTrue(manifest.contains("android.permission.ACCESS_COARSE_LOCATION"))
        assertFalse(manifest.contains("android.permission.ACCESS_FINE_LOCATION"))
        assertFalse(manifest.contains("android.permission.ACCESS_BACKGROUND_LOCATION"))
        assertFalse(manifest.contains("android.permission.FOREGROUND_SERVICE_LOCATION"))
        assertFalse(manifest.contains("android.permission.BLUETOOTH_SCAN"))
        assertFalse(manifest.contains("android.permission.NEARBY_WIFI_DEVICES"))
    }

    @Test fun `location controller is one-shot cancellable and contains no logging`() {
        val controller=source("src/main/java/com/popwam/pop/ui/NearbyLocationController.kt")
        assertTrue(controller.contains("getCurrentLocation"))
        assertTrue(controller.contains("requestSingleUpdate"))
        assertTrue(controller.contains("invokeOnCancellation"))
        assertFalse(controller.contains("requestLocationUpdates"))
        assertFalse(controller.contains("Log."))
        assertFalse(controller.contains("FirebaseCrashlytics"))
    }

    @Test fun `permission is launched only by an explicit Nearby action`() {
        val screen=source("src/main/java/com/popwam/pop/ui/NearbyScreen.kt")
        val explicit=screen.indexOf("fun explicitEnable()")
        val launch=screen.indexOf("permissionLauncher.launch")
        assertTrue(explicit>=0&&launch>explicit)
        assertTrue(screen.contains("Button(::explicitEnable"))
        assertFalse(screen.substringBefore("fun explicitEnable()").contains("permissionLauncher.launch"))
    }

    @Test fun `screen lifecycle cancels collection and process resume is explicit`() {
        val screen=source("src/main/java/com/popwam/pop/ui/NearbyScreen.kt")
        val viewModel=source("src/main/java/com/popwam/pop/ui/AppViewModels.kt")
        assertTrue(screen.contains("repeatOnLifecycle(Lifecycle.State.STARTED)"))
        assertTrue(screen.contains("DisposableEffect(Unit){onDispose{vm.pauseNearbyCollection()}}"))
        assertTrue(viewModel.contains("private var nearbySession"))
        assertTrue(viewModel.contains("nearbySession=null"))
        assertFalse(viewModel.contains("SavedStateHandle"))
    }

    @Test fun `Android uses shared APIs and no location values in analytics`() {
        val api=source("src/main/java/com/popwam/pop/data/api/PopwamApi.kt")
        val analytics=source("src/main/java/com/popwam/pop/data/auth/FirebasePopAnalytics.kt")
        assertTrue(api.contains("api/nearby/settings"))
        assertTrue(api.contains("api/nearby/consent"))
        assertTrue(api.contains("api/nearby/presence"))
        assertTrue(api.contains("@GET(\"api/nearby\")"))
        assertFalse(analytics.contains("\"latitude\""))
        assertFalse(analytics.contains("\"longitude\""))
        assertFalse(analytics.contains("\"coarse_cell\""))
    }

    @Test fun `Nearby has no map hardware discovery persistent service or proximity push`() {
        val screen=source("src/main/java/com/popwam/pop/ui/NearbyScreen.kt")
        val manifest=source("src/main/AndroidManifest.xml")
        val repository=source("src/main/java/com/popwam/pop/data/repository/PopwamRepository.kt")
        assertFalse(screen.contains("GoogleMap"))
        assertFalse(screen.contains("MapView"))
        assertFalse(manifest.contains("NearbyLocationService"))
        assertFalse(repository.contains("nearbyNotification"))
        assertFalse(repository.contains("Bluetooth"))
        assertFalse(repository.contains("Wifi"))
    }
}
