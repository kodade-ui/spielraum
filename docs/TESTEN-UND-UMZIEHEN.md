# Start, Tests und späterer Umzug

## Lokaler Start

Im entpackten Projektordner mit Node.js 24:

```sh
npm start
```

Adresse: `http://127.0.0.1:4173`. Beenden mit Strg+C. Kein Build und keine Installation von npm-Abhängigkeiten erforderlich. Alternativ: `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist`.

Der beiliegende Server liefert nur `dist/` aus, bindet ausschließlich lokal und ist nicht als Produktionsserver vorgesehen. Seine Adresse ist nicht automatisch vom Handy erreichbar. Eine echte Android-Prüfung benötigt einen separat eingerichteten sicheren Preview-/HTTPS-Zugang. Keine lokalen Finanzdaten ohne Zustimmung über einen öffentlichen Tunnel freigeben.

Für einen anderen lokalen Port: `node tools/serve.mjs 4180`. Achtung: ein anderer Port oder der Wechsel zwischen `localhost` und `127.0.0.1` bedeutet einen anderen Browser-Datenbereich.

## Automatische Prüfungen

```sh
npm test
npm run check
```

`npm test` führt alle `tests/*.test.mjs` und danach `tests/ui-flow.mjs` aus. Erwarteter Stand bei Übergabe: 62 Fachtests plus synthetischer UI-Durchlauf. Fiktive Beispieldaten, keine Nutzereingaben.

`npm run check` prüft JavaScript-Syntax, relative Modulimporte und referenzierte HTML-/Service-Worker-Dateien. Das ist kein visueller Browsertest. Ergebnisse der Paketprüfung stehen in `docs/PRUEFPROTOKOLL.txt`.

Der UI-Durchlauf verwendet ein vereinfachtes DOM, Speicher- und Eventmodell. Er prüft Formularabläufe, Änderungen, Fehlersituationen und erzeugten Text; kein echter Browser, keine echte PWA-Installation, kein physisches Handy.

## Manuelle Abnahme mit Beispieldaten

1. Leere App starten; Beispielplan über Einstellungen öffnen. Demomodus hält die echten Daten getrennt.
2. Gehalt 3.000 €, Lebensmittel 400 €, Miete 900 € planen. Alle Beträge sofort in der Monatsprojektion prüfen, unabhängig vom Zahlungstag.
3. Lebensmittel 100 € als Teilbetrag erfassen: 300 € offen. Rest abhaken: zusätzliche 300 €, insgesamt 400 €. Erneutes Abhaken darf keinen doppelten Eintrag erzeugen.
4. Zusätzlichen Einkauf einem vorhandenen Planposten zuordnen; nur einmal abziehen. Löschen/Undo und Wechsel in einen anderen Monat prüfen.
5. Wiederkehrenden Posten nach einer Teilzahlung ändern; Zahlung muss über die Serie zugeordnet bleiben. Frühere Monate unverändert.
6. Quartalszahlung über den Jahreswechsel und Jahreszahlung mit gewähltem Zahlungsmonat prüfen. Alte Jahresanteile nur bewusst umstellen.
7. Rücklagentopf mit Anfangsbestand, Einzahlung und Entnahme prüfen. Entnahme und daraus finanzierter Kauf müssen jeweils einmal korrekt wirken.
8. Ziel-Kauf prüfen: Plan vor Übernahme unverändert, Vorschau verständlich, Übernahme einmalig, Rücknahme nach Neustart möglich. Neue Änderungen an betroffenen Posten müssen unsichere Rücknahme blockieren.
9. Eigenes Backup erzeugen und in einem getrennten Testprofil wiederherstellen; Monate, Summen, eigene Kategorien und Teilzahlungen vergleichen.
10. Mobile Breiten, 200 % Textvergrößerung, Tastaturbedienung, Fokus, Dialoge, lange Titel, große Beträge, Nullwerte und Fehlbeträge prüfen. Diagramme brauchen verständliche Textwerte.
11. Offline erst nach erfolgreichem Erstladen prüfen; danach Update mit neuer Cacheversion und erhaltenem Datenstand testen. Nicht durch Löschen von Website-Daten lösen.

## Veröffentlichung und Datenschutz

`dist/` lässt sich von einem passenden statischen HTTPS-Host ausliefern. Der Host muss korrekte MIME-Typen für HTML, JavaScript, CSS, SVG, PNG und Webmanifest liefern. `sw.js`, alle importierten Module und im Manifest/Cache genannte Dateien müssen erreichbar sein. Nur `dist/` veröffentlichen, nicht das gesamte Übergabepaket.

Die derzeitige Zugriffsbeschränkung der bestehenden App kommt vom bisherigen Hosting-Anbieter. Dieses Paket überträgt weder dessen Zugang noch seine Zugriffskontrolle. Auf einem neuen Host muss die gewünschte Privatsphäre separat eingerichtet und geprüft werden. Eine nicht beworbene URL ist keine Zugangskontrolle.

Der unveränderte Code sendet persönliche Finanzdaten nicht an einen App-Server oder ein Modell. Das ersetzt keine Prüfung neu hinzugefügter Bibliotheken, Dienste oder Skripte. Keine fremden Analytics-/Tracking-Skripte hinzufügen.

## Daten sicher zur neuen Adresse übernehmen

1. Alte App weiter verfügbar lassen. Dort **Daten & Backup → Backup speichern**.
2. Das Backup privat aufbewahren und nicht als Quellcode in ein Repository hochladen.
3. Neue Veröffentlichung zunächst mit fiktiven Daten prüfen, einschließlich PWA und Export/Import.
4. In der neuen App bewusst **Wiederherstellen** wählen. Das ersetzt den dort vorhandenen Teststand; vorher nötigenfalls sichern.
5. Mindestens aktuellen und vorherigen Monat vergleichen: Einnahmen, Ausgabenplan, tatsächlich erfasst, Teilzahlungen, Töpfe, Ziele und offene Beträge.
6. Neue Installation erst dann als Haupt-App verwenden. Alte Installation/Daten erst nach erfolgreicher Überprüfung entfernen, wenn überhaupt gewünscht.

Der Import erfolgt lokal in der neuen App. Claude benötigt das persönliche Backup nicht. Bei Problemen eine anonymisierte Minimaldatei erstellen, statt echte Finanzdaten zu teilen.

## Rückgabe für spätere Weiterentwicklung

Nach Änderungen gesamten Projektordner zurückgeben, inklusive Tests und knapper Änderungsliste. Herkunftsprüfsummen beschreiben den Ausgangsstand; geänderte Dateien nicht als unverändert ausgeben. Neue veröffentlichte Adresse und Versionsnummer dokumentieren. Damit ist auch ein späterer Wechsel zurück zu einer anderen KI möglich.
