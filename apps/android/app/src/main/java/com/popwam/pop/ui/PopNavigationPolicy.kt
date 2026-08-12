package com.popwam.pop.ui
object PopNavigationPolicy{val bottomRoutes=setOf("home","my-profile","menu");val contextualNfcRoutes=setOf("activate","programming","program/{id}","hce");fun exposesNfcTools()="nfc" in bottomRoutes}
