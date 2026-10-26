# DailySFM — Shopfloor Management mit integriertem Six Sigma

**Dashboard:** https://dailyperformancemanagement.github.io/DailySFM/

**Entwicklungsrepository:** https://github.com/DailyPerformanceManagement/DailySFM

## Grundlage

Diese Umgebung nutzt das **originale KPI Cockpit** als Oberfläche und Prozesslogik. Der Quellstand ist fixiert auf dem Commit `267b7ec96800f87b0860d003b69793f700917b82`; der reproduzierbare Import erfolgt über `scripts/import_dpm.py`.

## Arbeitsablauf

1. **Anmelden**: Beim ersten Öffnen erscheint der DailySFM-Anmeldedialog. Wer schon eine gültige EACS-Session besitzt, gelangt direkt ins Cockpit. Die E-Mail-Link-Anmeldung funktioniert ohne neues Passwort; die Zieladresse muss unter EACS Auth Redirect URLs zulässig sein.
2. **Daily Management**: Tageswerte der sechs KPIs erfassen, Trends und Abweichungen bewerten.
3. **Kennzahlen / Problemlösung**: Abweichung präzisieren und Ursache systematisch untersuchen.
4. **Verbesserungsprojekte**: Bestehende Projektansicht beibehalten oder über den zweiten Tab **Six Sigma & PFMEA** öffnen.
5. **Six Sigma**: Kennzahl auswählen, `KPI-Messwerte als neues Analyseprojekt` anklicken, Messwerte im Dateneditor prüfen, Statistik durchführen, PFMEA erfassen, Ergebnis speichern.
6. **Maßnahmen und Wirksamkeit**: Verbesserung / Kontrollphase dokumentieren. Vorhandene Cockpit-Datensätze werden beim Import nicht verändert.

## Native Integration

- `dailysfm-modules.js`, `dailysfm-modules.css`: Navigationseintrag, Projekt-/Six-Sigma-Untertab, Direktlinks von Kennzahlen und Problemlösung, sichere Übernahme gespeicherter Tagesmesswerte.
- `six-sigma.html`, `six-sigma.css`, `six-sigma.js`: Eigener Dateneditor, CSV/JSON, deskriptive Statistik, Pareto, Pearson/Spearman, Regression, Histogramm, Jarque–Bera, t-Tests, ANOVA, Cp/Cpk/Pp/Ppk, I-MR und PFMEA.
- `six-sigma-integrated.css`: Original-Dashboard-kompatible Ansicht innerhalb des Projektmoduls.
- `six-sigma-dpm-context.js`: Eindeutiger DMAIC-Leitfaden und Import der echten gespeicherten KPI-Tagesdaten als neues Analyseprojekt.
- `dailysfm-eacs.js`: Anmeldefenster beim Start und EACS-Cloudspeicherung. Kein störendes schwebendes Statusband.
- `projekte.html`: Unverändertes Verbesserungsprojekt-Modul der Vorlage, weiter über den Portfolio-Tab erreichbar.

## Messdaten und Interpretation

Die 6 KPI-Reihen enthalten **Tagesaggregate**, keine Einzelteilmessungen. Für sinnvolle Six-Sigma-Entscheidungen sind reale Rohmessungen, Messsystembetrachtung und passende Nenner nötig:

- Prozentwerte allein liefern noch keine p-Regelkarte (dazu werden Anzahl fehlerhafter und insgesamt geprüfter Einheiten benötigt).
- Unfälle, Fehlteile und Lagerbestände sind Zähl-/Bestandsdaten; I-MR ist dafür nicht pauschal geeignet.
- Cp/Cpk nur für kontinuierliche Messwerte mit **real festgelegten** oberen/unteren Spezifikationsgrenzen und ausreichender Prozessstabilität interpretieren.
- PFMEA-RPN ist ein einfacher S×O×D-Risikoindikator und **keine normative AIAG-VDA Action-Priority-Klassifikation**.
- Ein Datenimport erzeugt **immer ein neues Six-Sigma-Projekt**; die KPI-Quelldaten bleiben unberührt.
- Tabellen lassen sich beliebig umbenennen und bearbeiten; Messgrößen, Fehlertypen, Schichten, Nenner und Rohmessungen können ergänzt werden.

## Cloud

- Projekt: EACS Supabase, Frankfurt.
- Cockpit: `public.dailysfm_workspaces`, nutzerbezogene Snapshots.
- Studio: `public.sigma_projects`, nutzerbezogene Analyseprojekte.
- Zugang: Supabase Auth; beide Tabellen nutzen Row-Level Security (RLS).
- Das ursprüngliche Cockpit nutzt einen kompakteren Snapshot-Adapter, nicht alle früheren Backends wie Chat, Kalender oder Benachrichtigungen sind schon auf EACS migriert. Bei solchen Modulen werden Einschränkungen angezeigt.

## Qualitätssicherung

GitHub Actions `.github/workflows/restore-dpm.yml` testet vor der Freigabe:

- Quellstand und JavaScript-Syntax
- Browser-Start und Anmeldeseite
- kein sichtbares Statusband
- originale Navigation und Six-Sigma-Einbettung
- sichere Übernahme von KPI-Tageswerten ohne Veränderung der Quell-Messreihe
- Analyse- und PFMEA-Bedienung
- EACS-Speicherpfade mit simulierten Nutzern

Die Browser-Smoke-Tests verwenden **Mock-Authentifizierung**; für einen vollständigen Real-World-Cloudtest braucht es die Sitzung eines echten EACS-Nutzers.
