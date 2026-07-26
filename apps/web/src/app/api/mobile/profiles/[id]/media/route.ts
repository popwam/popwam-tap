import { prisma, type ProfileMediaPurpose } from "@popwam/db";
import { createStorageKey, deleteObject, isStorageEnabled, uploadPublicFile, validateImageUpload } from "@popwam/storage";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { assertStorageWithinLimitLocked } from "@/lib/plans";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const user=await getMobileUser(request);
  if(!user)return mobileUnauthorized();
  if(!isStorageEnabled())return Response.json({ok:false,error:"STORAGE_NOT_CONFIGURED"},{status:503});
  const {id}=await params;
  const profile=await prisma.profile.findFirst({where:{id,userId:user.id}});
  if(!profile)return Response.json({ok:false,error:"PROFILE_NOT_FOUND"},{status:404});
  const data=await request.formData();
  const file=data.get("file"),kind=String(data.get("kind")||"");
  if(!(file instanceof File)||!(["avatar","cover","logo"] as const).includes(kind as "avatar"))return Response.json({ok:false,error:"MEDIA_INVALID"},{status:400});
  const validation=validateImageUpload({filename:file.name,contentType:file.type,size:file.size});
  if(!validation.valid)return Response.json({ok:false,error:validation.error},{status:400});
  const key=createStorageKey({userId:user.id,type:kind,filename:file.name});
  const uploaded=await uploadPublicFile(new Uint8Array(await file.arrayBuffer()),{key,contentType:file.type,cacheControl:"public, max-age=31536000, immutable"});
  const oldKey=kind==="avatar"?profile.avatarStorageKey:kind==="cover"?profile.coverStorageKey:profile.logoStorageKey;
  try {
    await prisma.$transaction(async tx=>{
      const oldAsset=oldKey?await tx.profileMediaAsset.findFirst({where:{userId:user.id,storageKey:oldKey,deletedAt:null},select:{id:true,sizeBytes:true}}):null;
      await assertStorageWithinLimitLocked(tx,user.id,BigInt(file.size),oldAsset?.sizeBytes||0n);
      await tx.profile.update({where:{id},data:kind==="avatar"?{avatarUrl:uploaded.url,avatarStorageKey:key}:kind==="cover"?{coverUrl:uploaded.url,coverStorageKey:key}:{logoUrl:uploaded.url,logoStorageKey:key}});
      if(oldAsset)await tx.profileMediaAsset.update({where:{id:oldAsset.id},data:{state:"DELETED",deletedAt:new Date()}});
      await tx.profileMediaAsset.create({data:{userId:user.id,profileId:id,purpose:kind.toUpperCase() as ProfileMediaPurpose,state:"PUBLISHED",storageKey:key,publicUrl:uploaded.url,originalFilename:file.name.slice(0,255),mimeType:file.type,sizeBytes:file.size}});
    },{isolationLevel:"Serializable"});
  } catch(error) {
    await deleteObject(key).catch(()=>undefined);
    if(error instanceof Error&&error.message==="STORAGE_LIMIT_REACHED")return Response.json({ok:false,error:error.message},{status:403});
    throw error;
  }
  if(oldKey)await deleteObject(oldKey).catch(()=>undefined);
  return Response.json({ok:true,url:uploaded.url});
}
