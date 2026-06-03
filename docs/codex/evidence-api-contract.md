# Case and Evidence API Contract

Source of truth: backend source under `backend/app`; Swagger UI is deployed at `https://api-evisafe.thijsvdweijer.nl/docs`; deployed base URL is `https://api-evisafe.thijsvdweijer.nl/`.

## Repository Paths Inspected

- Root: `README.md`; no `AGENTS.md` found; no root `package.json` found.
- Mobile app: `mobile-app-frontend/domestic-violence-app/package.json`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/timeline.tsx`, `app/login.tsx`, `app/register.tsx`, `services/api.ts`, `app.json`, reusable components under `components/`.
- Backend: `backend/app/main.py`, `controllers/auth.py`, `controllers/cases.py`, `controllers/incident.py`, `controllers/evidence.py`, `models/schemas.py`, `models/incident.py`, `models/evidence.py`, `models/evidencetype.py`, `services/auth.py`, `services/case.py`, `services/incident.py`, `services/evidence.py`, `services/metadata.py`, `services/encryption.py`, `core/storage.py`.

## Mobile Patterns To Preserve

- Expo Router is used. Root stack starts at `login`, then `register`, `(tabs)`, and `modal`.
- Tabs are configured in `app/(tabs)/_layout.tsx`: Home `index`, Timeline, Plan, Resources, Settings; `explore` is hidden with `href: null`.
- Home screen quick-capture UI is static placeholder data only. Voice Note, Photo & Video, and Written Note cards do not navigate yet.
- API access is centralized in `services/api.ts` with plain `fetch`, JSON defaults, `EXPO_PUBLIC_API_URL` base URL, and an in-memory bearer token.
- Current auth/session behavior is not persistent: `login()` stores the access token in a module variable via `setAuthToken()`, then `router.replace('/(tabs)')`.
- No React Query, cache library, global state store, AsyncStorage, SecureStore, media permissions, `FormData`, camera, image picker, or audio recording dependency is currently implemented.
- Existing UI style is React Native `StyleSheet`, Manrope fonts, `@expo/vector-icons`/Ionicons, `Pressable`, `ScrollView`, `SafeAreaView`, and local reusable components such as `AuthInput`.

## Authentication Contract

- Login: `POST /auth/login`
  - JSON body: `{ "email": string, "password": string }`
  - Response: `{ "access_token": string, "token_type": "bearer" }`
  - Errors: `401` with `detail` for invalid credentials or disabled account.
- Register: `POST /auth/register`
- Current user: `GET /auth/me`
- Protected routes require `Authorization: Bearer <access_token>`.
- JWT includes `sub` user ID and `email`; default expiry is `ACCESS_TOKEN_EXPIRE_MINUTES`, currently 30 minutes in backend config.
- Auth errors from dependency: `401` invalid/expired token, `404` user not found, `403` account disabled.

## Singleton Case Contract

Product invariant: each authenticated user should own exactly one permanent Case. The mobile app must not present case selection, case switching, or multi-case management.

Backend contract after the singleton update:

- `POST /auth/register` creates the user and a default Case titled `"My Case"` in the same registration flow.
- `GET /cases/me` is the mobile retrieval endpoint for the authenticated user's Case.
- `GET /cases/me` returns `CaseResponse` when exactly one Case exists, `404` when no Case exists, and `409` when existing duplicate Case rows are detected.
- `POST /cases/` remains available for repair/manual creation when a user has no Case, but returns `409 Conflict` if the user already owns a Case.
- `GET /cases/` remains as a compatibility endpoint and returns zero or one item; it returns `409 Conflict` instead of silently selecting from duplicate existing data.
- The `Case.user_id` model is marked unique for newly created schemas. Existing deployed databases still need an explicit migration or cleanup if duplicate Case rows already exist.

Mobile should obtain `case_id` by calling `GET /cases/me`, then use that `case_id` for `GET /incidents/?case_id=<case_id>`.

## Incident Endpoints

There are no existing mobile incident client methods. Add them in `services/api.ts` or a nearby API module using the same bearer-token request helper.

- List incidents for a case: `GET /incidents/?case_id=<number>`
  - Response: `IncidentResponse[]`
  - Error: `404` `Case not found or access denied`
- Retrieve one incident: `GET /incidents/{incident_id}`
  - Response: `IncidentResponse`
  - Error: `404` `Incident not found` or case access denial.
- Create incident: `POST /incidents/`
  - JSON body: `IncidentCreate`
  - Response: `IncidentResponse`
  - Error: `404` `Case not found or access denied`
- Update incident: `PUT /incidents/{incident_id}`
  - JSON body: `IncidentUpdate`
  - Response: `IncidentResponse`

`IncidentCreate`:

```ts
type IncidentType =
  | 'verbal'
  | 'physical'
  | 'psychological'
  | 'financial'
  | 'sexual'
  | 'stalking'
  | 'other';

