# Phase 3–4 correction record

## Runtime theme authority

`PersistedLaunchStateStore` is the single persisted authority for base
appearance (`SYSTEM`, `LIGHT`, `DARK`) and POP palette (`PULSE`, `MINT`,
`VIOLET`, `CORAL`, `SOLAR`, `GRAPHITE`). `LaunchCoordinator` is its mutation
boundary. `AppearanceStore` is now an in-memory compatibility mirror for
legacy authenticated screens only; it neither reads nor writes preferences.

The Android Material projection and the shared Phase 3/4 Compose projection
both derive from `popSemanticColors`. The explicit logo roles are
`logoPrimary`, `logoSecondary`, `logoAccent`, `logoOnPrimary`, and
`logoOnDark`.

## Removed hard-coded theme behavior

- `PopSplashScreen` no longer hard-codes Mint or re-creates fixed stage frames.
- Android `PopIdentity` no longer owns a second palette table or a `PRO` palette.
- Phase 3/4 logo rendering uses semantic logo roles instead of a permanent
  primary-color tint.
- The authenticated settings screen no longer reads an independent persisted
  appearance preference into runtime theme state.

## Compatibility and operating constraints

- `PhaseCSetupScreen.kt`, the old passkey-continuation UI, has been removed.
- `DesignReviewActivity` exists only in the Android `debug` source set at
  `pop-debug://review`; it is fixture-only and cannot send OTPs or mutate auth.
- Database recreation/deletion is intentionally not implemented. The current
  target is a hosted Neon PostgreSQL database, not an identified Google
  database product.
