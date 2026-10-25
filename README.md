# DailySFM — Claude DPM copy, connected to EACS

**Published dashboard:** https://dailyperformancemanagement.github.io/DailySFM/

**Source repository (this independent project):** https://github.com/DailyPerformanceManagement/DailySFM

**Original Claude source (read-only):** https://github.com/DailyPerformanceManagement/DPM

**Frozen upstream commit:** `267b7ec96800f87b0860d003b69793f700917b82`

## What this project actually is

- `index.html` is **the original Claude KPI Cockpit** (same dashboard layout, charts, daily KPI workflows, PDCA and problem solving), rebuilt from the pinned upstream commit by `scripts/import_dpm.py`.
- Its **B+K Supabase client, publishable key, production host and login startup are removed** by the importer. It cannot reach the B+K database.
- The original `projekte.html` improvement-project module is copied byte-for-byte from Claude. All 18 original screenshots are available under `hilfe/`.
- The extra `six-sigma.html` studio provides editable datasets/columns, statistical tools and PFMEA.

## EACS cloud storage (not B+K)

Project: **EACS / lean-command-center**, Frankfurt (`eu-central-1`)

Supabase URL: `https://gibsgwfuvuxfgicpvybm.supabase.co`

- Original KPI Cockpit -> `public.dailysfm_workspaces` (private user-owned JSONB snapshots)
- Six Sigma Studio -> `public.sigma_projects` (separate user-owned records)
- Both use Supabase Authentication + row-level security. **Only the browser-safe publishable key** is bundled into frontend code, never any service-role secrets.
- `supabase/eacs_dailysfm_workspaces.sql` documents the database table and its four RLS policies (already applied to EACS).

## How to use

1. Open the [DailySFM KPI Cockpit](https://dailyperformancemanagement.github.io/DailySFM/).
2. In the bottom status strip choose **EACS anmelden** and sign in with an **EACS account**, or register a new one.
3. If email confirmation is required, confirm it and return to the dashboard. You may need to add the published DailySFM URL to EACS **Auth → URL Configuration → Redirect URLs**, depending on your email setup.
4. After sign-in, the original cockpit begins a **new, empty EACS workspace**. Any old browser demo measurements are backed up locally, *not automatically imported* into EACS.
5. Daily KPI changes are automatically saved to the EACS table. Use **Jetzt speichern** to trigger an immediate save.
6. In [Six Sigma Studio](https://dailyperformancemanagement.github.io/DailySFM/six-sigma.html), sign in with the same EACS account to manage cloud projects.

## Known limitations / safety

- The original DPM application was built for a **different B+K schema**. This first EACS bridge saves/restores the original cockpit's overall local state as an authenticated snapshot; it does **not** migrate its numerous underlying B+K tables, chat/calendar integrations, user roles or notifications to EACS.
- The original DPM dashboard contains fictional starting values in **guest/demo mode**. They do not silently become cloud data. A newly authenticated EACS workspace starts empty.
- Browser storage can contain a local offline backup; signed-in state is private in EACS but browser data should still be protected on shared computers.
- The public app does **not** query or mutate production B+K data.
- Authentication, signup email confirmation and cross-device cloud persistence require an actual EACS user account to test end to end. CI currently tests simulated sign-in/save behavior and database policy/grant configuration. It does not create users or write test data to the EACS project.

## Testing and reproducibility

- The `restore-dpm.yml` GitHub Actions workflow fetches the pinned Claude source, checks its Git blob SHA, removes the B+K client, runs syntax and Playwright smoke tests, and commits the resulting site **only into DailySFM**.
- `scripts/eacs-smoke.cjs` checks both EACS save pathways with mocked auth/network (no production writes).
- `scripts/import_dpm.py` retains the original UI while changing the cloud connection. It is safe to rerun because the pinned SHA is checked.
- To develop locally: `python3 scripts/import_dpm.py`, then `python3 -m http.server 8000`.

Original `DPM` and B+K are intentionally left untouched.
