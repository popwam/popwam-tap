package com.popwam.mobile.designsystem

/**
 * Development-only design contract. These steps are composed from approved surrounding screens;
 * no four-step Profile Setup source frames exist in the approved Figma page.
 */
object ProfileSetupVisualAssumptions {
    const val DEVELOPMENT_FLAG = "mobile.profileSetup.composedDesign"
    val steps = listOf(
        "Basic Identity",
        "About You",
        "Location & Visibility",
        "Review & Create",
    )
    const val referenceWidth = 393
    const val referenceHeight = 852
    const val horizontalContentInset = 20
    const val sectionSpacing = 24
    const val controlRadius = 16
    const val primaryActionRadius = 24
}

