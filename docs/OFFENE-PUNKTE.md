# Produktstand, Kritik und nächste Entscheidungen

## Ziel des Nutzers

Ein hochwertiger, einfacher persönlicher Planer auf dem Android-Handy. Prioritäten: (1) größere Anschaffungen durchspielen, (2) weniger manuelle Arbeit, (3) Wünsche zeitlich miteinander vereinbaren. Keine zweite Bankbuchhaltung, keine erneute Analyse-Hauptnavigation. Datenerhalt hat Vorrang vor einem technisch bequemen Neubau.

## Tatsächlich vorhanden (3.2)

- Drei Bereiche: Monat, Sparen, Jahr; Plus-Taste für die Schnellerfassung.
- Sofortige Monatsprojektion, erweiterbare Kategorien, monatliche/vierteljährliche/jährliche/einmalige Posten.
- Monat: eine Hauptzahl „Noch frei“, Rechnungen abhaken, Budgets mit Rest, Käufe ohne Budget mit Zuordnung, Detailblatt.
- Sparen: Töpfe mit Zielstatus und ein Wunsch-Fahrplan (Reihenfolge, Monatsbetrag, Zeitleiste, Übernahme mit einem Tipp).
- Jahr: zwölf Monate frei mit Sonderzahlungen, Abos & Verträge mit Jahreskosten, Rückblick auf den Vormonat.
- Lokale Speicherung, Datei-Backup, Wiederherstellung, PWA-Installation und Offline-Shell. Kein Bankkonto verbunden.

## Erledigt in 3.2 (9. Oktober 2026)

- Wunsch-Fahrplan ersetzt den Schieber je Wunsch.
- Diagramme überarbeitet: geprüfte Farben im Aufteilungsbalken, Planbalken mit sichtbarer Überschreitung, Jahresbalken mit Linie „üblich“.
- Details: `docs/AENDERUNGEN-3.2.md`.

## Erledigt in 3.1 (9. Oktober 2026) · Paket 2 und 3

- Rücklagen und Ziele als ein Bereich „Sparen“, Sparrechner mit Schieber, Sparplan mit einem Tipp.
- Bereich „Jahr“ ersetzt „Ein Blick nach vorn“.
- Entfernte Funktionen auch im Code aufgeräumt (Module, Renderer, Tests, CSS). Datenvalidierung für Altdaten bleibt.
- Details: `docs/AENDERUNGEN-3.1.md`.

## Erledigt in 3.0 (8. Oktober 2026) · Paket 1

- Neues Stylesheet, Dunkelmodus, untere Navigation mit Plus-Taste.
- Bereich „Monat“ ersetzt Monatsplan + Ausgaben: eine Hauptzahl „Noch frei“, Aufteilungsbalken, eine Liste (Rechnungen, Budgets, Ohne Budget, Sparen, Einnahmen), Detailblatt je Posten.
- Schnellerfassung (auch per App-Icon lang drücken), Ein-Tipp-Zuordnung von Käufen ohne Budget.
- Kauf prüfen, Szenarien, Zeitplan, CSV-Import, Monatsabschluss aus der Oberfläche entfernt (Daten bleiben).
- Neues Logo, Icons als Dateien, Startfarben passend zur App.

## Nächste Schritte

Alle drei Pakete aus dem Rundum-Check und der Wunsch-Fahrplan sind umgesetzt. Vorgeschlagen, aber nicht beauftragt: Kontostand-Abgleich (vom Nutzer vorerst zurückgestellt, Nutzen erschloss sich nicht), Geldfluss-Diagramm, Favoriten in der Schnellerfassung, Backup per Teilen, automatisches Abhaken am Zahlungstag, Suche über Käufe. Hosting-Update-Weg (Worker umbenennen) bleibt umständlich; Pages oder GitHub prüfen.

## Vorgemerkt für das nächste Update (vom Nutzer gewünscht, 9. Oktober 2026)

- Schalter **Automatisch / Hell / Dunkel** in den Einstellungen. Bisher folgt die App nur der Systemeinstellung (`prefers-color-scheme`), ein manuelles Umschalten gibt es nicht. Idee: Wahl lokal speichern (nicht im Datenstand `spielraum.v2`, eigener unkritischer Schlüssel), per `data-theme` am Wurzelelement setzen, `theme-color`-Meta mitführen, Tokens für beide Modi existieren bereits in `app.css`. Kein eigenes Update dafür; wird beim nächsten ohnehin anstehenden Update mitgenommen (SW-Cache dann erhöhen).

