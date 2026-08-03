import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.plugin.mpp.apple.XCFramework

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.compose.multiplatform)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.android.library)
}

group = "com.popwam.mobile"
version = "0.1.0"

kotlin {
    androidTarget {
        publishLibraryVariants("debug", "release")
        compilerOptions.jvmTarget.set(JvmTarget.JVM_17)
    }
    val xcf = XCFramework("PopAuthenticationKit")
    listOf(iosArm64(), iosSimulatorArm64()).forEach { target ->
        target.binaries.framework {
            baseName = "PopAuthenticationKit"
            isStatic = true
            export(project(":foundation"))
            export(project(":design-system"))
            xcf.add(this)
        }
    }

    sourceSets {
        commonMain.dependencies {
            api(project(":foundation"))
            api(project(":design-system"))
            api(compose.components.resources)
            api(compose.foundation)
            api(compose.material3)
            api(compose.runtime)
            api(compose.ui)
            implementation(libs.coroutines.core)
            implementation(libs.ktor.client.content.negotiation)
            implementation(libs.ktor.client.core)
            implementation(libs.ktor.serialization.json)
            implementation(libs.serialization.json)
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.coroutines.test)
        }
    }
}

android {
    namespace = "com.popwam.mobile.authentication"
    compileSdk = 36
    defaultConfig { minSdk = 26 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.popwam.mobile.authentication.generated.resources"
}

