# API-Layer Security & Risk Review — N1-12

**Date:** 2026-11-15
**Reviewer:** Developer A
**Scope:** The four HTTP endpoints (`health`, `me`, `studentAccess`, `adminAccess`), the shared helpers (`auth.ts`, `authorization.ts`, `api-response.ts`, `api-errors.ts`), and their dependency surface.
**Environment:** Local Firebase Emulator Suite (`demo-networking-p1`), Auth 9099 / Firestore 8080 / Functions 5001.

> **Disclaimer:** This is a focused engineering review of a demo-stage API, not a penetration test and not a production security sign-off. No load, fuzzing, or infrastructure-level testing was performed. Findings below are limited to what was observed or read in the current source.

---

## 1. Method

1. Static reading of `src/*.ts` and `firestore.rules`.
2. Live probes against the running emulators for header parsing and identity lifecycle (revocation, disable, deletion).
3. Existing automated suites (43 tests) as regression evidence.
4. `npm audit` for both `backend/functions` and `backend` (full and `--omit=dev`).

## 2. Controls verified as working (evidence-based)

| Control | Observed behavior |
|---|---|
| Missing / malformed `Authorization` | `401 UNAUTHENTICATED` |
| Lowercase scheme (`bearer …`) | `401 UNAUTHENTICATED` (strict match) |
| Double space after `Bearer` | `401 UNAUTHENTICATED` |
| Extra spoofing headers (`X-User-Role`, `X-Uid`) | Ignored; identity comes from the token only |
| Query-string role spoofing (`?role=admin`) | Ignored; `403` for a Student |
| Client-supplied `?uid=` | Ignored; response returns the verified UID |
| Role removed after token issuance (stale token) | `403 FORBIDDEN` (live `getUser` comparison) |
| Student promoted after token issuance | `403` until token refresh |
| Disabled account | `401 INVALID_TOKEN` on `/me` and `/studentAccess` (emulator rejects at verification) |
| Deleted account | `401 INVALID_TOKEN` (emulator rejects at verification; `authorization.ts` also maps user-not-found to `403`) |
| Unknown role (`teacher`) | `403` on both role endpoints |
| Error bodies | Generic, no stack traces, no internal identifiers, no environment details |
| HTTP method restriction | `405` + `Allow: GET`, checked **before** authentication |
| Response caching | `Cache-Control: no-store` on all endpoints, including errors |
| Service-to-service secrets | None present in the client contract; no secrets in responses |

## 3. Findings

Severity uses demo-MVP context, not production grading.

