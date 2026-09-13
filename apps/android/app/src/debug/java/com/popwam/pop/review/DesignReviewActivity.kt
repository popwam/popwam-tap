package com.popwam.pop.review

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.os.LocaleListCompat
import com.popwam.mobile.foundation.auth.AccountState
import com.popwam.mobile.foundation.auth.AuthChallenge
import com.popwam.mobile.foundation.auth.AuthenticationMethod
import com.popwam.mobile.foundation.auth.AuthenticationNextAction
import com.popwam.mobile.foundation.auth.BiometricEnrollmentPolicy
import com.popwam.mobile.foundation.auth.OtpConfiguration
import com.popwam.mobile.foundation.auth.PasskeyRequirement
import com.popwam.mobile.foundation.auth.SessionScope
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.foundation.overlay.OverlayDismissPolicy
import com.popwam.mobile.foundation.overlay.OverlayEntry
import com.popwam.mobile.foundation.overlay.OverlayKey
import com.popwam.mobile.foundation.overlay.OverlayPresentation
import com.popwam.mobile.foundation.overlay.OverlayState
import com.popwam.mobile.foundation.platform.BiometricCapability
import com.popwam.mobile.onboarding.LanguageScreen
import com.popwam.mobile.onboarding.Phase3OnboardingTheme
import com.popwam.pop.ui.components.PopBrandedLoading
import com.popwam.mobile.onboarding.ThemeScreen
import com.popwam.pop.ui.theme.popFontFamilies
import com.popwam.pop.TapApplication
import com.popwam.pop.ui.currentLocale
import com.popwam.pop.ui.MenuReviewScreen
import com.popwam.pop.ui.MenuSettingsReviewScreen
import com.popwam.pop.ui.MenuProfileContext
import com.popwam.pop.ui.PopBottomNavigationReviewScreen
import com.popwam.pop.ui.home.HomeLoadState
import com.popwam.pop.ui.home.HomePrimaryTab
import com.popwam.pop.ui.home.HomeProfile
import com.popwam.pop.ui.home.HomeScreen
import com.popwam.pop.ui.home.HomeUiState
import com.popwam.pop.ui.profile.*
import com.popwam.pop.ui.share.*
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive

/** Debug source set only. It renders fixtures and never instantiates a phone, OTP, or auth client. */
class DesignReviewActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val language=intent.getStringExtra("language")
        if(!language.isNullOrBlank())AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language))
        setContent { DesignReviewGallery(intent.getStringExtra("screen"),language,intent.getBooleanExtra("focused",false)) }
    }
}

