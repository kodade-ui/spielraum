import {uid,validate,validMonth,shiftMonth,projected,upsertItem,removeItem} from './planner.js';
import {reserveSummary,createPot} from './reserves.js';
import {suggestCategory} from './intelligence.js';
export const monthsBetween=(a,b)=>(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+Number(b.slice(5))-Number(a.slice(5));
export const MAX_RATE_MONTHS=120;
const euroUp=c=>Math.ceil(c/100)*100;
export function saveGoal(state,draft,id=null){
  const n=structuredClone(state);
  n.goals??=[];
  if(id&&!n.goals.some(g=>g.id===id))throw Error('Dieses Ziel wurde inzwischen entfernt.');
  const goal={...(id?n.goals.find(g=>g.id===id):{}),...draft,id:id||uid()};
  if(id)n.goals=n.goals.map(g=>g.id===id?goal:g);
  else n.goals.push(goal);
  return validate(n);
}
export function goalProgress(state,goal,month){
  const pot=goal.potId?reserveSummary(state,month).pots.find(p=>p.id===goal.potId):null;
  const balance=pot?.balance||0,covered=Math.min(goal.price,Math.max(0,balance)),missing=Math.max(0,goal.price-balance);
  const future=!!goal.deadline&&validMonth(goal.deadline)&&goal.deadline>=month;
  const targetPot=future&&pot?reserveSummary(state,goal.deadline).pots.find(p=>p.id===pot.id):null;
  const deadlineBalance=targetPot?.balance||0,rateStart=targetPot?.checkpoint?.month>month?targetPot.checkpoint.month:month,months=future&&targetPot?.checkpoint?monthsBetween(rateStart,goal.deadline)+1:0;
  // Extra rate includes the selected month: its existing contribution is already in deadlineBalance.
  const extra=months?Math.ceil(Math.max(0,goal.price-deadlineBalance)/months):null;
  return {rateStart,pot,balance,covered,missing,percent:Math.round(covered/goal.price*100),months,deadlineBalance,extra,overdue:!!goal.deadline&&goal.deadline<month};
}

// ---- Sparen ab 3.3: Topf füllen per fester Monatsrate oder per Einzahlung, wann es passt ----

// Eindeutiger Topfname aus einem Titel.
export function potName(state,title){
  let name=title.slice(0,80),k=1;
  while(state.pots.some(p=>p.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de')))name=title.slice(0,70)+' ('+(++k)+')';
  return name;
}
// Ein Ziel ohne Topf (früherer „Wunsch“) bekommt beim ersten Geld einen eigenen Topf.
export function ensureGoalPot(state,goalId,month,balance=0){
  const g=state.goals.find(x=>x.id===goalId);
  if(!g)throw Error('Dieses Ziel ist nicht mehr vorhanden.');
  if(g.potId)return {state,potId:g.potId};
  let n=createPot(state,{name:potName(state,g.title),month,balance,color:'#24483f'});
  const potId=n.pots.at(-1).id;
  n=saveGoal(n,{...g,potId},g.id);
  return {state:n,potId};
}
// Laufende oder kommende feste Monatsrate eines Topfs (Einmalbeträge zählen nicht).
export function potRate(state,potId,month){
  const now=projected(state,month).find(i=>i.potId===potId&&i.type==='saving'&&i.frequency==='month');
  if(now)return {amount:now.amount,start:now.start,end:now.end||'',id:now.id,running:true};
  const next=state.items.filter(i=>i.potId===potId&&i.type==='saving'&&i.frequency==='month'&&i.start>month).sort((a,b)=>a.start.localeCompare(b.start))[0];
  return next?{amount:next.amount,start:next.start,end:next.end||'',id:next.id,running:false}:null;
}
// Feste Monatsraten des Topfs ab „from“ beenden; frühere Monate bleiben, Einmalbeträge bleiben.
export function withoutRates(state,potId,from){
  let n=state;
  const series=new Map();
  for(const i of state.items)if(i.potId===potId&&i.type==='saving'&&i.frequency==='month'&&(!i.end||i.end>=from))series.set(i.groupId||i.id,i.id);
  for(const id of series.values())if(n.items.some(i=>i.id===id))n=removeItem(n,id,from);
  return n;
}
const balanceAt=(state,potId,m)=>reserveSummary(state,m).pots.find(p=>p.id===potId)?.balance||0;
// Rechnet Termin → Rate oder Rate → Termin. Ohne Topf (neues Ziel) zählt „saved“ als Bestand ab Start.
// Ergebnis: rate (ganze Euro), end (letzter Sparmonat), months; done = schon gedeckt; tooLong = über zehn Jahre.
export function planRate(state,{potId='',price,start,deadline='',rate=0,saved=0}){
  if(!validMonth(start))throw Error('Bitte einen gültigen Startmonat wählen.');
  const base=potId?withoutRates(state,potId,start):state;
  const bal=m=>potId?balanceAt(base,potId,m):saved;
  if(deadline){
    if(!validMonth(deadline)||deadline<start)throw Error('Der Termin muss im Startmonat oder danach liegen.');
    const months=monthsBetween(start,deadline)+1,need=price-bal(deadline);
    if(need<=0)return {rate:0,end:deadline,months,done:true};
    return {rate:euroUp(Math.ceil(need/months)),end:deadline,months,done:false,tooLong:months>MAX_RATE_MONTHS};
  }
  if(!Number.isSafeInteger(rate)||rate<=0)throw Error('Bitte eine Monatsrate größer als 0 eingeben.');
  if(bal(start)>=price)return {rate:0,end:start,months:0,done:true};
  for(let k=0;k<MAX_RATE_MONTHS;k++){
    const m=shiftMonth(start,k);
    if(bal(m)+rate*(k+1)>=price)return {rate,end:m,months:k+1,done:false};
  }
  return {rate,end:'',months:MAX_RATE_MONTHS,done:false,tooLong:true};
}
// Neue feste Rate ab „start“ (ersetzt eine bestehende ab dort). end leer = ohne Ende. rate 0 = nur beenden.
export function applyRate(state,{potId,title,rate,start,end=''}){
  if(!state.pots.some(p=>p.id===potId))throw Error('Dieser Topf ist nicht mehr vorhanden.');
  let n=withoutRates(state,potId,start);
  if(!rate)return validate(n);
  const once=end&&end===start;
  return upsertItem(n,{title:('Sparen für '+title).slice(0,160),amount:rate,type:'saving',category:suggestCategory(n,'Sparen '+title,'saving').id,frequency:once?'once':'month',start,end:once?'':end,note:'',potId},null,start);
}
// Einzahlung, wann es passt: ein einmaliger Sparposten im gewählten Monat.
export function addDeposit(state,{potId,title,amount,month}){
  if(!state.pots.some(p=>p.id===potId))throw Error('Dieser Topf ist nicht mehr vorhanden.');
  if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Bitte einen Betrag größer als 0 eingeben.');
  if(!validMonth(month))throw Error('Bitte einen gültigen Monat wählen.');
  return upsertItem(state,{title:('Einzahlung '+title).slice(0,160),amount,type:'saving',category:suggestCategory(state,'Sparen '+title,'saving').id,frequency:'once',start:month,end:'',note:'',potId},null,month);
}
// Neues Ziel in einem Schritt: Topf mit vorhandenem Geld, Ziel, optional feste Rate.
export function createGoal(state,{title,price,saved=0,month,deadline='',note='',rate=null}){
  title=String(title||'').trim();
  if(!title||!Number.isSafeInteger(price)||price<=0)throw Error('Bitte einen Namen und einen Zielbetrag größer als 0 eingeben.');
  if(!Number.isSafeInteger(saved)||saved<0)throw Error('Bitte beim angesparten Betrag 0 oder mehr eingeben.');
  let n=createPot(state,{name:potName(state,title),month,balance:saved,color:'#24483f'});
  const potId=n.pots.at(-1).id;
  n=saveGoal(n,{title,price,deadline:rate?.end||deadline||'',potId,note,status:'active'});
  if(rate?.rate)n=applyRate(n,{potId,title,rate:rate.rate,start:rate.start,end:rate.end});
  return n;
}
