# Local Firebase Emulator (auth / firestore / functions)

**Status:** verified 2026-11-17 on Windows 10 + Samsung Galaxy A17 (SM-A175F, Android 16, API 36).
**Root that owns the config:** `networking-fundamentals/backend` (this repository).

The app talks to the emulators only. There is no production Firebase project and
no paid service in the MVP.

---

## 1. Why the backend root, not the older POC

`E:\P1_Firebase_Emulator_POC` is a legacy test bench. Its `firestore.rules` is a
deny-all stub:

```javascript
match /{document=**} { allow read, write: if false; }
```

and it only ships the `health` function. Running the app against it makes every
Firestore read/write fail with `permission-denied`, so it must not be used for
application work.

`networking-fundamentals/backend` carries the real, verified N2-04 rules, the
real functions (`health`, `me`, `studentAccess`, `adminAccess`), the 11 composite
indexes and the fixture scripts. Always start the emulators from there.

---

## 2. Prerequisites

| Tool | Version used |
|---|---|
| Node.js | 24.x |
| firebase-tools | 15.34.2 |
| Java (Temurin JDK) | 21 (needed by the Firestore emulator) |
| Flutter | 3.47.9 / Dart 3.13.7 |

First run only: install and build the functions before starting the emulators.

```powershell
cd E:\Graduation_Project2_GitHub\networking-fundamentals\backend\functions
npm install
npm run build        # tsc -> functions/lib/*.js
```

---

## 3. Configuration that must stay in the repo

`backend/.firebaserc` — the emulator names itself after this project. An empty
`{}` makes firebase-tools start `demo-no-project`, and every app request fails
because the Flutter bootstrap uses `demo-networking-p1`.

```json
{
  "projects": {
    "default": "demo-networking-p1"
  }
}
```

`backend/firebase.json` — each emulator needs an explicit `host`. The physical
device reaches the laptop over Wi-Fi, so `localhost` is not enough.

```json
"emulators": {
  "auth":      { "host": "0.0.0.0", "port": 9099 },
  "functions": { "host": "0.0.0.0", "port": 5001 },
  "firestore": { "host": "0.0.0.0", "port": 8080 },
  "ui":        { "enabled": false },
  "singleProjectMode": true
}
```

> `firebase emulators:start --host 0.0.0.0` no longer exists in firebase-tools 15.
> The CLI answers `error: unknown option '--host'`; the `host` key in
> `firebase.json` is the supported replacement (`controller.js` reads
> `config.src.emulators[<name>].host`).

---

## 4. Start the emulators

```powershell
cd E:\Graduation_Project2_GitHub\networking-fundamentals\backend
firebase emulators:start
```

Expected output:

```
Detected demo project ID "demo-networking-p1"
Authentication  0.0.0.0:9099
Functions       0.0.0.0:5001
Firestore       0.0.0.0:8080
All emulators ready!
```

The Emulator Hub stays on `127.0.0.1:4400`. Guests/phones never need it.

---

## 5. Run the Flutter app against the emulator

```powershell
cd E:\Graduation_Project2_GitHub\networking-fundamentals\mobile
flutter run -d RKGYC042G6T --dart-define=FIREBASE_EMULATOR_HOST=192.168.1.3
```

`FIREBASE_EMULATOR_HOST` defaults to `127.0.0.1`, which is only correct for the
desktop/emulator-on-the-same-machine case.

Current LAN facts (verified): laptop `192.168.1.3`, phone `192.168.1.4`,
gateway `192.168.1.1`. Check `ipconfig` before each session — the laptop address
changes between networks.

The Android manifest carries `android:usesCleartextTraffic="true"` because the
emulators speak plain HTTP; without it the device reports
`Cleartext HTTP traffic to <host> not permitted`.

### Fallback when Wi-Fi is unavailable

`adb reverse` maps the device's loopback onto the laptop, so the default host
works over USB and no LAN binding is needed:

```powershell
adb reverse tcp:9099 tcp:9099
adb reverse tcp:8080 tcp:8080
adb reverse tcp:5001 tcp:5001
flutter run -d RKGYC042G6T      # no --dart-define
```

---

## 6. Verification commands

Reachability from the laptop:

```powershell
Test-NetConnection 192.168.1.3 -Port 9099 -InformationLevel Quiet
Test-NetConnection 192.168.1.3 -Port 8080 -InformationLevel Quiet
```

Reachability from the phone (ICMP is blocked by Windows Firewall, so test TCP,
not `ping`):

```powershell
adb shell "echo -n '' | nc -w 3 192.168.1.3 9099 && echo OPEN || echo CLOSED"
adb shell "echo -n '' | nc -w 3 192.168.1.3 8080 && echo OPEN || echo CLOSED"
```

Accounts present in the Auth emulator:

```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-networking-p1/accounts:query" `
  -Headers @{ Authorization = "Bearer owner" } `
  -ContentType "application/json" -Body "{}"
```

The `/emulator/v1/projects/<id>/accounts` path only supports `DELETE` in this
version; listing uses `accounts:query` above.

Proof that the real rules are loaded (and not a deny-all stub):

| Request (unauthenticated) | Expected |
|---|---|
| `/v1/projects/demo-networking-p1/databases/(default)/documents/users/fake-uid` | `403 PERMISSION_DENIED` with a rule line reference |
| `/v1/projects/demo-networking-p1/databases/(default)/documents/system/publishedContentVersion` | `404 NOT_FOUND` (the rule allowed the read, the document is missing) |

A deny-all ruleset would answer `403` for both.

---

## 7. Known gaps

- **No profile provisioning yet.** N2-04 declares `users/{uid}` as
  "backend creates" (`allow create: if false`), and the owner may only update
  `displayName` and `preferredLanguage` while `status == "active"`. The current
  Register screen only calls Firebase Auth, so a signed-up user has **no**
  `users/{uid}` document. Provisioning has to be added server-side before any
  profile or progress feature is built.
- **`functions` has no emulator wiring in Flutter yet.**
  `lib/core/firebase/firebase_bootstrap.dart` redirects Auth and Firestore only;
  `FirebaseFunctions.instance.useFunctionsEmulator(...)` is missing, so callable
  or function calls would go to the production endpoint.
- **Emulator data is in memory.** Restarting the emulators clears Auth users,
  Firestore documents and fixtures. Re-seed with
  `npm run fixtures:seed` from `backend/functions` when needed.
