package com.popwam.pop.ui

import android.os.SystemClock
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

const val POP_COLD_SPLASH_MILLIS=3_000L

class RuntimeLaunchViewModel:ViewModel() {
    private val _ready=MutableStateFlow(false)
    val ready=_ready.asStateFlow()
    private var started=false

    fun begin(refresh:suspend ()->Unit) {
        if(started)return
        started=true
        viewModelScope.launch {
            val start=SystemClock.elapsedRealtime()
            runCatching { refresh() }
            delay((POP_COLD_SPLASH_MILLIS-(SystemClock.elapsedRealtime()-start)).coerceAtLeast(0))
            _ready.value=true
        }
    }
}
