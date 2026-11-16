# Backend API Contract — v1

**Owner:** Developer A (backend)
**Audience:** Developer B (Flutter), both developers during defense preparation
**Machine-readable companion:** [`openapi.yaml`](./openapi.yaml)
**Status:** matches the currently implemented and tested backend (N1-06..N1-09 verified; content-read section updated by N3-01).

---

## 1. Versioning decision (recorded, N1-11)

- The MVP contract is **version 1**.
- The success/error envelope intentionally has **no `schemaVersion` field** and **no correlation ID**.
- Adding either is a **contract change**, not an implementation detail: it must be agreed by both developers and covered by regression tests before adoption.
- Within the MVP, changes are **additive or internal**. Any change that removes/renames a field, changes a status code, or changes an error `code` string requires a documented decision here first.

## 2. Transport and base URLs

| Environment | Base URL |
|---|---|
| Local emulator (host machine) | `http://127.0.0.1:5001/demo-networking-p1/us-central1` |
| From the Android device over LAN (N7) | `http://<laptop-LAN-IP>:5001/demo-networking-p1/us-central1` |

- Project ID: `demo-networking-p1` (emulator-only demo project).
- All endpoints are **GET-only**.
- Every response sets `Cache-Control: no-store`.
- A `405` response also sets `Allow: GET`.
- `127.0.0.1` is correct for the laptop only. The phone must use the laptop's LAN IP (N7-01).

## 3. Response envelopes

Every response is exactly one of these two shapes. No other top-level keys exist.

**Success**
```json
{
  "success": true,
  "data": {}
}
```

**Failure**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource."
  }
}
```

`success` is the discriminator. Clients must not read `data` when `success` is `false`, and must not read `error` when it is `true`.

## 4. Error catalog

| `error.code` | HTTP | Canonical message | When it occurs |
|---|---|---|---|
| `UNAUTHENTICATED` | 401 | A valid Bearer token is required. | No `Authorization` header, or not exactly `Bearer <token>` |
| `INVALID_TOKEN` | 401 | The authentication token is invalid. | Token supplied but rejected (invalid, expired, revoked, disabled account) |
| `FORBIDDEN` | 403 | You do not have permission to access this resource. | Authenticated but not a current holder of the required role; live role ≠ token role; disabled account; account deleted |
| `METHOD_NOT_ALLOWED` | 405 | Only GET requests are supported. | Any verb other than GET (HTTP method is checked before authentication) |
| `AUTH_SERVICE_UNAVAILABLE` | 503 | Authorization service is temporarily unavailable. | Unexpected failure while reading the current user record |

`message` is human-readable and may be displayed, but **clients must branch on `code`**, never on `message` text.

## 5. Endpoints

### 5.1 `GET /health` — public

No authentication.

`200`
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "networking-backend"
  }
}
```

`405` → error envelope with `METHOD_NOT_ALLOWED`.

### 5.2 `GET /me` — verified identity

Requires `Authorization: Bearer <Firebase ID token>`.

`200`
```json
{
  "success": true,
  "data": {
    "uid": "verified-uid-example"
  }
}
```

- `uid` always comes from the verified token. Sending `?uid=` or a UID header has **no effect** (tested).
- `401` → `UNAUTHENTICATED` or `INVALID_TOKEN`
- `405` → `METHOD_NOT_ALLOWED`

### 5.3 `GET /studentAccess` — Student role only

Requires a verified token whose **live** Firebase Auth role is `student`.

`200`
```json
{
  "success": true,
  "data": {
    "uid": "verified-uid-example",
    "role": "student"
  }
}
```

- `401` → `UNAUTHENTICATED` / `INVALID_TOKEN`
- `403` → `FORBIDDEN`
- `405` → `METHOD_NOT_ALLOWED`
- `503` → `AUTH_SERVICE_UNAVAILABLE`

### 5.4 `GET /adminAccess` — Admin role only

Same rules as `/studentAccess`; the successful payload contains `"role": "admin"`.