- **Bereich Sparen gestalterisch überarbeiten** (Rückmeldung des Nutzers, 9. Oktober 2026): wirkt wie eine lange, volle, gequetschte und unruhige Liste; die Farben gefallen nicht. Wunsch: ruhiger, eleganter, Farben stimmig aufeinander abgestimmt, mehr Luft. Die Töpfe sollen nicht mehr bloß eine Liste sein, sondern eine eigene, schönere Darstellung bekommen (Gestaltungsfreiheit ausdrücklich erteilt, nicht vorher abstimmen). Gilt für Töpfe, Wunsch-Fahrplan und Hero zusammen. Palette mit dem Dataviz-Validator prüfen (hell und dunkel), Screenshots 360/390 px vorher/nachher. Erst beim nächsten Update, nicht einzeln ausliefern.

- **Fehler seit 3.0: Einnahmen, Rücklagen und Topf-Bewegungen lassen sich nicht mehr löschen.** In 2.12 hatte jede Zeile ein Löschen-Kreuz (`delete-item`). Seit 3.0 gibt es „Posten ab … entfernen“ nur im Detailblatt für Ausgaben (`month-ui.js` `itemSheet`); Einnahmen/Rücklagen öffnen direkt den Editor (`itemDialog`), und der hat keinen Löschen-Knopf. Der Handler `delete-item` existiert noch. Lösung: Löschen-Knopf im Editor (bei bestehendem Posten) mit demselben Verhalten wie `deletePost` (inkl. Rückgängig). Test ergänzen.
- **Bestand eines Topfs anpassen ohne Einnahme:** „Bestand korrigieren“ existiert (`correctPot`, erzeugt keinen Posten), ist im Topfblatt aber nur ein kleiner Textlink unter den großen Knöpfen Einzahlung/Entnahme, die dagegen Planposten anlegen. Wird übersehen. Lösung: im Topfblatt prominent als „Bestand anpassen“ führen, Einzahlung/Entnahme als „einplanen“ benennen und erklären.

## Erledigt in 2.13 (8. Oktober 2026)

- Code zeilenweise formatiert, nachweislich ohne Verhaltensänderung.
- Trennzeichen in der Postenliste („WohnenMonatlich“) behoben.
- Doppelte Aktionsleiste im Monatsplan auf dem Handy aufgelöst; untere Leiste enthält jetzt auch „Rücklage“.
- Neu bemerkt, offen: Legende der Verteilungskarte reicht auf Handybreite bis an den Kartenrand.

Details und Prüfungen: `docs/AENDERUNGEN-2.13.md`.

## Wichtigste ungelöste Rückmeldung

Nach Version 2.12 erkannte der Nutzer vor allem die Zusammenführung der Ausgaben, das Entfernen des prominenten Entscheidungspfads und minimale Designänderungen. Er erwartete einen deutlich sichtbaren, zusammenhängenden Fortschritt nach der besprochenen SharkFin-Referenz. Diese Kritik ist nicht als Missverständnis des Nutzers abzuweisen. Die überarbeitete Gesamtsicht ist noch nicht überzeugend fertig.

## Besprochene Referenz: SharkFin

Der Nutzer brachte Screenshots einer anderen privaten Budget-App ein: ruhige helle Oberflächen, klare Summen, sortierte Buchungslisten, ein Geldflussdiagramm mit proportionalen Verbindungen, Kategorienring plus Betragsliste, eigenständig gestaltete Mobilansichten und eine Vermögensansicht. Diese Prinzipien inspirieren; Layout/Marke nicht 1:1 kopieren. Die fremden Screenshots und deren Finanzangaben sind nicht Teil dieses Pakets. Für einen exakten visuellen Vergleich kann der Nutzer sie erneut bereitstellen.

## Naheliegendes nächstes Paket – erst mit Nutzer abstimmen

