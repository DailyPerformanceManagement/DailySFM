# DailySFM — Independent Development Workspace

This is the separate Lean / Shop Floor Management workspace owned by DailyPerformanceManagement.

## Safety
- **Original Claude repository:** https://github.com/DailyPerformanceManagement/DPM
- **Upstream snapshot:** `267b7ec96800f87b0860d003b69793f700917b82`
- This repository is for **independent development**, not direct edits to the original.
- The B+K Supabase production database must **never** be connected from this workspace.
- The original DPM code is kept only as a read-only reference until its Supabase connections and authentication are safely migrated.
- Browser-only prototype data is not synchronized to production.

## Modules being integrated
- Daily management KPIs: Sicherheit, Qualität, Liefertreue, Produktivität, Nacharbeit, Lagerbestand
- Claude's `projekte.html` improvement-project workspace and help images
- Six Sigma: Pareto, correlation, regression, hypothesis tests, normality, process capability, PFMEA

## Deployment
Deploy only this independent repository. Do not connect the original production database.
