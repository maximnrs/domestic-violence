# Evidence Feature Progress

## Phase 2 Status

Implemented read-only mobile Case browsing and incident evidence metadata display.

This read-only phase remains complete. It does not implement playback, voice recording, photo capture, or video capture.

## Written-Note Mobile Phase Status

Implemented the mobile written-note capture and readable display phase:

- Home `Written Note` quick-capture now opens a written-note route.
- The written-note route loads `GET /cases/me`, lists incidents for the singleton Case, loads `GET /evidence-types/`, and requires incident selection before upload.
- Users can create a minimal Incident with real `IncidentCreate` fields when no suitable Incident exists.
- The app resolves `evidence_type_id` from `type_name === "written_note"` and never hard-codes a numeric evidence type ID.
- Note text is written to a temporary UTF-8 `.txt` file with `expo-file-system/legacy`, uploaded as multipart `file`, and then cleaned up from cache.
- Successful upload navigates to the associated incident detail route with a refresh parameter so evidence metadata is fetched again.
- Incident detail identifies written notes through evidence-type lookup, downloads only the opened note, decodes hex bytes as UTF-8, and preserves metadata rows when download/decryption fails.

No voice recording, microphone permissions, audio upload/playback, photo capture, video capture, token persistence, or new cache/state library was added.

## Backend Evidence Contract Phase Status

Implemented backend contract work needed before mobile evidence capture can be safely built:

- Added authenticated evidence type lookup: `GET /evidence-types/`.
- Added stable required type names for deployed evidence type records:
  - `written_note`
  - `voice_audio`
- Secured `POST /evidence/` so incident ownership is verified before reading uploaded file bytes.
- Replaced the placeholder timestamp implementation with an RFC 3161 timestamp authority request for the SHA-256 digest of uploaded evidence bytes.
- Uploads now fail before encryption/storage when the trusted timestamp authority is offline, unreachable, times out, or rejects the request.
- Evidence metadata now persists the base64 DER timestamp token, authority URL, status, hash algorithm, message imprint, and nonce.
- Added an idempotent PostgreSQL migration script for the new evidence timestamp columns.
- Repaired evidence download for new uploads so AES-256-GCM encrypted object bytes can be decrypted and returned as hex-encoded original bytes.
- Added focused backend tests for evidence type lookup, upload authorization, download authorization, metadata-only schema behavior, and text/binary encryption round trips.

No mobile written-note UI, mobile recording UI, upload integration, playback, or file download integration was implemented in that backend phase; written-note mobile work was added afterward as described above.

## Files Changed

- `mobile-app-frontend/domestic-violence-app/services/api.ts`
  - Added typed `CaseResponse`, `IncidentResponse`, `EvidenceResponse`, evidence type/download/upload DTOs, and API methods for Case, Incident, Evidence, evidence types, multipart upload, and evidence download.
- `mobile-app-frontend/domestic-violence-app/app/_layout.tsx`
  - Added the `written-note` stack route.
- `mobile-app-frontend/domestic-violence-app/app/(tabs)/_layout.tsx`
  - Replaced the second tab route from Timeline to Case.
- `mobile-app-frontend/domestic-violence-app/app/(tabs)/index.tsx`
  - Wired the existing `Written Note` quick-capture tile to `/written-note`.
- `mobile-app-frontend/domestic-violence-app/app/(tabs)/case.tsx`
  - Added the `My Case` screen.
  - Fetches the singleton Case and its incidents.
  - Renders incidents as tappable folder-like rows.
- `mobile-app-frontend/domestic-violence-app/app/(tabs)/timeline.tsx`
  - Removed static Timeline placeholder screen.
- `mobile-app-frontend/domestic-violence-app/app/incidents/[incidentId].tsx`
  - Added incident detail route.
  - Fetches incident metadata and evidence metadata.
  - Loads evidence types and expands written-note evidence items on demand by downloading and decoding content.
- `mobile-app-frontend/domestic-violence-app/app/written-note.tsx`
  - Added written-note creation, incident association, minimal incident creation, evidence-type lookup, temp text-file upload, recoverable error handling, and discard confirmation.
- `mobile-app-frontend/domestic-violence-app/package.json`
  - Added `expo-file-system`.
- `mobile-app-frontend/domestic-violence-app/package-lock.json`
  - Locked the Expo SDK-compatible file-system package.
- `docs/codex/evidence-feature-progress.md`
  - Tracks this implementation phase and remaining blockers.

## API Methods And Routes Used

- `getMyCase()` -> `GET /cases/me`
  - Retrieves the authenticated user's singleton Case.
- `listIncidents(caseId)` -> `GET /incidents/?case_id=<case_id>`
  - Lists incidents only after `case_id` is returned by `/cases/me`.
- `getIncident(incidentId)` -> `GET /incidents/{incident_id}`
  - Refreshes real incident metadata on the detail route.
- `listIncidentEvidence(incidentId)` -> `GET /evidence/?incident_id=<incident_id>`
  - Lists evidence metadata for the selected incident.
- `createIncident(payload)` -> `POST /incidents/`
  - Creates an Incident inside the authenticated singleton Case when the note flow needs one.
