// Owner-authorized acceptance configuration. Never connects to Production.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const requireDb=createRequire(path.join(root,'packages/db/package.json'));
const {PrismaClient}=requireDb('@prisma/client');
const cli=path.join(process.env.APPDATA,'npm/node_modules/@railway/cli/bin/railway.exe');
const project='a9d788a7-5ae7-414c-a1c5-fdac81b26227';
const environment='ff94b952-4772-4675-905d-b36def679071';
function variables(service){try{return JSON.parse(execFileSync(cli,['variable','list','-p',project,'-e',environment,'-s',service,'--json'],{encoding:'utf8',stdio:['pipe','pipe','pipe']}));}catch{throw Error('TEST configuration read failed; values suppressed');}}
const templates=['personal-sunrise','professional-noir','professional-editorial','personal-rose-paper','personal-lavender','personal-botanical','business-horizon','agency-idea-studio','brand-bloom','tech-link','store-first','store-lume','store-glowup','store-nobletime','store-stylehub','store-pawlove','store-techzone'];
let db;
let stage='configuration';
try {
  stage='Railway TEST variables';
  const pg=variables('Postgres');
  for(const service of ['popwam-auth-test','popwam-public-test']){
    const env=variables(service);
    if(env.RAILWAY_ENVIRONMENT_ID!==environment||env.RAILWAY_ENVIRONMENT_NAME!=='test'||env.DATABASE_URL!==pg.DATABASE_URL||env.DIRECT_DATABASE_URL!==pg.DATABASE_URL)throw Error('TEST database isolation mismatch');
  }
  const url=new URL(pg.DATABASE_URL);
  if(url.hostname!=='postgres.railway.internal'||url.pathname!=='/railway')throw Error('TEST database identity mismatch');
  url.hostname='gondola.proxy.rlwy.net';url.port='53631';
  stage='TEST database connection';
  db=new PrismaClient({datasources:{db:{url:url.href}}});
  stage='TEST entitlement read';
  const result=await db.$transaction(async tx=>{
    const identity=await tx.$queryRawUnsafe('SELECT current_database() AS database');
    if(identity[0]?.database!=='railway')throw Error('Unexpected actual database');
    const plans=await tx.plan.findMany({where:{isActive:true},select:{id:true,maxProfiles:true,maxVirtualCards:true,allowBusinessCards:true,allowThemes:true,storefrontEnabled:true}});
    const catalog=await tx.profileTemplate.findMany({where:{slug:{in:templates}},select:{slug:true,minimumPlan:true,isActive:true}});
    if(catalog.length!==17)throw Error('Approved TEST template catalog incomplete');
    if(!process.argv.includes('--apply'))return {
      apply:false,environment:'TEST',plans:plans.length,approvedTemplates:catalog.length,
      personalAndBusinessEnabled:plans.every(plan=>plan.allowBusinessCards),
      templateAccessEnabled:plans.every(plan=>plan.allowThemes&&plan.storefrontEnabled)&&catalog.every(template=>template.isActive&&template.minimumPlan==='free'),
      productionTouched:false,
    };
    for(const plan of plans)await tx.plan.update({where:{id:plan.id},data:{allowBusinessCards:true,allowThemes:true,storefrontEnabled:true,maxProfiles:Math.max(plan.maxProfiles,4),maxVirtualCards:Math.max(plan.maxVirtualCards,4)}});
    // Catalog minimumPlan is the existing real access rule, deliberately relaxed
    // only in this isolated acceptance DB so newly registered TEST accounts work too.
    await tx.profileTemplate.updateMany({where:{slug:{in:templates}},data:{minimumPlan:'free',isActive:true}});
    const overrides=await tx.userLimitOverride.findMany({where:{user:{role:{notIn:['ADMIN','SUPER_ADMIN']}}},select:{id:true,maxProfiles:true,maxVirtualCards:true}});
    for(const row of overrides)await tx.userLimitOverride.update({where:{id:row.id},data:{allowBusinessCards:true,allowThemes:true,maxProfiles:Math.max(row.maxProfiles??4,4),maxVirtualCards:Math.max(row.maxVirtualCards??4,4)}});
    return {apply:true,environment:'TEST',plansUpdated:plans.length,approvedTemplates:catalog.length,existingOverridesUpdated:overrides.length,productionTouched:false};
  },{timeout:30000});
  console.log(JSON.stringify(result));
} catch {console.error(`PASS 7A ${stage} failed; details suppressed.`);process.exitCode=1;}
finally {await db?.$disconnect();}
