pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = "POPAndroid"
include(":app")
includeBuild("../mobile") {
    dependencySubstitution {
        substitute(module("com.popwam.mobile:foundation")).using(project(":foundation"))
        substitute(module("com.popwam.mobile:design-system")).using(project(":design-system"))
    }
}
