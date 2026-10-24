# Spielraum

Private Budget-App (PWA) mit drei Bereichen: Monat (Plan und Käufe), Sparen (Rücklagen und Ziele), Jahr (zwölf Monate, Verträge, Rückblick).

- **App:** https://kodade-ui.github.io/spielraum/
- **Datenschutz:** Alle Eingaben bleiben im Browser des jeweiligen Geräts. Dieses Repository enthält nur den Programmcode, keine Finanzdaten. Kein Server, keine Analyse- oder Tracking-Dienste.
- **Technik und Arbeitsregeln:** siehe `00-START-HIER.md`, `CLAUDE.md` und `docs/`.
- **Veröffentlichung:** Änderungen kommen über einen Branch und Pull Request. Jeder Pull Request wird automatisch getestet (`npm test`, `npm run check`); nach dem Merge auf `main` wird `dist/` nur bei bestandenen Tests auf GitHub Pages veröffentlicht.

Backups (`spielraum-backup*.json`) gehören nicht in dieses Repository.
