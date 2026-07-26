package com.popwam.pop.ui

import com.popwam.pop.data.api.ShareTargetDto
import com.popwam.pop.nfc.PermanentUrlPolicy

object ShareCenterPolicy {
    fun selectedTarget(targets:List<ShareTargetDto>,requested:String?)=
        targets.firstOrNull{it.id==requested} ?: targets.firstOrNull()

    fun activationScratchValid(value:String)=value.length==6&&value.all(Char::isDigit)

    fun hceState(hasNfc:Boolean,nfcEnabled:Boolean,hceSupported:Boolean)=when{
        !hasNfc->"NFC_UNAVAILABLE"
        !nfcEnabled->"NFC_DISABLED"
        !hceSupported->"HCE_UNSUPPORTED"
        else->"READY"
    }

    fun canAssignTarget(profileShareable:Boolean,target:ShareTargetDto?)=
        profileShareable&&target!=null&&PermanentUrlPolicy.isValid(target.canonicalUrl)

    fun activationIdentifierCandidate(value:String)=value.trim().take(512)
}