type IncidentCreate = {
  case_id: number;
  incident_date?: string | null; // date, YYYY-MM-DD
  incident_time?: string | null; // time, HH:mm:ss-compatible
  location?: string | null;
  incident_type?: IncidentType | null;
  description?: string | null;
};
```

`IncidentResponse`:

```ts
type IncidentResponse = {
  incident_id: number;
  case_id: number;
  incident_date: string | null;
  incident_time: string | null;
  location: string | null;
  incident_type: IncidentType | null;
  description: string | null;
  creation_date: string;
};
```

## Evidence Endpoints

There are no existing mobile evidence client methods.

- List evidence types: `GET /evidence-types/`
  - Authenticated read-only endpoint.
  - Response: `EvidenceTypeResponse[]`.
  - Mobile must resolve type IDs by stable `type_name`; do not hard-code numeric IDs.
- List evidence for an incident: `GET /evidence/?incident_id=<number>`
  - Response: `EvidenceResponse[]`
  - Error: `404` `Evidence not found or access denied` only if service raises; otherwise an empty list is possible.
- Retrieve one evidence record: `GET /evidence/{evidence_id}`
  - Response: `EvidenceResponse`
  - Error: `404` `Evidence not found or access denied`
- Upload evidence: `POST /evidence/`
  - Content type: `multipart/form-data`
  - Response: `EvidenceResponse`
  - Error: `400` for backend `ValueError`; `422` for missing/invalid multipart fields.
- Download evidence: `GET /evidence/{evidence_id}/download`
  - Response: `{ "status": "success", "message": "Evidence file ready for download", "data": string }`, where `data` is hex-encoded bytes.

`EvidenceResponse`:

```ts
type EvidenceResponse = {
  evidence_id: number;
  incident_id: number;
  user_id: number;
  evidence_type_id: number;
  file_name: string;
  evidence_location: string | null;
  evidence_imei: string | null;
  evidence_device: string | null;
  evidence_activation: string | null;
  file_path: string;
  file_hash: string;
  created_at: string;
  description: string | null;
};
```

`EvidenceTypeResponse`:

```ts
type EvidenceTypeResponse = {
  evidence_type_id: number;
  type_name: string;
  description: string | null;
};
```

## Multipart Upload Contract

Route: `POST /evidence/`

Required multipart fields:

- `incident_id`: integer form field.
- `evidence_type_id`: integer form field.
- `file`: uploaded file field. Backend reads all bytes with `await file.read()` and stores `file.filename`.

Optional multipart fields:

- `evidence_location`: string.
- `evidence_imei`: string.
- `evidence_device`: string.
- `evidence_activation`: string.
- `description`: string.

Before reading `file`, encrypting bytes, writing object storage data, or creating evidence metadata, the backend now verifies that `incident_id` resolves to an Incident whose Case is owned by the authenticated user. Inaccessible or nonexistent incidents return `404` using the existing incident error convention. Upload processing failures after authorization return `400`.

Backend does not inspect `file.content_type`, file extension, or uploaded MIME type. No source-level accepted audio MIME list exists. No source-level size limit exists beyond FastAPI/server/proxy infrastructure.

## Written Notes

There is no dedicated JSON endpoint for written/text notes and no `note_text` field. Written notes must use the generic evidence upload route as file-backed evidence:

- Create a text file/blob on the client.
- Encode note files as UTF-8 bytes.
- Upload it as multipart field `file`.
- Send `incident_id`, `evidence_type_id`, and optional metadata fields above.
- Use `description` only as metadata; do not rely on it as the persisted note body unless the backend/API owner confirms that behavior.

The response shape is `EvidenceResponse`.

## Voice/Audio Evidence

There is no dedicated voice endpoint. Voice recordings must use `POST /evidence/` with:

- `file`: the recorded audio file.
- `incident_id`: target incident ID.
- `evidence_type_id`: numeric evidence type ID for voice/audio.
- Optional metadata fields listed above.

Supported audio MIME types are not declared or validated in backend source. The server currently accepts any uploaded file through FastAPI `UploadFile`.

## Evidence Types

- Database model: `evidencetype` with `evidence_type_id`, `type_name`, `description`.
- Schema exists: `EvidenceTypeResponse`.
- Controller route now exposes persisted evidence types through `GET /evidence-types/`.
- Stable backend-defined `type_name` values required for mobile evidence capture:
  - `written_note`: written/text note evidence.
  - `voice_audio`: voice/audio recording evidence.
- Mobile must call `GET /evidence-types/` after authentication and resolve the required `evidence_type_id` by `type_name`.
- Mobile must not hard-code numeric IDs.
- No seed/migration file with deployed IDs was found in the repository. Because no established migration/seed tooling exists, deployed databases must be seeded out-of-band with at least the two stable records above. If either record is missing from the lookup response, mobile capture should remain disabled or show a configuration error.

## Incident Association

Evidence is associated to an incident during upload through required multipart field `incident_id`. There is no separate association route.

The backend now verifies incident access before evidence payload processing. `POST /evidence/` calls the existing incident ownership path before reading the uploaded file; only authorized incidents proceed to encryption/storage/metadata creation. Retrieval/listing still filters evidence by `Evidence.user_id`.

## Evidence Download Contract

`GET /evidence/{evidence_id}/download` returns:

```ts
type EvidenceDownloadResponse = {
  status: 'success';
  message: string;
  data: string; // hex-encoded original decrypted bytes
};
```

For authorized evidence, the backend now retrieves the matching encryption row by `evidence_id`, downloads encrypted object bytes from storage, retrieves the AES key by stored key reference, and decrypts AES-256-GCM data. New uploads store object bytes as `ciphertext || 16-byte GCM tag`, allowing text and binary file round trips.

Unauthorized evidence download remains rejected through `metadata.get_evidence()`.

Known compatibility limitation: evidence uploaded before this repair may not decrypt if the stored object lacks the GCM authentication tag. No destructive migration was added for existing evidence objects.

## Cache, State, Navigation Reuse

- Continue using Expo Router navigation (`router.push`, `router.replace`) and tab/stack files for screens or modals.
- Keep API helpers centralized and typed in/near `services/api.ts`.
- Because no cache library exists, implement mutation refresh with local component state and explicit refetch after create/upload, or introduce a cache library only as a deliberate architecture decision.
- If adding uploads, `apiRequest()` must be adapted or a separate helper must avoid forcing `Content-Type: application/json`; React Native `FormData` should allow multipart boundaries to be set by `fetch`.
- Session persistence is missing. If Phase 2 needs data after app reload, add a deliberate token storage approach such as SecureStore before relying on authenticated fetches at app startup.
- Media capture will need new Expo dependencies and permission handling; none are present in `package.json`/`app.json`.

## Missing Capabilities / Blockers

- Evidence type lookup endpoint exists, but deployed databases still need required `written_note` and `voice_audio` seed rows.
- No dedicated written-note endpoint or note text DTO.
- No dedicated audio endpoint.
- No MIME-type validation or accepted-audio contract in source.
- No explicit upload size limits in source.
- No mobile upload helper, media permissions, audio recording package, camera/image picker package, persistent auth session, or cache/state library.
- Existing deployed databases may require Case uniqueness migration/cleanup; no migration framework exists in the repository.
- Public Swagger UI exists, but the repo source is the only inspected source of exact implementation details.

## Recommended Implementation Sequence

1. Seed deployed evidence types with `written_note` and `voice_audio`, then resolve IDs through `GET /evidence-types/`.
2. Add mobile upload helpers only after resolving type IDs from the authenticated lookup endpoint.
3. Add typed mobile models and API methods for cases/incidents/evidence, preserving bearer auth and base URL behavior.
4. Add a multipart upload helper that does not set JSON `Content-Type`.
5. Add or choose session persistence, then authenticated refetch behavior after app reload.
6. Implement incident list/detail/create flow first.
7. Implement written-note capture by creating/uploading a text file through generic evidence upload.
8. Add audio recording dependency, app permissions, and upload voice files through generic evidence upload.
9. Refetch local incident/evidence state after create/upload and update Home/Timeline placeholder data to real API data.

## Phase 2 Readiness

Phase 2 read-only Case and incident evidence metadata browsing is complete. Mobile written-note submission and voice upload can proceed after the deployed API includes the new backend changes and the deployed database has `written_note` and `voice_audio` evidence type rows. Evidence file playback/access remains separate from upload and should use the repaired download endpoint only after validating deployed storage/decryption behavior.

## Phase 1B Blocker Resolution

### Case ID and My Case Flow

Authenticated case endpoints are implemented and ownership-scoped:

- `GET /cases/`
  - Compatibility list endpoint.
  - Returns zero or one case for the authenticated user.
  - Returns `409 Conflict` if existing duplicate case rows are detected.
  - Response: `CaseResponse[]`.
- `GET /cases/me`
  - Preferred mobile endpoint for the authenticated user's singleton Case.
  - Response: `CaseResponse`.
  - Error: `404` if no case exists; `409` if duplicate case rows already exist for the user.
- `GET /cases/{case_id}`
  - Returns one owned case.
  - Error: `404` with `detail: "Case not found"` if not found or not owned.
- `POST /cases/`
  - Creates a case for the authenticated user.
  - Body: `CaseCreate`.
  - Response: `CaseResponse`.
  - Error: `409` with `detail: "User already has a case"` if the user already owns a case.
- `PUT /cases/{case_id}`
  - Updates one owned case.

`CaseCreate`:

```ts
type CaseCreate = {
  case_title: string;
  description?: string | null;
  status?: string | null; // backend default: "open"
};
```

`CaseResponse`:

```ts
type CaseResponse = {
  case_id: number;
  user_id: number;
  case_title: string;
  description: string | null;
  creation_date: string;
  status: string | null;
};
```

The confirmed product invariant is now singleton Case: each user should have exactly one permanent Case that contains that user's Incidents and Evidence. New registrations create a default `"My Case"` automatically. The `cases.user_id` model field is marked unique for newly created schemas, and the service prevents duplicate creation through the API. Incidents still require a valid owned `case_id`; `IncidentCreate.case_id` is required and `incident_service.create_incident()` verifies case ownership before creating an incident.

Smallest correct mobile UX for "My Case":

1. After authenticated entry to the app, call `GET /cases/me`.
2. Use the returned `case_id` to call `GET /incidents/?case_id=<case_id>`.
3. If `/cases/me` returns `404`, the account is missing its Case; show a controlled empty/error state or call `POST /cases/` only if the product keeps manual repair creation enabled.
4. If `/cases/me` returns `409`, duplicate historical Case rows exist; do not choose one client-side. Show a support/data-cleanup state.

Case browsing can proceed safely as a read-only mobile phase because `/cases/me` is authenticated and ownership-scoped. Incident listing can also proceed safely when the `case_id` comes from `GET /cases/me`.

### Evidence Type IDs

Narrow evidence-type discovery found no reliable source for deployed IDs, so a lookup endpoint was added:

- No seed scripts, migrations, SQL dumps, admin scripts, test fixtures, startup initialization, or environment setup files defining `evidencetype` rows were found in the repository.
- No mobile constants define evidence type IDs.
- Backend has `EvidenceType` and `EvidenceTypeResponse`.
- `GET /evidence-types/` exposes persisted evidence type records.

Known status:

- Written/text note evidence type ID: must be resolved from `type_name === "written_note"`.
- Voice/audio evidence type ID: must be resolved from `type_name === "voice_audio"`.

Do not invent or hard-code IDs in mobile code. A deployed database seed operation is required before written-note submission or voice upload can be production-safe.

Smallest correct backend solution:

- Use the authenticated read-only evidence type lookup endpoint: `GET /evidence-types/`.
- Add the required seed rows through the deployment/database process because no repository migration/seed framework exists.
- Mobile should select by stable `type_name`, not by hard-coded numeric ID.

### Written-Note Retrieval and Display

The download endpoint returns decrypted file bytes as hex for authorized evidence:

- `GET /evidence/{evidence_id}/download`
- Controller calls `evidence_service.download_evidence(...)`.
- Controller returns `data: file_bytes.hex()`.

The repaired backend path:

- `evidence_service.download_evidence()` verifies the evidence belongs to the authenticated user.
- It queries `Encryption` by `evidence_id`.
- It downloads encrypted bytes from storage.
- It retrieves the AES key by stored key reference.
- It decrypts AES-256-GCM `ciphertext || tag` bytes and returns original bytes as hex in JSON.

Recommended mobile behavior for a UTF-8 written note is:

1. Fetch incident evidence metadata with `GET /evidence/?incident_id=<id>`.
2. Render the incident-detail evidence list from metadata only: `file_name`, `created_at`, `description`, and `evidence_type_id`/resolved type name.
3. Do not download every text note body for the list. Download note contents only when the user opens a written-note item.
4. On open, call `GET /evidence/{evidence_id}/download`, read JSON `data`, convert hex to bytes, then decode bytes as UTF-8 text.
5. Treat `description` as metadata. It may contain a short app-provided preview if the mobile app intentionally sends one, but it must not be treated as the authoritative note body unless the backend contract changes to say so.

Compatibility note: older stored objects created before the GCM tag was stored may not be decryptable.

### Evidence Upload Authorization

The upload authorization issue has been fixed:

- `POST /evidence/` authenticates the user.
- Before `file.read()`, it resolves `incident_id` via `incident_service.get_incident(db, current_user.user_id, incident_id)`.
- That path verifies the Incident belongs to a Case owned by the authenticated user.
- Only after authorization does the backend read, encrypt, store, and persist evidence metadata.

Minimal backend remedy:

- Inaccessible incidents return `404` with the existing incident error detail.
- Upload failures after authorization return `400`.

Do not rely on mobile-visible incidents as the only authorization guard; server-side verification is now part of the upload lifecycle.

### Revised Readiness Decision

- Read-only Case screen: can proceed. Use `GET /cases/me`; handle `404` as missing setup data and `409` as duplicate data requiring cleanup.
- Incident-detail evidence listing: can proceed for metadata listing when the incident comes from an owned case flow. Use `GET /evidence/?incident_id=<id>`; do not download note/audio contents in the list.
- Written-note submission: backend is structurally ready after deployment if `written_note` exists in `GET /evidence-types/`; mobile must encode note files as UTF-8 and resolve the ID by `type_name`.
- Readable written-note display: backend download path is repaired for new uploads; validate deployed storage/decryption and handle legacy pre-repair objects that may not decrypt.
- Voice recording upload: backend is structurally ready after deployment if `voice_audio` exists in `GET /evidence-types/`; MIME/size expectations remain undefined by backend source.
- Voice/audio playback or file access: download returns original bytes as hex, but mobile playback/file access remains a separate phase.
