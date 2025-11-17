import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "com.karlfish.app"
    defaultConfig {
        applicationId = "com.karlfish.app"
        minSdk = 24
        targetSdk = 35
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    signingConfigs {
        val debugKeystore = file("${System.getProperty("user.home")}/.android/debug.keystore")
        if (debugKeystore.exists()) {
            create("release") {
                // Use debug keystore for testing (replace with your own keystore for production)
                storeFile = debugKeystore
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }
    buildTypes {
        getByName("debug") {
            // Uses default debug signing config automatically
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            // Use debug signing config for release builds (for testing)
            // This ensures the APK is signed even if release keystore doesn't exist
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
    
    applicationVariants.all {
        val variant = this
        outputs.all {
            val output = this as com.android.build.gradle.internal.api.BaseVariantOutputImpl
            val variantName = variant.name
            when {
                variantName.contains("Universal", ignoreCase = true) -> {
                    output.outputFileName = "karlfish-universal-release.apk"
                }
                variantName.contains("Arm64", ignoreCase = true) -> {
                    output.outputFileName = "karlfish-arm64-release.apk"
                }
                else -> {
                    // Default naming for other variants
                    output.outputFileName = "karlfish-${variantName.lowercase()}-release.apk"
                }
            }
        }
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.6.1")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.8.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")

// Make assembleRelease and assembleUniversalRelease build both universal and ARM64 APKs
afterEvaluate {
    tasks.named("assembleRelease") {
        dependsOn("assembleUniversalRelease", "assembleArm64Release")
    }
    // Also ensure universal build triggers ARM64 build
    tasks.named("assembleUniversalRelease") {
        finalizedBy("assembleArm64Release")
    }
}