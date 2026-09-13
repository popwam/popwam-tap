import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const api = 'https://popwam-auth-test-test.up.railway.app';
const web = 'https://popwam-public-test-test.up.railway.app';
const fixture = {
  RAILWAY_ENVIRONMENT_ID: 'ff94b952-4772-4675-905d-b36def679071', RAILWAY_ENVIRONMENT_NAME: 'test',
  RAILWAY_SERVICE_ID: '9202f479-ece7-4253-bf0e-b11bc000cfca',
  DATABASE_URL: 'postgresql://test:fixture@postgres.railway.internal:5432/railway',
  DIRECT_DATABASE_URL: 'postgresql://test:fixture@postgres.railway.internal:5432/railway',
  NEXTAUTH_URL: api, APP_URL: api, NEXT_PUBLIC_WEB_APP_URL: api, PASSKEY_ORIGIN: api,
  PUBLIC_URL: web, NEXT_PUBLIC_APP_URL: web, APP_HOST: new URL(api).host, PUBLIC_HOST: new URL(web).host, PASSKEY_RP_ID: new URL(api).host,
  EVOLUTION_API_URL: 'https://provider.example.test', EVOLUTION_API_KEY: 'provider-fixture', EVOLUTION_INSTANCE: 'test-instance',
  OTP_TTL_SECONDS: '300', OTP_RESEND_COOLDOWN_SECONDS: '60', OTP_MAX_ATTEMPTS: '5',
};
for (const [i, key] of ['NEXTAUTH_SECRET', 'MOBILE_TOKEN_SECRET', 'MOBILE_ENROLLMENT_SECRET', 'OTP_PEPPER', 'ACTIVATION_SCRATCH_PEPPER', 'ACTIVATION_RATE_LIMIT_PEPPER'].entries()) fixture[key] = `${i}`.repeat(64);
function run(overrides = {}) { return spawnSync(process.execPath, [fileURLToPath(new URL('./validate-test-env.mjs', import.meta.url))], { env: { ...process.env, ...fixture, ...overrides }, encoding: 'utf8' }); }
test('accepts the configured isolated TEST service', () => assert.equal(run().status, 0));
test('refuses the actual Production environment', () => assert.equal(run({ RAILWAY_ENVIRONMENT_ID: 'e465376b-2fd9-4119-aa97-a6d850d0259e', RAILWAY_ENVIRONMENT_NAME: 'popwam' }).status, 1));
test('refuses a Production database URL without disclosing credentials', () => {
  const result = run({ DATABASE_URL: 'postgresql://user:do-not-print@production.example/neondb' });
  assert.equal(result.status, 1); assert.ok(!result.stderr.includes('do-not-print'));
});
test('refuses Production public routing', () => assert.equal(run({ PUBLIC_URL: 'https://go.popwam.com' }).status, 1));
test('refuses a separate writable migration connection', () => assert.equal(run({ DIRECT_DATABASE_URL: 'postgresql://different:fixture@postgres.railway.internal:5432/railway' }).status, 1));
test('refuses shared auth secrets', () => assert.equal(run({ OTP_PEPPER: fixture.NEXTAUTH_SECRET }).status, 1));
