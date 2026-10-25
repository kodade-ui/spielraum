# Spielraum 3.5.5 · Sparraten belasten das Budget des Folgemonats

Stand: 25. Oktober 2026 · Auslöser: Fehlerbericht des Nutzers. Ein Notgroschen-Posten, der Ende November vom Gehalt abgeht, belastete das November-Budget; der Dezember wirkte zu frei. 3.5.3 und 3.5.4 hatten das falsch gelöst, weil sie die Sparen-Summen um einen Monat verschoben haben. Die Summen waren aber richtig.

## Regel (vom Nutzer bestätigt)
- Ein Sparposten steht im Monat der Überweisung. Eine feste Rate im November geht Ende November vom neuen Gehalt ab.
- Das neue Gehalt ist für den Folgemonat. Darum **belasten feste Raten das Budget des Folgemonats**: Die November-Rate zählt im Dezember.
- Einmalige Einzahlungen zwischendurch gehen vom laufenden Geld ab und belasten ihren eigenen Monat.
- Das Gehalt im Planmonat Oktober ist das Gehalt von Ende September (unverändert).

## Was sich ändert
- **Sparen:** Die Summen sind wieder wie in 3.5.2. Groß steht „Anfang Monat“ (Monatsanfang plus Ein- und Auszahlungen zwischendurch), klein „Ende Monat“ (plus die festen Raten des Monats). Je Rücklage und je Ziel stehen beide Werte. Raten starten standardmäßig wieder im laufenden Monat („erste Überweisung Ende Okt“).
- **Monat:** Unter Sparen stehen die Raten, die dieses Budget belasten („Überweisung Ende September“). Ausgegraut darunter stehen die Raten, die Ende des Monats abgehen und für den Folgemonat zählen.
- **„Noch frei“, Kontostand, Jahr, Kostenvorschau beim Festlegen einer Rate:** Alle nutzen die neue Regel.
- **Jahreskosten:** Bis zur Zahlung zählen die Raten der Vormonate. Die höhere Rate läuft bis zum Monat vor der Zahlung, ab dem Zahlungsmonat die normale.

## Technisch
- `planner.js`: neu ist `budgetSavings(s,m)` (feste Raten aus m−1 plus einmalige aus m). `totals().saving` nutzt sie, damit auch `reconcileMonth`, `forecast` und Kontostand.
- `savings-ui.js`: Zeitlogik wie 3.5.2 (`during`), Darstellung „Anfang/Ende“ aus 3.5.4. `costText` rechnet ab dem Folgemonat.
- `sinking.js`: `sinkingOptions` zählt Raten bis zum Vormonat der Zahlung. `laterStart` ist der Zahlungsmonat, `firstLater` der erste volle Zyklus.
- `month-ui.js`: Die Sparliste nutzt `budgetSavings`, dazu die anstehenden Raten.
- Tests an die Regel angepasst. Service-Worker-Cache `v3-12`. Keine Datenänderung, keine Migration.

## Geprüft
- `npm test` mit 63 Fachtests und `npm run check`. Dazu der UI-Ablauf mit 16 Blöcken, darin: Eine Rate belastet den Folgemonat, eine Einzahlung den eigenen Monat. Sparen „Anfang“ enthält die Einzahlung, „Ende“ zusätzlich die Rate. Der Monat zeigt „Überweisung Ende …“ und „zählt für …“.
- Fiktive Daten: Die Sparen-Summen entsprechen wieder genau denen von 3.5.2.
