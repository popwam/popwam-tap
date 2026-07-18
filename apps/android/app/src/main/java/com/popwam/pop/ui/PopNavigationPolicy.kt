package com.popwam.pop.ui
object PopNavigationPolicy{val bottomRoutes=setOf("home","virtual-cards","activate","products","menu");val contextualNfcRoutes=setOf("activate","programming","program/{id}","hce");fun exposesNfcTools()="nfc" in bottomRoutes}
