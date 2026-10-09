// Wunsch-Fahrplan (ab 3.2): Wünsche (offene Ziele ohne Topf) nacheinander mit einem festen Monatsbetrag ansparen.
// Reine Rechenlogik plus die Übernahme als eine einzige Zustandsänderung; Speichern und Rückgängig übernimmt die Oberfläche.
import {shiftMonth,upsertItem} from './planner.js';
import {createPot} from './reserves.js';
import {saveGoal,monthsBetween} from './goals.js';
import {suggestCategory} from './intelligence.js';

export const MAX_PLAN_MONTHS=120;
const POT_COLORS=['#5f8f80','#d48f26','#6490cf','#bd865a','#9a7fc0','#82975b'];

// Offene Wünsche in der gespeicherten Reihenfolge; neue Wünsche hängen sich in Anlagereihenfolge hinten an.
export function wishOrder(state){
  const wishes=(state.goals||[]).filter(g=>g.status==='active'&&!g.potId),order=state.settings.wishPlan?.order||[];
  const rank=id=>{const i=order.indexOf(id);return i<0?order.length+wishes.findIndex(g=>g.id===id):i};
  return [...wishes].sort((a,b)=>rank(a.id)-rank(b.id));
}

// Jeder Wunsch bekommt ganze Monate: so viele, wie der Monatsbetrag braucht, und eine gleichbleibende Rate,
// die auf volle Euro aufgerundet ist und den Monatsbetrag nie übersteigt. Der nächste Wunsch beginnt im Monat danach.
export function planWishes(wishes,monthly,start){
  if(!Number.isSafeInteger(monthly)||monthly<100)throw Error('Bitte einen Monatsbetrag von mindestens 1 € wählen.');
  let at=start;
  return wishes.map(g=>{
    const months=Math.ceil(g.price/monthly),rate=Math.min(monthly,Math.ceil(g.price/months/100)*100),end=shiftMonth(at,months-1);
    const row={goal:g,start:at,end,months,rate,late:g.deadline&&g.deadline<end?monthsBetween(g.deadline,end):0,tooLong:monthsBetween(start,end)+1>MAX_PLAN_MONTHS};
    at=shiftMonth(end,1);
    return row;
  });
}

// Übernahme: je Wunsch ein Topf (Bestand 0 € ab Startmonat), das Ziel bekommt Topf und Zieldatum, dazu eine monatliche Sparrate.
export function applyWishPlan(state,rows){
  if(!rows.length)throw Error('Es gibt keinen offenen Wunsch.');
  if(rows.some(r=>r.tooLong))throw Error(`Mit diesem Betrag dauert der Fahrplan länger als ${MAX_PLAN_MONTHS/12} Jahre. Bitte einen höheren Monatsbetrag wählen.`);
  let n=state;
  for(const r of rows){
    const g=n.goals.find(x=>x.id===r.goal.id&&x.status==='active');
    if(!g)throw Error(`„${r.goal.title}“ ist nicht mehr vorhanden. Bitte den Fahrplan erneut öffnen.`);
    if(g.potId)throw Error(`Für „${g.title}“ läuft bereits ein Sparplan.`);
    let name=g.title.slice(0,80),k=1;
    while(n.pots.some(p=>p.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de')))name=g.title.slice(0,70)+' ('+(++k)+')';
    n=createPot(n,{name,month:r.start,balance:0,color:POT_COLORS[n.pots.length%POT_COLORS.length]});
    const potId=n.pots.at(-1).id;
    n=saveGoal(n,{...g,potId,deadline:r.end},g.id);
    n=upsertItem(n,{title:'Sparen für '+g.title.slice(0,140),amount:r.rate,type:'saving',category:suggestCategory(n,'Sparen '+g.title,'saving').id,frequency:r.months===1?'once':'month',start:r.start,end:r.months===1?'':r.end,note:'',potId},null,r.start);
  }
  return n;
}
