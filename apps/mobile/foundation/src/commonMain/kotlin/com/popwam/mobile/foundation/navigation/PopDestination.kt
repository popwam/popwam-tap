package com.popwam.mobile.foundation.navigation

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
sealed interface PopDestination {
    @Serializable @SerialName("launch") data object Launch : PopDestination
    @Serializable @SerialName("first_launch_final") data object FirstLaunchFinalStage : PopDestination
    @Serializable @SerialName("language") data object Language : PopDestination
    @Serializable @SerialName("theme") data object Theme : PopDestination
    @Serializable @SerialName("phone_auth") data object PhoneAuth : PopDestination
    @Serializable @SerialName("otp") data object Otp : PopDestination
    @Serializable @SerialName("passkey_setup") data object PasskeySetup : PopDestination
    @Serializable @SerialName("biometric_setup") data object BiometricSetup : PopDestination
    @Serializable @SerialName("account_created") data object AccountCreated : PopDestination
    @Serializable @SerialName("profile_setup") data class ProfileSetup(val step: ProfileSetupStep) : PopDestination

    @Serializable @SerialName("home") data object Home : PopDestination
    @Serializable @SerialName("share") data object Share : PopDestination
    @Serializable @SerialName("menu") data object Menu : PopDestination
    @Serializable @SerialName("activity") data object Activity : PopDestination
    @Serializable @SerialName("friends") data object Friends : PopDestination
    @Serializable @SerialName("nearby") data object Nearby : PopDestination
    @Serializable @SerialName("products") data object Products : PopDestination
    @Serializable @SerialName("virtual_cards") data object VirtualCards : PopDestination
    @Serializable @SerialName("activate") data object Activate : PopDestination
    @Serializable @SerialName("programming") data object Programming : PopDestination
    @Serializable @SerialName("hce") data object Hce : PopDestination
    @Serializable @SerialName("integrations") data object Integrations : PopDestination
    @Serializable @SerialName("passkeys") data object Passkeys : PopDestination

    @Serializable @SerialName("profile") data class Profile(val profileId: String) : PopDestination
    @Serializable @SerialName("public_profile") data class PublicProfile(val slug: String) : PopDestination
    @Serializable @SerialName("profile_publish") data class ProfilePublish(val profileId: String) : PopDestination
    @Serializable @SerialName("virtual_card") data class VirtualCard(val cardId: String) : PopDestination
    @Serializable @SerialName("card") data class Card(val cardId: String) : PopDestination
    @Serializable @SerialName("program") data class Program(val cardId: String) : PopDestination
    @Serializable @SerialName("settings") data class Settings(val section: SettingsSection? = null) : PopDestination
    @Serializable @SerialName("legal") data class Legal(val document: LegalDocument) : PopDestination
}


@Serializable
enum class ProfileSetupStep {
    BASIC_IDENTITY,
    ABOUT_YOU,
    LOCATION_AND_VISIBILITY,
    REVIEW_AND_CREATE,
}

@Serializable
enum class SettingsSection {
    ACCOUNT,
    PROFILES,
    SECURITY,
    DEVICES,
    SESSIONS,
    PASSKEYS,
    APPEARANCE,
    NOTIFICATIONS,
    PRIVACY,
    PERMISSIONS,
    USAGE,
    SHARING_AND_NFC,
    STORAGE,
    HELP,
    ABOUT,
}

@Serializable
enum class LegalDocument { TERMS, PRIVACY }

enum class RootTab(val destination: PopDestination) {
    HOME(PopDestination.Home),
    SHARE(PopDestination.Share),
    MENU(PopDestination.Menu),
}

/** Temporary serialization boundary for the existing Android string-based NavHost. */
object LegacyDestinationCodec {
    fun encode(destination: PopDestination): String = when (destination) {
        PopDestination.Launch -> "launch"
        PopDestination.FirstLaunchFinalStage -> "first-launch-final"
        PopDestination.Language -> "language"
        PopDestination.Theme -> "theme"
        PopDestination.PhoneAuth -> "phone-auth"
        PopDestination.Otp -> "auth/otp"
        PopDestination.PasskeySetup -> "auth/passkey-setup"
        PopDestination.BiometricSetup -> "auth/biometric-setup"
        PopDestination.AccountCreated -> "auth/account-created"
        is PopDestination.ProfileSetup -> "profile-setup/${destination.step.name.lowercase()}"
        PopDestination.Home -> "home"
        PopDestination.Share -> "share"
        PopDestination.Menu -> "menu"
        PopDestination.Activity -> "activity"
        PopDestination.Friends -> "friends"
        PopDestination.Nearby -> "nearby"
        PopDestination.Products -> "products"
        PopDestination.VirtualCards -> "virtual-cards"
        PopDestination.Activate -> "activate"
        PopDestination.Programming -> "programming"
        PopDestination.Hce -> "hce"
        PopDestination.Integrations -> "integrations"
        PopDestination.Passkeys -> "passkeys"
        is PopDestination.Profile -> "profile/${safeSegment(destination.profileId)}"
        is PopDestination.PublicProfile -> "public-profile/${safeSegment(destination.slug)}"
        is PopDestination.ProfilePublish -> "profile-publish/${safeSegment(destination.profileId)}"
        is PopDestination.VirtualCard -> "virtual-card/${safeSegment(destination.cardId)}"
        is PopDestination.Card -> "card/${safeSegment(destination.cardId)}"
        is PopDestination.Program -> "program/${safeSegment(destination.cardId)}"
        is PopDestination.Settings -> destination.section?.let { "settings/${it.name.lowercase().replace('_', '-')}" } ?: "settings"
        is PopDestination.Legal -> "legal/${destination.document.name.lowercase()}"
    }

    private fun safeSegment(value: String): String {
        require(value.isNotBlank() && '/' !in value && '?' !in value && '#' !in value) {
            "Destination identifiers must be non-empty path segments"
        }
        return value
    }
}
