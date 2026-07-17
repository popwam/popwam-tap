package com.popwam.pop.hce
object HceSelectionPolicy{fun select(currentId:String?,requestedId:String,supported:Boolean)=if(supported&&requestedId.isNotBlank())requestedId else currentId;fun clear()=null}