private enum class ReviewScreen(val label: String) {
    SPLASH("Splash"), LANGUAGE("Language"), THEME("Theme"), THEME_GALLERY("Theme Gallery"),
    ROOT_HOME("Root Home + Nav"), HOME_LOADED("Home Loaded"), HOME_LOADING("Home Loading"), HOME_EMPTY("Home Empty"), HOME_ERROR("Home Error"),
    PROFILE_LIST("Profile List"), PROFILE_PERSONAL("Personal Profile"), PROFILE_BUSINESS("Business Profile"),
    PROFILE_CREATE("Create Profile"),
    PROFILE_BASIC("Basic Info"), PROFILE_ABOUT("About"), PROFILE_CONTACT("Contact & Links"), PROFILE_TYPE_DETAILS("Type Details"), PROFILE_MEDIA("Media"),
    PROFILE_VISIBILITY("Visibility"),
    PROFILE_APPEARANCE("Appearance"), PROFILE_VERIFICATION("Verification"), PROFILE_LOADING("Profiles Loading"), PROFILE_ERROR("Profiles Error"),
    SHARE_CENTER("Share Center"), SHARE_QR_READY("QR Ready"), SHARE_PRIVATE("Share Private"),
    SHARE_NFC_UNAVAILABLE("NFC Unavailable"), SHARE_NFC_READY("NFC Ready"), SHARE_NFC_WRITING("NFC Writing"), SHARE_NFC_SUCCESS("NFC Success"), SHARE_NFC_ERROR("NFC Error"), SHARE_HCE_READY("HCE Ready"),
    MENU("Menu"), MENU_ACCOUNT("Menu Account"), MENU_SECURITY("Menu Security"), MENU_DEVICES("Menu Devices"),
    MENU_LANGUAGE("Menu Language"), MENU_APPEARANCE("Menu Appearance"), MENU_PRIVACY("Menu Privacy"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DesignReviewGallery(initialScreen:String?=null,initialLanguage:String?=null,focused:Boolean=false) {
    var screen by remember { mutableStateOf(ReviewScreen.entries.firstOrNull{it.name==initialScreen}?:ReviewScreen.SPLASH) }
    var palette by remember { mutableStateOf(IdentityPalette.PULSE) }
    var mode by remember { mutableStateOf(ThemeMode.LIGHT) }
    var language by remember { mutableStateOf(initialLanguage?:currentLocale().substringBefore('-')) }
    var splashProgress by remember { mutableFloatStateOf(0f) }
    val app = LocalContext.current.applicationContext as TapApplication
    LaunchedEffect(app) {
        val live = app.container.launchState.initialize()
        palette = live.selectedPopStyle
        mode = live.selectedBaseTheme
        language = live.selectedLanguageTag?.substringBefore('-') ?: language
    }

    Phase3OnboardingTheme(mode, palette, isSystemInDarkTheme(), language, popFontFamilies()) {
        if(focused){
            when(screen){
                ReviewScreen.SPLASH->PopBrandedLoading()
                ReviewScreen.ROOT_HOME->PopBottomNavigationReviewScreen{HomeScreen(homeReviewState(language),{})}
                ReviewScreen.HOME_LOADING->PopBottomNavigationReviewScreen{HomeScreen(HomeUiState(),{})}
                ReviewScreen.PROFILE_PERSONAL->PopBottomNavigationReviewScreen(HomePrimaryTab.PROFILE){
                    ProfileViewScreen(profileReviewState(language,ProfileBackendKind.PERSONAL),"review-primary",{}, {},topLevel=true)
                }
                ReviewScreen.SHARE_CENTER->ShareReviewScreen(shareReviewState(language))
                ReviewScreen.MENU->PopBottomNavigationReviewScreen(HomePrimaryTab.MENU){
                    MenuReviewScreen(MenuProfileContext(if(language=="ar")"سارة أحمد" else "Sarah Ahmed",if(language=="ar")"مصممة منتجات" else "Product designer",type=if(language=="ar")"شخصي" else "Personal",publicUrl="https://pop.popwam.com/sarah-a1b2c3d4",completionPercent=67))
                }
                else->Unit
            }
            return@Phase3OnboardingTheme
        }
        Scaffold(
            topBar = { TopAppBar(title = { Text("POP Design Review") }) },
        ) { inset ->
            Column(Modifier.fillMaxSize().padding(inset), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
                    items(ReviewScreen.entries) { item -> Button(onClick = { screen = item }) { Text(item.label) } }
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
                    items(IdentityPalette.entries) { item -> Button(onClick = { palette = item }) { Text(item.name.lowercase().replaceFirstChar(Char::uppercase)) } }
                    items(ThemeMode.entries) { item -> Button(onClick = { mode = item }) { Text(item.name.lowercase().replaceFirstChar(Char::uppercase)) } }
                    items(listOf("en", "ar")) { tag -> Button(onClick = { language = tag; AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(tag)) }) { Text(tag.uppercase()) } }
                }
                HorizontalDivider()
                when (screen) {
                    ReviewScreen.SPLASH -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(listOf(0f, .22f, .48f, .75f, 1f)) { value -> Button(onClick = { splashProgress = value }) { Text("${(value * 100).toInt()}%") } }
                        }
                        PopBrandedLoading(reducedMotion = false)
                    }
                    ReviewScreen.LANGUAGE -> LanguageScreen(listOf("en", "ar"), language, {})
                    ReviewScreen.THEME -> ThemeScreen(mode, palette, false, { mode = it }, {}, {}, { palette = it }, {})
                    ReviewScreen.THEME_GALLERY -> ThemeScreen(mode, palette, true, { mode = it }, {}, {}, { palette = it }, {})
                    ReviewScreen.ROOT_HOME -> PopBottomNavigationReviewScreen { HomeScreen(homeReviewState(language), {}) }
                    ReviewScreen.HOME_LOADED -> HomeScreen(homeReviewState(language), {})
                    ReviewScreen.HOME_LOADING -> HomeScreen(HomeUiState(), {})
                    ReviewScreen.HOME_EMPTY -> HomeScreen(HomeUiState(loadState = HomeLoadState.EMPTY), {})
                    ReviewScreen.HOME_ERROR -> HomeScreen(HomeUiState(loadState = HomeLoadState.ERROR, errorCode = "REVIEW"), {})
                    ReviewScreen.PROFILE_LIST -> ProfileListScreen(profileReviewState(language), {})
                    ReviewScreen.PROFILE_PERSONAL -> ProfileViewScreen(profileReviewState(language,ProfileBackendKind.PERSONAL),"review-primary",{}, {},topLevel=true)
                    ReviewScreen.PROFILE_BUSINESS -> ProfileViewScreen(profileReviewState(language,ProfileBackendKind.BUSINESS),"review-primary",{}, {},topLevel=true)
                    ReviewScreen.PROFILE_CREATE -> ProfileCreationScreen(profileReviewState(language),{}, {})
                    ReviewScreen.PROFILE_BASIC -> ProfileEditorSectionScreen(profileReviewState(language),"review-primary",ProfileEditorSection.BASIC_INFORMATION,{}, {})
                    ReviewScreen.PROFILE_ABOUT -> ProfileEditorSectionScreen(profileReviewState(language),"review-primary",ProfileEditorSection.ABOUT,{}, {})
                    ReviewScreen.PROFILE_CONTACT -> ProfileEditorSectionScreen(profileReviewState(language),"review-primary",ProfileEditorSection.CONTACT_LINKS,{}, {})
                    ReviewScreen.PROFILE_TYPE_DETAILS -> ProfileEditorSectionScreen(profileReviewState(language,ProfileBackendKind.PERSONAL),"review-primary",ProfileEditorSection.TYPE_DETAILS,{}, {})
                    ReviewScreen.PROFILE_MEDIA -> ProfileEditorSectionScreen(profileReviewState(language),"review-primary",ProfileEditorSection.MEDIA,{}, {})
                    ReviewScreen.PROFILE_VISIBILITY -> ProfileEditorSectionScreen(profileReviewState(language),"review-primary",ProfileEditorSection.VISIBILITY,{}, {})
                    ReviewScreen.PROFILE_APPEARANCE -> ProfileEditorSectionScreen(profileReviewState(language),"review-primary",ProfileEditorSection.APPEARANCE,{}, {})
                    ReviewScreen.PROFILE_VERIFICATION -> ProfileEditorSectionScreen(profileReviewState(language),"review-primary",ProfileEditorSection.VERIFICATION,{}, {})
                    ReviewScreen.PROFILE_LOADING -> ProfileListScreen(ProfilesUiState(), {})
                    ReviewScreen.PROFILE_ERROR -> ProfileListScreen(ProfilesUiState(loadState=ProfileLoadState.ERROR,errorCode="REVIEW"), {})
                    ReviewScreen.SHARE_CENTER -> ShareReviewScreen(shareReviewState(language))
                    ReviewScreen.SHARE_QR_READY -> ShareReviewScreen(shareReviewState(language),ShareInitialPanel.QR)
                    ReviewScreen.SHARE_PRIVATE -> ShareReviewScreen(shareReviewState(language).copy(availability=ShareAvailability.PRIVATE,payload=null),ShareInitialPanel.QR)
                    ReviewScreen.SHARE_NFC_UNAVAILABLE -> ShareReviewScreen(shareReviewState(language).copy(nfc=ShareNfcState(NfcAvailability.UNAVAILABLE)),ShareInitialPanel.NFC)
                    ReviewScreen.SHARE_NFC_READY -> ShareReviewScreen(shareReviewState(language).copy(nfc=ShareNfcState(NfcAvailability.READY,NfcOperation.WRITE,NfcStage.WAITING_FOR_TAG)),ShareInitialPanel.NFC)
                    ReviewScreen.SHARE_NFC_WRITING -> ShareReviewScreen(shareReviewState(language).copy(nfc=ShareNfcState(NfcAvailability.READY,NfcOperation.WRITE,NfcStage.WRITING)),ShareInitialPanel.NFC)
                    ReviewScreen.SHARE_NFC_SUCCESS -> ShareReviewScreen(shareReviewState(language).copy(nfc=ShareNfcState(NfcAvailability.READY,NfcOperation.WRITE,NfcStage.SUCCESS)),ShareInitialPanel.NFC)
                    ReviewScreen.SHARE_NFC_ERROR -> ShareReviewScreen(shareReviewState(language).copy(nfc=ShareNfcState(NfcAvailability.READY,NfcOperation.WRITE,NfcStage.ERROR,"TAG_TOO_SMALL")),ShareInitialPanel.NFC)
                    ReviewScreen.SHARE_HCE_READY -> ShareReviewScreen(shareReviewState(language).copy(hce=ShareHceState(HceAvailability.READY,true,true)),ShareInitialPanel.HCE)
                    ReviewScreen.MENU -> MenuReviewScreen()
                    ReviewScreen.MENU_ACCOUNT -> MenuSettingsReviewScreen("account")
                    ReviewScreen.MENU_SECURITY -> MenuSettingsReviewScreen("security")
                    ReviewScreen.MENU_DEVICES -> MenuSettingsReviewScreen("devices")
                    ReviewScreen.MENU_LANGUAGE -> MenuSettingsReviewScreen("language")
                    ReviewScreen.MENU_APPEARANCE -> MenuSettingsReviewScreen("appearance")
                    ReviewScreen.MENU_PRIVACY -> MenuSettingsReviewScreen("privacy")
                }
            }
        }
    }
}

