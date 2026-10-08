import {uid,validMonth,shiftMonth,validate} from './planner.js';
import {newVariant,evaluateScenario,saveDecision,adoptScenario} from './scenarios.js';
// A goal check is transient until its explicit adoption. Existing records are never migrated.
export function purchaseDraft(state,goalId,input) {
  const goal=state.goals.find(g=>g.id===goalId);
  if(!goal)throw Error('Dieses Ziel fehlt.');
  const {month,price,running=0,funding=0,potId='',minFree=0,category}=input;
  if(!validMonth(month)||month>'2100-01')throw Error('Bitte einen Kaufmonat bis Januar 2100 wählen.');
  if([price,running,funding,minFree].some(v=>!Number.isSafeInteger(v)||v<0||v>100000000000)||!price)throw Error('Bitte gültige Beträge eingeben.');
  if(funding>price||funding&&!potId)throw Error('Die Topfentnahme benötigt einen Topf und darf höchstens dem Kaufpreis entsprechen.');
  if(!state.categories.some(c=>c.id===category))throw Error('Bitte eine Kategorie wählen.');
  const id='purchase_'+goal.id;
  if(state.decisions?.some(d=>d.id===id&&d.applied))throw Error('Dieser Kauf wurde bereits eingeplant. Öffne zuerst seine Übernahme.');
  if(state.monthClosures?.some(c=>c.month===month))throw Error('Dieser Monat ist abgeschlossen. Wähle einen offenen Monat.');
  const v=newVariant('Kaufplan',month),line=(title,amount,type,frequency,pot='')=>({id:uid(),title:title.slice(0,160),amount,type,frequency,start:month,end:'',category,note:'',...(pot?{potId:pot}:{})});
  v.lines.push(line(goal.title,price,'expense','once'));
  if(running)v.lines.push(line('Folgekosten · '+goal.title,running,'expense','month'));
  if(funding)v.lines.push(line('Aus Rücklage · '+goal.title,funding,'income','once',potId));
  const d={id,title:goal.title.slice(0,100),start:month,minFree,protected:structuredClone(state.timeline?.protected||[]),variants:[v]};
  validate({...structuredClone(state),decisions:[...(state.decisions||[]).filter(x=>x.id!==id),d]});
  return d;
}
export function checkPurchase(state,goalId,input,{search=true}={}) {
  const decision=purchaseDraft(state,goalId,input),base=evaluateScenario(state,decision),result=evaluateScenario(state,decision,decision.variants[0]);
  let later=null;
  if(search&&result.violations.length)for(let i=1;i<=24;i++){
    const month=shiftMonth(input.month,i);
    if(month>'2100-01')break;
    try{
      const d=purchaseDraft(state,goalId,{...input,month}),r=evaluateScenario(state,d,d.variants[0]);
      if(!r.violations.length){
        later=month;
        break;
      }
    }catch{}
  }
  return {decision,base,result,later};
}
export function adoptPurchase(state,decision){
  if(state.decisions?.some(d=>d.id===decision.id&&d.applied))throw Error('Dieser Kauf ist bereits eingeplant.');
  if(state.monthClosures?.some(c=>c.month===decision.start))throw Error('Dieser Monat ist abgeschlossen.');
  const r=evaluateScenario(state,decision,decision.variants[0]);
  if(r.violations.length)throw Error('Dieser Kauf unterschreitet Deine Grenzen. Bitte Betrag oder Zeitpunkt anpassen.');
  return adoptScenario(saveDecision(state,decision),decision.id,decision.variants[0].id);
}
