import "server-only";
export type BackupProviderName="POP_CLOUD"|"GOOGLE_DRIVE";
export interface BackupProvider{readonly name:BackupProviderName;available(user:{googleDriveScope:boolean}):boolean;backup(userId:string,payload:unknown):Promise<{reference:string}>}
export class PopCloudBackupProvider implements BackupProvider{readonly name="POP_CLOUD" as const;available(){return true}async backup(userId:string){return{reference:`pop-cloud:${userId}`}}}
export class GoogleDriveBackupProvider implements BackupProvider{readonly name="GOOGLE_DRIVE" as const;available(user:{googleDriveScope:boolean}){return process.env.GOOGLE_CONNECTED_ENABLED==="true"&&user.googleDriveScope}async backup(_userId:string,_payload:unknown):Promise<{reference:string}>{throw new Error("GOOGLE_DRIVE_BACKUP_NOT_CONFIGURED")}}
