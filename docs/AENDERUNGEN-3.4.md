# Spielraum 3.4 · Sparen: Rücklagen zuerst

Stand: 9. Oktober 2026 · Auslöser: Rückmeldung des Nutzers zu 3.3. Er will zuerst die Rücklagen sehen und sie sollen sich klar von den Zielen unterscheiden. Eine Grafik soll zeigen, wie viel insgesamt und wie viel pro Topf da ist, ohne Verlauf.

## Was sich für Dich ändert

- **Sparen beginnt mit den Rücklagen.** Ganz oben steht, wie viel insgesamt in Deinen Rücklagen liegt (Ende des gewählten Monats).
- Darunter zeigt ein Balken die Aufteilung: Jeder Topf hat ein Stück, so lang wie sein Anteil, und eine eigene Farbe.
- Darunter stehen die Töpfe als Zeilen mit Farbpunkt, Betrag und Anteil in Prozent, nach Größe sortiert. Ein Tipp öffnet den Topf wie bisher.
- Danach folgen die **Ziele** als Kacheln mit Ring, unverändert.
- Ganz unten steht eine Zeile mit dem Geld in Zielen, dem, was diesen Monat in Töpfe geht, und dem, was frei ist.
- Die Farbe gehört zum Topf, nicht zu seiner Größe. Wächst ein Topf an einem anderen vorbei, behält er seine Farbe. Ab dem siebten Topf werden die übrigen grau als „Weitere“ zusammengefasst.

## Technisch

- `savings-ui.js`: neue Funktion `reserves()` mit Gesamtsumme, Balken und Zeilen. Die Rücklagen-Kacheln und der alte Kopfbereich „Angespart“ sind entfernt.
- `app.css`: Tokens `--pot-1` bis `--pot-6` und `--pot-rest`, hell und dunkel. Mit dem Dataviz-Validator geprüft:
  - hell gegen #fffefb, dunkel gegen #18201d
  - alle Prüfungen bestanden
  - benachbarte Paare: Farbschwäche ΔE ≥ 9, normales Sehen ≥ 17
  - Kontrast ≥ 3 : 1
- Service-Worker-Cache `v3-6`. Keine Datenänderung, keine Migration.

## Geprüft

- `npm test`: 62 Fachtests. UI-Ablauf mit 15 Blöcken, neu darin: Rücklagen vor Zielen, Gesamtstand, Balken erst ab zwei Rücklagen, Anteil in Prozent.
- `npm run check` ohne Befund.
- Chromium 390 px hell und dunkel, 360 px hell, fiktive Daten mit vier Rücklagen: keine Seitenfehler, kein horizontales Scrollen.

## Grenzen

- Ein Topf mit 0 € oder weniger hat kein Stück im Balken, steht aber in der Liste.
- Kein Test auf Deinem Handy.