- `getEvidenceTypes()` -> `GET /evidence-types/`
  - Authenticated lookup for persisted evidence type rows.
  - Mobile must resolve `evidence_type_id` by `type_name`, not by hard-coded numeric ID.
- `uploadEvidence(payload)` -> `POST /evidence/`
  - Multipart upload route.
  - Sends `incident_id`, resolved `evidence_type_id`, and `file`; the helper does not set JSON `Content-Type`.
- `downloadEvidence(evidenceId)` -> `GET /evidence/{evidence_id}/download`
  - Returns `{ status, message, data }`, where `data` is hex-encoded original decrypted bytes for authorized evidence.

## Written-Note Incident Association

The written-note screen does not assume or hard-code a Case ID. It calls `GET /cases/me`, then `GET /incidents/?case_id=<case_id>`.

If incidents exist, the user selects one from real Incident metadata. If no Incident exists, or the user chooses to create a new one, the screen uses `POST /incidents/` with supported fields only: `case_id`, `incident_date`, `incident_time`, `location`, `incident_type`, and `description`. The created Incident is selected automatically and the pending note text remains intact.

## Written-Note Upload And Display

Before upload, mobile calls or reuses `GET /evidence-types/` and resolves the row where `type_name === "written_note"`. If that row is missing, the screen shows a recoverable server-configuration error and does not upload.

The note body is stored in the uploaded file, not in `description`. The app writes the current note text to a temporary UTF-8 `.txt` file through `expo-file-system/legacy`, uploads it as multipart `file` with `text/plain`, and removes the cache file after the attempt. Upload failure preserves the note text for retry.

Incident detail still renders evidence metadata without downloading file bodies. Written-note rows are labelled only when their `evidence_type_id` matches the backend-provided `written_note` type. Opening one row calls `GET /evidence/{evidence_id}/download`, decodes response `data` from hex to UTF-8, and displays the text inline. Download or decode failure shows an inline recoverable error while keeping the metadata visible.

## Singleton Case Consumption

The mobile app does not show case selection or multi-case management.

The Case tab calls `GET /cases/me`. When a Case is returned, the screen uses that Case's `case_id` to fetch incidents. If the Case endpoint fails, returns no usable Case, or reflects legacy duplicate data through an API error, the screen shows a recoverable error state and does not choose a Case client-side.

## Navigation And Evidence Listing

The bottom tab previously labelled `Timeline` now appears as `Case`. The Case screen heading is `My Case`.

Incident rows navigate to `/incidents/[incidentId]`. The detail screen fetches the selected incident and then fetches evidence metadata for that incident.

Evidence records are rendered with neutral metadata only:

- `file_name`, or `Evidence item` fallback;
- `created_at`;
- RFC 3161 timestamp status/authority when present;
- neutral `evidence_type_id` display;
- `description`, when present;
- optional location/device/IMEI/activation metadata when populated.

The UI does not infer Written Note, Voice Recording, photo, video, or other evidence kind labels.

## Authentication / Session Limitation

The app still stores the bearer token only in memory via `setAuthToken()` in `services/api.ts`.

Authenticated Case, incident, and evidence metadata requests work after login in the same runtime session. A full app reload loses the token, so these read-only screens may show an API error until the user logs in again. No session persistence mechanism was added in this phase.

## Validation

Validation commands should be run from `mobile-app-frontend/domestic-violence-app`.

Results from this phase:

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- No test script is defined in `package.json`.
- `npm install expo-file-system@~19.0.22`: timed out, but the dependency declaration and lockfile hoist completed; installed package resolved to `19.0.23` with package range `~19.0.22`.
- A second longer npm install retry was declined, so no additional install command completed.

Backend validation results from the evidence contract phase:

- `python -m pip install -r backend\requirements.txt`: passed after approval; installed backend dependencies into the user Python environment.
- `python -m pip install email-validator==2.3.0`: passed after approval; added missing dependency required by existing `EmailStr` schemas.
- `python -c "... compile(...)"` from `backend`: passed with `syntax ok`.
- `python -m pytest -p no:cacheprovider tests\test_evidence_contract.py tests\test_cases.py` from `backend`: passed, `13 passed, 6 warnings`.
- No repository migration validation was available because no migration framework or migration directory exists.

## Remaining Evidence Blockers

- Voice recording/upload is not implemented in mobile.
- Audio playback is not implemented in mobile.
- Photo/video capture and upload are not implemented in mobile.
- Mobile must use `GET /evidence-types/` and resolve IDs from `written_note` and `voice_audio`.
- Deployed databases still need deterministic `evidencetype` seed rows for `written_note` and `voice_audio`; no repository seed/migration framework exists. Written-note upload remains a runtime configuration error if `written_note` is missing.
- Evidence download/decryption is repaired for new uploads, but legacy evidence uploaded before the GCM tag was stored may not decrypt.
- Existing deployed databases may require a migration to enforce Case uniqueness at the database layer.
- This written-note implementation was validated locally by lint/typecheck only; no live deployed API upload/download was claimed.
- Backend tests now run locally after installing dependencies, but deployment/CI should still run them in the target backend environment.
