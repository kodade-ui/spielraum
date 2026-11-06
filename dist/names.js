// Bezeichnungen von Ausgaben (ab 3.7): Vorschläge beim Tippen, letzte Verwendung eines Namens, Auswertung je Budget.
// Nur Lesen, verändert den Datenstand nie.
export const nameKey=t=>String(t||'').trim().toLocaleLowerCase('de');
const isExpense=x=>!x.kind||x.kind==='expense';
const newestFirst=(a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id));
// Eigene Namen, neueste zuerst, ohne Dubletten. Namen, die nur der Name eines Planpostens sind („Lebensmittel“), zählen nicht.
export function knownNames(state,limit=80){
  const plan=new Set((state.items||[]).map(i=>nameKey(i.title))),seen=new Map();
  for(const x of (state.actualExpenses||[]).filter(isExpense).slice().sort(newestFirst)){
    const k=nameKey(x.title);
    if(!k||plan.has(k)||seen.has(k))continue;
    seen.set(k,x.title.trim());
  }
  return [...seen.values()].slice(0,limit);
}
// Letzte Ausgabe mit diesem Namen (Groß-/Kleinschreibung egal) oder null.
export function lastUse(state,title){
  const k=nameKey(title);
  if(!k)return null;
  return (state.actualExpenses||[]).filter(x=>isExpense(x)&&nameKey(x.title)===k).sort(newestFirst)[0]||null;
}
// Welches Ziel die Schnellerfassung vorwählen soll: aktiver Planposten dieses Monats (links aus reconcileMonth),
// 'none' für „Ohne Budget“ (dazu die Kategorie) oder null, wenn der Name unbekannt ist oder sein Posten nicht mehr läuft.
export function targetFor(state,title,links){
  const x=lastUse(state,title);
  if(!x)return null;
  if(!x.planItemId)return {target:'none',category:x.category};
  const group=x.planGroupId||x.planItemId,link=links.find(i=>i.id===x.planItemId||(i.groupId||i.id)===group);
  return link?{target:link.id}:null;
}
// Zahlungen eines Postens nach Bezeichnung zusammengefasst, größte Summe zuerst. Ohne eigenen Namen = Name des Postens.
export function byName(payments){
  const groups=new Map();
  for(const p of payments){
    const k=nameKey(p.title),g=groups.get(k)||{title:p.title.trim(),count:0,total:0};
    g.count++;
    g.total+=p.amount;
    groups.set(k,g);
  }
  return [...groups.values()].sort((a,b)=>b.total-a.total||a.title.localeCompare(b.title,'de'));
}
export const datalist=(state,esc,id='known-names')=>`<datalist id="${id}">${knownNames(state).map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist>`;
