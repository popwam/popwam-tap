# Mobile authentication contract v2 proposal

Status: proposal only. No backend route or production authentication behavior is changed in Phase 2.

## Security decisions

- Every new account must create a passkey before receiving unrestricted application access.
- Biometrics authorize local application access and unlock a device-held credential. A biometric result is not remote identity proof.
- Raw biometric information never leaves Android Keystore, Secure Enclave, or the platform biometric subsystem.
- When secure biometric hardware is unavailable, a new user may continue after passkey creation.
- When hardware exists but no biometric is enrolled, the client opens system enrollment settings, re-checks on return, and does not silently skip.

## Existing contract gap

`POST /api/mobile/auth/firebase/phone/exchange` currently returns normal access and refresh tokens immediately. Existing passkey registration routes require that normal session. This makes passkey enrollment optional from the server's perspective.

Contract v2 should be negotiated by sending `contractVersion: 2` to the existing phone exchange route. Version 1 must remain available during migration.

## Proposed exchange response

```json
{
  "ok": true,
  "contractVersion": 2,
  "transactionId": "opaque-id",
  "accountState": "NEW",
  "allowedMethods": ["PHONE_OTP"],
  "preferredMethod": "PHONE_OTP",
  "requiredEnrollments": ["PASSKEY", "LOCAL_BIOMETRIC_AUTHORIZATION", "PROFILE_SETUP"],
  "nextStep": "CREATE_PASSKEY",
  "enrollmentSession": {
    "token": "short-lived-bound-token",
    "expiresAt": "RFC-3339 timestamp",
    "permittedActions": ["CREATE_PASSKEY", "AUTHORIZE_LOCAL_BIOMETRICS"]
  }
}
```

The enrollment token must be short-lived, device-session-bound, replay-resistant, non-refreshable, and unusable against normal profile, sharing, NFC, Home, or Settings APIs.

## Enrollment sequence

1. Verify Firebase phone ownership.
2. Return a restricted enrollment session for a new account.
3. Allow that token to call passkey registration options and verification only.
4. Require discoverable credentials and user verification, as the existing WebAuthn configuration already does.
5. Consume the registration challenge once and persist the passkey credential.
6. Evaluate local biometric capability on-device.
7. If enrolled, create or unlock a non-exportable device key protected by biometric authorization.
8. If hardware exists without enrollment, open system settings and re-check on return.
9. If hardware is unavailable, record only the capability outcome locally and continue.
10. Exchange the completed passkey enrollment transaction for the normal access and refresh session.
11. Continue to Account Created and Profile Setup.

The backend may store a device record containing platform, device identifier, passkey credential identifier, public device-binding key or attestation metadata, and whether local biometric authorization was enabled. It must not receive a biometric template, raw biometric result, or claim that biometrics independently authenticated the account owner.

## Returning accounts

Returning users with a passkey should prefer:

1. `POST /api/mobile/auth/passkey/options`
2. Platform passkey assertion
3. `POST /api/mobile/auth/passkey/verify`
4. Normal session issuance

Phone OTP remains a recovery/fallback method according to server policy. A returning account must not be forced through new-account Profile Setup.

## OTP policy

When OTP is allowed, the server decision should provide:

- Code length
- Expiry duration
- Resend delay
- Maximum attempts
- Rate-limit outcome
- Whether automatic submission is allowed

The client must not assume a fixed six-digit code in shared state.

## Required server errors

- `AUTH_CONTRACT_VERSION_UNSUPPORTED`
- `ENROLLMENT_SESSION_REQUIRED`
- `ENROLLMENT_SESSION_EXPIRED`
- `ENROLLMENT_SESSION_REPLAYED`
- `PASSKEY_ENROLLMENT_REQUIRED`
- `PASSKEY_CHALLENGE_INVALID`
- `PASSKEY_VERIFICATION_FAILED`
- `DEVICE_BINDING_FAILED`
- `AUTH_METHOD_NOT_ALLOWED`
- `OTP_RATE_LIMITED`
- `OTP_ATTEMPTS_EXHAUSTED`

Responses must remain `cache-control: no-store` and must not log phone numbers, OTP values, session tokens, WebAuthn responses, credential public keys, or biometric state details beyond a safe categorical capability value.

## Compatibility and rollout

- Add v2 response and restricted-session support behind a server flag.
- Add contract tests before enabling a mobile client.
- Enable only for internal development builds first.
- Observe completion, expiration, and recovery rates without logging sensitive values.
- Keep v1 for existing production clients until minimum supported versions have adopted v2.
- Remove v1 new-account unrestricted issuance only after rollback metrics and support procedures are approved.

