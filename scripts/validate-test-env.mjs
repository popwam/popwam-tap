import assert from 'node:assert/strict';
const env = process.env;
let variable = 'RAILWAY_ENVIRONMENT_ID';
const check = (name, condition) => { variable = name; assert.ok(condition); };
try {
  check('RAILWAY_ENVIRONMENT_ID', env.RAILWAY_ENVIRONMENT_ID === 'ff94b952-4772-4675-905d-b36def679071');
  check('RAILWAY_ENVIRONMENT_NAME', env.RAILWAY_ENVIRONMENT_NAME === 'test');
  variable = 'RAILWAY_SERVICE_ID';
  assert.ok(['9202f479-ece7-4253-bf0e-b11bc000cfca', '935087b3-8b1c-4e30-9286-f0c13f85b61d'].includes(env.RAILWAY_SERVICE_ID));
  for (const key of ['DATABASE_URL', 'DIRECT_DATABASE_URL']) {
    variable = key;
    const url = new URL(env[key]);
    assert.ok(/^postgres(ql)?:$/.test(url.protocol));
    assert.equal(url.hostname, 'postgres.railway.internal');
    assert.equal(url.pathname, '/railway');
  }
  check('DIRECT_DATABASE_URL', env.DATABASE_URL === env.DIRECT_DATABASE_URL);
  const api = 'https://popwam-auth-test-test.up.railway.app';
  const web = 'https://popwam-public-test-test.up.railway.app';
  for (const key of ['NEXTAUTH_URL', 'APP_URL', 'NEXT_PUBLIC_WEB_APP_URL', 'PASSKEY_ORIGIN']) check(key, env[key] === api);
  for (const key of ['PUBLIC_URL', 'NEXT_PUBLIC_APP_URL']) check(key, env[key] === web);
  variable = 'APP_HOST';
  assert.equal(env.APP_HOST, new URL(api).host);
  variable = 'PUBLIC_HOST';
  assert.equal(env.PUBLIC_HOST, new URL(web).host);
  variable = 'PASSKEY_RP_ID';
  assert.equal(env.PASSKEY_RP_ID, new URL(api).host);
  const secrets = ['NEXTAUTH_SECRET', 'MOBILE_TOKEN_SECRET', 'MOBILE_ENROLLMENT_SECRET', 'OTP_PEPPER', 'ACTIVATION_SCRATCH_PEPPER', 'ACTIVATION_RATE_LIMIT_PEPPER'];
  for (const key of secrets) check(key, !!env[key] && env[key].trim().length >= 32 && !/CHANGE|EXAMPLE|PLACEHOLDER/i.test(env[key]));
  check(secrets.join(', '), new Set(secrets.map(k => env[k])).size === secrets.length);
  for (const key of ['EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE']) check(key, !!env[key]?.trim());
  variable = 'EVOLUTION_API_URL';
  const evolution = new URL(env.EVOLUTION_API_URL);
  assert.equal(evolution.protocol, 'https:');
  assert.ok(!evolution.username && !evolution.password && !evolution.search && !evolution.hash);
  variable = 'EVOLUTION_INSTANCE';
  assert.match(env.EVOLUTION_INSTANCE, /^[A-Za-z0-9_.-]{1,120}$/);
  check('OTP_TTL_SECONDS', env.OTP_TTL_SECONDS === '300');
  check('OTP_RESEND_COOLDOWN_SECONDS', env.OTP_RESEND_COOLDOWN_SECONDS === '60');
  check('OTP_MAX_ATTEMPTS', env.OTP_MAX_ATTEMPTS === '5');
  check('PASSKEY_ANDROID_ORIGINS', env.PASSKEY_ANDROID_ORIGINS?.trim() === 'android:apk-key-hash:2wLB6Ar-rc3goPV-Syud8oWJd5Ipu78bFhJ-gRQc5TA');
  for (const key of ['STAGING', 'OTP_TEST_MODE', 'OTP_EXPOSE_IN_RESPONSE']) check(key, !env[key] || env[key].toLowerCase() === 'false');
  for (const key of ['OTP_TEST_CODE', 'OTP_TEST_PHONES']) check(key, !env[key]?.trim());
  console.log('Isolated TEST environment validation passed.');
} catch {
  console.error(`TEST environment validation failed: ${variable}. Configuration values suppressed.`);
  process.exitCode = 1;
}
