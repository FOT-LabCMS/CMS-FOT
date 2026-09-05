# CMS-FOT Drag-and-Drop Preview Issue — Root Cause Analysis

> Read-only investigation — no code changed. Every claim is tagged **PROVEN** (from repo files/logs), **LIKELY** (strong inference), or **REQUIRES SERVER VERIFICATION** (needs VPS access).

## 1. Executive Summary

On localhost, drag-and-drop image/PDF upload previews correctly inside the app. On the VPS (`192.248.50.135`) the uploaded file **opens in a new browser tab** instead.

The provable core issue: `frontend/.env.production` has `VITE_API_BASE_URL=http://192.248.50.135:5001` — **missing the `/api` path** that the dev file has (`http://localhost:5001/api`). Every URL builder (`getChemicalImageUrl`, `getInstrumentImageUrl`, `getSdsUrl`) and the axios client just concatenate `VITE_API_BASE_URL` with a stored relative path. On localhost the result coincidentally matches the backend `/api/uploads` mount; on production it doesn't. But since the app *works* end-to-end on the VPS, the deployed bundle **cannot** have been built from this repo's current `.env.production` → the deployed build is stale/mismatched, and a web-server layer (likely nginx) serving uploaded files directly is the most plausible cause of the raw "new tab" render.

Fix priority: align env to `...:5001/api`, rebuild + redeploy frontend, ensure backend runs `HEAD` (`/api/uploads`), then verify — before any code changes.

## 2. Methodology
1. Read all frontend/backend `.env*` files.
2. Read all URL-builder + preview UI code.
3. Read backend server/middleware/storage/controllers.
4. Searched repo for nginx/`*.conf`/`deploy.sh`/`ecosystem`/`Dockerfile` — **none exist in the repo**.
5. Inspected git history of `server.js` and the deploy workflow.
6. Inspected VS Code `.history` env snapshots.
7. Tagged every claim.

## 3. Environment Comparison (PROVEN)

**Frontend `HEAD`:**
- `.env.development` → `VITE_API_BASE_URL=http://localhost:5001/api`
- `.env.production` → `VITE_API_BASE_URL=http://192.248.50.135:5001` (no `/api`)

**Backend `HEAD`:**
- `.env.development` → `NODE_ENV=development`, `UPLOADS_DIR=./uploads`, `FRONTEND_URL=http://localhost:5173`
- `.env.production` → `NODE_ENV=production`, `UPLOADS_DIR=/home/cmsadmin/CMS-FOT/backend/uploads`, `FRONTEND_URL=http://192.248.50.135:5173`

The absolute prod `UPLOADS_DIR` matches `storageService.js` resolution and is **not** the bug (§6.4).

## 4. Backend Code Trace (PROVEN)
- `server.js:85` — `app.use("/api/uploads", express.static(getUploadsRoot()))` → files served at **`/api/uploads`**, not `/uploads`.
- All routers mounted under `/api/*` (lines 93–102).
- `uploadMiddleware.js` — field-routed dirs (`sds`/`images`/`instruments`), generated filenames (`chemical-|sds-|instrument-<ts>-<rand><ext>`), MIME+extension filters, 10 MB limit.
- DB stores **relative** paths only: `ChemicalController.js:114` `imageUrl=/uploads/images/<file>`, `:119` `sdsStorageKey=<filename>`; `InstrumentsController.js:87` `/uploads/instruments/<file>`. Full URLs are assembled by the frontend.

## 5. Frontend Code Trace (PROVEN)
- `axiosInstance.js:4-8` — `baseURL = VITE_API_BASE_URL` exactly. **If `/api` is missing, every API call 404s** (server mounts at `/api/*`).
- `chemicalImage.js:16`, `instrumentImage.js`, `sds.js:23` (`${BASE}/uploads/...`) — all concat base + relative path.
- Preview UI: images → inline `<img>` + modal (`ChemicalCard.jsx:63`, `ChemicalDetails.jsx:448,635,828`); drag-drop previews use `blob:` URLs (`AddChemical.jsx:401`, `EditChemicalModal.jsx:1033`) — **environment-independent**. SDS Preview is `<a target="_blank">` in both `ViewSdsLibrary.jsx:217` and `ChemicalDetails.jsx:726` — **new tab by design**.

