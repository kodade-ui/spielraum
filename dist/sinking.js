// Jahreskosten glätten (ab 3.3): Für jährliche und vierteljährliche Ausgaben jeden Monat einen festen Teil zurücklegen.
// Ablauf: eigener Topf, monatliche Sparrate, und im Zahlungsmonat eine Entnahme in Höhe der Zahlung.
// Die Entnahme gleicht die Zahlung im Monat aus (Regel: Entnahme erhöht den Monatsrahmen einmal, senkt den Topf einmal).
import {shiftMonth,projected,legacyAnnual,upsertItem,validMonth} from './planner.js';
import {createPot,reserveSummary} from './reserves.js';
import {monthsBetween,potName} from './goals.js';
import {suggestCategory} from './intelligence.js';

const euroUp=c=>Math.ceil(c/100)*100;
const intervalOf=i=>i.frequency==='quarter'?3:12;
const smoothable=i=>i.type==='expense'&&!i.source&&!i.potId&&((i.frequency==='year'&&!legacyAnnual(i))||i.frequency==='quarter');

// Nächster Zahlungsmonat ab „month“ (höchstens zwölf Monate gesucht).
export function nextDue(state,item,month){
  for(let k=0;k<=12;k++){
    const m=shiftMonth(month,k);
    if(!validMonth(m))return '';
    if(projected(state,m).some(i=>i.id===item.id))return m;
  }
  return '';
}

// Jährliche/vierteljährliche Ausgaben ohne Rücklage. Je Postengruppe zählt die Version, die als nächste fällig wird.
export function sinkingCandidates(state,month){
  const dismissed=new Set(state.settings.sinkingDismissed||[]),covered=new Set(state.items.filter(w=>w.covers&&(!w.end||w.end>=month)).map(w=>w.covers));
  const best=new Map();
  for(const i of state.items){
    if(!smoothable(i)||(i.end&&i.end<month))continue;
    const key=i.groupId||i.id;
    if(covered.has(key)||dismissed.has(key))continue;
    const next=nextDue(state,i,month);
    if(!next)continue;
    const cur=best.get(key);
    if(!cur||next<cur.next)best.set(key,{key,item:i,next,amount:i.amount,interval:intervalOf(i),monthly:euroUp(Math.ceil(i.amount/intervalOf(i)))});
  }
  return [...best.values()].sort((a,b)=>b.amount/b.interval-a.amount/a.interval||a.item.title.localeCompare(b.item.title,'de'));
}

// Zwei Wege: „now“ deckt schon die nächste Zahlung (bis dahin höhere Rate, falls nötig),
// „later“ lässt die nächste Zahlung wie bisher und spart ab dem Monat danach genau für die übernächste. Ist genug Zeit, gibt es nur „now“.
// Ab 3.5.5: Eine Rate im Monat X wird Ende X überwiesen. Für eine Zahlung im Monat N zählen also die Raten bis N−1.
// „now“: bis N−1 eine höhere Rate, ab N die normale. „later“: Zahlung N noch aus dem Monat, Rate ab N, Entnahme ab N+Intervall.
export function sinkingOptions(c,month,saved=0){
  const k=Math.max(0,monthsBetween(month,c.next)),enough=saved+k*c.monthly>=c.amount;
  const laterStart=c.next>month?c.next:month;
  let firstLater=shiftMonth(c.next,c.interval);
  while(monthsBetween(laterStart,firstLater)<c.interval)firstLater=shiftMonth(firstLater,c.interval);
  // Ist die Zahlung fällig, bevor eine Rate überwiesen ist, bringt eine Rate bis dahin nichts: dann nur „later“.
  return {months:k,regular:c.monthly,catchUp:enough?0:k>0?euroUp(Math.ceil(Math.max(0,c.amount-saved)/k)):c.amount,onlyLater:!enough&&k===0,laterStart,firstLater};
}
export function applySinking(state,c,month,{mode='now',saved=0}={}){
  const o=sinkingOptions(c,month,saved),title=c.item.title;
  if(o.onlyLater)mode='later';
  let n=createPot(state,{name:potName(state,title),month,balance:saved,color:'#24483f'});
  const end=c.item.end||'',potId=n.pots.at(-1).id,first=mode==='later'&&o.catchUp&&!(end&&end<o.firstLater)?o.firstLater:c.next;
  const sCat=suggestCategory(n,'Sparen '+title,'saving').id,iCat=suggestCategory(n,'Rücklage '+title,'income').id;
  const withdrawal={title:(title+' aus Rücklage').slice(0,160),amount:c.amount,type:'income',category:iCat,frequency:c.item.frequency,start:first,end,note:'',potId,covers:c.key};
  if(c.item.frequency==='year')Object.assign(withdrawal,{annualPayment:true,cycleStart:first});
  else withdrawal.cycleStart=first;
  n=upsertItem(n,withdrawal,null,first);
  const save=(amount,start,stop,groupId)=>upsertItem(n,{title:('Rücklage '+title).slice(0,160),amount,type:'saving',category:sCat,frequency:'month',start,end:stop,note:'',potId,...(groupId?{groupId}:{})},null,start);
  if(mode==='now'&&o.catchUp){
    const lastCatch=shiftMonth(c.next,-1);
    n=save(o.catchUp,month,lastCatch,'');
    const firstRate=n.items.at(-1);
    firstRate.groupId=firstRate.id;
    if(!end||end>=c.next)n=save(o.regular,c.next,end,firstRate.id);
  }
  else if(first!==c.next)n=save(o.regular,o.laterStart,end,'');
  else n=save(o.regular,month,end,'');
  return n;
}

// Status einer Jahreskosten-Rücklage: nächste Entnahme, was bis dahin drin ist, ob es reicht.
export function sinkingStatus(state,potId,month){
  const ws=state.items.filter(i=>i.potId===potId&&i.type==='income'&&i.covers);
  if(!ws.length)return null;
  let next=null;
  for(const w of ws){
    const m=nextDue(state,w,month);
    if(m&&(!next||m<next.month))next={month:m,item:w};
  }
  if(!next)return {done:true};
  const pot=reserveSummary(state,next.month).pots.find(p=>p.id===potId),after=pot?.balance??0;
  return {month:next.month,title:next.item.title.replace(/ aus Rücklage$/,''),amount:next.item.amount,before:after+next.item.amount,short:after<0?-after:0};
}
