# Spielraum

Private Budget-App (PWA) mit drei Bereichen: Monat (Plan und Käufe), Sparen (Rücklagen und Ziele), Jahr (zwölf Monate, Verträge, Rückblick).

- **App:** https://spielraum-k7.rotkehlchen42.workers.dev/ (Cloudflare). Die GitHub-Pages-Adresse ist eine zweite Kopie mit eigenem, leerem Datenbereich.
- **Datenschutz:** Alle Eingaben bleiben im Browser des jeweiligen Geräts. Dieses Repository enthält nur den Programmcode, keine Finanzdaten. Kein Server, keine Analyse- oder Tracking-Dienste.
- **Technik und Arbeitsregeln:** siehe `00-START-HIER.md`, `CLAUDE.md` und `docs/`.
- **Veröffentlichung:** Änderungen kommen über einen Branch und Pull Request. Jeder Pull Request wird automatisch getestet (`npm test`, `npm run check`). Nach dem Merge auf `main` veröffentlicht Cloudflare den Ordner `dist/` (wenn mit dem Repository verbunden, Konfiguration `wrangler.jsonc`), sonst per ZIP-Upload.

Backups (`spielraum-backup*.json`) gehören nicht in dieses Repository.
