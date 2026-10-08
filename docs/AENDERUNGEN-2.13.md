# Spielraum 2.13: Änderungen und Prüfungen

Stand: 8. Oktober 2026 · Bearbeitet von Claude · Ausgangsstand: 2.12 (Commit `6897d9da…`, Übergabe von GPT)

Das kleine Paket besteht aus Formatierung und zwei Darstellungsfehlern. Fachlogik, Datenmodell, Speicherschlüssel und PWA-Identität bleiben unverändert.

## 1. Code lesbar formatiert (keine Verhaltensänderung)

- **JavaScript** (alle Dateien unter `dist/`): Bisher standen die Anweisungen in sehr langen Zeilen, jetzt steht jede Anweisung in einer eigenen Zeile mit Einrückung. Ein Formatierer auf Token-Ebene hat nur Leerraum zwischen Tokens verändert. Das ergibt rund 1.060 statt 3.070 Zeilen.
- **CSS** (`planner.css`, `refinement.css`): Jede Regel und jede Deklaration steht jetzt in einer eigenen Zeile.
- **Nachweis, dass sich nichts geändert hat:**
  - Für jede JS-Datei wurde der Syntaxbaum (acorn, ohne Positionsangaben) vor und nach der Formatierung verglichen. Er ist identisch.
  - Chromium hat beide CSS-Fassungen eingelesen und das Ergebnis vollständig serialisiert (1.451 Regeln in `planner.css`). Es ist identisch.
  - Bildschirmfotos aller vier Bereiche und des Startbildschirms bei 390 px vor und nach der Formatierung sind pixelgleich.
- **Grenze:** HTML-Vorlagen in Template-Strings bleiben lange Zeilen, etwa 95 Zeilen über 400 Zeichen. Umbrüche dort würden die erzeugte HTML-Ausgabe verändern, z. B. durch zusätzliche Leerzeichen in Inline-Text.
- In Git ist das ein eigener Commit. Inhaltliche Änderungen sind dadurch getrennt nachvollziehbar.

## 2. Trennzeichen in der Postenliste

- **Fehler:** Auf Handybreite stand dort „WohnenMonatlich“ oder „Abos & VerträgeJährlich“.
- **Ursache:** Die Zeile ist ein Flex-Container. Eine Media-Query in `refinement.css` (max. 760 px) setzte das Trennzeichen auf `display:none`. Dadurch verschmolzen die beiden Textteile zu einem einzigen Flex-Element, und der Abstand (`gap`) griff nicht mehr.
- **Behebung:** Die Ausblenderegel wurde entfernt. Das Trennzeichen ist jetzt einheitlich „·“ statt „/“, passend zu „· am 5.“. Es ist `aria-hidden`, die Beschriftung für Screenreader bleibt unverändert.
- Ergebnis: „Wohnen · Monatlich“, auch auf dem Desktop.

## 3. Nur noch eine Aktionsleiste im Monatsplan (Handy)

- **Vorher:** Bis 760 px gab es oben „Ausgabe anlegen / Einnahme / Rücklage“ und zusätzlich die fixierte Leiste unten mit „Neue Ausgabe / Einnahme“.
- **Jetzt:** Bis 760 px ist die obere Zeile ausgeblendet. Die untere Leiste im Daumenbereich enthält alle drei Aktionen: „+ Ausgabe“, „+ Einnahme“ und „+ Rücklage“. Damit ist „Rücklage“ dort neu.
- Ab 761 px gibt es keine untere Leiste. Dort bleibt die obere Zeile wie bisher.
- Bei großer Schrift bricht die Leiste in zwei Reihen um, statt Text abzuschneiden. Unter 380 px sind Abstände und Schrift etwas kompakter.

## Weitere Änderungen

- Die Service-Worker-Cacheversion wurde von `v2-14` auf `v2-15` erhöht. Die App-Version in „Daten & Backup“ lautet jetzt 2.13, in `package.json` 2.13.0.
- `tests/ui-flow.mjs`: Die Prüfung auf den Text „Neue Ausgabe“ wurde ersetzt. Geprüft wird jetzt, dass die mobile Leiste im Monatsplan die Aktionen `new-expense`, `new-income` und `new-saving` enthält.
- Unverändert sind Speicherschlüssel (`spielraum.v2`), Manifest, Scope, Start-URL, Datenmodell und Rechenregeln.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` (Node 22.22) | 62/62 Fachtests und 13 UI-Ablaufblöcke bestanden |
| `npm run check` | 45 JS-Dateien gültig, Ressourcen vollständig |
| AST-Vergleich JS, CSSOM-Vergleich CSS | identisch (nur für den Formatierungsschritt) |
| Screenshots vor/nach der Formatierung | pixelgleich |
| Chromium bei 340/360/390/430 px, Beispielplan | Trennzeichen sichtbar; Leiste einreihig, keine abgeschnittenen Beschriftungen |
| Tippen auf „+ Rücklage“ unten | Dialog „Neue Rücklage“ mit aktivem Typ „Rücklage“ |
| Simulierte große Schrift (26 px) in der Leiste | Umbruch in zwei Reihen, kein Überlauf |
| Desktop 1280 px | obere Zeile sichtbar, keine untere Leiste |
| Update-Simulation 2.12 → 2.13 im selben Browserprofil mit fiktiven Posten | Cache `v2-14` → `v2-15`, neue Oberfläche aktiv, gespeicherte Daten byte-identisch |

## Nicht geprüft / offene Grenzen

- Es gab keinen Test auf einem physischen Android-Gerät. Alle Ansichten stammen aus Chromium (Headless) mit Touch-Emulation.
- Die Textskalierung von Android wurde nur angenähert, durch eine größere Schrift in der Leiste. Bei sehr großer Schrift belegt die zweireihige Leiste mehr Platz und kann unten Inhalt überdecken.
- Ein Nebenbefund, nicht behoben, weil außerhalb des Pakets: In der Karte „So verteilt sich Dein Geld“ reicht die Legende bis an den Kartenrand. Die Beträge kleben auf Handybreite rechts am Rand.
