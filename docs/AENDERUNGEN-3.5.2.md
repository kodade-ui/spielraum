# Spielraum 3.5.2 · Sparen: Stand im Monat und am Monatsende

Stand: 24. Oktober 2026 · Auslöser: Rückmeldung des Nutzers. In 3.5 galt „heute“ nur für den laufenden Monat, ab November erschien wieder der Monatsende-Stand.

- **In jedem Monat gleich:** Groß steht der **Stand im Monat**, klein darunter der **Stand am Monatsende**. Das gilt für die Rücklagen insgesamt, für jede Rücklage (Zusatz „Ende …“ in der Zeile), für die Ziel-Kacheln und für beide Blätter.
- **Stand im Monat** = Monatsanfang plus einmalige Einzahlungen minus Entnahmen. Was Du zwischendurch einzahlst, zählt sofort.
- **Stand am Monatsende** = zusätzlich die festen, wiederkehrenden Sparraten, die mit dem Gehalt am Monatsende kommen.
- Ein kurzer Hinweis unter den Rücklagen erklärt beides.
- **Technisch:** `during()` in `savings-ui.js` rechnet aus den Bewegungen von `reserveSummary`. Die Rechenlogik der Töpfe ist unverändert. Service-Worker-Cache `v3-9`, keine Datenänderung.
- **Geprüft:** `npm test` mit 62 Fachtests und dem UI-Ablauf (16 Blöcke), darin neu: Eine Einzahlung zählt sofort, die feste Rate erst zum Monatsende, und beides erscheint auch im Folgemonat. Dazu `npm run check` und Screenshots für Oktober und November.
