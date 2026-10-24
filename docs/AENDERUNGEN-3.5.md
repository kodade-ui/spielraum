# Spielraum 3.5 · Kontostand geschätzt, Sparen zeigt „heute“

Stand: 24. Oktober 2026 · Auslöser: Wünsche des Nutzers.

## Was sich für Dich ändert

- **Monat: „Auf dem Konto, geschätzt“.** Im laufenden Monat steht unter „Noch frei“, wie viel gerade auf dem Konto sein müsste. Die Rechnung: Einnahmen des Monats minus allem, was Du als bezahlt abgehakt oder als Kauf erfasst hast.
  - Ein Tipp zeigt den Rechenweg. Erst kommt der Kontostand, dann was davon noch gebunden ist (offene Rechnungen, Rest in den Budgets, Sparen am Monatsende). Was übrig bleibt, ist genau „Noch frei“.
  - Das ist kein echter Kontostand. Was Du nicht einträgst, fehlt hier.
  - In vergangenen und künftigen Monaten wird nichts angezeigt, weil „jetzt“ dort keinen Sinn ergibt.
- **Sparen: im laufenden Monat der Stand von heute.** Deine Sparraten zahlst Du mit dem Gehalt am Monatsende ein. Darum zeigen Rücklagen, Balken, Anteile und Ziele im laufenden Monat den Stand zu Monatsbeginn, überschrieben mit „Rücklagen · heute“.
  - Ein kurzer Hinweis unter den Rücklagen erklärt das und nennt den Stand Ende des Monats.
  - In den Blättern steht beides: „heute“ und „Ende Oktober: …“.
  - In anderen Monaten bleibt es beim Stand Ende des Monats.

## Technisch

- `month-ui.js`: neu sind `cash(r)` (= `availableIncome − actualTotal`) und das Blatt `month-cash`. Der Rechenweg geht genau auf: Kontostand − offene Rechnungen − Rest in Budgets − Sparen = `afterOpen`.
- `savings-ui.js`: neu sind `isNow`, `atNow` (Stand = `opening` im laufenden Monat), der Hinweis `sv-info` und die doppelte Angabe in den Blättern. Die Rechenlogik (`reserveSummary`, `goalProgress`) ist unverändert.
- Service-Worker-Cache `v3-7`. Keine Datenänderung, keine Migration.

## Geprüft

- `npm test`: 62 Fachtests. UI-Ablauf mit 16 Blöcken, darin neu:
  - der Rechenweg geht auf;
  - der Kontostand erscheint nur im laufenden Monat;
  - Sparen zeigt „heute“ mit Hinweis, im Folgemonat „Ende“ ohne Hinweis.
- `npm run check` ohne Befund.
- Chromium 390 px hell und dunkel, 360 px hell, fiktive Daten: keine Seitenfehler, kein horizontales Scrollen.

## Grenzen

- Einmalige Einzahlungen und Entnahmen im laufenden Monat zählen im Stand „heute“ noch nicht mit. Er ist der Monatsbeginn.
- Der Kontostand kennt nur, was Du einträgst.
