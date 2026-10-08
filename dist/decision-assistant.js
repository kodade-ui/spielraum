import {uid,shiftMonth,validMonth} from './planner.js';
import {evaluateScenario,saveDecision} from './scenarios.js';
const clone=x=>structuredClone(x);
export function pausableRates(state,start){
  return state.items.filter(i=>i.type==='saving'&&i.frequency==='month'&&i.start<=start&&(!i.end||i.end>=start)&&!i.groupId&&!state.items.some(x=>x.groupId===i.id)&&!state.skips.some(k=>k.startsWith(i.id+'@')));
}
export function suggestDecisions(state,d,v,{priceId='',runningIds=[],pauseIds=[],pauseMonths=6,maxDelay=24}={}){
  if(d.applied)throw Error('Bitte die übernommene Entscheidung zuerst zurücknehmen.');
  const evaluate=(decision,variant)=>{
    try{
      const result=evaluateScenario(state,decision,variant);
      return {ok:result.violations.length===0,result};
    }catch(e){
      return {ok:false,error:e.message};
    }
  },original=evaluate(d,v),out=[];
  const add=(kind,title,description,decision,variant)=>{
    const checked=evaluate(decision,variant);
    if(checked.ok)out.push({id:uid(),kind,title,description,decision,variant,result:checked.result});
  };
  if(priceId){
    const l=v.lines.find(l=>l.id===priceId);
    if(!l||l.type!=='expense'||l.frequency!=='once')throw Error('Bitte einen einmaligen Ausgabenposten auswählen.');
    let lo=0,hi=l.amount;
    const candidate=amount=>{
      const copy=clone(v);
      copy.lines=copy.lines.filter(x=>x.id!==priceId||amount>0).map(x=>x.id===priceId?{...x,amount}:x);
      return copy;
    };
    if(evaluate(d,candidate(0)).ok){
      while(lo<hi){
        const mid=Math.ceil((lo+hi)/2);
        if(evaluate(d,candidate(mid)).ok)lo=mid;
        else hi=mid-1;
      }
      if(lo>0){
        add('price','Preisrahmen',`Für „${l.title}“ sind höchstens ${lo} Cent vorgesehen. Alle anderen Annahmen bleiben gleich.`,clone(d),candidate(lo));
        out.at(-1).priceAmount=lo;
        out.at(-1).priceTitle=l.title;
      }
    }
  }
  if(runningIds.length){
    if(runningIds.some(id=>!v.lines.some(l=>l.id===id&&l.type==='expense'&&l.frequency!=='once')))throw Error('Die freigegebenen laufenden Kosten sind nicht mehr vorhanden.');
    const candidate=f=>{
      const copy=clone(v);
      copy.lines=copy.lines.map(l=>runningIds.includes(l.id)?{...l,amount:Math.floor(l.amount*f/10000)}:l).filter(l=>l.amount>0);
      return copy;
    };
    let lo=0,hi=10000;
    if(evaluate(d,candidate(0)).ok){
      while(lo<hi){
        const mid=Math.ceil((lo+hi)/2);
        if(evaluate(d,candidate(mid)).ok)lo=mid;
        else hi=mid-1;
      }
      add('running','Laufende Kosten begrenzen','Die ausgewählten laufenden Kosten werden im gleichen Verhältnis reduziert. Das ist eine rechnerische Obergrenze, kein verfügbares Angebot.',clone(d),candidate(lo));
    }
  }
  for(let delay=1;delay<=maxDelay;delay++){
    const next=clone(d),copy=clone(v);
    next.start=shiftMonth(d.start,delay);
    if(next.start>'2100-01')break;
    let valid=true;
    for(const l of copy.lines){
      l.start=shiftMonth(l.start,delay);
      if(l.cycleStart)l.cycleStart=shiftMonth(l.cycleStart,delay);
      if(l.end)l.end=shiftMonth(l.end,delay);
      if(!validMonth(l.start)||l.end&&!validMonth(l.end))valid=false;
    }
    copy.stress.month=shiftMonth(copy.stress.month,delay);
    if(valid&&evaluate(next,copy).ok){
      add('delay','Später beginnen','Alle Szenarioposten und das Ende entfallender Serien werden gemeinsam verschoben. Freies Geld gilt dabei nicht automatisch als angespart.',next,copy);
      break;
    }
  }
  if(pauseIds.length){
    const eligible=pausableRates(state,d.start);
    if(pauseIds.some(id=>!eligible.some(i=>i.id===id)))throw Error('Eine Sparrate hat Änderungen oder Monatsausnahmen. Bitte diese Rate direkt im Szenario anpassen.');
    const copy=clone(v);
    for(const id of pauseIds){
      const i=eligible.find(i=>i.id===id);
      if(!copy.removedIds.includes(id))copy.removedIds.push(id);
      const restart=shiftMonth(d.start,pauseMonths);
      if(validMonth(restart)&&(!i.end||i.end>=restart))copy.lines.push({...i,id:uid(),start:restart,note:'Nach ausdrücklich freigegebener Sparpause'});
    }
    add('pause','Freigegebene Sparpause',`Nur die von Dir ausgewählten Sparraten pausieren ${pauseMonths} Monate. Danach laufen sie wieder; mögliche Auswirkungen auf Wünsche siehst Du im Vergleich.`,clone(d),copy);
  }
  return {original,proposals:out};
}
export function saveSuggestion(state,proposal){
  const d=clone(proposal.decision);
  d.id=uid();
  d.title=(d.title+' · '+proposal.title).slice(0,100);
  const v=clone(proposal.variant);
  v.id=uid();
  v.name=proposal.title;
  v.lines=v.lines.map(l=>({...l,id:uid()}));
  d.variants=[v];
  delete d.applied;
  return saveDecision(state,d);
}
