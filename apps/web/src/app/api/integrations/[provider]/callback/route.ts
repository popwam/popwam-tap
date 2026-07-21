import {createHash} from "node:crypto";
import {prisma} from "@popwam/db";
import {getApplicationOrigin} from "@popwam/shared";
import {exchangeOAuthCode,fetchProviderProfile,isProviderKey,providerConfigs} from "@/lib/connected-accounts";
import {encryptSecret} from "@/lib/token-vault";

type CallbackStage="request_validation"|"state_lookup"|"state_consume"|"token_exchange"|"profile_fetch"|"account_lookup"|"account_save";
const knownInternalCodes=new Set(["CALLBACK_URL_MISMATCH","TOKEN_EXCHANGE_FAILED","PROFILE_FETCH_FAILED","PROFILE_ID_MISSING","INTEGRATION_TOKEN_ENCRYPTION_KEY_REQUIRED","PROVIDER_DISABLED"]);
function internalCode(error:unknown){return error instanceof Error&&knownInternalCodes.has(error.message)?error.message:"UNEXPECTED_ERROR"}
function logFailure(provider:string,reason:string,stage:CallbackStage,error?:unknown){console.error("oauth_callback_failed",{provider:isProviderKey(provider)?provider:"unknown",reason,stage,internalCode:error?internalCode(error):reason})}

export async function GET(request:Request,{params}:{params:Promise<{provider:string}>}){
  const requestUrl=new URL(request.url);
  const appOrigin=getApplicationOrigin();
  const {provider}=await params;
  const fail=(reason:string,stage:CallbackStage,error?:unknown)=>{logFailure(provider,reason,stage,error);return Response.redirect(new URL(`/dashboard/integrations?error=${encodeURIComponent(reason)}`,appOrigin))};
  if(!isProviderKey(provider))return fail("PROVIDER_UNKNOWN","request_validation");
  if(requestUrl.searchParams.has("error"))return fail("OAUTH_PROVIDER_ERROR","request_validation");
  const state=requestUrl.searchParams.get("state")||"";
  const code=requestUrl.searchParams.get("code")||"";
  if(!state)return fail("OAUTH_STATE_MISSING","request_validation");
  if(!code)return fail("OAUTH_CODE_MISSING","request_validation");

  let stage:CallbackStage="state_lookup";
  try{
    const record=await prisma.oAuthConnectionState.findFirst({where:{provider:providerConfigs[provider].db,stateHash:createHash("sha256").update(state).digest("base64url")}});
    if(!record)return fail("OAUTH_STATE_INVALID","state_lookup");
    if(record.expiresAt<=new Date())return fail("OAUTH_STATE_EXPIRED","state_lookup");
    if(record.consumedAt)return fail("OAUTH_STATE_REPLAYED","state_lookup");
    stage="state_consume";
    const consumed=await prisma.oAuthConnectionState.updateMany({where:{id:record.id,consumedAt:null},data:{consumedAt:new Date()}});
    if(!consumed.count)return fail("OAUTH_STATE_REPLAYED","state_consume");
    stage="token_exchange";
    const tokens=await exchangeOAuthCode(provider,code,record.codeVerifier);
    stage="profile_fetch";
    const profile=await fetchProviderProfile(provider,tokens.accessToken);
    stage="account_lookup";
    const existing=await prisma.connectedAccount.findUnique({where:{provider_providerAccountId:{provider:providerConfigs[provider].db,providerAccountId:profile.id}},select:{userId:true}});
    if(existing&&existing.userId!==record.userId)return fail("PROVIDER_ACCOUNT_ALREADY_CONNECTED","account_lookup");
    stage="account_save";
    await prisma.connectedAccount.upsert({where:{provider_providerAccountId:{provider:providerConfigs[provider].db,providerAccountId:profile.id}},update:{status:"CONNECTED",displayName:profile.displayName,username:profile.username,avatarUrl:profile.avatarUrl,profileUrl:profile.profileUrl,metadata:profile.metadata as never,followersCount:profile.followersCount,followersUpdatedAt:profile.followersCount?new Date():undefined,accessTokenEncrypted:encryptSecret(tokens.accessToken),refreshTokenEncrypted:tokens.refreshToken?encryptSecret(tokens.refreshToken):undefined,tokenExpiresAt:tokens.expiresIn?new Date(Date.now()+tokens.expiresIn*1000):undefined,scopes:tokens.scope,lastSyncedAt:new Date(),lastErrorCode:null,disconnectedAt:null},create:{userId:record.userId,provider:providerConfigs[provider].db,providerAccountId:profile.id,displayName:profile.displayName,username:profile.username,avatarUrl:profile.avatarUrl,profileUrl:profile.profileUrl,metadata:profile.metadata as never,followersCount:profile.followersCount,followersUpdatedAt:profile.followersCount?new Date():undefined,accessTokenEncrypted:encryptSecret(tokens.accessToken),refreshTokenEncrypted:tokens.refreshToken?encryptSecret(tokens.refreshToken):undefined,tokenExpiresAt:tokens.expiresIn?new Date(Date.now()+tokens.expiresIn*1000):undefined,scopes:tokens.scope,lastSyncedAt:new Date()}});
    return Response.redirect(new URL(`/dashboard/integrations?connected=${provider}`,appOrigin));
  }catch(error){
    const code=internalCode(error);
    if(code==="CALLBACK_URL_MISMATCH")return fail("CALLBACK_URL_MISMATCH",stage,error);
    if(code==="PROVIDER_DISABLED")return fail("OAUTH_CONFIGURATION_ERROR",stage,error);
    if(code==="INTEGRATION_TOKEN_ENCRYPTION_KEY_REQUIRED")return fail("ENCRYPTION_KEY_MISSING",stage,error);
    if(stage==="token_exchange")return fail("TOKEN_EXCHANGE_FAILED",stage,error);
    if(stage==="profile_fetch"||code==="PROFILE_FETCH_FAILED"||code==="PROFILE_ID_MISSING")return fail("PROVIDER_PROFILE_FAILED",stage,error);
    return fail(stage==="state_lookup"||stage==="state_consume"||stage==="account_lookup"||stage==="account_save"?"DATABASE_FAILURE":"PROVIDER_CALLBACK_FAILED",stage,error);
  }
}
