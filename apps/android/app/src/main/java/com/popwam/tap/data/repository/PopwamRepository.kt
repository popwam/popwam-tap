package com.popwam.tap.data.repository

import com.popwam.tap.data.api.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

class PopwamRepository(private val api:PopwamApi){
    suspend fun cards()=api.cards()
    suspend fun card(id:String)=api.card(id)
    suspend fun updateCard(id:String,status:String?=null,destinationId:String?=null)=api.updateCard(id,CardUpdateRequest(status,destinationId))
    suspend fun profiles()=api.profiles()
    suspend fun createProfile(body:ProfileWriteRequest)=api.createProfile(body)
    suspend fun updateProfile(id:String,body:ProfileWriteRequest)=api.updateProfile(id,body)
    suspend fun inspectActivation(value:String)=api.inspectActivation(ActivationInspectRequest(value))
    suspend fun claim(token:String,profileId:String)=api.claim(ClaimRequest(token,profileId))
    suspend fun programmingCards()=api.programmingCards()
    suspend fun markProgrammed(id:String,uri:String)=api.markProgrammed(id,ProgramRequest("PROGRAMMED",uri))
    suspend fun markLocked(id:String,uri:String)=api.markProgrammed(id,ProgramRequest("LOCKED",uri,true,"LOCK"))
    suspend fun verifyNfc(uri:String)=api.verifyNfc(VerifyNfcRequest(uri))
    suspend fun createDestination(profileId:String,body:DestinationWriteRequest)=api.createDestination(profileId,body)
    suspend fun deleteDestination(id:String)=api.deleteDestination(id)
    suspend fun uploadMedia(profileId:String,kind:String,name:String,mime:String,bytes:ByteArray)=api.uploadMedia(profileId,kind.toRequestBody("text/plain".toMediaTypeOrNull()),MultipartBody.Part.createFormData("file",name,bytes.toRequestBody(mime.toMediaTypeOrNull())))
    suspend fun uploadFile(profileId:String,titleAr:String,titleEn:String,name:String,mime:String,bytes:ByteArray)=api.uploadFile(profileId,titleAr.toRequestBody("text/plain".toMediaTypeOrNull()),titleEn.toRequestBody("text/plain".toMediaTypeOrNull()),MultipartBody.Part.createFormData("file",name,bytes.toRequestBody(mime.toMediaTypeOrNull())))
}
