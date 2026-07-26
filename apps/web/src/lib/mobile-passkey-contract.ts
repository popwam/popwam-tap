export const mobilePasskeyAuditMetadata=()=>({platform:"ANDROID",method:"PASSKEY",outcome:"SUCCESS"} as const);
export function mobilePasskeySuccessResponse<TSession extends object,TUser extends object>(session:TSession,user:TUser){
  return {ok:true as const,...session,user};
}
export async function runMobilePasskeyAuthentication<TAssertion,TProof,TResult>(
  assertion:TAssertion,
  deviceName:string|undefined,
  dependencies:{verify:(assertion:TAssertion)=>Promise<TProof|null>;finalize:(proof:TProof,deviceName:string|undefined)=>Promise<TResult>},
){
  const proof=await dependencies.verify(assertion);
  if(!proof)return null;
  return dependencies.finalize(proof,deviceName);
}
