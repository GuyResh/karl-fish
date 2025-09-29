## Karl Fish — Product Requirements Document (PRD)

Version: 1.0  
Last updated: 2025-09-29

### Overview
Karl Fish is an offline-first fishing logbook with cloud sync, social sharing via friendships, and multi-platform deployment (GitHub Pages and Vercel). Data is stored locally (IndexedDB) and synced to Supabase (Postgres + Auth + RLS). Users manage sessions and catches, collaborate with friends, and export via file or email.

#### Goals
- Fast, reliable session logging across devices
- Offline-first with eventual consistency
- Controlled sharing (private, friends, public)
- Simple deployments and serverless email exports

#### Non-Goals
- Real-time multi-user editing
- Heavy GIS analytics (future)

#### Key Technologies
- React + Vite + TypeScript
- IndexedDB (Dexie)
- Supabase (Postgres, Auth, RLS)
- Vercel Serverless (Node, Nodemailer)
- Deploy: GitHub Pages, Vercel

---

### User Roles & Auth
- Anonymous: must register to use the app
- Authenticated: full features
- Auth via Supabase email/password; email confirmation required
- Post-signup modal clearly instructs to confirm email

---

### Core Flows
#### Registration & Sign-in
- Register with email, password, name (normalized on submit: trim + collapse internal spaces)
- Confirmation modal appears after signup
- Sign in after confirming email

#### Sessions & Catches
- Create/edit/delete sessions; sessions store catches inline (JSON)
- Fields (session_data JSON): id, date/time, location {lat, lon, description}, catches[], shared flag -> mapped to privacy_level

#### Sharing & Friends
- Friendship states: stranger, pending_sent, pending_received, friend, blocked
- Actions: send request, accept, block, unfriend, unblock
- UI reflects state with icons and tooltips

#### Sync
- Debounced, single in-flight `isSyncing` lock
- Bidirectional, timestamp-based resolution (newer source wins)
- Batch uploads (size 100), minimal API calls
- Force Download (cloud -> local), Clear Local, Clear All (local + cloud)

#### Import/Export
- Import local file (JSON/CSV)
- Export to file (download) or server-side email via Vercel API

---

### UI Specification (Panels)
#### Header
- Shows first word of `profile.name` (fallback: username or email)
- Auth controls

#### Dashboard
- Recent Sessions list; empty-state with fish icon and CTA
- Stats: total sessions, total catches (from sessions[].catches)
- Listens for `dataCleared` and `dataUpdated` events to refresh

#### Sessions List
- CSS grid with 2 columns, consistent alignment
- Location: lat and lon shown on separate lines with fixed width; description wraps
- Catches count aligned with coords column width

#### Share
- Anglers list (all users except current)
- Friendship UI per user:
  - Stranger: grey UserPlus (click to request)
  - Pending Sent: yellow badge (not clickable)
  - Pending Received: green Check (Accept), red X (Block)
  - Friend: green Users + grey Unfriend
  - Blocked: red X + grey Unblock
- Uses `FriendService` for actions; reloads state after change

#### Transfer
- Share button: triggers `DataSyncService.forceSync()`
- Export: Download (client), Email (server API; server fetches sessions)
- Recipient defaults to authenticated user email
- Data Management: Clear Local, Force Download, Clear All — all via `ConfirmModal` with requiresCount=3

#### Settings
- Edit `name` (spaces normalized on submit)

#### Auth Modal
- Register/Login flows; post-register email confirmation modal with OK

---

### Data Model (Supabase)
#### Tables
- **profiles**: id (uuid), username (text, unique), name (text), location (text)
- **sessions**: id (uuid), user_id (uuid fk), session_data (jsonb), privacy_level (text), updated_at (timestamptz)
  - Unique index: (user_id, (session_data->>'id')) as idx_sessions_user_session_id
- **friendships**: id (uuid), requester_id (uuid), addressee_id (uuid), status (pending|accepted|blocked)
  - Unique: (requester_id, addressee_id)
- **friend_permissions**: user_id, friend_id, can_view_sessions, can_view_catches, can_view_location
  - Unique: (user_id, friend_id)

#### Functions & Triggers (idempotent schema)
- **handle_new_user()** — insert into profiles on auth.users insert
- **update_updated_at_column()** — generic updated_at trigger
- **get_profile_with_email(user_id)**
- Triggers: on_auth_user_created, update_sessions_updated_at
- Schema script drops dependent triggers/functions before create

#### RLS (indicative)
- **sessions**: user can CRUD rows where user_id = auth.uid(); reads may allow public for privacy_level='public'
- **friendships**: requester/addressee can manage relevant rows
- **friend_permissions**: user-scoped

### IndexedDB (Dexie)
- Local store for sessions (catches nested)
- `FishingDataService`: CRUD, `clearAllSessions`, `clearAllUserData`, stats from sessions[].catches
- Events dispatched for UI refresh

### Sync Architecture
#### Upload
- `DataSyncService.syncAllData()` guarded by `isSyncing`, debounce in `App.tsx`
- `SharingService.uploadSessions()` in batches of 100
- Existing check via lookup by JSON id; upsert: include DB id for updates, omit for inserts

#### Download
- When no local data or cloud newer
- Save to IndexedDB; strip cloud-only fields

#### Conflict Resolution
- Compare cloud `updated_at` vs local `updatedAt`/`date`; newer wins

---

### Email Export (Vercel API)
- Endpoint: /api/send-export-email (Node ESM)
- CORS enabled for GH Pages
- Body: { userEmail, format }
- API fetches sessions via Supabase admin user lookup; sends via Nodemailer (SMTP)
- Uses SMTP_* env; also reads VITE_SMTP_* if present

---

### Deployment
#### Vite Build
- vite.config.ts dynamic base via mode or VITE_BASE_PATH
- Scripts: build:vercel (production), build:github (github-pages)

#### GitHub Pages
- .github/workflows/deploy.yml runs build:github
- Set VITE_BASE_PATH=/karl-fish
- App calls Vercel API via absolute URL

#### Vercel
- vercel.json uses build:vercel
- Serverless functions in /api (send-export-email.js)
- Custom domain via Vercel dashboard (DNS + project link)

#### Supabase
- Host Postgres/Auth
- Apply db/supabase-schema.sql (idempotent; drops + creates)
- Configure RLS and policies

---

### Environment Variables
#### Frontend (Vite)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_BASE_PATH (/, /karl-fish)

#### Server/API (Vercel or local dev)
- SMTP_SERVER
- SMTP_PORT (587 recommended)
- SMTP_USERNAME
- SMTP_PASSWORD
- SMTP_FROM (email or "Name <email>")

---

### Error Handling
- Email API: robust error parsing for non-JSON; clear messages
- Sync: handle 403 (RLS), 409 (duplicate key) with batch logic and filtering
- UI: destructive actions via ConfirmModal (requiresCount=3)

---

### Security & Privacy
- RLS enforces per-user access
- Minimize PII; `name` and `username` only; email handled by Supabase
- Sharing governed by `privacy_level` and `friend_permissions`

---

### Known Issues
- Supabase REST onConflict with JSON path not supported; workaround implemented
- Large initial uploads can be lengthy; batching mitigates

---

### Roadmap
- Real-time notifications for friendship changes
- Map/heatmap analytics
- Photos/media for catches
- Background sync & conflict UI

---

### QA Checklist
- Registration name normalization and email confirm modal
- Sessions grid 2-column layout and location formatting
- Sync runs once per load; batches of 100; no duplicate keys
- Friendship actions reflect correct roles and states
- Export download and email work; CORS ok from GH Pages
- Dashboard updates on dataCleared/dataUpdated