## 6. Proven Findings
- **§6.1** Base-URL inconsistency between dev and prod env files.
- **§6.2** URL asymmetry:
  - Dev → `http://localhost:5001/api/uploads/...` ✔ matches mount
  - Prod (repo env) → `http://192.248.50.135:5001/uploads/...` ✘ (axios → `.../chemicals` ✘ too)
- **§6.3 Deduction by contradiction:** a deployed bundle built from this repo's `.env.production` would break the *entire* app (no `/api` in axios base). Since uploading works, the deployed bundle is **not** from this repo's current env. It was built with `/api`, or a proxy rewrites paths.
- **§6.4** `UPLOADS_DIR` absolute path is correct/consistent — not the cause.
- **§6.5** Git history: uploads static route flipped within ~1hr on Sep 4, 2026 — `2e9b1f0`→`/api/uploads`, `732cae1`(merge)→`/uploads`, `a7691aa`→`/api/uploads` (HEAD). The VPS backend may differ from HEAD.
- **§6.6** The only "uploaded file → new tab" code path is the SDS **Preview** link. Images never open new tabs in current code. **If images open in a new tab on the VPS, the deployed bundle predates the blob-preview/image-modal code** (commits `92a1c5e`, `b46a03a`).

## 7. Likely Findings
- **§7.1** Stale/mismatched deployed frontend build (from §6.3 + §6.5 + §6.6).
- **§7.2** A web-server layer (nginx) maps `/uploads/*` to the uploads directory or proxies `:5001` non-`/api` paths → browser opens raw files in a new tab. Most plausible mechanism for the exact symptom.
- **§7.3** Historical/translated URLs on old records — minor, not primary.

## 8. Requires Server/Browser Verification
Blocking a 100% confident statement (no secrets needed):
1. `/home/cmsadmin/deploy.sh` (from `.github/workflows/deploy.yml`) — which `VITE_API_BASE_URL` is used at `vite build`?
2. VPS nginx config — any `location /uploads/`? proxying of `/`→`:5173` / non-`/api`→filesystem?
3. Deployed commits/build timestamps: `git rev-parse HEAD`, `ls -la dist/assets`, service start time.
4. DevTools Network — exact preview request URL, status, `Content-Type`, `Content-Disposition`.
5. `curl -I` variants: `/api/uploads/...`, `/uploads/...`, `/` origin — which returns 200 and headers.
6. Filesystem check: file exists under `/home/cmsadmin/CMS-FOT/backend/uploads/...`.

## 9. Recommended Fix Plan (no changes made)
1. **§9.1 (highest-value):** set `frontend/.env.production` → `VITE_API_BASE_URL=http://192.248.50.135:5001/api`; rebuild + redeploy.
2. **§9.2:** redeploy backend on `HEAD` so static mount is `/api/uploads`; `curl -I .../api/uploads/sds/<file>` → 200 + correct `Content-Type`.
3. **§9.3 (code, later):** have backend return canonical URLs (e.g. `/api/uploads/...`) instead of relative paths; centralize URL building; guard the `/api` segment.
4. **§9.4 (design):** make SDS preview behavior explicit — keep new-tab (correct URL) or move to in-app authenticated-blob PDF viewer (like `downloadSdsFile`).
5. **§9.5 Verification checklist:** rebuild; re-test drag-drop on chemical/instrument/SDS; confirm `/api/uploads/...` in Network; no new-tab for images; SDS preview valid; backend `npm test` + frontend `npm run build` green.

## 10. Repository Gaps
No nginx/`deploy.sh`/`ecosystem`/`Dockerfile`/`dist` committed. `docs/CAMPUS_DEPLOYMENT.md` is empty. Deploy workflow only calls `bash /home/cmsadmin/deploy.sh` — build-time env logic lives outside the repo.

## 11. Information Requests (VPS owner; nothing sensitive)
deploy.sh contents (or the build-time env), nginx site config, deployed commits/timestamps, the exact preview URL + status seen in DevTools. Do **not** share `DATABASE_URL`/`JWT_SECRET`/`SMTP_PASSWORD` — note these are already committed in env files and should be rotated (out of scope here).

## 12. TL;DR
Production `VITE_API_BASE_URL` omits `/api`, so preview URLs target `/uploads/...` instead of real `/api/uploads/...`. Since the app still works on the VPS, the **deployed bundle doesn't match this repo**, and the raw new-tab render is most likely from a web-server serving uploaded files directly. Confirm via §8, then apply §9.1 + §9.2 as the minimal safe fix, then §9.5.