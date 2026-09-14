import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const fixture = {
  DATABASE_URL: 'postgresql://fixture:fixture@database.invalid/pop',
  DIRECT_DATABASE_URL: 'postgresql://fixture:fixture@database.invalid/pop',
  APP_URL: 'https://pop.popwam.com', NEXTAUTH_URL: 'https://pop.popwam.com',
  PUBLIC_URL: 'https://go.popwam.com', NEXT_PUBLIC_APP_URL: 'https://go.popwam.com',
  APP_HOST: 'pop.popwam.com', PUBLIC_HOST: 'go.popwam.com',
  PASSKEY_RP_ID: 'pop.popwam.com', PASSKEY_ORIGIN: 'https://pop.popwam.com',
  PASSKEY_ANDROID_ORIGINS: `android:apk-key-hash:${'a'.repeat(43)}`,
  EVOLUTION_API_URL: 'https://provider.invalid', EVOLUTION_API_KEY: 'fixture-provider', EVOLUTION_INSTANCE: 'fixture',
};
for (const [i, name] of ['NEXTAUTH_SECRET', 'MOBILE_TOKEN_SECRET', 'MOBILE_ENROLLMENT_SECRET', 'OTP_PEPPER', 'ACTIVATION_SCRATCH_PEPPER', 'ACTIVATION_RATE_LIMIT_PEPPER'].entries()) fixture[name] = String(i).repeat(64);
function run(overrides = {}, args = []) {
  return spawnSync(process.execPath, [fileURLToPath(new URL('./validate-production-env.mjs', import.meta.url)), ...args], {
    env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, ...fixture, ...overrides }, encoding: 'utf8',
  });
}
test('core contract succeeds without disabled integrations, Firebase, storage, seed or APK distribution', () => assert.equal(run().status, 0));
test('requires both database connections and every Evolution credential', () => {
  for (const name of ['DATABASE_URL', 'DIRECT_DATABASE_URL', 'EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE']) {
    const r = run({ [name]: '' }); assert.equal(r.status, 1); assert.ok(r.stderr.includes(name));
  }
});
test('rejects weak or shared core secrets without printing them', () => {
  const r = run({ OTP_PEPPER: 'do-not-echo-this' }); assert.equal(r.status, 1); assert.ok(!r.stderr.includes('do-not-echo-this'));
  assert.equal(run({ OTP_PEPPER: fixture.NEXTAUTH_SECRET }).status, 1);
});
test('Production cannot be turned into OTP TEST by STAGING', () => {
  for (const name of ['STAGING', 'OTP_TEST_MODE', 'OTP_EXPOSE_IN_RESPONSE']) assert.equal(run({ [name]: 'true' }).status, 1);
  assert.equal(run({ STAGING: 'true', OTP_TEST_MODE: 'true', OTP_TEST_CODE: '123456' }).status, 1);
  assert.equal(run({ OTP_TEST_CODE: '123456' }).status, 1);
  assert.equal(run({ OTP_TEST_PHONES: '+12025550100' }).status, 1);
});
test('rejects TEST domains, credential-bearing URLs and Markdown URLs', () => {
  for (const url of ['https://popwam-auth-test-test.up.railway.app', 'https://user:do-not-print@pop.popwam.com', '[https://pop.popwam.com](https://pop.popwam.com)']) {
    const r = run({ APP_URL: url }); assert.equal(r.status, 1); assert.ok(!r.stderr.includes('do-not-print'));
  }
  assert.equal(run({ PUBLIC_URL: 'https://go.popwam.com/unexpected' }).status, 1);
});
test('future Production auth rejects the TEST debug signing origin', () => assert.equal(run({ PASSKEY_ANDROID_ORIGINS: 'android:apk-key-hash:2wLB6Ar-rc3goPV-Syud8oWJd5Ipu78bFhJ-gRQc5TA' }, ['--future-auth']).status, 1));
test('current Production permits intentionally absent Evolution; future auth requires it', () => {
  const absent = { EVOLUTION_API_URL: '', EVOLUTION_API_KEY: '', EVOLUTION_INSTANCE: '' };
  assert.equal(run(absent).status, 0);
  assert.equal(run(absent, ['--future-auth']).status, 1);
});
test('validates active OTP ranges and allows runtime defaults', () => {
  assert.equal(run({ OTP_TTL_SECONDS: '300', OTP_RESEND_COOLDOWN_SECONDS: '60', OTP_MAX_ATTEMPTS: '5' }).status, 0);
  for (const name of ['OTP_TTL_SECONDS', 'OTP_RESEND_COOLDOWN_SECONDS', 'OTP_MAX_ATTEMPTS']) assert.equal(run({ [name]: '0' }).status, 1);
});
test('enabled connected accounts require their own credentials; disabled blank groups do not', () => {
  for (const flag of ['META_ENABLED', 'TIKTOK_ENABLED', 'GOOGLE_CONNECTED_ENABLED', 'LINKEDIN_ENABLED', 'GITHUB_ENABLED']) {
    assert.equal(run({ [flag]: 'false' }).status, 0); assert.equal(run({ [flag]: 'true' }).status, 1);
  }
});
test('Analytics does not require an Auth domain, bucket or sender ID', () => assert.equal(run({ NEXT_PUBLIC_FIREBASE_API_KEY: 'fixture', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fixture', NEXT_PUBLIC_FIREBASE_APP_ID: 'fixture' }).status, 0));
test('partial FCM, Wallet and R2 groups fail without disclosing values', () => {
  for (const name of ['FCM_PRIVATE_KEY', 'GOOGLE_WALLET_PRIVATE_KEY', 'APPLE_WALLET_SIGNER_KEY_BASE64', 'R2_SECRET_ACCESS_KEY']) {
    const r = run({ [name]: 'do-not-echo-this' }); assert.equal(r.status, 1); assert.ok(!r.stderr.includes('do-not-echo-this'));
  }
});
