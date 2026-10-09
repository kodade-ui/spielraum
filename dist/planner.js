import {validatePlanning} from './planning-schema.js';
import {validateDecisions} from './scenarios-schema.js';
import { validate as validateLegacy } from './legacy.js';
export const KEY = 'spielraum.v2';
export const LEGACY_KEY = 'spielraum.v1';
export const COLORS = ['#7c6bd6', '#e79058', '#5d9da4', '#d57697', '#82975b', '#6490cf', '#bd865a', '#9a94a8'];
export const uid = () => crypto.randomUUID();
export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
};
export const validMonth = m => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m >= '2000-01' && m <= '2100-12';
export const shiftMonth = (m, n) => {
  const d=new Date(Number(m.slice(0,4)),Number(m.slice(5))-1+n,1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
};
export const monthName = (m, short=false) => new Intl.DateTimeFormat('de-DE',{month:short?'short':'long',year:'numeric'}).format(new Date(m+'-01T12:00:00'));
export const euro = n => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n/100);
export const amountText = n => new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100);
export const compact = n => new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(n/100);
export const fieldMoney = n => (n/100).toFixed(2).replace('.',',');
export { money } from './legacy.js';
export function blank() {
  return {version:2,items:[],skips:[],categories:['Wohnen','Lebensmittel','Mobilität','Freizeit','Shopping','Gesundheit','Abos & Verträge','Sonstiges'].map((name,i)=>({id:'c'+i,name,color:COLORS[i]})),legacy:{budgets:{},limits:{},complete:{}},settings:{lastBackup:null,migrated:false,migrationSeen:false},revision:0,updatedAt:null};
}
export function validDate(d) {
  return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&validMonth(d.slice(0,7))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
}
export function validate(s) {
  const fail=()=>{
    throw Error('Die Datei ist kein gültiges Spielraum-Backup.');
  };
  const amount=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000000;
  const text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
  const id=v=>text(v,100)&&/^[a-zA-Z0-9_-]+$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(!s||s.version!==2||!Array.isArray(s.items)||s.items.length>100000||!Array.isArray(s.categories)||s.categories.length<1||s.categories.length>100||!Array.isArray(s.skips)||s.skips.length>100000||!obj(s.settings)||!Number.isSafeInteger(s.revision)||s.revision<0)fail();
  if(!(s.updatedAt===null||typeof s.updatedAt==='string')||!(s.settings.lastBackup===null||typeof s.settings.lastBackup==='string'))fail();
  const cats=new Set();
  for(const c of s.categories){
    if(!id(c.id)||cats.has(c.id)||!text(c.name,45)||!/^#[0-9a-f]{6}$/i.test(c.color))fail();
    cats.add(c.id);
  }
  if(s.actualExpenses!==undefined){
    if(!Array.isArray(s.actualExpenses)||s.actualExpenses.length>100000)fail();
    const seen=new Set();
    for(const x of s.actualExpenses){
      if(!id(x.id)||seen.has(x.id)||!text(x.title,160)||!amount(x.amount)||x.amount===0||!validDate(x.date)||!cats.has(x.category)||typeof x.note!=='string'||x.note.length>1000)fail();
      seen.add(x.id);
    }
  }
  for(const i of s.items)if(i.paymentDay!==undefined&&(!Number.isInteger(i.paymentDay)||i.paymentDay<1||i.paymentDay>31))fail();
  const pots=new Set();
  if(s.pots!==undefined){
    if(!Array.isArray(s.pots)||s.pots.length>100)fail();
    for(const p of s.pots){
      if(!id(p.id)||pots.has(p.id)||!text(p.name,80)||!/^#[0-9a-f]{6}$/i.test(p.color)||!amount(p.goal)||typeof p.note!=='string'||p.note.length>1000||!Array.isArray(p.checkpoints)||!p.checkpoints.length||p.checkpoints.length>1212)fail();
      pots.add(p.id);
      const months=new Set();
      for(const c of p.checkpoints){
        if(!validMonth(c.month)||months.has(c.month)||!amount(c.balance))fail();
        months.add(c.month);
      }
    }
  }
  if(s.goals!==undefined){
    if(!Array.isArray(s.goals)||s.goals.length>1000)fail();
    const goalIds=new Set(),allocated=new Set();
    for(const g of s.goals){
      if(!id(g.id)||goalIds.has(g.id)||!text(g.title,100)||!amount(g.price)||g.price===0||!['active','done'].includes(g.status)||typeof g.note!=='string'||g.note.length>1000||(g.deadline&&!validMonth(g.deadline))||(g.potId&&!pots.has(g.potId)))fail();
      goalIds.add(g.id);
      if(g.potId&&g.status==='active'){
        if(allocated.has(g.potId))throw Error('Ein Rücklagentopf kann nur einem offenen Ziel zugeordnet sein.');
        allocated.add(g.potId);
      }
    }
  }
  const ids=new Set();
  for(const item of s.items){
    if(!id(item.id)||ids.has(item.id)||!text(item.title,160)||!amount(item.amount)||item.amount===0||!['income','expense','saving'].includes(item.type)||!['month','quarter','year','once'].includes(item.frequency)||!validMonth(item.start)||(item.end&&(!validMonth(item.end)||item.end<item.start))||!cats.has(item.category)||typeof item.note!=='string'||item.note.length>1000||(item.source&&item.source!=='legacy-budget')||(item.source==='legacy-budget'&&!amount(item.defaultAmount))||(item.groupId&&!id(item.groupId))||(item.cycleStart!==undefined&&!validMonth(item.cycleStart))||(item.annualPayment!==undefined&&typeof item.annualPayment!=='boolean'))fail();
    ids.add(item.id);
  }
  for(const i of s.items)if(i.potId&&(!pots.has(i.potId)||!['saving','income'].includes(i.type)||i.source))fail();
  // Jahreskosten-Rücklage (ab 3.3): Entnahme verweist auf die Postengruppe der Ausgabe, die sie deckt.
  for(const i of s.items)if(i.covers!==undefined&&(!id(i.covers)||i.type!=='income'||!i.potId))fail();
  for(const k of s.skips){
    if(typeof k!=='string'||!k.includes('@')||!id(k.split('@')[0])||!validMonth(k.split('@')[1])||k.split('@').length!==2)fail();
  }
  if(!obj(s.legacy)||!obj(s.legacy.budgets)||!obj(s.legacy.limits)||!obj(s.legacy.complete))fail();
  for(const [m,a]of Object.entries(s.legacy.budgets))if(!validMonth(m)||!amount(a))fail();
  for(const [m,limits]of Object.entries(s.legacy.limits)){
    if(!validMonth(m)||!obj(limits))fail();
    for(const [cat,a]of Object.entries(limits))if(!cats.has(cat)||!amount(a))fail();
  }
  for(const [m,v]of Object.entries(s.legacy.complete))if(!validMonth(m)||typeof v!=='boolean')fail();
  for(const c of s.categories){
    if(c.keywords!==undefined&&(typeof c.keywords!=='string'||c.keywords.length>1000))fail();
    if(c.group&&!['income','expense','saving','all'].includes(c.group))fail();
    if(c.pace&&!['fixed','spread'].includes(c.pace))fail();
    if(c.limit!==undefined&&!amount(c.limit))fail();
  }
  for(const i of s.items)if(i.pace&&!['fixed','spread'].includes(i.pace))fail();
  if(s.settings.analysis){
    if(!obj(s.settings.analysis)||!amount(s.settings.analysis.buffer)||!amount(s.settings.analysis.savingTarget))fail();
  }
  // Wunsch-Fahrplan (3.2, seit 3.3 ohne Oberfläche): gespeicherte Einstellung bleibt gültig, damit alte Backups weiter einlesbar sind.
  if(s.settings.wishPlan!==undefined){
    const w=s.settings.wishPlan;
    if(!obj(w)||!amount(w.monthly)||w.monthly>100000000||!Array.isArray(w.order)||w.order.length>1000||w.order.some(x=>!id(x)))fail();
  }
  if(s.settings.sinkingDismissed!==undefined&&(!Array.isArray(s.settings.sinkingDismissed)||s.settings.sinkingDismissed.length>1000||s.settings.sinkingDismissed.some(x=>!id(x))))fail();
  if(s.settings.assignments){
    if(!obj(s.settings.assignments)||Object.keys(s.settings.assignments).length>100000)fail();
    for(const [k,v]of Object.entries(s.settings.assignments))if(k.length>180||!cats.has(v))fail();
  }
  if(s.snapshots){
    if(!obj(s.snapshots)||Object.keys(s.snapshots).length>1212)fail();
    for(const [m,v]of Object.entries(s.snapshots)){
      if(!validMonth(m)||!obj(v)||!['income','expense','saving','fixed','variable'].every(k=>amount(v[k]))||!Number.isSafeInteger(v.remaining)||v.remaining!==v.income-v.expense-v.saving||v.fixed+v.variable!==v.expense||!Array.isArray(v.categoryTotals)||v.categoryTotals.some(c=>!id(c.id)||!text(c.name,45)||!amount(c.value))||typeof v.capturedAt!=='string')fail();
    }
  }
  validateDecisions(s);
  validatePlanning(s);
  return s;
}
export function migrate(old) {
  validateLegacy(old);
  const s=blank();
  s.categories=structuredClone(old.categories);
  s.skips=[...old.skips];
  s.settings.lastBackup=old.settings.lastBackup;
  s.settings.migrated=true;
  for(const t of old.transactions)s.items.push({id:t.id,title:t.title,amount:t.amount,type:t.type,category:t.category,note:t.note,frequency:'once',start:t.date.slice(0,7),end:'',originalDate:t.date});
  for(const r of old.rules)s.items.push({id:r.id,title:r.title,amount:r.amount,type:r.type,category:r.category,note:r.note,frequency:r.interval,start:r.date.slice(0,7),end:r.end?r.end.slice(0,7):'',originalDate:r.date});
  for(const [m,p]of Object.entries(old.plans)){
    s.legacy.budgets[m]=p.amount;
    s.legacy.limits[m]=p.limits;
    s.legacy.complete[m]=p.complete;
  }
  const hasBudget=old.settings.defaultBudget>0||Object.values(old.plans).some(p=>p.amount>0);
  if(hasBudget)s.items.push({id:uid(),title:'Übernommener Monatsrahmen',amount:old.settings.defaultBudget||1,type:'income',category:s.categories.at(-1).id,note:'Dein bisheriger Budgetrahmen. Wird nur verwendet, solange für diesen Monat keine eigenen Einnahmen angelegt sind.',frequency:'month',start:'2000-01',end:'',source:'legacy-budget',defaultAmount:old.settings.defaultBudget});
  return validate(s);
}
export function parseBackup(raw) {
  const parsed=typeof raw==='string'?JSON.parse(raw):raw;
  return parsed.version===1?migrate(parsed):validate(parsed);
}
// Unconfirmed annual entries retain their historical monthly share until their payment month is chosen.
export const legacyAnnual = item => item.frequency==='year'&&!item.annualPayment;
export function active(item,m) {
  if(item.start>m||(item.end&&item.end<m)||(item.frequency==='once'&&item.start!==m))return false;
  const interval=item.frequency==='quarter'?3:item.frequency==='year'&&item.annualPayment?12:0;
  if(!interval)return true;
  const anchor=item.cycleStart||item.start,delta=(Number(m.slice(0,4))-Number(anchor.slice(0,4)))*12+Number(m.slice(5))-Number(anchor.slice(5));
  return delta>=0&&delta%interval===0;
}
export function resolveExpensePlan(state,plan,entry){
  if(entry.kind&&entry.kind!=='expense')return null;
  const exact=plan.find(i=>i.id===entry.planItemId);
  if(exact)return exact;
  const previous=state.items.find(i=>i.id===entry.planItemId),group=entry.planGroupId||previous?.groupId||previous?.id;
  if(!group)return null;
  const matches=plan.filter(i=>(i.groupId||i.id)===group);
  return matches.length===1?matches[0]:null;
}
export function projected(s,m) {
  const skip=new Set(s.skips);
  const ownIncome=s.items.some(i=>i.type==='income'&&!i.source&&!i.potId&&active(i,m)&&!skip.has(i.id+'@'+m));
  return s.items.filter(i=>active(i,m)&&!skip.has(i.id+'@'+m)&&!(i.source==='legacy-budget'&&ownIncome)).map(i=>{
    const amount=i.source==='legacy-budget'?(s.legacy.budgets[m]??i.defaultAmount??i.amount):legacyAnnual(i)?Math.round(i.amount/12):i.amount;
    return {...i,monthlyAmount:amount};
  }).filter(i=>!i.source||i.monthlyAmount>0);
}
export function totals(s,m) {
  const items=projected(s,m),sum=type=>items.filter(i=>i.type===type).reduce((n,i)=>n+i.monthlyAmount,0),income=sum('income'),expense=sum('expense'),saving=sum('saving');
  return {items,income,expense,saving,reserveWithdrawals:items.filter(i=>i.type==='income'&&i.potId).reduce((n,i)=>n+i.monthlyAmount,0),remaining:income-expense-saving,planned:expense+saving,annualShare:items.filter(i=>legacyAnnual(i)&&i.type==='expense').reduce((n,i)=>n+i.monthlyAmount,0)};
}
export function distribution(s,m,mode='all') {
  const t=totals(s,m),byType=type=>s.categories.map(c=>({...c,id:type==='saving'?'saving_'+c.id:c.id,name:type==='saving'&&mode==='all'?c.name+' · Rücklage':c.name,value:t.items.filter(i=>i.type===type&&i.category===c.id).reduce((n,i)=>n+i.monthlyAmount,0)})).filter(c=>c.value>0).sort((a,b)=>b.value-a.value);
  if(mode==='saving')return byType('saving');
  const out=byType('expense');
  if(mode==='all'){
    out.push(...byType('saving'));
    if(t.remaining>0)out.push({id:'__remaining',name:'Freier Betrag',color:'#bfdca7',value:t.remaining});
  }
  return out;
}
export function forecast(s,m,n=6) {
  return Array.from({length:n},(_,i)=>{
    const month=shiftMonth(m,i);
    return {month,...totals(s,month)};
  }).filter(x=>validMonth(x.month));
}
export function removeItem(s,id,m) {
  const n=structuredClone(s),item=n.items.find(i=>i.id===id);
  if(!item)throw Error('Dieser Posten ist nicht mehr vorhanden.');
  const group=item.groupId||item.id,removed=new Set();
  n.items=n.items.filter(i=>{
    const related=item.frequency==='once'?i.id===id:(i.groupId||i.id)===group;
    if(!related)return true;
    if(i.frequency!=='once'&&i.start<m){
      i.end=i.end&&i.end<shiftMonth(m,-1)?i.end:shiftMonth(m,-1);
      return true;
    }
    if(i.start>=m){
      removed.add(i.id);
      return false;
    }
    return true;
  });
  n.skips=n.skips.filter(k=>!removed.has(k.split('@')[0]));
  return n;
}
export function upsertItem(s,draft,id=null,m=currentMonth(),scope='future') {
  const n=structuredClone(s),old=id?n.items.find(i=>i.id===id):null;
  if(id&&!old)throw Error('Dieser Posten wurde inzwischen geändert oder entfernt.');
  draft={...draft};
  if(draft.frequency==='year'&&draft.annualPayment===undefined)draft.annualPayment=old?.frequency==='year'?!!old.annualPayment:true;
  if(draft.frequency==='quarter'||draft.frequency==='year'&&draft.annualPayment)draft.cycleStart=draft.cycleStart||(old?.frequency===draft.frequency?(old.cycleStart||old.start):draft.start);
  else delete draft.cycleStart;
  if(draft.frequency!=='year')delete draft.annualPayment;
  if(old&&scope==='once'&&old.frequency!=='once'){
    if(!n.skips.includes(id+'@'+m))n.skips.push(id+'@'+m);
    n.items.push({...draft,id:uid(),groupId:old.groupId||old.id,amount:legacyAnnual(draft)?Math.round(draft.amount/12):draft.amount,frequency:'once',start:m,end:''});
  }
  else if(old&&old.frequency!=='once'&&old.start<m){
    const end=old.end;
    const groupId=old.groupId||old.id;
    old.groupId=groupId;
    old.end=shiftMonth(m,-1);
    n.items.push({...draft,id:uid(),groupId,start:m,end:draft.end||end||''});
  }
  else if(old)n.items=n.items.map(i=>i.id===id?{...draft,id,...(old.groupId?{groupId:old.groupId}:{})}:i);
  else n.items.push({...draft,id:uid()});
  return validate(n);
}
export function demo() {
  const s=blank(),m=currentMonth();
  const add=(title,amount,type,category,frequency='month',start=m)=>s.items.push({id:uid(),title,amount,type,category,frequency,start,end:'',note:'',...(frequency==='year'?{annualPayment:true}: {})});
  add('Nettogehalt',280000,'income','c7');
  add('Miete & Nebenkosten',82000,'expense','c0');
  add('Lebensmittel',32000,'expense','c1');
  add('Cafés & Essen gehen',14000,'expense','c3');
  add('Mobilität',6300,'expense','c2');
  add('Sport & Freizeit',6500,'expense','c3');
  add('Streaming & Telefon',4900,'expense','c6');
  add('Kleidung',8000,'expense','c4');
  add('Versicherungen',24000,'expense','c6','year');
  add('Urlaub',15000,'saving','c7');
  add('Sparrate',20000,'saving','c7');
  add('Neuer Kopfhörer',12000,'expense','c4','once');
  return s;
}
