// Run inside the deployed TEST service with `railway ssh ... node ...`.
// Connectivity only: this script has no send-message operation or phone input.
import './validate-test-env.mjs';
if (process.exitCode) process.exit(process.exitCode);
const env = process.env;
const base = env.EVOLUTION_API_URL.replace(/\/+$/, '');
const result = { checkedAt: new Date().toISOString(), source: 'TEST backend', reachable: false, credentialsAccepted: false, instanceExists: false, usable: false, realWhatsAppSent: false };
try {
  const options = { headers: { apikey: env.EVOLUTION_API_KEY }, redirect: 'error', signal: AbortSignal.timeout(10000) };
  const versionResponse = await fetch(base + '/', options);
  result.reachable = versionResponse.ok;
  if (versionResponse.ok) {
    const body = await versionResponse.json();
    if (typeof body.version === 'string' && /^2\.\d+\.\d+$/.test(body.version)) result.version = body.version;
  }
  const response = await fetch(base + '/instance/connectionState/' + encodeURIComponent(env.EVOLUTION_INSTANCE), { ...options, signal: AbortSignal.timeout(10000) });
  result.httpStatus = response.status;
  if (response.ok) {
    const body = await response.json();
    result.credentialsAccepted = true;
    result.instanceExists = body.instance?.instanceName === env.EVOLUTION_INSTANCE;
    result.usable = result.instanceExists && body.instance?.state === 'open';
    result.state = ['open', 'close', 'connecting'].includes(body.instance?.state) ? body.instance.state : 'unknown';
  }
} catch { result.error = 'Provider connection failed; details suppressed'; }
console.log(JSON.stringify(result));
if (!result.reachable || !result.credentialsAccepted || !result.instanceExists || !result.usable) process.exitCode = 1;
