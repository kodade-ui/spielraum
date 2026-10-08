import {uid,validate,shiftMonth,validMonth,totals,removeItem,projected,active} from './planner.js';
import {reserveSummary,checkpointFor} from './reserves.js';
const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
export function newVariant(name,start){
  return {id:uid(),name,lines:[],removedIds:[],stress:{monthly:0,once:0,month:shiftMonth(start,5),potId:''}};
}
export function saveDecision(state,decision){
  const n=structuredClone(state);
  n.decisions??=[];
  const i=n.decisions.findIndex(x=>x.id===decision.id);
  if(i>=0)n.decisions[i]=structuredClone(decision);
  else n.decisions.push(structuredClone(decision));
  return validate(n);
}
export function scenarioPlan(state,d,v,stress=false){
  if(d.applied)throw Error('Diese Entscheidung ist bereits übernommen. Nimm sie zuerst zurück, um erneut zu vergleichen.');
  let n=structuredClone(state);
  const cat=state.categories.find(c=>c.group==='expense')?.id||state.categories[0].id;
  for(const p of d.protected)if(!state.pots.some(x=>x.id===p.potId))throw Error('Ein geschützter Topf fehlt. Bitte die Grenzen der Entscheidung bearbeiten.');
  const removedGroups=new Set();
  for(const id of v.removedIds){
    const item=state.items.find(i=>i.id===id);
    if(!item)throw Error('Ein auszuschließender Posten wurde verändert oder gelöscht. Bitte die Variante bearbeiten.');
    const group=item.frequency==='once'?item.id:item.groupId||item.id;
    if(removedGroups.has(group))continue;
    n=removeItem(n,id,d.start);
    removedGroups.add(group);
  }
  const added=[];
  function add(l,key){
    if(!state.categories.some(c=>c.id===l.category))throw Error('Eine Kategorie fehlt. Bitte den Szenarioposten bearbeiten.');
    if(l.potId){
      const p=state.pots.find(p=>p.id===l.potId);
      if(!p||!checkpointFor(p,l.start))throw Error('Der zugeordnete Topf fehlt oder beginnt erst nach der Zahlung. Bitte die Topfzuordnung prüfen.');
    }
    const base={...l,id:'sim_'+d.id+'_'+key,note:'Entscheidung: '+d.title,...(l.type==='expense'?{potId:undefined}:{})};
    added.push(base);
    if(l.type==='expense'&&l.potId)added.push({...base,id:base.id+'_fund',title:('Aus Topf: '+l.title).slice(0,160),type:'income',potId:l.potId});
  }
  for(const l of v.lines){
    if(l.type==='income'&&!l.potId&&Array.from({length:12},(_,i)=>shiftMonth(d.start,i)).some(m=>active(l,m)&&projected(n,m).some(i=>i.source==='legacy-budget')))throw Error('Bitte den übernommenen Monatsrahmen zuerst im Monatsplan durch eine normale Einnahme ersetzen. Sonst würde eine zusätzliche Einnahme den alten Rahmen ablösen.');
    add(l,l.id);
  }
  if(stress){
    const t=v.stress;
    if(t.monthly)add({title:'Belastungstest · laufende Mehrkosten',amount:t.monthly,type:'expense',frequency:'month',start:d.start,end:'',category:cat,note:''},'stress_month');
    if(t.once)add({title:'Belastungstest · Sonderausgabe',amount:t.once,type:'expense',frequency:'once',start:t.month,end:'',category:cat,note:'',potId:t.potId},'stress_once');
  }
  // Replace generated IDs with deterministic, bounded IDs for comparison/preview.
  added.forEach((i,index)=>i.id='scenario_preview_'+index+'_'+d.id.slice(0,40));
  n.items.push(...added);
  validate(n);
  return {state:n,added};
}
export function evaluateScenario(state,d,v=null,stress=false){
  const n=v?scenarioPlan(state,d,v,stress).state:state;
  const rows=Array.from({length:12},(_,i)=>shiftMonth(d.start,i)).filter(validMonth).map(month=>({month,...totals(n,month),reserves:reserveSummary(n,month)}));
  const violations=[];
  for(const r of rows){
    if(r.remaining<d.minFree)violations.push({month:r.month,kind:'free',value:r.remaining,minimum:d.minFree});
    for(const p of r.reserves.pots){
      const protectedPot=d.protected.find(x=>x.potId===p.id),minimum=protectedPot?.minimum||0;
      if(p.balance<minimum)violations.push({month:r.month,kind:'pot',potId:p.id,name:p.name,value:p.balance,minimum});
    }
  }
  const goals=(state.goals||[]).filter(g=>g.status==='active').map(g=>{
    if(!g.potId)return {goal:g,reach:null,balance:null,missing:g.price};
    const reach=rows.find(r=>(r.reserves.pots.find(p=>p.id===g.potId)?.balance||0)>=g.price)?.month||null;
    const at=rows.find(r=>r.month===g.deadline)||rows.at(-1),balance=at.reserves.pots.find(p=>p.id===g.potId)?.balance||0;
    return {goal:g,reach,balance,missing:Math.max(0,g.price-balance),at:at.month};
  });
  const upfront=(v?v.lines.filter(l=>l.type==='expense'&&l.frequency==='once'&&l.start===d.start).reduce((n,l)=>n+l.amount,0):0)+(v&&stress&&v.stress.month===d.start?v.stress.once:0);
  return {rows,goals,upfront,violations,minRemaining:Math.min(...rows.map(r=>r.remaining)),average:Math.round(rows.reduce((n,r)=>n+r.remaining,0)/rows.length),freeTotal:rows.reduce((n,r)=>n+r.remaining,0),state:n};
}
export function adoptScenario(state,decisionId,variantId,stress=false){
  const d=state.decisions.find(x=>x.id===decisionId),v=d?.variants.find(x=>x.id===variantId);
  if(!d||!v)throw Error('Diese Variante ist nicht mehr vorhanden.');
  const {state:n}=scenarioPlan(state,d,v,stress);
  // Generated items receive permanent independent IDs; all prior-month items are retained by removeItem.
  const oldIds=new Set(state.items.map(i=>i.id));
  for(const i of n.items)if(!oldIds.has(i.id))i.id=uid();
  n.decisions.find(x=>x.id===d.id).applied=makeJournal(state,n,variantId,stress);
  return validate(n);
}
export function makeJournal(state,n,variantId='timeline',stress=false){
  const before=new Map(state.items.map(i=>[i.id,i])),after=new Map(n.items.map(i=>[i.id,i])),keys=new Set([...before.keys(),...after.keys()]);
  const changes=[...keys].filter(id=>!same(before.get(id),after.get(id))).map(id=>({id,before:before.get(id)||null,after:after.get(id)||null}));
  if(!changes.length)throw Error('Diese Variante enthält keine Änderungen am Monatsplan.');
  const groups=[...new Set(changes.flatMap(c=>[c.before,c.after].filter(Boolean).map(i=>i.groupId||i.id)))];
  const guardItems=n.items.filter(i=>groups.includes(i.groupId||i.id)),guardIds=new Set([...changes.map(c=>c.id),...guardItems.map(i=>i.id)]);
  return structuredClone({groups,guardItems,guardSkips:n.skips.filter(k=>guardIds.has(k.split('@')[0])),variantId,stress,at:new Date().toISOString(),changes,skipsAdded:n.skips.filter(k=>!state.skips.includes(k)),skipsRemoved:state.skips.filter(k=>!n.skips.includes(k))});
}
export function undoScenario(state,id){
  const d=state.decisions.find(x=>x.id===id),n=undoJournal(state,d?.applied);
  delete n.decisions.find(x=>x.id===id).applied;
  return validate(n);
}
export function undoJournal(state,a){
  if(!a)throw Error('Für diese Entscheidung gibt es keine Übernahme zurückzunehmen.');
  const related=state.items.filter(i=>a.groups.includes(i.groupId||i.id)),guardIds=new Set([...a.changes.map(c=>c.id),...a.guardItems.map(i=>i.id)]);
  if(!same(related,a.guardItems)||!same(state.skips.filter(k=>guardIds.has(k.split('@')[0])),a.guardSkips))throw Error('Betroffene Posten oder Monatsausnahmen wurden inzwischen geändert. Rücknahme gestoppt, damit neuere Änderungen erhalten bleiben.');
  for(const c of a.changes)if(!same(state.items.find(i=>i.id===c.id),c.after))throw Error('Ein betroffener Budgetposten wurde inzwischen geändert. Die Rücknahme wurde gestoppt, damit Deine neueren Änderungen erhalten bleiben.');
  for(const k of a.skipsAdded)if(!state.skips.includes(k))throw Error('Eine betroffene Monatsausnahme wurde inzwischen geändert.');
  for(const k of a.skipsRemoved)if(state.skips.includes(k))throw Error('Eine betroffene Monatsausnahme wurde inzwischen geändert.');
  const ids=new Set(a.changes.map(c=>c.id)),n=structuredClone(state);
  n.items=n.items.filter(i=>!ids.has(i.id));
  n.items.push(...a.changes.filter(c=>c.before).map(c=>structuredClone(c.before)));
  n.skips=n.skips.filter(k=>!a.skipsAdded.includes(k));
  n.skips.push(...a.skipsRemoved);
  return n;
}