| ID | Severity | Finding | Evidence | Impact | Disposition |
|---|---|---|---|---|---|
| F-01 | Medium | **Existing ID tokens survive `revokeRefreshTokens()` until natural expiry** (~1 h). `authenticate()` calls `verifyIdToken(token)` without `checkRevoked`. | Probe: after revoking, `/me` → `200` and `/studentAccess` → `200` with the old token. | A previously issued token keeps working for up to an hour after a revocation event. Role *changes* are still blocked by the live-role comparison, so privilege escalation via stale role is not possible. | **Accepted for MVP.** Record as a known limitation. Revisit if account-deletion or "log out all devices" becomes a demo requirement (AC-15). `checkRevoked: true` is the mechanism, at the cost of an extra Auth round-trip (already paid in `authorize()`). |
| F-02 | Low | **`/me` relies on token verification only** — unlike `authorize()`, it does not perform a live `getUser()` state check. | Code review of `index.ts` + `auth.ts`. Emulator rejects disabled/deleted tokens at verification, so no gap was observed **in the emulator**. | In real Firebase, a disabled account's existing token can remain accepted until expiry. Exposure is limited to the caller's own UID. | **Documented.** Add a live account-state check to `/me` when account deletion lands (N2/N3, AC-15). |
| F-03 | Low | **The `503 AUTH_SERVICE_UNAVAILABLE` path is not exercised by an automated test.** | `authorization.ts` catch block exists; no test forces `getUser()` to fail. | A regression in that branch would go unnoticed. | **Documented as untested.** Add a dependency-injected/mocked test when the auth layer is refactored (N2). Do not claim it as tested. |
| F-04 | Medium | **7 production dependency advisories (1 low, 6 moderate; 0 high/critical)**, plus 5 dev-only advisories → 12 total. All are transitive (`google-gax`, `gaxios`, `rimraf`, `glob`, `minimatch`, `fast-xml-parser`) via `firebase-admin`; the 5 extra are `@typescript-eslint/*` tooling. | `npm audit` and `npm audit --omit=dev` on 2026-11-15. `backend` root reports **0**. | Mostly DoS/path-avoidance classes in libraries not directly exposed to request input; low exploitability in a localhost demo. No high/critical findings. | **Documented, not fixed.** No `npm audit fix --force` (would break toolchain compatibility without evidence). Re-run before the defense and record counts in the defense pack. |
| F-05 | Low | **No application-level rate limiting or abuse throttling** on the HTTP endpoints. | Code review; `setGlobalOptions({maxInstances: 10})` is the only bound. | Brute-force/DoS risk if ever exposed beyond localhost. Demo runs on the laptop's Wi-Fi only. | **Accepted for MVP** (demo-only, zero-cost). Note for production hardening. |
| F-06 | Info | **Emulators bind to `127.0.0.1`**, so the current setup is not reachable from the phone. | Port checks show loopback listeners only. | Not a vulnerability — a configuration fact. The LAN demo requires an explicit bind. | **By design for now.** N7-01 owns the LAN bind + Windows firewall scope. Must never bind publicly. |
| F-07 | Info | `backend/index.backup.ts` is a leftover scaffold copy at the backend root. | File inspection; `tsc` `include: ["src"]` excludes it and `firebase.json` serves only `functions/`. | None at runtime; can confuse reviewers. | **Recommend archiving/deleting** in cleanup. |
| F-08 | Info | `.firebaserc` is `{}`; the project ID is supplied via CLI flag. | File inspection. | No deploy target configured. Intentional for emulator-only work. | **Accepted.** Do not "fix" unless a real Firebase project is registered. |
| F-09 | Info | Firestore rules remain **deny-all**; the 4 rules tests assert only denial. | `firestore.rules` + tests. | No Firestore authorization exists yet — all denied, which fails closed. | **Historical (N1). Superseded 2026-11-16 by N2-04/N2-05:** current rules are least-privilege (140 lines, 91-test suite). |

## 4. Residual risk statement

For the graduation demo on a local machine and a private Wi-Fi network, with no external exposure, no real user data, and emulator-only credentials, the residual risk is **acceptable**. The most material residual issues are:

1. Token revocation is not enforced for the token lifetime (F-01).
2. Production dependency advisories remain open (F-04).
3. The 503 branch is unverified by tests (F-03).
4. Firestore authorization was not implemented at the time of this review (F-09). **Resolved after this review:** N2-04/N2-05 implemented and tested least-privilege rules.

None of these block continuing Step 3 closeout or starting N2. They **do** block any claim of production readiness.

## 5. Recommended actions before the defense

1. Re-run `npm audit` and record the date/counts in the defense pack; state explicitly that no high/critical advisories exist.
2. Keep all services bound to localhost or a firewalled LAN address; never `0.0.0.0` on an untrusted network.
3. When account deletion is implemented, add the live-state check to `/me` and evaluate `checkRevoked: true` (F-01/F-02).
4. Add a mocked failure test for the `503` branch when the auth dependency becomes injectable (F-03).
5. Archive or delete `backend/index.backup.ts` (F-07).
6. Do not run `npm audit fix --force`.

## 6. Reproduction

```powershell
# Dependency posture
cd E:\Graduation_Project2\networking-fundamentals\backend\functions
npm audit
npm audit --omit=dev

# Regression evidence (43 tests) — requires emulators on 9099/8080/5001
cd ..
node --test .\tests\api-contract.http.test.mjs .\tests\auth.http.test.mjs .\tests\health.http.test.mjs .\tests\firestore.rules.test.mjs .\functions\tests\api-contract.test.cjs .\functions\tests\authorization.http.test.cjs
```

The identity-lifecycle probe used for F-01/F-02 is not part of the automated suite (it mutates accounts); its raw output is retained outside the repository. If it should become a permanent regression test, it belongs in N2 alongside account-lifecycle work.
