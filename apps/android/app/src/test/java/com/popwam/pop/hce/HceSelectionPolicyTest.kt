package com.popwam.pop.hce
import org.junit.Assert.*;import org.junit.Test
class HceSelectionPolicyTest{@Test fun selectingCardReplacesPreviousDeviceCard(){assertEquals("new",HceSelectionPolicy.select("old","new",true))}@Test fun unsupportedDeviceKeepsCurrentSelection(){assertEquals("old",HceSelectionPolicy.select("old","new",false))}}