**Role rules (tested behavior):**
- Student → Student endpoint: allowed.
- Student → Admin endpoint: `403`.
- Admin → Admin endpoint: allowed.
- Admin → Student endpoint: `403` (roles are strict, not hierarchical).
- No role / unknown role (e.g. `teacher`): `403`.
- Role removed after the token was issued: old token → `403`.
- Student promoted after the token was issued: old token → `403` until the token is refreshed.
- Disabled account: `401` `INVALID_TOKEN`.
- Role/UID supplied via query string or custom headers: ignored.

## 6. Flutter client contract (Developer B)

1. **Token handling**
   - Obtain the ID token from Firebase Auth and send `Authorization: Bearer <idToken>`.
   - Never send `uid`, `role`, or any authorization flag in query strings or custom headers.
   - On `401`, refresh the token once and retry; if it still fails, sign the user out and route to login.

2. **Parsing**
   - Parse into a sealed result: `ApiSuccess<T>` / `ApiFailure`.
   - Switch on `success`; only then read `data` or `error`.
   - Switch on `error.code` for behavior; use `message` for display.

3. **Status handling**

| Status | Client behavior |
|---|---|
| 200 | Use `data` |
| 401 | Refresh token once → retry → otherwise sign out |
| 403 | Show permission message; do not retry |
| 405 | Treat as a client bug; log it, do not retry |
| 503 | Show "service unavailable"; retry with backoff, never loop |
| Network error | Treat as offline; official operations are online-only |

4. **No caching** — protected responses are `no-store`; do not persist them.

5. **Suggested Dart shape** (illustrative; naming is Developer B's choice)
```dart
sealed class ApiResult<T> {
  const ApiResult();
}

final class ApiSuccess<T> extends ApiResult<T> {
  final T data;
  const ApiSuccess(this.data);
}

final class ApiFailure extends ApiResult<Never> {
  final String code;
  final String message;
  final int status;
  const ApiFailure(this.code, this.message, this.status);
}
```

6. **Guest mode** — guests never call `/me`, `/studentAccess`, or `/adminAccess`; protected actions must show the registration call-to-action.

## 7. Verification evidence

The contract above is enforced by automated tests (run after `npm run build`):

```powershell
cd E:\Graduation_Project2\networking-fundamentals\backend
node --test .\tests\api-contract.http.test.mjs .\tests\auth.http.test.mjs .\tests\health.http.test.mjs .\tests\firestore.rules.test.mjs .\functions\tests\api-contract.test.cjs .\functions\tests\authorization.http.test.cjs
```

Last recorded result: **43/43 passing** (Authorization 16, Auth 6, Health 5, Firestore-deny-all 4, API unit 7, API HTTP 5), plus `npm run build` and `npm run lint` clean. This is the N1 subset; the current full gate is **177/177** (N2 suites included) plus **11/11** catalog tests.

The unit tests fail if the envelope gains an undocumented field, if a status/message mapping changes, or if a code is added without updating the documented catalog.

## 8. Content reads and explicit non-goals in v1

**Content reads (D-09, recorded at N3-01).** Approved course content is read by the Flutter client through the **Firebase client SDK**, subject to `firestore.rules`. N3 adds **no** Functions read endpoints for courses, lessons, or quizzes.

| Data | Guest | Signed-in student |
|---|---|---|
| `system/publishedContentVersion`, active version metadata | read | read |
| Course metadata (all 6) | read | read |
| Lessons/quizzes in `course-01` | read | read |
| Lessons/quizzes in later courses | deny | read only when own `courseProgress.status != "locked"` |
| `quizBanks/**`, `aiSections/**`, `private/**` | deny | deny |
| `attempts`, `quizState`, `idempotency`, tombstones, `adminAudit` | deny | deny |

Quiz **lists** must include `where("courseId", "==", <courseId>)`; an unconstrained list fails closed by design. Lesson lists are path-scoped, so no `courseId` filter is needed there. The exact read sequence, ordering, and error handling are in [`content-read-n3.md`](./content-read-n3.md). Functions endpoints remain health/auth/role checks in N3. Domain **mutations** (quiz lifecycle, progress, admin publish) arrive in N4+ and will extend this document.

Non-goals:

- No `schemaVersion`, no correlation IDs, no request IDs in public bodies.
- No API pagination, filtering, or bulk endpoints.
- No batch/offline endpoints; official operations are online-only.
