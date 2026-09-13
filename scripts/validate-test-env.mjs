import assert from 'node:assert/strict';
const env = process.env;
try {
  assert.equal(env.RAILWAY_ENVIRONMENT_ID, 'ff94b952-4772-4675-905d-b36def679071');
  assert.equal(env.RAILWAY_ENVIRONMENT_NAME, 'test');
  assert.ok(['9202f479-ece7-4253-bf0e-b11bc000cfca', '935087b3-8b1c-4e30-9286-f0c13f85b61d'].includes(env.RAILWAY_SERVICE_ID));
  for (const key of ['DATABASE_URL', 'DIRECT_DATABASE_URL']) {
    const url = new URL(env[key]);
    assert.equal(url.hostname, 'postgres.railway.internal');
    assert.equal(url.pathname, '/railway');
  }
  assert.equal(env.DATABASE_URL, env.DIRECT_DATABASE_URL);
  const api = 'https://popwam-auth-test-test.up.railway.app';
  const web = 'https://popwam-public-test-test.up.railway.app';
  for (const key of ['NEXTAUTH_URL', 'APP_URL', 'NEXT_PUBLIC_WEB_APP_URL', 'PASSKEY_ORIGIN']) assert.equal(env[key], api);
  for (const key of ['PUBLIC_URL', 'NEXT_PUBLIC_APP_URL']) assert.equal(env[key], web);
  assert.equal(env.APP_HOST, new URL(api).host);
  assert.equal(env.PUBLIC_HOST, new URL(web).host);
  assert.equal(env.PASSKEY_RP_ID, new URL(api).host);
  const secrets = ['NEXTAUTH_SECRET', 'MOBILE_TOKEN_SECRET', 'MOBILE_ENROLLMENT_SECRET', 'OTP_PEPPER', 'ACTIVATION_SCRATCH_PEPPER', 'ACTIVATION_RATE_LIMIT_PEPPER'];
  for (const key of secrets) assert.ok(env[key]?.length >= 32);
  assert.equal(new Set(secrets.map(k => env[k])).size, secrets.length);
  for (const key of ['EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE']) assert.ok(env[key]?.trim());
  const evolution = new URL(env.EVOLUTION_API_URL);
  assert.equal(evolution.protocol, 'https:');
  assert.ok(!evolution.username && !evolution.password && !evolution.search && !evolution.hash);
  assert.match(env.EVOLUTION_INSTANCE, /^[A-Za-z0-9_.-]{1,120}$/);
  assert.equal(env.OTP_TTL_SECONDS, '300');
  assert.equal(env.OTP_RESEND_COOLDOWN_SECONDS, '60');
  assert.equal(env.OTP_MAX_ATTEMPTS, '5');
  console.log('Isolated TEST environment validation passed.');
} catch {
  console.error('TEST environment validation failed; migration/start refused. Configuration values suppressed.');
  process.exitCode = 1;
}
