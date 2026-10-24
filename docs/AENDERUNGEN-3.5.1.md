# Spielraum 3.5.1 · Kontostand: Sparen sofort abziehen

Stand: 24. Oktober 2026 · Auslöser: Rückmeldung des Nutzers zu 3.5.

- **Geschätzter Kontostand:** Die Sparraten werden jetzt gleich am Anfang abgezogen. Sie gehen sofort mit dem Gehalt weg und stehen nie im Monatsbudget. 3.5 hatte sie fälschlich erst zum Monatsende abgezogen, dadurch war der Kontostand um die Sparraten zu hoch.
- **Rechenweg:** Einnahmen − Sparen − schon bezahlt und ausgegeben = auf dem Konto, geschätzt. Davon noch gebunden: offene Rechnungen und Rest in den Budgets. Was übrig bleibt, ist „Noch frei“.
- **„Noch frei“** bleibt unverändert, ebenso die Anzeige „heute“ bei Sparen.
- **Veröffentlichung:** Die App liegt jetzt unter https://kodade-ui.github.io/spielraum/ und wird nach jedem Merge automatisch veröffentlicht. Die Cloudflare-Konfiguration (`wrangler.jsonc`) ist entfernt.
- Service-Worker-Cache `v3-8`. Keine Datenänderung.
- **Geprüft:** `npm test` (62 Fachtests, UI-Ablauf 16 Blöcke, Rechenweg mit Sparraten), `npm run check`.
