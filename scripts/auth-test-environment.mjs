// Explicit, secret-safe operations for the owner-authorized isolated Railway TEST.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(import.meta.dirname, '..');
const requireDb = createRequire(path.join(root, 'packages/db/package.json'));
const { PrismaClient } = requireDb('@prisma/client');
const { parse } = requireDb('dotenv');
const cli = process.env.RAILWAY_CLI_PATH || path.join(process.env.APPDATA, 'npm/node_modules/@railway/cli/bin/railway.exe');
const project = 'a9d788a7-5ae7-414c-a1c5-fdac81b26227';
const environment = 'ff94b952-4772-4675-905d-b36def679071';
const services = ['popwam-auth-test', 'popwam-public-test'];
const api = 'https://popwam-auth-test-test.up.railway.app';
const web = 'https://popwam-public-test-test.up.railway.app';
const reportDir = path.join(process.env.LOCALAPPDATA, 'POPWAM', 'auth-test-activation');
mkdirSync(reportDir, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
function railway(args, input) {
  try {
    return execFileSync(cli, args, { cwd: root, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
  } catch { throw Error('Railway operation failed; secret-bearing output suppressed'); }
}
function variables(service, env = environment) {
  return JSON.parse(railway(['variable', 'list', '-p', project, '-e', env, '-s', service, '--json']));
}
function save(name, value) { writeFileSync(path.join(reportDir, name + '.json'), JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)); }
function identity(url) { const u = new URL(url); return { host: u.hostname, port: u.port, database: u.pathname, fingerprint: hash(url).slice(0, 16) }; }
function testConnection(pg) {
  const u = new URL(pg.DATABASE_URL);
  if (u.hostname !== 'postgres.railway.internal' || u.pathname !== '/railway') throw Error('Unexpected TEST database identity');
  u.hostname = 'gondola.proxy.rlwy.net'; u.port = '53631';
  return u.href;
}
const prod = variables('popwam-tap', 'popwam');
const pg = variables('Postgres');
const testUrl = testConnection(pg);
const production = new PrismaClient({ datasources: { db: { url: prod.DATABASE_URL } } });
const test = new PrismaClient({ datasources: { db: { url: testUrl } } });
const local = parse(readFileSync(path.join(root, '.env')));

async function productionSnapshot() {
  // Explicit READ ONLY transaction: no customer fields leave the database.
  const database = await production.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const result = {};
    for (const table of ['User', 'Profile', '_prisma_migrations']) {
      result[table] = await tx.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(row_to_json(t)::text), '' ORDER BY id), '')) AS fingerprint FROM "${table}" t`);
    }
    return result;
  }, { timeout: 30000 });
  const topology = JSON.parse(railway(['status', '--json']));
  const instance = topology.environments.edges.find(e => e.node.name === 'popwam').node.serviceInstances.edges.find(e => e.node.serviceName === 'popwam-tap').node;
  return { database, variablesFingerprint: hash(JSON.stringify(Object.entries(prod).sort())), evolution: Object.fromEntries(['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE'].map(k => [k, prod[k] ? hash(prod[k]) : 'absent'])), deployments: instance.activeDeployments.map(d => ({ id: d.id, status: d.status, createdAt: d.createdAt })) };
}
async function prove() {
  const topology = JSON.parse(railway(['status', '--json']));
  const env = topology.environments.edges.find(e => e.node.id === environment)?.node;
  if (env?.name !== 'test' || pg.RAILWAY_ENVIRONMENT_ID !== environment) throw Error('TEST environment identity mismatch');
  if (prod.DATABASE_URL === pg.DATABASE_URL || identity(prod.DATABASE_URL).database === identity(testUrl).database || identity(prod.DATABASE_URL).host === identity(testUrl).host) throw Error('Shared database refused');
  const checks = {};
  for (const service of services) {
    const vars = variables(service);
    const instance = env.serviceInstances.edges.find(e => e.node.serviceName === service)?.node;
    if (!instance || vars.RAILWAY_ENVIRONMENT_ID !== environment || vars.DATABASE_URL !== pg.DATABASE_URL || vars.DIRECT_DATABASE_URL !== pg.DATABASE_URL) throw Error('TEST service connection mismatch');
    if (vars.APP_URL !== api || vars.PUBLIC_URL !== web) throw Error('TEST origins mismatch');
    if (Object.entries(vars).some(([k, v]) => /DATABASE_URL/.test(k) && v !== pg.DATABASE_URL)) throw Error('Unexpected additional database connection');
    checks[service] = { id: instance.serviceId, runtime: identity(vars.DATABASE_URL), domains: instance.domains };
  }
  const actual = await test.$queryRawUnsafe('SELECT current_database() AS database, inet_server_addr()::text AS server, current_user AS role');
  if (actual[0].database !== 'railway') throw Error('Actual TEST database mismatch');
  const proof = { checkedAt: new Date().toISOString(), isolated: true, project, environment, production: identity(prod.DATABASE_URL), test: identity(testUrl), actual, api, web, services: checks };
  save('isolation', proof); console.log(JSON.stringify(proof));
}
async function configure() {
  for (const key of ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE']) if (!local[key]) throw Error('Missing ' + key);
  const config = {};
  for (const key of ['FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY', 'FCM_PROJECT_ID', 'PASSKEY_ANDROID_ORIGINS', 'BCRYPT_SALT_ROUNDS', 'MAX_IMAGE_UPLOAD_MB', 'ALLOWED_IMAGE_TYPES']) if (prod[key]) config[key] = prod[key];
  for (const key of Object.keys(prod).filter(k => k.startsWith('NEXT_PUBLIC_FIREBASE_'))) config[key] = prod[key];
  for (const key of ['NEXTAUTH_SECRET', 'MOBILE_TOKEN_SECRET', 'MOBILE_ENROLLMENT_SECRET', 'OTP_PEPPER', 'ACTIVATION_SCRATCH_PEPPER', 'ACTIVATION_RATE_LIMIT_PEPPER', 'INTEGRATION_TOKEN_ENCRYPTION_KEY']) config[key] = randomBytes(32).toString('hex');
  Object.assign(config, { DATABASE_URL: pg.DATABASE_URL, DIRECT_DATABASE_URL: pg.DATABASE_URL, NODE_ENV: 'production', PORT: '8080', APP_NAME: 'POP TEST', APP_URL: api, NEXTAUTH_URL: api, NEXT_PUBLIC_WEB_APP_URL: api, PUBLIC_URL: web, NEXT_PUBLIC_APP_URL: web, APP_HOST: new URL(api).host, PUBLIC_HOST: new URL(web).host, PASSKEY_ORIGIN: api, PASSKEY_RP_ID: new URL(api).host, META_ENABLED: 'false', OTP_TTL_SECONDS: '300', OTP_RESEND_COOLDOWN_SECONDS: '60', OTP_MAX_ATTEMPTS: '5' });
  for (const key of ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE']) config[key] = local[key];
  // No Production storage or integration write credentials are copied.
  for (const service of services) {
    for (const [key, value] of Object.entries(config)) railway(['variable', 'set', '-p', project, '-e', environment, '-s', service, key, '--stdin', '--skip-deploys'], value);
    console.log(service + ': TEST variables configured; secrets suppressed; storage intentionally disabled.');
  }
}
try {
  switch (process.argv[2]) {
    case 'baseline': { const snapshot = await productionSnapshot(); const file = path.join(reportDir, 'production-before.json'); if (existsSync(file)) throw Error('Baseline already exists'); save('production-before', snapshot); console.log(JSON.stringify(snapshot)); break; }
    case 'compare': { const after = await productionSnapshot(); const before = JSON.parse(readFileSync(path.join(reportDir, 'production-before.json'))); save('production-after', after); const unchanged = JSON.stringify(before) === JSON.stringify(after); console.log(JSON.stringify({ productionUnchanged: unchanged, ...after })); if (!unchanged) process.exitCode = 1; break; }
    case 'configure': await configure(); break;
    case 'deployment-config': {
      for (const serviceId of ['9202f479-ece7-4253-bf0e-b11bc000cfca', '935087b3-8b1c-4e30-9286-f0c13f85b61d']) {
        const query = `mutation { serviceInstanceUpdate(serviceId: "${serviceId}", environmentId: "${environment}", input: { builder: RAILPACK, buildCommand: "pnpm build", preDeployCommand: ["node scripts/validate-test-env.mjs && pnpm db:deploy"], startCommand: "node scripts/validate-test-env.mjs && pnpm --filter @popwam/web start", healthcheckPath: "/health", healthcheckTimeout: 300, restartPolicyMaxRetries: 3 }) }`;
        const result = JSON.parse(railway(['api', query, '--compact']));
        if (result.errors || !result.data?.serviceInstanceUpdate) throw Error('TEST deployment configuration failed');
      }
      console.log('Both TEST services have explicit TEST build/predeploy/start settings; Production configuration untouched.'); break;
    }
    case 'reset-seed': {
      await prove();
      if (!local.ADMIN_EMAIL || !local.ADMIN_PASSWORD || local.ADMIN_PASSWORD.length < 12) throw Error('Missing strong local Admin access configuration');
      const { tsImport } = requireDb('tsx/esm/api');
      const { APPROVED_PROFILE_TEMPLATES } = await tsImport(pathToFileURL(path.join(root, 'apps/web/src/lib/profile-templates.ts')).href, import.meta.url);
      const slugs = new Set(APPROVED_PROFILE_TEMPLATES.map(t => t.slug));
      if (slugs.size !== 17) throw Error('Expected 17 approved templates');
      const tables = ['Plan', 'PhoneCountryConfig', 'LegalDocument', 'ProfileCategory', 'ProfileModuleDefinition', 'ProfileTemplate', 'ProfileTemplateModule', 'LinkPlatform', 'OnboardingDefinition', 'OnboardingStep', 'OnboardingQuestion', 'OnboardingQuestionOption', 'OnboardingQuestionCondition'];
      const data = await production.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        const result = {};
        for (const table of tables) result[table] = (await tx.$queryRawUnsafe(`SELECT row_to_json(t) AS row FROM "${table}" t`)).map(r => r.row);
        result.SystemSetting = await tx.systemSetting.findMany({ where: { key: { in: ['localization.runtime', 'profile.account-types.v1', 'legal.country-targeting.v1'] } } });
        return result;
      }, { timeout: 60000 });
      data.ProfileTemplate = data.ProfileTemplate.filter(t => slugs.has(t.slug));
      if (data.ProfileTemplate.length !== 17) throw Error('Approved configuration missing');
      const templateIds = new Set(data.ProfileTemplate.map(t => t.id));
      data.ProfileTemplateModule = data.ProfileTemplateModule.filter(r => templateIds.has(r.templateId));
      if (data.OnboardingDefinition.some(r => r.templateId && !templateIds.has(r.templateId))) throw Error('Onboarding references unapproved template');
      const defaults = data.ProfileCategory.map(r => ({ id: r.id, defaultTemplateId: templateIds.has(r.defaultTemplateId) ? r.defaultTemplateId : null }));
      data.ProfileCategory = data.ProfileCategory.map(r => ({ ...r, defaultTemplateId: null }));
      const moduleDefaults = Object.fromEntries(data.ProfileModuleDefinition.map(m => [m.key, m.key === 'IDENTITY' ? 'REQUIRED' : 'OPTIONAL']));
      if (!data.SystemSetting.some(s => s.key === 'profile.account-types.v1')) data.SystemSetting.push({ key: 'profile.account-types.v1', value: Object.fromEntries(['PERSONAL', 'BUSINESS'].map(key => [key, { key, enabled: true, modules: moduleDefaults, requireVerification: false, requireAvatar: false, requireCover: false }])), updatedAt: new Date().toISOString() });
      if (!data.SystemSetting.some(s => s.key === 'legal.country-targeting.v1')) data.SystemSetting.push({ key: 'legal.country-targeting.v1', value: {}, updatedAt: new Date().toISOString() });
      const bcrypt = requireDb('bcryptjs');
      const passwordHash = await bcrypt.hash(local.ADMIN_PASSWORD, 12);
      await test.$transaction(async tx => {
        const actual = await tx.$queryRawUnsafe('SELECT current_database() AS database');
        if (actual[0].database !== 'railway') throw Error('Reset target identity changed');
        // Customer/auth state only, plus the configuration replaced below. No Inventory seed or filesystem/storage deletion.
        await tx.$executeRawUnsafe('TRUNCATE TABLE "User", "OtpChallenge", "MobileAuthChallenge", "AuditLog" CASCADE');
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${[...tables, 'SystemSetting'].map(t => `"${t}"`).join(', ')} CASCADE`);
        for (const table of [...tables, 'SystemSetting']) {
          if (data[table].length) await tx.$executeRawUnsafe(`INSERT INTO "${table}" SELECT * FROM json_populate_recordset(NULL::"${table}", $1::json)`, JSON.stringify(data[table]));
        }
        for (const row of defaults) if (row.defaultTemplateId) await tx.profileCategory.update({ where: { id: row.id }, data: { defaultTemplateId: row.defaultTemplateId } });
        await tx.user.create({ data: { email: local.ADMIN_EMAIL.trim().toLowerCase(), name: 'POP TEST Admin', role: 'ADMIN', status: 'ACTIVE', passwordHash } });
      }, { timeout: 60000 });
      const counts = {};
      for (const model of ['user', 'profile', 'otpChallenge', 'mobileAuthChallenge', 'mobileRefreshToken', 'session', 'deviceSession', 'profileRevision', 'profileTemplate', 'plan', 'phoneCountryConfig', 'legalDocument', 'linkPlatform', 'onboardingDefinition', 'systemSetting', 'inventoryBatch']) counts[model] = await test[model].count();
      counts.enabledCountries = await test.phoneCountryConfig.count({ where: { enabled: true } });
      counts.customerUsers = await test.user.count({ where: { role: 'USER' } });
      if (counts.customerUsers || counts.profile || counts.otpChallenge || counts.mobileRefreshToken || counts.inventoryBatch || counts.profileTemplate !== 17) throw Error('Clean TEST counts did not match');
      const manifest = { date: new Date().toISOString(), counts, config: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { count: v.length, sha256: hash(JSON.stringify(v)) }])), accountTypes: ['PERSONAL', 'BUSINESS'], adminAccess: 'Existing owner local ADMIN_EMAIL / ADMIN_PASSWORD; no profile created', storage: 'Disabled; no Production storage credentials copied' };
      save('seed', manifest); console.log(JSON.stringify(manifest)); break;
    }
    case 'inspect-config': {
      const result = await production.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        return {
          settings: await tx.systemSetting.findMany({ select: { key: true } }),
          templates: await tx.profileTemplate.findMany({ select: { slug: true, isActive: true } }),
          plans: await tx.plan.findMany({ select: { slug: true } }),
          countries: await tx.phoneCountryConfig.findMany({ where: { enabled: true }, select: { iso2: true } }),
          legal: await tx.legalDocument.findMany({ select: { documentType: true, locale: true, status: true, isActive: true } }),
          onboarding: await tx.onboardingDefinition.count({ where: { status: 'PUBLISHED' } }),
        };
      }, { timeout: 30000 }); console.log(JSON.stringify(result)); break;
    }
    case 'prove': await prove(); break;
    case 'api-smoke': {
      await prove();
      // US fictional 555 number is used only after proving the country is disabled.
      if ((await test.phoneCountryConfig.findUnique({ where: { iso2: 'US' } }))?.enabled) throw Error('Unsupported-country smoke requires US disabled');
      const post = async (route, body) => {
        const response = await fetch(api + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(15000) });
        const json = await response.json();
        if (Object.keys(json).some(k => /^(otp|code|otpHash|accessToken|refreshToken)$/i.test(k))) throw Error('Secret field exposed by rejected request');
        return { status: response.status, body: json, cacheControl: response.headers.get('cache-control'), retryAfter: response.headers.get('retry-after') };
      };
      const invalid = await post('/api/mobile/auth/otp/request', { phone: 'invalid', countryCode: 'EG', locale: 'en' });
      const disabled = await post('/api/mobile/auth/otp/request', { phone: '+12025550123', countryCode: 'US', locale: 'en' });
      const throttle = [];
      for (let i = 0; i < 6; i++) throttle.push(await post('/api/mobile/auth/otp/request', { phone: 'invalid' }));
      const verify = await post('/api/mobile/auth/otp/verify', { phone: 'invalid', challengeId: '00000000-0000-4000-8000-000000000000', code: '123456' });
      if (invalid.status !== 400 || disabled.body.error !== 'PHONE_COUNTRY_UNAVAILABLE' || !throttle.some(r => r.status === 429 && r.retryAfter === '60') || verify.status !== 400) throw Error('TEST API smoke expectation failed');
      const counts = {};
      for (const model of ['user', 'profile', 'profileRevision', 'otpChallenge', 'mobileAuthChallenge', 'mobileRefreshToken', 'session', 'deviceSession', 'inventoryBatch']) counts[model] = await test[model].count();
      const migrations = await test.$queryRawUnsafe('SELECT count(*)::int AS applied, count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS failed FROM "_prisma_migrations"');
      const retiredColumn = await test.$queryRawUnsafe("SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema='public' AND table_name='MobileAuthChallenge' AND column_name='firebaseSubjectHash'");
      if (counts.otpChallenge || counts.profile || counts.mobileRefreshToken || migrations[0].failed || retiredColumn[0].count) throw Error('Unexpected TEST state after smoke');
      const result = { date: new Date().toISOString(), invalid, disabled, throttle, verify, counts, migrations, retiredColumnAbsent: true, realWhatsAppSent: false };
      save('api-smoke', result); console.log(JSON.stringify(result)); break;
    }
    case 'migrate': {
      await prove();
      const prismaCli = requireDb.resolve('prisma/build/index.js');
      for (const action of ['deploy', 'status']) {
        const output = execFileSync(process.execPath, [prismaCli, 'migrate', action], { cwd: path.join(root, 'packages/db'), env: { ...process.env, DATABASE_URL: testUrl, DIRECT_DATABASE_URL: testUrl }, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        console.log(output.replaceAll(testUrl, '[TEST_DATABASE_URL]'));
      }
      break;
    }
    default: throw Error('Expected baseline, configure, deployment-config, inspect-config, prove, migrate, reset-seed, api-smoke or compare');
  }
} catch (error) {
  // Do not emit Prisma/CLI diagnostics: they can contain connection credentials.
  console.error(JSON.stringify({ operation: process.argv[2], failed: true, type: error.constructor.name, code: error.code || null }));
  process.exitCode = 1;
} finally { await Promise.all([production.$disconnect(), test.$disconnect()]); }
