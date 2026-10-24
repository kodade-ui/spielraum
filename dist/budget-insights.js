// Erklärt, welche Planposten den freien Betrag gegenüber dem Vormonat verändern (Bereich Monat).
import {totals,shiftMonth,validMonth} from './planner.js';

export function planChanges(state,month){
  const previous=shiftMonth(month,-1);
  if(!validMonth(previous))return null;
  const now=totals(state,month),before=totals(state,previous),groups=new Map();
  for(const [items,sign] of [[now.items,1],[before.items,-1]])for(const i of items){
    const key=i.groupId||i.id,entry=groups.get(key)||{id:i.id,title:i.title,type:i.type,change:0};
    entry.change+=sign*i.monthlyAmount*(i.type==='income'?1:-1);
    groups.set(key,entry);
  }
  return {previous,delta:now.remaining-before.remaining,before:before.remaining,now:now.remaining,changes:[...groups.values()].filter(x=>x.change).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))};
}