1. **Eine sichtbar neue integrierte Übersicht:** Einnahmen, separat ausgewiesene Rücklagenentnahmen, Ausgaben, Reservierungen und freier Betrag als zusammenhängender Aufbau. Eine bloße Ansammlung weiterer Karten oder umbenannte bestehende Diagramme genügt nicht.
2. **Echtes mobil lesbares Geldflussdiagramm:** bisher NICHT geliefert. Die existierende Aufteilung besteht überwiegend aus Ring und Restbudgetstreifen. Wenige gut lesbare Gruppen, proportionale Flüsse, exakte Textwerte und antippbare Details; Fehlbetrag und Sparen fachlich korrekt darstellen.
3. **Kategorienverteilung direkt integrieren:** „Erfasst / Geplant“ existiert bereits, liegt aber unterhalb der Postenliste. Platzierung, Sichtbarkeit, Navigation zum Detail und Rückweg als zusammenhängenden Ablauf gestalten.
4. **Kaufprüfung verständlich auffindbar machen:** Aktion ist vorhanden. Ihr Nutzen und die Ergebnisdarstellung müssen ohne Kenntnis von Szenarien verständlich sein. Preis/Termin am ursprünglichen Ziel und tatsächlich geprüfte/übernommene Variante sind bisher nicht automatisch synchronisiert; verständliche Anzeige und bewusstes Änderungsverhalten gemeinsam festlegen.

Die Bitte um dieses Übergabepaket ist keine neue Freigabe, diese Punkte sofort umzusetzen oder live zu veröffentlichen.

## Weitere Ideen, bisher nicht beauftragt/umgesetzt

- Anschaffungsprojekte mit mehreren Bestandteilen, z. B. Reise aus Transport/Unterkunft/Aktivitäten oder Kaffeeset aus Maschine/Mühle/Zubehör. Die derzeitige Kaufprüfung kennt Gesamtpreis und eine zusätzliche monatliche Kostensumme, keine vollständige Projektstruktur.
- Vermögensübersicht aus bestätigten Beständen und optionalen Verbindlichkeiten. Rücklagentöpfe sind Zweckbindungen und dürfen nicht zusätzlich zu denselben Kontobeständen als Vermögen gezählt werden.
- Eine neue Jahresübersicht mit deutlich sichtbaren Belastungsspitzen; vorhandene Vorschauen und Zeitpläne zuerst nutzen, nicht eine weitere parallele Logik erstellen.
- Erweiterte persönliche Zuordnungsregeln; vorhandene Kategorien- und Importregeln berücksichtigen.

## Technische Punkte für den nächsten Review

- Seit 3.0 gibt es ein Stylesheet `app.css` mit Tokens; seit 3.1 ohne Regeln für entfernte Ansichten.
- Seit 3.1 sind alte Renderer, Kaufprüfung, Zeitplan und Entscheidungsassistent gelöscht. `scenarios.js` bleibt für das Übernahmejournal; Schemadateien validieren Altdaten.
- Ziele ohne Topf lassen sich in der Deckungsprognose nicht verlässlich terminieren. Diese Grenze ist sichtbar zu machen, nicht durch erfundene Prognosen zu ersetzen.
- Viele Filter-/Diagrammwechsel rendern den Bereich neu. Scrollposition, Fokus und geöffnete Details auf dem echten Handy prüfen.
- Automatisches Neuladen bei Updates wurde nicht als neuer vollständiger Update-Dialog umgesetzt. Identität und vorhandene Daten erhalten; PWA-Cache gezielt versionieren.
- Monatsabschlüsse lassen sich nicht mehr anlegen. Für mit älteren Versionen abgeschlossene Monate zeigt „Monat“ „Wieder öffnen“.
- Kein aktueller physischer Android-Test und keine vollständige visuelle Abnahme. Die synthetischen UI-Tests beweisen weder Layoutqualität noch Touch-Ergonomie.

## Akzeptanz für ein künftiges Umsetzungspaket

- Nutzer erkennt auf dem ersten relevanten Bildschirm einen tatsächlichen Strukturgewinn.
- Ein Lebensmitteleinkauf von 100 € bei 400 € Plan lässt 300 € offen und wird einmal berücksichtigt.
- Gehalt, Rücklagenentnahme und Sparbetrag bleiben begrifflich/rechnerisch getrennt.
- Filter und Diagramme erklären ihre Auswahl; Monat bleibt beim Wechsel erhalten.
- Kein Verlust vorhandener Einträge, Notizen, eigener Kategorien, Revisionen oder Übernahmejournale.
- Screenshots/visuelle Ergebnisse werden nur als tatsächlich geprüft bezeichnet, wenn sie gerendert und angesehen wurden.
