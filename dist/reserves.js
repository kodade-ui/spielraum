import {validate,uid,currentMonth,shiftMonth,validMonth,projected,legacyAnnual} from './planner.js';
export const RESERVE_BACKUP_KEY='spielraum.before-reserves-2026-09';
export function checkpointFor(pot,month){return [...pot.checkpoints].filter(c=>c.month<=month).sort((a,b)=>b.month.localeCompare(a.month))[0]||null;}
export function reserveSummary(state,month){
 const pots=(state.pots||[]).map(p=>({...p,checkpoint:checkpointFor(p,month),opening:0,deposits:0,withdrawals:0,balance:0,movements:[]}));
 const eligible=pots.filter(p=>p.checkpoint),first=eligible.map(p=>p.checkpoint.month).sort()[0];
 if(first){for(const p of eligible)p.balance=p.checkpoint.balance;
  for(let m=first;m<=month;m=shiftMonth(m,1)){
   if(m===month)for(const p of eligible)p.opening=p.balance;
   for(const i of projected(state,m)){if(!i.potId)continue;const p=pots.find(p=>p.id===i.potId);if(!p?.checkpoint||m<p.checkpoint.month)continue;
    const delta=i.type==='saving'?i.monthlyAmount:-i.monthlyAmount;p.balance+=delta;
    if(m===month){p.movements.push(i);if(delta>=0)p.deposits+=delta;else p.withdrawals-=delta;}
   }
  }
 }
 return {pots,opening:pots.reduce((n,p)=>n+p.opening,0),deposits:pots.reduce((n,p)=>n+p.deposits,0),withdrawals:pots.reduce((n,p)=>n+p.withdrawals,0),balance:pots.reduce((n,p)=>n+p.balance,0)};
}
export function createPot(state,{name,balance=0,month=currentMonth(),color='#7c6bd6',goal=0,note=''}){
 const n=structuredClone(state);n.pots??=[];name=String(name).trim();if(!name)throw Error('Bitte einen Namen für den Topf eingeben.');if(n.pots.some(p=>p.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de')))throw Error('Diesen Topfnamen gibt es schon.');
 n.pots.push({id:uid(),name,color,goal,note,checkpoints:[{month,balance}]});return validate(n);
}
export function correctPot(state,id,month,balance){const n=structuredClone(state),pot=n.pots.find(p=>p.id===id);if(!pot)throw Error('Dieser Topf ist nicht mehr vorhanden.');if(!validMonth(month))throw Error('Bitte einen gültigen Monat wählen.');pot.checkpoints=pot.checkpoints.filter(c=>c.month!==month);pot.checkpoints.push({month,balance});pot.checkpoints.sort((a,b)=>a.month.localeCompare(b.month));return validate(n);}
export function reserveForecast(state,month,count=6){return Array.from({length:count},(_,i)=>shiftMonth(month,i)).filter(validMonth).map(m=>({month:m,...reserveSummary(state,m)}));}
// Timing is optional and never changes the full-month planning calculation.
export function paymentSchedule(state,month){
 const last=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 return projected(state,month).filter(i=>i.type!=='income'||i.potId).map(i=>({...i,day:!legacyAnnual(i)&&i.paymentDay?Math.min(last,i.paymentDay):null,kind:i.potId&&i.type==='income'?'withdrawal':i.type==='saving'?'deposit':'expense'})).sort((a,b)=>(a.day??32)-(b.day??32)||a.title.localeCompare(b.title,'de'));
}
