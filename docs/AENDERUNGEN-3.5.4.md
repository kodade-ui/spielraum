# Spielraum 3.5.4 · Anfang und Ende je Rücklage, Gehaltsbezug sichtbar

Stand: 25. Oktober 2026 · Auslöser: Wunsch des Nutzers und Missverständnis darüber, welcher Planmonat welches Gehalt meint.

- **Sparen:** Jede Rücklage zeigt wieder beide Werte, groß „Anfang Monat“, klein „Ende …“. Das gilt auch, wenn beide gleich sind, ebenso auf den Ziel-Kacheln. Die Prozentangabe steht jetzt in der Unterzeile.
- **Beschriftung:** „Anfang November“ statt „Stand im November“.
  - Anfang = nach dem Gehalt Ende Vormonat (mit den Raten des Planmonats), dazu Ein- und Auszahlungen zwischendurch.
  - Ende = nach dem Gehalt Ende des Monats (mit den Raten des Folgemonats).
  - Der Hinweis unter den Rücklagen nennt die konkreten Monate.
- **Monat:** Jede feste Sparrate trägt den Zusatz „geht Ende September vom Gehalt ab“ (jeweils der Vormonat). So sieht man sofort, ob ein Eintrag im richtigen Monat steht.
- Rechenlogik unverändert gegenüber 3.5.3. Service-Worker-Cache `v3-11`.
- Geprüft: `npm test` (63 Fachtests, UI-Ablauf 16 Blöcke inklusive Gehaltsbezug), `npm run check`, Screenshots.
