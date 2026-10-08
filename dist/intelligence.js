import { validate, currentMonth, monthName, shiftMonth, totals, projected, euro, uid } from './planner.js';
export const UPDATE_BACKUP_KEY='spielraum.before-categories-2026-09';
const normalize=v=>String(v??'').toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
export const CATALOG=[
['c0','Wohnen','#7c6bd6','expense','fixed','Miete,Nebenkosten,Wohnen,Hausgeld'],
['c1','Lebensmittel','#e79058','expense','spread','Lebensmittel,Wocheneinkauf,Supermarkt,Rewe,Edeka,Aldi,Lidl,Penny,Netto Markt'],
['c2','Mobilität','#5d9da4','expense','fixed','Mobilität,Deutschlandticket,Bahn,Bus,Auto,Leasing,Benzin,Tanken,Fahrrad,ÖPNV'],
['c3','Freizeit','#d57697','expense','spread','Freizeit,Kino,Theater,Konzert,Spiele,Gaming,Bücher,Hobby'],
['c4','Shopping','#82975b','expense','spread','Shopping,Kleidung,Schuhe,Kopfhörer,Elektronik,Möbel,Amazon'],
['c5','Gesundheit','#6490cf','expense','fixed','Gesundheit,Arzt,Apotheke,Medikamente,Zahnarzt,Therapie'],
['c6','Abos & Verträge','#bd865a','expense','fixed','Abo,Abonnement,Netflix,Spotify,Streaming,Disney,ChatGPT'],
['c7','Sonstiges','#9a94a8','all','spread',''],
['c_saving','Sparen & Notgroschen','#7c9f69','saving','fixed','Sparen,Sparrate,Sparbetrag,Sparkonto,Notgroschen,Notfallreserve,Tagesgeld,Rücklage'],
['c_retirement','Altersvorsorge & Investments','#7064a7','saving','fixed','Altersvorsorge,ETF,ETF Sparplan,Fonds,Aktien,Depot,Rentenversicherung,Betriebsrente,Investments,Vermögensaufbau,Riester,Rürup'],
['c_income','Einkommen','#6b9d88','income','fixed','Einkommen,Gehalt,Nettogehalt,Lohn,Honorar,Bonus,Minijob,Rente,Kindergeld'],
['c_insurance','Versicherungen','#ba9755','expense','fixed','Versicherung,Haftpflicht,Hausrat,Berufsunfähigkeit,BU Versicherung,Rechtsschutz,Kfz Versicherung'],
['c_phone','Telefon & Internet','#5585ac','expense','fixed','Telefon,Internet,Handy,Mobilfunk,DSL,Telekom,Vodafone,O2'],
['c_energy','Energie & Haushalt','#829a51','expense','fixed','Strom,Gas,Heizung,Energie,Wasser,Rundfunk,GEZ,Haushalt,Reinigung'],
['c_foodout','Essen gehen & Cafés','#d18b75','expense','spread','Essen gehen,Restaurant,Café,Cafe,Kaffee,Lieferando,Takeaway,Imbiss,Kantine'],
['c_sport','Sport & Fitness','#5c9a95','expense','fixed','Sport,Fitness,Fitnessstudio,Gym,Verein,Yoga,Schwimmen'],
['c_travel','Reisen & Urlaub','#dc9a7d','all','spread','Reisen,Urlaub,Hotel,Flug,Ferien,Reisekasse'],
['c_education','Bildung & Beruf','#8b89b6','expense','fixed','Bildung,Studium,Weiterbildung,Fortbildung,Kurs,Studiengebühren,Seminar'],
['c_gifts','Geschenke & Feiern','#c881a6','expense','spread','Geschenk,Geschenke,Geburtstag,Weihnachten,Feier,Hochzeit'],
['c_family','Familie & Kinder','#9a89ac','expense','fixed','Familie,Kinder,Kita,Kindergarten,Schule,Unterhalt'],
['c_pets','Haustiere','#a38665','expense','fixed','Haustier,Hund,Katze,Tierarzt,Tierfutter,Futter'],
['c_debt','Kredite & Schulden','#a87c86','expense','fixed','Kredit,Darlehen,Schulden,Tilgung,Ratenzahlung'],
['c_donation','Spenden','#8da479','expense','fixed','Spende,Spenden,Mitgliedsbeitrag,Patenschaft']
];
export function enhanceState(input){
  validate(input);
  const s=structuredClone(input);
  if(!s.settings.categoryEdition){
    for(const [id,name,color,group,pace,words]of CATALOG){
      const existing=s.categories.find(c=>c.id===id)||s.categories.find(c=>normalize(c.name)===normalize(name));
      if(existing){
        if(!existing.group)existing.group=group;
        if(!existing.pace)existing.pace=pace;
        if(existing.keywords===undefined)existing.keywords=existing.name===name?words:'';
      }
      else if(s.categories.length<100)s.categories.push({id,name,color,group,pace,keywords:words});
    }
    s.settings.categoryEdition=1;
  }
  s.settings.assignments??={};
  s.settings.analysis??={buffer:0,savingTarget:0};
  s.snapshots??={};
  s.pots??=[];
  s.actualExpenses??=[];
  s.goals??=[];
  s.decisions??=[];
  s.importRules??=[];
  s.monthClosures??=[];
  return validate(s);
}
function phraseScore(text,phrase){
  const p=normalize(phrase);
  if(!p)return 0;
  return (' '+text+' ').includes(' '+p+' ')?10+p.length:0;
}
export function suggestCategory(s,title,type='expense'){
  const text=normalize(title),learned=s.settings.assignments?.[type+':'+text];
  if(learned&&s.categories.some(c=>c.id===learned))return {id:learned,reason:'Aus Deiner früheren Zuordnung gelernt'};
  let winner=null;
  for(const c of s.categories){
    let score=phraseScore(text,c.name)*2;
    for(const word of String(c.keywords||'').split(','))score=Math.max(score,phraseScore(text,word));
    if(c.group===type)score+=score?4:0;
    if(score>0&&(!winner||score>winner.score))winner={id:c.id,score,reason:'Passend zu Name oder Stichwörtern'};
  }
  const fallback=type==='saving'?'c_saving':type==='income'?'c_income':'c7';
  return winner||{id:s.categories.find(c=>c.id===fallback)?.id||s.categories.at(-1).id,reason:type==='saving'?'Allgemeine Rücklage':type==='income'?'Allgemeines Einkommen':'Noch kein passendes Stichwort'};
}
export function suggestionsForExisting(s){
  return s.items.filter(i=>i.category==='c7'&&!i.source).map(i=>({item:i,suggestion:suggestCategory(s,i.title,i.type)})).filter(v=>v.suggestion.id!==v.item.category);
}
export function rememberCategory(s,title,type,category){
  s.settings.assignments??={};
  const key=type+':'+normalize(title);
  if(key.length>type.length+1)s.settings.assignments[key]=category;
}
export function paceFor(s,item){
  if(item.pace)return item.pace;
  if(item.type!=='expense'||item.frequency==='year')return 'fixed';
  return s.categories.find(c=>c.id===item.category)?.pace||'fixed';
}
export function capturePlan(s,m){
  const t=totals(s,m);
  let variable=0;
  for(const i of t.items)if(i.type==='expense'&&paceFor(s,i)==='spread')variable+=i.monthlyAmount;
  return {income:t.income,expense:t.expense,saving:t.saving,remaining:t.remaining,fixed:t.expense-variable,variable,categoryTotals:s.categories.map(c=>({id:c.id,name:c.name,value:t.items.filter(i=>i.type==='expense'&&i.category===c.id).reduce((n,i)=>n+i.monthlyAmount,0)})).filter(c=>c.value>0),capturedAt:new Date().toISOString()};
}
export const daysIn=m=>new Date(Number(m.slice(0,4)),Number(m.slice(5)),0).getDate();
export function planAtDay(snapshot,m,day){
  const d=Math.min(daysIn(m),Math.max(0,day));
  return snapshot.income-snapshot.fixed-snapshot.saving-Math.round(snapshot.variable*d/daysIn(m));
}
export function historyPlans(s,m){
  return Object.entries(s.snapshots||{}).filter(([key,v])=>key<m&&key<currentMonth()&&v.income>0).sort(([a],[b])=>a.localeCompare(b)).slice(-6);
}
export function comparison(s,m,day){
  const current=capturePlan(s,m),past=historyPlans(s,m);
  return {current:planAtDay(current,m,day),usual:past.length>=2?Math.round(past.reduce((n,[k,v])=>n+planAtDay(v,k,day),0)/past.length):null,count:past.length,currentPlan:current,past};
}
export function analyze(s,m){
  const t=totals(s,m),result=[],add=(level,title,body,why)=>result.push({level,title,body,why});
  if(!t.income){
    add('info','Einnahmen fehlen noch','Mit geplanten Einnahmen kann ich Deinen freien Betrag und Deine Quoten sinnvoll einordnen.','Ohne Einkommensbasis wären Prozentvergleiche irreführend.');
    return result;
  }
  if(t.remaining<0)add('warning','Dein Plan ist noch nicht gedeckt',`Ausgaben und Rücklagen übersteigen Deine Einnahmen um ${euro(-t.remaining)}. Prüfe zuerst veränderbare Posten.`,`Einnahmen ${euro(t.income)} − Ausgaben ${euro(t.expense)} − Rücklagen ${euro(t.saving)}.`);
  else add('positive','Dein Plan ist gedeckt',`${euro(t.remaining)} bleiben unverplant (${Math.round(t.remaining/t.income*100)} % Deiner Einnahmen). Das ist Dein Spielraum für ungeplante Kosten oder zusätzliche Ziele.`,'Eine positive Differenz ist kein Nachweis, dass alle künftigen Kosten bereits erfasst sind.');
  const prefs=s.settings.analysis||{};
  if(prefs.buffer>0&&t.remaining<prefs.buffer)add('warning','Dein gewünschter Puffer wird unterschritten',`Für Deinen Zielpuffer von ${euro(prefs.buffer)} fehlen noch ${euro(prefs.buffer-t.remaining)}.`,'Vergleich mit Deinem selbst gewählten Ziel, nicht mit einem pauschalen Richtwert.');
  if(prefs.savingTarget>0&&t.saving<prefs.savingTarget)add('info','Dein Rücklagenziel ist noch offen',`Du planst ${euro(t.saving)} statt der gewünschten ${euro(prefs.savingTarget)}. Die Differenz beträgt ${euro(prefs.savingTarget-t.saving)}.`,'Nur Posten der Art „Rücklage“ zählen in diese Summe.');
  for(const c of s.categories){
    const spent=t.items.filter(i=>i.category===c.id&&i.type==='expense').reduce((n,i)=>n+i.monthlyAmount,0);
    if(c.limit>0&&spent>c.limit)add('warning',`${c.name}: über Deinem Limit`,`${euro(spent)} sind eingeplant, ${euro(spent-c.limit)} mehr als Dein eigenes Limit von ${euro(c.limit)}.`,'Dein Kategorienlimit dient zur Orientierung und verändert die Berechnung nicht.');
  }
  const snapshot=capturePlan(s,m),largest=[...snapshot.categoryTotals].sort((a,b)=>b.value-a.value)[0];
  if(largest&&largest.value>0)add('info',`${largest.name} bindet den größten Anteil`,`${euro(largest.value)} entsprechen ${Math.round(largest.value/t.income*100)} % Deines Einkommens. Eine Veränderung um 10 % würde ${euro(Math.round(largest.value*.1))} pro Monat ausmachen.`,'Der Anteil allein sagt nicht, ob eine Ausgabe sinnvoll oder zu hoch ist. Das hängt von Bedarf und Prioritäten ab.');
  const contracts=t.items.filter(i=>i.type==='expense'&&i.frequency!=='once'&&['c6','c_phone'].includes(i.category));
  if(contracts.length){
    const amount=contracts.reduce((n,i)=>n+i.monthlyAmount,0);
    add('info','Verträge auf ihren Nutzen prüfen',`${contracts.length} laufende Posten in Abos und Telefon/Internet kosten zusammen ${euro(amount)} pro Monat (${euro(amount*12)} im Jahr). Prüfe, welche Du tatsächlich nutzt.`,'Die App kennt weder Kündigungsfristen noch den tatsächlichen Nutzen Deiner Verträge.');
  }
  const retirement=t.items.filter(i=>i.type==='saving'&&i.category==='c_retirement').reduce((n,i)=>n+i.monthlyAmount,0);
  if(retirement)add('positive','Altersvorsorge ist im Plan berücksichtigt',`${euro(retirement)} pro Monat sind dafür reserviert. Das schafft Kontinuität; ob die Höhe und Anlage zu Deinem Ziel passen, lässt sich aus dem Budget allein nicht beurteilen.`,'Keine Bewertung konkreter Anlagen, Renditen oder Deines Vorsorgebedarfs.');
  const misTyped=t.items.filter(i=>i.type==='expense'&&s.categories.find(c=>c.id===i.category)?.group==='saving');
  if(misTyped.length)add('info','Sparposten als Rücklage kennzeichnen',`${misTyped.length} Posten liegen in Spar- oder Vorsorgekategorien, sind aber als Ausgabe angelegt. Wenn Du Geld beiseitelegst, wähle beim Bearbeiten „Rücklage“.`,'Der freie Gesamtbetrag bleibt gleich. Rücklagenquote und Ausgabenverteilung werden dadurch aussagekräftiger.');
  const prior=historyPlans(s,m);
  if(prior.length>=2){
    const avg=Math.round(prior.reduce((n,[,p])=>n+p.expense,0)/prior.length),diff=t.expense-avg;
    if(avg>0&&Math.abs(diff)>=1000)add('info',diff>0?'Mehr Ausgaben als in Deinen Vergleichsplänen':'Weniger Ausgaben als in Deinen Vergleichsplänen',`Deine geplanten Ausgaben liegen ${euro(Math.abs(diff))} (${Math.round(Math.abs(diff)/avg*100)} %) ${diff>0?'über':'unter'} dem Mittel von ${prior.length} gespeicherten Monatsplänen.`,'Verglichen werden Pläne, keine tatsächlichen Zahlungen. Unterschiedliche Einkommen oder einmalige Anschaffungen können die Abweichung erklären.');
  }
  return result;
}
