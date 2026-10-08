# Spielraum – Arbeitskontext für Claude

## Einstieg und Arbeitsweise

Dies ist eine bestehende private Budget-PWA, keine Aufforderung zu einem Neubau. Nutzer kommuniziert auf Deutsch, ist kein Softwareentwickler und erwartet selbstständig erledigte, freigegebene Aufgaben. Erst prüfen und konkret vorschlagen; Änderungen erst nach Freigabe. Kein Bankzugang und keine personenbezogenen Daten im Paket. Keine Hintergrundaktionen oder dauerhaften Erinnerungen anlegen.

Lies `docs/ARCHITEKTUR-UND-RECHENREGELN.md`, `docs/OFFENE-PUNKTE.md` und `docs/TESTEN-UND-UMZIEHEN.md`. Die aktuelle App ist Version **2.12**, Service-Worker-Cache **v2-14**. Quellstand: `6897d9daee90b0e8dd843c1ee933b7054d5e6901`. Die Anbieter-Publikationsnummer 15 ist eine andere Zählung als die App-Version.

## Technik

- Statisches HTML/CSS/JavaScript mit nativen ES-Modulen. Kein React, kein Backend, kein Build, keine Runtime-Abhängigkeiten.
- `dist/` ist der wirkliche Quellcode und zugleich der Webroot. Hier editieren, kein nicht vorhandenes `src/` suchen.
- `dist/planner-ui.js` hält UI-Zustand, Navigation, Dialoge, globale Events, Persistenz und Undo.
- Fachlogik liegt in kleinen Modulen: `planner.js`, `reconciliation.js`, `reserves.js`, `goals.js`, `scenarios.js`, `purchase.js`, `timeline.js`.
- Styles: zuerst `planner.css`, danach `refinement.css`. Das erste Stylesheet enthält viele historische Überschreibungen. Selektorspezifität und Ladereihenfolge beachten.
- `package.json` und `tools/` wurden nur zur portablen Übergabe ergänzt. Alle Originaldateien unter `dist/`, `tests/`, `assets/` und `scripts/` sind unverändert vom genannten Commit übernommen. Vergleich über `SOURCE-MANIFEST.json`.
- `npm start`, `npm test`, `npm run check`; Node.js 24. Kein `npm install` erforderlich. Der Server bindet nur an 127.0.0.1, sein Port bleibt standardmäßig 4173.
- Die optionalen historischen Icon-Skripte benötigen für das Rendern `sharp`; das ist kein Erfordernis zum Starten oder Testen. Fertige Icons sind enthalten. Keine Pakete allein für unveränderte Icons installieren.

## Unverhandelbare Datenregeln

1. Alle Geldwerte sind Integer-Cent. Euroformat nur in Anzeige/Eingabe. Keine Gleitkomma-Summen in der Fachlogik.
2. Lokaler Hauptschlüssel `spielraum.v2`, Legacy `spielraum.v1`. Unverändert lassen. Vorhandene Daten nicht beim Start überschreiben; niemals zum Testen echte Daten löschen.
3. Identität der PWA (`manifest.webmanifest`, ID, Scope, Start-URL) bei Aktualisierung derselben Installation erhalten. Service-Worker-Version bei Shell-Änderungen erhöhen und neue Dateien in `ASSETS` aufnehmen.
4. `validate`, `enhanceState`, `persist`, `commitUndo` und vorhandene Transaktions-/Revisionsprüfungen verwenden; keine parallele Speicherlogik bauen.
5. Monatsplan und tatsächliche Käufe sind zwei Sichten auf zusammengehörige Daten. Zugeordnete Käufe senken den offenen Planbetrag. Nicht den Planbetrag und den zugehörigen Istbetrag vollständig doppelt abziehen.
6. Einnahmen, Sparen und Umbuchungen nicht als Konsumausgaben darstellen. Topfanfangsbestände sind keine Einnahmen. Eine Rücklagenentnahme erhöht den Monatsrahmen einmal und senkt den Topf einmal.
7. Wiederkehrende Änderungen ab dem gewählten Monat erhalten die Historie. `groupId` und `planGroupId` stabil auflösen; Titel sind keine belastbare Verknüpfung.
8. Simulationen verändern den Monatsplan erst nach einer konkreten Übernahmevorschau und Bestätigung. Geschützte Rücklagen und Mindestspielraum respektieren. Übernahmen nicht duplizieren.
9. Alle dynamischen Texte escapen; keine privaten Daten an externe Dienste übertragen. Die vorhandene Auswertung ist deterministische Logik, keine angebundene KI.

## Qualität und Umfang

- Primär Android/Touch, Breiten 360–430 px; zusätzlich Desktop und 200 % Textvergrößerung berücksichtigen. Lesbare Beträge und ausreichend große Bedienflächen vor maximaler Informationsdichte.
- Vier Hauptbereiche: Monatsplan, Rücklagen, Ausgaben, Ziele. Kein neuer Hauptbereich „Auswertung“, keine erneute Aufteilung Ausgaben/Abgleich.
- Kein Frameworkwechsel, Cloudspeicher oder Rewrite allein aus Bequemlichkeit. Solche Architekturänderungen separat vorschlagen und abstimmen.
- Tests sind Prüfmittel, keine Produktdefinition: Ältere Testtitel erwähnen historische Jahresanteile. Die aktuellen Regeln stehen im Fachkonzept und im Code.
- Nach einer Änderung vollständiges Projekt zurückgeben, nicht nur einzelne Schnipsel. Erläutere Auswirkungen auf Speicherung/PWA und notwendige manuelle Prüfungen.
- Kein Live-Hosting-Zugang im Paket. Ohne explizit geklärten Zugang kann die bisherige Adresse nicht direkt aktualisiert werden. Neue Veröffentlichung zunächst nur mit Beispieldaten prüfen.
