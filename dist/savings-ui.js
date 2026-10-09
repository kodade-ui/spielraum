// Bereich „Sparen“ (ab 3.1): Rücklagentöpfe und Ziele in einer Ansicht; ab 3.2 mit Wunsch-Fahrplan.
// Nutzt nur vorhandene Fachfunktionen: reserveSummary, goalProgress, reconcileMonth und wishplan.js.
import {euro,amountText,monthName,shiftMonth,currentMonth,totals,projected} from './planner.js';
import {reserveSummary} from './reserves.js';
import {goalProgress,monthsBetween} from './goals.js';
import {reconcileMonth} from './reconciliation.js';
import {wishOrder,planWishes,applyWishPlan} from './wishplan.js';
import {themeColor} from './theme.js';
export function createSavingsUI(ctx){
  const {esc,icon}=ctx;
  const S=()=>ctx.state,M=()=>ctx.month;
  const short=m=>new Intl.DateTimeFormat('de-DE',{month:'short',year:'numeric'}).format(new Date(m+'-01T12:00:00')).replace('.','');
  const money2=v=>{const [w,c]=amountText(v).split(',');return `${w},<small>${c} €</small>`};
  const goalFor=potId=>S().goals.find(g=>g.status==='active'&&g.potId===potId);
  // Sparpläne beginnen nie in der Vergangenheit: ab dem Monat nach dem gewählten, frühestens nach dem aktuellen.
  const firstMonth=()=>shiftMonth(M()>currentMonth()?M():currentMonth(),1);
  function potStatus(p,g){
    if(!g)return p.goal?`<p class="pot-line">${euro(Math.max(0,p.goal-p.balance))} bis zum Sparziel von ${euro(p.goal)}</p>`:'';
    const gp=goalProgress(S(),g,M()),pct=Math.min(100,Math.max(0,gp.balance/g.price*100));
    let status;
    if(gp.overdue)status=`<span class="chip warn">Termin ${esc(short(g.deadline))} vorbei</span>`;
    else if(g.deadline&&gp.months){
      status=gp.extra?`<span class="chip warn">${euro(gp.extra)} im Monat fehlen</span><button class="textbtn" data-action="goal-plan" data-id="${g.id}">Rate anpassen</button>`:`<span class="chip ok">bis ${esc(short(g.deadline))} gedeckt</span>${gp.deadlineBalance>g.price?`<span class="pot-buffer">${euro(gp.deadlineBalance-g.price)} Puffer</span>`:''}`;
    }
    else if(g.deadline&&!gp.months)status=`<span class="chip warn">Topf startet nach dem Termin</span>`;
    else status=gp.missing?`<span class="chip">${euro(gp.missing)} fehlen noch</span>`:`<span class="chip ok">Preis gedeckt</span>`;
    return `<p class="pot-goal">Ziel: <b>${esc(g.title)}</b> · ${euro(g.price)}${g.deadline?' bis '+esc(short(g.deadline)):''}</p><span class="meter goal" style="--c:${themeColor(p.color)}"><span style="width:${pct.toFixed(1)}%"></span></span><div class="pot-status">${status}</div>`;
  }

  function potCard(p){
    const g=goalFor(p.id);
    const sub=p.checkpoint?(p.deposits||p.withdrawals?[p.deposits?'+'+euro(p.deposits)+' im '+monthName(M()):'',p.withdrawals?'−'+euro(p.withdrawals)+' entnommen':''].filter(Boolean).join(' · '):'keine Sparrate im '+monthName(M())):'startet '+monthName(p.checkpoints[0].month);
    return `<article class="pot"><button class="pot-head" data-action="savings-pot" data-id="${p.id}"><span class="dot-mark" style="--c:${themeColor(p.color)}"></span><span class="pot-name">${esc(p.name)}<small>${esc(sub)}</small></span><span class="pot-balance ${p.balance<0?'is-negative':''}">${euro(p.balance)}</span></button>${potStatus(p,g)}${!g&&!p.goal?`<button class="add-line small" data-action="goal-new" data-pot="${p.id}">${icon('target')}Ziel für diesen Topf</button>`:''}</article>`;
  }

  // ---- Wunsch-Fahrplan ----
  // Freie Beträge je Monat werden einmal pro Darstellung berechnet; der Schieber rechnet danach nur noch den Plan neu.
  let freeCache=null;
  const freeIn=m=>{
    if(!freeCache||freeCache.revision!==S().revision||freeCache.month!==M())freeCache={revision:S().revision,month:M(),map:new Map()};
    if(!freeCache.map.has(m))freeCache.map.set(m,reconcileMonth(S(),m).afterOpen);
    return freeCache.map.get(m);
  };
  const median=v=>{const a=[...v].sort((x,y)=>x-y),h=a.length>>1;return a.length%2?a[h]:Math.round((a[h-1]+a[h])/2)};
  const up=(v,step)=>Math.ceil(v/step)*step;
  function planFrame(wishes){
    const start=firstMonth(),typical=median(Array.from({length:12},(_,i)=>freeIn(shiftMonth(start,i)))),sum=wishes.reduce((n,g)=>n+g.price,0);
    const stored=S().settings.wishPlan?.monthly;
    const max=Math.max(10000,up(Math.min(sum,typical>0?typical:sum),5000),stored||0);
    const monthly=Math.min(max,Math.max(1000,stored||up(Math.max(5000,Math.min(sum,typical/2)),1000)));
    // Laufende Sparraten für bereits gestartete Ziele zählen nicht zum Wunschbetrag, werden aber genannt.
    const goalPots=new Set(S().goals.filter(g=>g.status==='active'&&g.potId).map(g=>g.potId));
    const running=projected(S(),start).filter(i=>i.type==='saving'&&goalPots.has(i.potId)).reduce((n,i)=>n+i.monthlyAmount,0);
    return {start,typical,max,monthly,running};
  }
  // Achse: Startmonat und jeder Jahresanfang, ohne dass Beschriftungen sich überlappen.
  function axisTicks(ticks,pos){
    const out=[];
    for(const m of ticks){
      const first=!out.length,p=pos(m);
      if(!first&&(p-pos(out.at(-1)[0])<(out.length===1?24:14)||p>74))continue;
      out.push([m,first]);
    }
    return out;
  }
  function planBody(wishes,f,monthly){
    const rows=planWishes(wishes,monthly,f.start),last=rows.at(-1).end,span=monthsBetween(f.start,last)+1;
    // Engster Monat während des Plans: frei laut Monatsplan minus die Wunschrate dieses Monats (höchstens fünf Jahre geprüft).
    let worst=null;
    for(const r of rows)for(let k=0;k<r.months&&monthsBetween(f.start,shiftMonth(r.start,k))<60;k++){
      const m=shiftMonth(r.start,k),left=freeIn(m)-r.rate;
      if(!worst||left<worst.left)worst={m,left};
    }
    const pos=m=>monthsBetween(f.start,m)/span*100;
    const ticks=[f.start];
    for(let m=shiftMonth(f.start,1);m<=last;m=shiftMonth(m,1))if(m.endsWith('-01'))ticks.push(m);
    const tooLong=rows.some(r=>r.tooLong);
    const rowHTML=(r,i)=>`<li class="wp-row"><div class="wp-head"><span class="wp-num">${i+1}</span><button class="wp-title" data-action="goal-edit" data-id="${r.goal.id}">${esc(r.goal.title)}<small>${euro(r.goal.price)}</small></button><span class="wp-move"><button class="iconbtn small" data-action="wish-up" data-id="${r.goal.id}" aria-label="${esc(r.goal.title)} nach vorn" ${i?'':'disabled'}>${icon('up')}</button><button class="iconbtn small" data-action="wish-down" data-id="${r.goal.id}" aria-label="${esc(r.goal.title)} nach hinten" ${i<rows.length-1?'':'disabled'}>${icon('down')}</button></span></div><div class="wp-track" aria-hidden="true"><i style="left:${pos(r.start).toFixed(2)}%;width:${(r.months/span*100).toFixed(2)}%"></i></div><p class="wp-sub"><b>${euro(r.rate)}</b> im Monat · ${r.months===1?esc(short(r.start)):esc(short(r.start))+' – '+esc(short(r.end))}${r.late?` <span class="chip warn">${r.late===1?'1 Monat':r.late+' Monate'} nach Wunschtermin</span>`:''}</p></li>`;
    return `<ol class="wp-rows">${rows.map(rowHTML).join('')}</ol><div class="wp-axis" aria-hidden="true">${axisTicks(ticks,pos).map(([m,first])=>`<span style="left:${pos(m).toFixed(2)}%">${esc(first?short(m):m.slice(0,4))}</span>`).join('')}${last!==f.start?`<span class="wp-end">${esc(short(last))}</span>`:''}</div>
<div class="wp-summary"><p>Alle ${rows.length===1?'':rows.length+' '}Wünsche erfüllt: <b>${esc(monthName(last))}</b></p>${worst?`<p class="${worst.left<0?'is-negative':''}">${worst.left<0?`Im ${esc(monthName(worst.m))} fehlen danach ${euro(-worst.left)}.`:`Danach bleiben mindestens ${euro(worst.left)} im Monat frei (knappster Monat: ${esc(monthName(worst.m))}).`}</p>`:''}${f.running?`<p class="helper">Zusätzlich laufen schon ${euro(f.running)} im Monat für Ziele mit Topf.</p>`:''}${tooLong?'<p class="is-negative">Mit diesem Betrag dauert es länger als zehn Jahre.</p>':''}</div><button class="btn btn-primary wide" data-action="wishplan-apply" data-monthly="${monthly}" ${tooLong?'disabled':''}>Fahrplan übernehmen</button><p class="helper wp-note">Legt für jeden Wunsch einen Topf und seine Sparrate an, ab ${esc(monthName(f.start))}. Mit „Rückgängig“ sofort zurücknehmbar.</p>`;
  }
  function wishPlan(wishes){
    const f=planFrame(wishes);
    return `<section class="wishplan" aria-label="Wunsch-Fahrplan"><label class="wp-budget"><span class="wp-budget-label">Für Wünsche pro Monat</span><b class="wp-budget-value" id="wp-value">${euro(f.monthly)}</b><input type="range" min="1000" max="${f.max}" step="1000" value="${f.monthly}" data-wishplan-range aria-describedby="wp-hint"></label><p class="helper" id="wp-hint">${f.typical>0?`Üblicherweise frei: ${euro(f.typical)} im Monat`:'Laut Plan bleibt derzeit kaum etwas frei.'}</p><div class="wp-body" id="wp-body">${planBody(wishes,f,f.monthly)}</div></section>`;
  }

  function render(){
    const m=M(),s=reserveSummary(S(),m),t=totals(S(),m),free=reconcileMonth(S(),m).afterOpen;
    const wishes=wishOrder(S()),done=S().goals.filter(g=>g.status==='done');
    const unlinked=projected(S(),m).filter(i=>i.type==='saving'&&!i.potId);
    return `<section class="hero"><p class="hero-label">In Töpfen Ende ${esc(monthName(m))}</p><p class="hero-value ${s.balance<0?'is-negative':''}">${money2(s.balance)}</p><p class="hero-sub">${t.saving?euro(t.saving)+' Sparraten im '+esc(monthName(m))+' · '+euro(free)+' noch frei':'Noch keine Sparrate in diesem Monat'}</p></section>
${unlinked.length?`<div class="notice"><span>${euro(unlinked.reduce((n,i)=>n+i.monthlyAmount,0))} Sparen ohne Topf: im Budget reserviert, aber keinem Topf zugeordnet.</span><button class="textbtn" data-action="pot-link">Zuordnen</button></div>`:''}
<section class="group"><header class="group-head"><h2>Töpfe</h2>${s.pots.length?`<span>${s.pots.length}</span>`:''}</header>${s.pots.length?`<div class="pots">${s.pots.map(potCard).join('')}</div>`:''}${s.pots.length?'':`<p class="helper group-note">Ein Topf ist Geld mit Zweck: Notgroschen, Urlaub, Auto. Trag ein, was schon da ist; Sparraten aus dem Monat füllen ihn.</p><div class="starter-chips">${['Notgroschen','Urlaub','Auto','Geschenke'].map(n=>`<button data-action="pot-preset" data-name="${n}">+ ${n}</button>`).join('')}</div>`}<button class="add-line" data-action="pot-new">${icon('plus')}Topf anlegen</button></section>
<section class="group"><header class="group-head"><h2>Wünsche</h2>${wishes.length?`<span>${euro(wishes.reduce((n,g)=>n+g.price,0))}</span>`:''}</header>${wishes.length?wishPlan(wishes):'<p class="helper group-note">Halte fest, wofür Du sparen möchtest. Spielraum ordnet Deine Wünsche nacheinander ein und zeigt, wann welcher erfüllt ist.</p>'}<button class="add-line" data-action="goal-new">${icon('plus')}Wunsch hinzufügen</button></section>
${done.length?`<details class="journal"><summary>Erledigte Ziele <span>${done.length}</span></summary><ul class="rows">${done.map(g=>`<li class="row is-plain"><button class="row-main" data-action="goal-edit" data-id="${g.id}"><span class="row-title">${esc(g.title)}</span><span class="row-sub">${euro(g.price)}</span></button><button class="textbtn" data-action="goal-reopen" data-id="${g.id}">Wieder öffnen</button></li>`).join('')}</ul></details>`:''}`;
  }

  function potSheet(id){
    const m=M(),p=reserveSummary(S(),m).pots.find(x=>x.id===id);
    if(!p)throw Error('Dieser Topf ist nicht mehr vorhanden.');
    const g=goalFor(id),raw=S().pots.find(x=>x.id===id);
    const future=S().items.filter(i=>i.potId===id&&i.start>m).sort((a,b)=>a.start.localeCompare(b.start));
    ctx.openDialog(esc(p.name),`<div class="sheet-body"><p class="sheet-meta">${p.checkpoint?'Geplanter Stand Ende '+esc(monthName(m)):'Startet '+esc(monthName(p.checkpoints[0].month))}</p><div class="figures four"><div><span>Anfang</span><b>${euro(p.opening)}</b></div><div><span>Ein</span><b>${p.deposits?'+':''}${euro(p.deposits)}</b></div><div><span>Aus</span><b>${p.withdrawals?'−':''}${euro(p.withdrawals)}</b></div><div><span>Ende</span><b class="${p.balance<0?'is-negative':''}">${euro(p.balance)}</b></div></div>${potStatus(p,g)}<h3 class="sheet-h">Im ${esc(monthName(m))} eingeplant</h3>${p.movements.length?`<ul class="rows compact">${p.movements.map(i=>`<li class="row is-plain"><button class="row-main" data-action="edit-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${i.type==='saving'?'Einzahlung':'Entnahme'}</span></button><span class="row-amount ${i.type==='saving'?'is-positive':''}">${i.type==='saving'?'+':'−'}${euro(i.monthlyAmount)}</span></li>`).join('')}</ul>`:'<p class="helper">Keine Bewegung in diesem Monat.</p>'}${future.length?`<h3 class="sheet-h">Später eingeplant</h3><ul class="rows compact">${future.map(i=>`<li class="row is-plain"><button class="row-main" data-action="edit-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${i.type==='saving'?'Einzahlung':'Entnahme'} ab ${esc(monthName(i.start))}</span></button><span class="row-amount">${i.type==='saving'?'+':'−'}${euro(i.amount)}</span></li>`).join('')}</ul>`:''}<details class="sheet-more"><summary>Eingetragene Bestände</summary><ul class="rows compact">${[...raw.checkpoints].sort((a,b)=>b.month.localeCompare(a.month)).map(c=>`<li class="row is-plain"><span class="row-main"><span class="row-title">Anfang ${esc(monthName(c.month))}</span></span><span class="row-amount">${euro(c.balance)}</span>${raw.checkpoints.length>1?`<button class="iconbtn" data-action="pot-remove-checkpoint" data-id="${id}" data-month="${c.month}" aria-label="Bestand Anfang ${esc(monthName(c.month))} entfernen">${icon('trash')}</button>`:''}</li>`).join('')}</ul></details><div class="sheet-actions"><button class="btn btn-primary" data-action="pot-correct" data-id="${id}">Bestand anpassen</button></div><p class="helper spaced">Wenn auf dem Konto etwas anderes liegt, als hier steht. Das ändert nur den Topf, nicht Deinen Monatsplan.</p><div class="sheet-actions"><button class="btn btn-outline" data-action="pot-deposit" data-id="${id}">${icon('plus')}Einzahlung einplanen</button><button class="btn btn-outline" data-action="pot-withdraw" data-id="${id}">${icon('up')}Entnahme einplanen</button></div><div class="sheet-links"><button class="textbtn" data-action="pot-edit" data-id="${id}">Topf bearbeiten</button>${g?`<button class="textbtn" data-action="goal-edit" data-id="${g.id}">Ziel bearbeiten</button><button class="textbtn" data-action="goal-done" data-id="${g.id}">Ziel erledigt</button>`:`<button class="textbtn" data-action="goal-new" data-pot="${id}">Ziel setzen</button>`}</div></div>`);
  }

  // Schieber: nur den Planteil neu zeichnen, damit der Finger am Regler bleibt; gespeichert wird beim Loslassen.
  function slide(el){
    const wishes=wishOrder(S()),body=document.querySelector('#wp-body'),value=document.querySelector('#wp-value');
    if(!wishes.length||!body)return;
    const monthly=Number(el.value);
    if(value)value.textContent=euro(monthly);
    body.innerHTML=planBody(wishes,planFrame(wishes),monthly);
  }
  function saveMonthly(el){
    const monthly=Number(el.value),n=structuredClone(S());
    n.settings.wishPlan={monthly,order:wishOrder(S()).map(g=>g.id)};
    ctx.persist(n,'');
  }
  function move(id,delta){
    const order=wishOrder(S()).map(g=>g.id),i=order.indexOf(id),j=i+delta;
    if(i<0||j<0||j>=order.length)return;
    [order[i],order[j]]=[order[j],order[i]];
    const n=structuredClone(S());
    n.settings.wishPlan={monthly:planFrame(wishOrder(S())).monthly,order};
    ctx.persist(n,'');
  }
  const actions={
    'savings-pot':el=>potSheet(el.dataset.id),
    'wish-up':el=>move(el.dataset.id,-1),
    'wish-down':el=>move(el.dataset.id,1),
    'wishplan-apply':el=>{
      const wishes=wishOrder(S()),f=planFrame(wishes),monthly=Number(el.dataset.monthly)||f.monthly,rows=planWishes(wishes,monthly,f.start);
      const n=applyWishPlan(S(),rows);
      n.settings.wishPlan={monthly,order:[]};
      ctx.commitUndo(n,`Fahrplan übernommen: ${rows.length===1?'1 Sparrate':rows.length+' Sparraten'} ab ${monthName(f.start)}`);
    }
  };
  return {render,actions,slide,saveMonthly};
}
