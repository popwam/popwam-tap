import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.plugin.mpp.apple.XCFramework

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.compose.multiplatform)
    alias(libs.plugins.android.library)
}

group = "com.popwam.mobile"
version = "0.1.0"

kotlin {
    androidTarget {
        publishLibraryVariants("debug", "release")
        compilerOptions.jvmTarget.set(JvmTarget.JVM_17)
    }
    val xcf = XCFramework("PopOnboardingKit")
    listOf(iosArm64(), iosSimulatorArm64()).forEach { target ->
        target.binaries.framework {
            baseName = "PopOnboardingKit"
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
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.coroutines.test)
        }
    }
}

android {
    namespace = "com.popwam.mobile.onboarding"
    compileSdk = 36
    defaultConfig { minSdk = 26 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.popwam.mobile.onboarding.generated.resources"
}

val verifyAndroidSafeOnboardingResources by tasks.registering {
    val drawableResources = layout.projectDirectory.dir("src/commonMain/composeResources/drawable")
    inputs.dir(drawableResources)
    doLast {
        val unsupported = drawableResources.asFile
            .walkTopDown()
            .filter { it.isFile && it.extension.equals("svg", ignoreCase = true) }
            .map { it.relativeTo(projectDir).invariantSeparatorsPath }
            .sorted()
            .toList()
        check(unsupported.isEmpty()) {
            "Android onboarding cannot load SVG through Compose Multiplatform painterResource. " +
                "Convert these resources to shared Canvas/ImageVector geometry or an Android-safe raster: " +
                unsupported.joinToString()
        }
    }
}

tasks.named("preBuild").configure {
    dependsOn(verifyAndroidSafeOnboardingResources)
}
