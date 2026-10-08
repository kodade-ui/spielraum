import {uid,validate,projected} from './planner.js';
export function actualSummary(state,month){
  const entries=(state.actualExpenses||[]).filter(x=>x.date.slice(0,7)===month&&(!x.kind||x.kind==='expense')).sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title,'de'));
  const plan=projected(state,month).filter(i=>i.type==='expense');
  const categories=state.categories.map(c=>({...c,value:entries.filter(x=>x.category===c.id).reduce((n,x)=>n+x.amount,0),planned:plan.filter(x=>x.category===c.id).reduce((n,x)=>n+x.monthlyAmount,0)})).filter(c=>c.value||c.planned).sort((a,b)=>b.value-a.value||b.planned-a.planned);
  return {entries,categories,total:entries.reduce((n,x)=>n+x.amount,0),planned:plan.reduce((n,x)=>n+x.monthlyAmount,0)};
}
export function saveActual(state,draft,id=null){
  const n=structuredClone(state);
  n.actualExpenses??=[];
  if(id&&!n.actualExpenses.some(x=>x.id===id))throw Error('Diese Ausgabe wurde inzwischen entfernt.');
  const item={...(id?n.actualExpenses.find(x=>x.id===id):{}),...draft,id:id||uid()};
  if(id)n.actualExpenses=n.actualExpenses.map(x=>x.id===id?item:x);
  else n.actualExpenses.push(item);
  return validate(n);
}
