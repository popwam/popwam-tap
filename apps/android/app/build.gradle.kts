import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
}

// Both release and debug package IDs are present in the checked-in Firebase
// configuration. Phone verification is a required Phase 4 capability.
val firebaseAndroidIntegrationEnabled = true

val localProperties = Properties().apply { val file=rootProject.file("local.properties"); if(file.exists()) file.inputStream().use(::load) }
val apiBaseUrl = (System.getenv("POPWAM_API_BASE_URL") ?: localProperties.getProperty("POPWAM_API_BASE_URL") ?: "https://pop.popwam.com/").let { if(it.endsWith('/')) it else "$it/" }
val publicBaseUrl = (System.getenv("POPWAM_PUBLIC_BASE_URL") ?: localProperties.getProperty("POPWAM_PUBLIC_BASE_URL") ?: "https://go.popwam.com/").let { if(it.endsWith('/')) it else "$it/" }

android {
    namespace = "com.popwam.pop"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.popwam.pop"
        minSdk = 26
        targetSdk = 36
        versionCode = 12
        versionName = "0.0.12"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        buildConfigField("String", "PUBLIC_BASE_URL", "\"$publicBaseUrl\"")
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"${localProperties.getProperty("GOOGLE_WEB_CLIENT_ID") ?: ""}\"")
        buildConfigField("String", "CREDENTIAL_MANAGER_VERSION", "\"1.6.0\"")
        buildConfigField("Boolean", "FIREBASE_RUNTIME_ENABLED", firebaseAndroidIntegrationEnabled.toString())
        vectorDrawables { useSupportLibrary = true }
    }
    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            // The physical review target is arm64. Avoid bundling emulator ABIs in the
            // debug artifact while leaving release Play delivery ABI-split capable.
            ndk { abiFilters += "arm64-v8a" }
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true; buildConfig = true }
    packaging { resources.excludes += setOf("/META-INF/{AL2.0,LGPL2.1}") }
    lint { abortOnError = true; checkReleaseBuilds = true; warningsAsErrors = false }
    testOptions { unitTests.isIncludeAndroidResources = true }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.06.00")
    implementation(composeBom)
    implementation("com.popwam.mobile:foundation:0.1.0")
    implementation("com.popwam.mobile:design-system:0.1.0")
    implementation("com.popwam.mobile:onboarding:0.1.0")
    implementation("com.popwam.mobile:authentication:0.1.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.navigation:navigation-compose:2.9.8")
    implementation("androidx.browser:browser:1.9.0")
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.datastore:datastore-preferences:1.2.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("io.ktor:ktor-client-okhttp:3.3.3")
    implementation("io.ktor:ktor-client-content-negotiation:3.3.3")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.3.3")
    implementation("com.google.android.gms:play-services-auth:21.4.0")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("io.coil-kt.coil3:coil-compose:3.3.0")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.3.0")
    implementation("androidx.camera:camera-core:1.5.3")
    implementation("androidx.camera:camera-camera2:1.5.3")
    implementation("androidx.camera:camera-lifecycle:1.5.3")
    implementation("androidx.camera:camera-view:1.5.3")
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
    implementation("com.google.zxing:core:3.5.3")
    implementation("com.googlecode.libphonenumber:libphonenumber:9.0.10")
    implementation(platform("com.google.firebase:firebase-bom:34.16.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-analytics")
    implementation("com.google.firebase:firebase-messaging")
    implementation("com.google.firebase:firebase-crashlytics")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.2")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    androidTestImplementation(composeBom)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

tasks.register("validateReleaseConfiguration") {
    group = "verification"
    doLast {
        check(apiBaseUrl.startsWith("https://")) { "Release API URL must use HTTPS" }
        println("Release configuration valid. Signing is intentionally external (Play App Signing or CI secrets).")
    }
}

tasks.register("verifyFirebaseDebugClient") {
    group = "verification"
    description = "Verifies that Firebase Console has a client for the debug applicationId."
    doLast {
        val config = file("google-services.json")
        check(config.isFile) { "ANDROID FIREBASE DEBUG CLIENT: BLOCKED - apps/android/app/google-services.json is missing." }
        @Suppress("UNCHECKED_CAST")
        val root = groovy.json.JsonSlurper().parse(config) as Map<String, Any?>
        val clients = root["client"] as? List<Map<String, Any?>> ?: emptyList()
        val packageNames = clients.mapNotNull { client ->
            ((client["client_info"] as? Map<String, Any?>)?.get("android_client_info") as? Map<String, Any?>)?.get("package_name") as? String
        }
        check("com.popwam.pop.debug" in packageNames) {
            "ANDROID FIREBASE DEBUG CLIENT: BLOCKED - register com.popwam.pop.debug in Firebase Console, download the generated google-services.json, then enable -Ppopwam.firebase.android.enabled=true."
        }
    }
}

if (firebaseAndroidIntegrationEnabled) {
    tasks.matching { it.name == "preDebugBuild" }.configureEach { dependsOn("verifyFirebaseDebugClient") }
}
