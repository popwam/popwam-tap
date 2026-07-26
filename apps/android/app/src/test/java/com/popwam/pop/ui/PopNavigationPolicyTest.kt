package com.popwam.pop.ui
import org.junit.Assert.*;import org.junit.Test
class PopNavigationPolicyTest{@Test fun navigationMatchesPopInformationArchitecture(){assertEquals(setOf("home","share","menu"),PopNavigationPolicy.bottomRoutes)}@Test fun nfcToolsIsNotPublicNavigation(){assertFalse(PopNavigationPolicy.exposesNfcTools())}}
