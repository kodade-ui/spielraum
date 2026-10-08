import {uid,validate,validMonth} from './planner.js';
import {reserveSummary} from './reserves.js';
export const monthsBetween=(a,b)=>(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+Number(b.slice(5))-Number(a.slice(5));
export function saveGoal(state,draft,id=null){const n=structuredClone(state);n.goals??=[];if(id&&!n.goals.some(g=>g.id===id))throw Error('Dieses Ziel wurde inzwischen entfernt.');const goal={...(id?n.goals.find(g=>g.id===id):{}),...draft,id:id||uid()};if(id)n.goals=n.goals.map(g=>g.id===id?goal:g);else n.goals.push(goal);return validate(n);}
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
