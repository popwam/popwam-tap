package com.popwam.pop.ui.theme
import androidx.compose.ui.graphics.toArgb
import org.junit.Assert.*;import org.junit.Test
class PopPlanThemesTest{@Test fun allSixPlanThemesExist(){assertEquals(setOf("default","personal","plus","pro","business","proBusiness"),PopPlanThemes.keys)}@Test fun defaultUsesFigmaGold(){assertEquals(0xFFD4AF37.toInt(),PopPlanThemes.getValue("default").primary.toArgb())}}