private fun shareReviewState(language:String)=ShareUiState(
    loadState=ShareLoadState.READY,
    activeProfile=ActiveShareProfile("review-primary",if(language=="ar")"سارة أحمد" else "Sarah Ahmed",ShareProfileAccess.PUBLIC,"PUBLISHED"),
    availability=ShareAvailability.PUBLIC,
    payload=CanonicalSharePayload("review-primary",if(language=="ar")"سارة أحمد" else "Sarah Ahmed","https://pop.popwam.com/sarah-a1b2c3d4"),
    nfc=ShareNfcState(NfcAvailability.READY),
    hce=ShareHceState(HceAvailability.READY,false,false),
)

private fun profileReviewState(language:String,category:ProfileBackendKind=ProfileBackendKind.PERSONAL):ProfilesUiState {
    val name=if(category==ProfileBackendKind.BUSINESS) "Sarah Studio" else "Sarah Ahmed"
    val kind=if(category in setOf(ProfileBackendKind.BUSINESS,ProfileBackendKind.BUSINESS,ProfileBackendKind.BUSINESS))ProfileBackendKind.BUSINESS else ProfileBackendKind.PERSONAL
    val summary=OwnedProfile("review-primary",name,if(language=="ar")"مصممة منتجات" else "Product designer",null,kind,category.name.lowercase(),"PUBLISHED","PUBLIC",true,ProfileVerificationState.UNAVAILABLE,ProfileCompletion(true))
    val content=ProfileContent(
        summary,4,if(language=="ar")"ar" else "en",name,name,if(language=="ar")name else "سارة أحمد",if(language=="ar")"Sarah Ahmed" else name,"مصممة منتجات","Product designer","استوديو سارة","Sarah Studio","Designing useful things","", "نبذة تعريفية واضحة وقابلة للقراءة.","A clear and readable profile introduction.","","", "+201001234567","","sarah@example.com","https://popwam.com","+201001234567","","Cairo","القاهرة","Cairo",mapOf("phone" to "PUBLIC","email" to "PUBLIC"),"sarah-a1b2c3d4","ELEGANT_LIGHT","Elegant",
        links=listOf(ProfileLink("link-1","Portfolio","","Portfolio","WEBSITE","https://example.com","PUBLIC",0)),
        services=listOf(ProfileService("service-1","Product strategy","","Product strategy","","Research and product strategy","","PUBLIC")),
        locations=listOf(ProfileLocation("branch-1","Downtown","","Downtown","","Cairo","+201001234567","https://maps.google.com","PUBLIC")),
        media=listOf(ProfileMedia("media-1","GALLERY","","PUBLIC",0)),
        modules=listOf(ProfileModule("IDENTITY","Identity",true,"PUBLIC",true,true),ProfileModule("ABOUT","About",true,"PUBLIC",false,true),ProfileModule("CONTACT","Contact",true,"PUBLIC",false,true),ProfileModule("SERVICES","Services",true,"PUBLIC",false,true),ProfileModule("BRANCHES","Locations",true,"PUBLIC",false,true),ProfileModule("GALLERY","Gallery",true,"PUBLIC",false,true)),
        fieldCapabilities=profileReviewCapabilities(category),
        structuredEntries=profileReviewEntries(category),
        contentCompletion=ProfileContentCompletion(
            complete=false,
            issues=listOf(ProfileContentIssue("REQUIRED_FIELD_MISSING","structured.cuisine","cuisine","profile.completion.required")),
        ),
        verification=ProfileVerification(
            submissionSupported=false,
            overallStatus="PENDING",
            signals=listOf(ProfileVerificationSignal("IDENTITY","PENDING",null,null,null,false)),
        ),
        firstName=if(category in setOf(ProfileBackendKind.PERSONAL,ProfileBackendKind.PERSONAL))name.substringBefore(' ') else "",
        lastName=if(category in setOf(ProfileBackendKind.PERSONAL,ProfileBackendKind.PERSONAL))name.substringAfter(' ',"") else "",
        profession=if(category==ProfileBackendKind.PERSONAL)"DESIGNER" else "PERSONAL",
        customProfession=if(category==ProfileBackendKind.PERSONAL)"Product designer" else "",
        company=if(category in setOf(ProfileBackendKind.PERSONAL,ProfileBackendKind.BUSINESS,ProfileBackendKind.BUSINESS,ProfileBackendKind.BUSINESS))"POP" else "",
        industryAr=if(category in setOf(ProfileBackendKind.BUSINESS,ProfileBackendKind.BUSINESS,ProfileBackendKind.BUSINESS))"الخدمات" else "",
        industryEn=if(category in setOf(ProfileBackendKind.BUSINESS,ProfileBackendKind.BUSINESS,ProfileBackendKind.BUSINESS))"Services" else "",
        documents=listOf(ProfileDocument(id="document-1",originalFilename="portfolio.pdf",publicUrl="https://cdn.example/portfolio.pdf",mimeType="application/pdf",sizeBytes=524_288,title="Portfolio",displayTitleAr="ملف الأعمال",displayTitleEn="Portfolio",visibility="PUBLIC",sortOrder=0)),
        documentCapability=ProfileDocumentCapability(uploadSupported=true,uploadEndpoint="/api/mobile/profiles/review-primary/files",unavailableReason="MOBILE_DOCUMENT_REPLACE_DELETE_NOT_IMPLEMENTED"),
    )
    val second=summary.copy(id="review-business",name=if(language=="ar")"استوديو سارة" else "Sarah Studio",backendKind=ProfileBackendKind.BUSINESS,isPrimary=false,lifecycle="DRAFT",visibility="PRIVATE",completion=ProfileCompletion(false,listOf("VISIBILITY_REQUIRED")))
    return ProfilesUiState(ProfileLoadState.CONTENT,listOf(summary,second),summary.id,content,ProfileQuota(2,5,3,true),offline=false)
}

private fun profileReviewCapabilities(category:ProfileBackendKind):List<ProfileFieldCapability> = emptyList()
private fun profileReviewEntries(category:ProfileBackendKind):List<ProfileStructuredEntry> = emptyList()

private fun homeReviewState(language: String) = HomeUiState(
    loadState = HomeLoadState.CONTENT,
    profiles = listOf(
        HomeProfile(
            id = "review-primary",
            name = if (language == "ar") "سارة أحمد" else "Sarah Ahmed",
            subtitle = if (language == "ar") "مصممة منتجات" else "Product designer",
            avatarUrl = null,
            lifecycle = "PUBLISHED",
            visibility = "PUBLIC",
            isPrimary = true,
        ),
        HomeProfile(
            id = "review-business",
            name = if (language == "ar") "استوديو سارة" else "Sarah Studio",
            subtitle = if (language == "ar") "ملف أعمال" else "Business profile",
            avatarUrl = null,
            lifecycle = "DRAFT",
            visibility = "PRIVATE",
            isPrimary = false,
        ),
    ),
    activeProfileId = "review-primary",
    completionPercent = 84,
    activeProductCount = 2,
    totalOpenCount = 148,
    isPartial = true,
)
