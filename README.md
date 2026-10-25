# DailySFM — Independent Lean & Six Sigma development dashboard

**Working repository:** https://github.com/DailyPerformanceManagement/DailySFM

**Original Claude repository (read-only source):** https://github.com/DailyPerformanceManagement/DPM

**Original source commit:** `267b7ec96800f87b0860d003b69793f700917b82`

## Included

- `index.html` — **independent** DailySFM KPI prototype with six daily-management KPIs, problem-solving, measures, projects and meetings. This is NOT the exact original Claude index.html; it is a deliberately isolated interface, currently loaded with fictional example data.
- `projekte.html` — Claude's standalone improvement-project module, copied byte-for-byte from the original repository at the source commit.
- `six-sigma.html`, `six-sigma.css`, `six-sigma.js` — editable Six Sigma Studio with dataset columns, CSV import/export, Pareto, correlation, regression, hypothesis tests, normality, capability and PFMEA.
- `hilfe/README.md` — links to 18 help screenshots in the original repository, pinned to the source commit. **The binary screenshots themselves have not yet been copied.**

## Isolation — important

- Neither Claude's original `DPM` repository nor the production **B+K Supabase** database has been modified.
- The runnable pages are intentionally **not connected to any Supabase project**; login/cloud-saving features are disabled.
- Demo projects and edits save to **browser localStorage only**. They will not synchronize between devices. Use the exported JSON/CSV backups before clearing browser data.
- The original production `index.html` is NOT published here because its authentication and database configuration refer to the B+K environment. A private exact source snapshot is stored separately in the EACS Supabase `dpm_lab` schema.

## Start

Open `index.html` through a static HTTP server (e.g. `python3 -m http.server 8000`) or configure GitHub Pages. Then navigate to `projekte.html` or `six-sigma.html`. The lab currently has **no published GitHub Pages URL**.

## Later steps

1. Create an isolated development backend with its own credentials and row-level security.
2. Replace the local demo storage with authenticated database storage.
3. Migrate the original Claude cockpit module without importing production B+K connections.
4. Test each integration before considering a release.

Never push or copy B+K secret API keys, access tokens or customer production records into this public repository.
