# Spielraum 3.3 · Sparen neu, Jahreskosten glätten, Hell/Dunkel-Schalter

Stand: 9. Oktober 2026 · Auslöser: Rückmeldungen des Nutzers (Sparen zu voll und unruhig, Farben unschön, Regler nicht sinnvoll; er spart flexibel, mal hier, mal dort).

## Was sich für Dich ändert

- **Sparen sieht anders aus.** Ziele und Rücklagen sind Kacheln mit einem Fortschrittsring statt einer langen Liste. Es gibt nur noch eine Ringfarbe. Gold zeigt „geschafft“, Warnungen erscheinen nur als Textfarbe, und die bunten Topf-Farben sind weg.
- **Kein Regler und kein Fahrplan mehr.** Ein Ziel hat jetzt Preis, „schon angespart“ und „fehlt“. Du sparst auf eine von zwei Arten:
  - **Flexibel:** Du zahlst ein, wann es passt („Einzahlen“, Betrag und Monat). Hat das Ziel einen Wunschtermin, steht dabei, was bis dahin im Monat nötig wäre.
  - **Feste Rate:** Du gibst einen Termin vor, und die App rechnet die Rate aus. Oder Du gibst eine Rate vor, und die App rechnet den Termin aus. Die Rate gilt ab diesem oder dem nächsten Monat und lässt sich später ändern oder beenden.
- **Was die Rate kostet:** Beim Festlegen steht sofort, was im Startmonat danach noch frei ist. Gibt es einen Monat, in dem es nicht reicht, wird er genannt. Auch beim Einzahlen siehst Du, was im Monat übrig bleibt.
- **Jahreskosten glätten:** Jährliche und vierteljährliche Zahlungen, etwa Versicherungen oder der Rundfunkbeitrag, schlägt die App als Rücklage vor. Ein Tipp legt drei Dinge an: einen Topf, eine Monatsrate und im Zahlungsmonat eine Entnahme. Der Zahlungsmonat reißt dann kein Loch mehr.
  - Reicht die Zeit bis zur nächsten Zahlung nicht, wählst Du zwischen „schon die nächste Zahlung abdecken“ (bis dahin etwas mehr) und „ab der übernächsten“.
  - Was Du nicht willst, blendest Du aus.
- **Rücklagen ohne Ziel**, zum Beispiel ein Notgroschen, zeigen ein Symbol statt eines Rings. Auch sie können eine feste Rate haben oder flexibel gefüllt werden. „Ziel setzen“ macht aus einer Rücklage ein Ziel.
- **Hell / Dunkel:** In den Einstellungen unter „Darstellung“ wählst Du Automatisch (wie das Handy), Hell oder Dunkel. Die Wahl gilt nur für dieses Gerät und steht nicht im Backup.
- **Deine bisherigen Wünsche** erscheinen als Ziele mit 0 €. Beim ersten Einzahlen oder bei der ersten Rate bekommen sie automatisch einen Topf.

## Technisch

- Neu ist `sinking.js` für die Jahreskosten. `goals.js` enthält jetzt `planRate`, `applyRate`, `addDeposit`, `createGoal`, `ensureGoalPot` und `withoutRates`. `savings-ui.js` ist neu geschrieben. `wishplan.js` und sein Test sind entfernt.
- `goals-ui.js` kann nur noch bearbeiten, abschließen und löschen. Neue Ziele, Raten und Einzahlungen laufen über `savings-ui.js`.
- Datenformat: Es gibt zwei neue optionale Felder: `covers` an Entnahmen von Jahreskosten-Rücklagen und `settings.sinkingDismissed`. Beide werden validiert. `settings.wishPlan` bleibt gültig, wird aber nicht mehr benutzt. Es gibt keine Migration, und beim Start wird nichts umgeschrieben.
- Dunkel-Tokens gelten per Medienabfrage oder per `data-theme="dark"`. Ein kurzes Skript in `index.html` setzt die Wahl vor dem ersten Zeichnen.
- Service-Worker-Cache `v3-5`. `sinking.js` ist neu in der Offline-Liste, `wishplan.js` ist daraus entfernt.

## Geprüft

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 62 Fachtests, davon 7 neu: Termin ↔ Rate, Ziel in einem Schritt, Ratenwechsel und -ende ab einem Monat, Ziel ohne Topf, Jahreskosten beide Wege, Zahlung im laufenden Monat, Backup-Validierung. UI-Ablauf mit 15 Blöcken bestanden. |
| `npm run check` | ohne Befund |
| Chromium 390/360 px hell, 390 px dunkel, „Dunkel“ erzwungen bei hellem Handy und umgekehrt, fiktive Daten | keine Seitenfehler, kein horizontales Scrollen, Dialoge angesehen |
| Kontraste | Ring 7,8 : 1 (hell) und 6,3 : 1 (dunkel). Text „Geschafft“ und Warnungen ≥ 4,9 : 1. |
| Update 3.2.1 → 3.3 im selben Browserprofil (fiktive Daten, vorher Fahrplan übernommen) | Daten byte-identisch, auch nach dem Ansehen. Cache `v3-4` → `v3-5`. Ziele werden angezeigt, keine Fehler. |

## Nicht geprüft / Grenzen

- Kein Test auf Deinem Handy.
- Silbentrennung langer Namen in den Kacheln hängt vom Browser ab.
- Ändert sich nach dem Glätten der Betrag einer Jahreszahlung, wird die Entnahme nicht automatisch angepasst. Die Rücklage zeigt dann „es fehlen …“, und Du passt die Rate an.
- Löschst Du die Ausgabe, bleibt die Rücklage samt Entnahme stehen. Lösche dann auch die Entnahme im Topf unter „Verlauf“.
