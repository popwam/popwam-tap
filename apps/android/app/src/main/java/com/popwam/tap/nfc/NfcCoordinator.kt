package com.popwam.tap.nfc
import android.nfc.Tag
import kotlinx.coroutines.flow.MutableStateFlow
object NfcCoordinator{private var handler:((Tag)->Unit)?=null;val active=MutableStateFlow(false);fun register(next:(Tag)->Unit){handler=next;active.value=true};fun clear(){handler=null;active.value=false};fun dispatch(tag:Tag){val current=handler?:return;clear();current(tag)}}
