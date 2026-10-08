import {uid,validate,totals,shiftMonth,validMonth,removeItem} from './planner.js';
import {reserveSummary,checkpointFor} from './reserves.js';
import {monthsBetween} from './goals.js';
import {makeJournal,undoJournal} from './scenarios.js';
export function defaultTimeline(month){return {start:month,minFree:0,cap:0,replaceIds:[],protected:[]};}
export function goalOrder(a,b){const af=a.schedule?.timing==='fixed'&&a.deadline,bf=b.schedule?.timing==='fixed'&&b.deadline;return (af&&!bf?-1:bf&&!af?1:af&&bf?a.deadline.localeCompare(b.deadline):0)||(a.schedule?.priority||50)-(b.schedule?.priority||50)||(a.deadline||'9999-12').localeCompare(b.deadline||'9999-12')||a.title.localeCompare(b.title,'de');}
export function buildTimeline(state,config=state.timeline){
 if(!config)throw Error('Bitte zuerst den Rahmen für den Zeitplan festlegen.');if(config.applied)throw Error('Der Zeitplan ist bereits übernommen.');
 let n=structuredClone(state);const groups=new Set();for(const id of config.replaceIds){const i=state.items.find(x=>x.id===id);if(!i||i.type!=='saving')throw Error('Eine freigegebene Sparrate fehlt. Bitte den Zeitplan-Rahmen prüfen.');const group=i.groupId||i.id;if(!groups.has(group)){n=removeItem(n,id,config.start);groups.add(group);}}
 for(const p of config.protected)if(!state.pots.some(x=>x.id===p.potId))throw Error('Ein geschützter Topf fehlt. Bitte den Rahmen bearbeiten.');
 const goals=(state.goals||[]).filter(g=>g.status==='active').sort(goalOrder),rows=[],lines=[],reaches=new Map(),warnings=[];for(const g of goals)if(g.schedule?.timing==='fixed'&&g.deadline&&g.deadline<config.start)warnings.push({month:config.start,text:g.title+': der feste Termin liegt vor dem Beginn dieses Zeitplans.'});
 for(let j=0;j<36;j++){const month=shiftMonth(config.start,j);if(!validMonth(month))break;const before=totals(n,month),pots=reserveSummary(n,month).pots;let left=Math.min(config.cap,Math.max(0,before.remaining-config.minFree));const allocations=[];
  // A future opening-balance correction discards earlier deposits: allocate after that reset.
  const eligible=goals.filter(g=>g.potId&&checkpointFor(n.pots.find(p=>p.id===g.potId),month));
  const need=g=>{const p=pots.find(p=>p.id===g.potId),floor=config.protected.find(x=>x.potId===g.potId)?.minimum||0;return Math.max(0,g.price+floor-p.balance);};
  const add=(g,want)=>{const nNeeded=need(g),grant=Math.min(left,nNeeded,Math.max(0,want));if(!grant)return;const line={id:'timeline_'+lines.length,title:('Sparen für '+g.title).slice(0,160),amount:grant,type:'saving',frequency:'once',start:month,end:'',category:state.categories.find(c=>c.group==='saving')?.id||state.categories[0].id,potId:g.potId,note:'Gemeinsamer Ziele-Zeitplan'};lines.push(line);n.items.push(line);left-=grant;pots.find(p=>p.id===g.potId).balance+=grant;allocations.push({goalId:g.id,amount:grant});};
  const candidates=eligible.filter(g=>{const p=n.pots.find(p=>p.id===g.potId),checkAt=g.deadline&&g.deadline>=month?checkpointFor(p,g.deadline):null;return !checkAt||checkAt.month<=month;});
  for(const g of candidates){if(g.schedule?.rate){const wanted=Math.min(need(g),g.schedule.rate);if(left<wanted)warnings.push({month,text:g.title+': die feste Rate passt nicht vollständig in den verfügbaren Sparrahmen.'});add(g,g.schedule.rate);continue;}if(g.schedule?.timing==='fixed'&&g.deadline&&g.deadline>=month){const end=reserveSummary(n,g.deadline).pots.find(p=>p.id===g.potId),floor=config.protected.find(x=>x.potId===g.potId)?.minimum||0,missing=Math.max(0,g.price+floor-end.balance);add(g,Math.ceil(missing/(monthsBetween(month,g.deadline)+1)));}}
  for(const g of candidates)if(!g.schedule?.rate)add(g,need(g));
  const after=totals(n,month),closing=reserveSummary(n,month);if(after.remaining<config.minFree)warnings.push({month,text:'Freier Betrag liegt unter Deiner Grenze.'});for(const p of closing.pots){const floor=config.protected.find(x=>x.potId===p.id)?.minimum||0;if(p.balance<floor)warnings.push({month,text:p.name+': geschützter Mindestbestand unterschritten.'});}
  for(const g of goals){const p=closing.pots.find(p=>p.id===g.potId),floor=config.protected.find(x=>x.potId===g.potId)?.minimum||0;if(p&&p.balance>=g.price+floor&&!reaches.has(g.id))reaches.set(g.id,month);if(g.schedule?.timing==='fixed'&&g.deadline===month&&(!p||p.balance<g.price+floor))warnings.push({month,text:g.title+': fester Termin wird nicht gedeckt.'});}
  rows.push({month,remaining:after.remaining,baseRemaining:totals(state,month).remaining,reserves:closing.balance,allocations});
 }
 const results=goals.map(g=>({goal:g,reach:reaches.get(g.id)||null,baseReach:rows.find(r=>{const p=reserveSummary(state,r.month).pots.find(p=>p.id===g.potId),floor=config.protected.find(x=>x.potId===g.potId)?.minimum||0;return p&&p.balance>=g.price+floor;})?.month||null}));
 return {state:n,lines,rows,goals:results,warnings};
}
export function applyTimeline(state){const result=buildTimeline(state),n=result.state,oldIds=new Set(state.items.map(i=>i.id));for(const i of n.items)if(!oldIds.has(i.id))i.id=uid();n.timeline.applied=makeJournal(state,n);return validate(n);}
export function undoTimeline(state){const n=undoJournal(state,state.timeline?.applied);delete n.timeline.applied;return validate(n);}
