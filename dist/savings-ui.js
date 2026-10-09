// Bereich „Sparen“ (ab 3.1): Rücklagentöpfe und Ziele in einer Ansicht, mit Sparrechner für Wünsche.
// Nutzt nur vorhandene Fachfunktionen: reserveSummary, createPot, goalProgress, saveGoal, upsertItem, totals.
import {euro,amountText,monthName,shiftMonth,validMonth,currentMonth,totals,projected,upsertItem} from './planner.js';
import {reserveSummary,createPot} from './reserves.js';
import {goalProgress,saveGoal,monthsBetween} from './goals.js';
import {suggestCategory} from './intelligence.js';
import {reconcileMonth} from './reconciliation.js';
import {themeColor} from './theme.js';

const MAX_MONTHS=60,POT_COLORS=['#5f8f80','#d48f26','#6490cf','#bd865a','#9a7fc0','#82975b'];
export function createSavingsUI(ctx){
  const {esc,icon}=ctx;
  const S=()=>ctx.state,M=()=>ctx.month;
  const short=m=>new Intl.DateTimeFormat('de-DE',{month:'short',year:'numeric'}).format(new Date(m+'-01T12:00:00')).replace('.','');
  const money2=v=>{const [w,c]=amountText(v).split(',');return `${w},<small>${c} €</small>`};
  const goalFor=potId=>S().goals.find(g=>g.status==='active'&&g.potId===potId);
  // Sparpläne beginnen nie in der Vergangenheit: ab dem Monat nach dem gewählten, frühestens nach dem aktuellen.
  const firstMonth=()=>shiftMonth(M()>currentMonth()?M():currentMonth(),1);
  const rateFor=(price,months)=>Math.ceil(price/Math.max(1,months)/100)*100;

  // Sparrechner: Rate ab dem Folgemonat bis einschließlich Zielmonat, auf volle Euro aufgerundet.
  function plan(g,months){
    const start=firstMonth(),deadline=shiftMonth(start,months-1),rate=rateFor(g.price,months);
    const free=reconcileMonth(S(),start).afterOpen;
    return {start,deadline,months,rate,freeAfter:free-rate,free};
  }
  function defaultMonths(g){
    const start=firstMonth();
    if(g.deadline&&validMonth(g.deadline)&&g.deadline>=start)return Math.min(MAX_MONTHS,monthsBetween(start,g.deadline)+1);
    return 12;
  }

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

  function wishCard(g){
    const months=defaultMonths(g),pl=plan(g,months);
    return `<article class="wish" data-wish="${g.id}"><div class="wish-head"><button class="wish-title" data-action="goal-edit" data-id="${g.id}">${esc(g.title)}<small>${euro(g.price)}${g.deadline?' · Wunsch: '+esc(short(g.deadline)):''}</small></button><button class="btn btn-primary small" data-action="wish-start" data-id="${g.id}" data-months="${months}">Sparplan starten</button></div><label class="wish-slider"><span class="visually-hidden">Zieltermin für ${esc(g.title)}</span><input type="range" min="1" max="${MAX_MONTHS}" step="1" value="${months}" data-wish-range="${g.id}" aria-describedby="wish-out-${g.id}"></label><p class="wish-out" id="wish-out-${g.id}">${wishText(g,pl)}</p></article>`;
  }
  function wishText(g,pl){
    return `<b>${euro(pl.rate)}</b> im Monat<br>${pl.months===1?'Einmal im '+esc(short(pl.start)):pl.months+' Raten · '+esc(short(pl.start))+' – '+esc(short(pl.deadline))}<br><span class="${pl.freeAfter<0?'is-negative':''}">Danach frei im ${esc(monthName(pl.start))}: ${euro(pl.freeAfter)}</span>`;
  }

  function render(){
    const m=M(),s=reserveSummary(S(),m),t=totals(S(),m),free=reconcileMonth(S(),m).afterOpen;
    const wishes=S().goals.filter(g=>g.status==='active'&&!g.potId),done=S().goals.filter(g=>g.status==='done');
    const unlinked=projected(S(),m).filter(i=>i.type==='saving'&&!i.potId);
    return `<section class="hero"><p class="hero-label">In Töpfen Ende ${esc(monthName(m))}</p><p class="hero-value ${s.balance<0?'is-negative':''}">${money2(s.balance)}</p><p class="hero-sub">${t.saving?euro(t.saving)+' Sparraten im '+esc(monthName(m))+' · '+euro(free)+' noch frei':'Noch keine Sparrate in diesem Monat'}</p></section>
${unlinked.length?`<div class="notice"><span>${euro(unlinked.reduce((n,i)=>n+i.monthlyAmount,0))} Sparen ohne Topf: im Budget reserviert, aber keinem Topf zugeordnet.</span><button class="textbtn" data-action="pot-link">Zuordnen</button></div>`:''}
<section class="group"><header class="group-head"><h2>Töpfe</h2>${s.pots.length?`<span>${s.pots.length}</span>`:''}</header>${s.pots.length?`<div class="pots">${s.pots.map(potCard).join('')}</div>`:''}${s.pots.length?'':`<p class="helper group-note">Ein Topf ist Geld mit Zweck: Notgroschen, Urlaub, Auto. Trag ein, was schon da ist; Sparraten aus dem Monat füllen ihn.</p><div class="starter-chips">${['Notgroschen','Urlaub','Auto','Geschenke'].map(n=>`<button data-action="pot-preset" data-name="${n}">+ ${n}</button>`).join('')}</div>`}<button class="add-line" data-action="pot-new">${icon('plus')}Topf anlegen</button></section>
<section class="group"><header class="group-head"><h2>Wünsche</h2>${wishes.length?`<span>${euro(wishes.reduce((n,g)=>n+g.price,0))}</span>`:''}</header>${wishes.length?`<div class="wishes">${wishes.map(wishCard).join('')}</div><p class="helper group-note">Schieber bewegen: Die Rate passt sich dem Termin an. „Sparplan starten“ legt einen Topf und eine monatliche Sparrate an, ab dem Folgemonat.</p>`:'<p class="helper group-note">Halte fest, wofür Du sparen möchtest. Spielraum rechnet aus, was das pro Monat bedeutet.</p>'}<button class="add-line" data-action="goal-new">${icon('plus')}Wunsch hinzufügen</button></section>
${done.length?`<details class="journal"><summary>Erledigte Ziele <span>${done.length}</span></summary><ul class="rows">${done.map(g=>`<li class="row is-plain"><button class="row-main" data-action="goal-edit" data-id="${g.id}"><span class="row-title">${esc(g.title)}</span><span class="row-sub">${euro(g.price)}</span></button><button class="textbtn" data-action="goal-reopen" data-id="${g.id}">Wieder öffnen</button></li>`).join('')}</ul></details>`:''}`;
  }

  function potSheet(id){
    const m=M(),p=reserveSummary(S(),m).pots.find(x=>x.id===id);
    if(!p)throw Error('Dieser Topf ist nicht mehr vorhanden.');
    const g=goalFor(id),raw=S().pots.find(x=>x.id===id);
    const future=S().items.filter(i=>i.potId===id&&i.start>m).sort((a,b)=>a.start.localeCompare(b.start));
    ctx.openDialog(esc(p.name),`<div class="sheet-body"><p class="sheet-meta">${p.checkpoint?'Geplanter Stand Ende '+esc(monthName(m)):'Startet '+esc(monthName(p.checkpoints[0].month))}</p><div class="figures four"><div><span>Anfang</span><b>${euro(p.opening)}</b></div><div><span>Ein</span><b>${p.deposits?'+':''}${euro(p.deposits)}</b></div><div><span>Aus</span><b>${p.withdrawals?'−':''}${euro(p.withdrawals)}</b></div><div><span>Ende</span><b class="${p.balance<0?'is-negative':''}">${euro(p.balance)}</b></div></div>${potStatus(p,g)}<h3 class="sheet-h">Im ${esc(monthName(m))} eingeplant</h3>${p.movements.length?`<ul class="rows compact">${p.movements.map(i=>`<li class="row is-plain"><button class="row-main" data-action="edit-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${i.type==='saving'?'Einzahlung':'Entnahme'}</span></button><span class="row-amount ${i.type==='saving'?'is-positive':''}">${i.type==='saving'?'+':'−'}${euro(i.monthlyAmount)}</span></li>`).join('')}</ul>`:'<p class="helper">Keine Bewegung in diesem Monat.</p>'}${future.length?`<h3 class="sheet-h">Später eingeplant</h3><ul class="rows compact">${future.map(i=>`<li class="row is-plain"><button class="row-main" data-action="edit-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${i.type==='saving'?'Einzahlung':'Entnahme'} ab ${esc(monthName(i.start))}</span></button><span class="row-amount">${i.type==='saving'?'+':'−'}${euro(i.amount)}</span></li>`).join('')}</ul>`:''}<details class="sheet-more"><summary>Eingetragene Bestände</summary><ul class="rows compact">${[...raw.checkpoints].sort((a,b)=>b.month.localeCompare(a.month)).map(c=>`<li class="row is-plain"><span class="row-main"><span class="row-title">Anfang ${esc(monthName(c.month))}</span></span><span class="row-amount">${euro(c.balance)}</span>${raw.checkpoints.length>1?`<button class="iconbtn" data-action="pot-remove-checkpoint" data-id="${id}" data-month="${c.month}" aria-label="Bestand Anfang ${esc(monthName(c.month))} entfernen">${icon('trash')}</button>`:''}</li>`).join('')}</ul></details><div class="sheet-actions"><button class="btn btn-primary" data-action="pot-deposit" data-id="${id}">${icon('plus')}Einzahlung</button><button class="btn btn-outline" data-action="pot-withdraw" data-id="${id}">${icon('up')}Entnahme</button></div><div class="sheet-links"><button class="textbtn" data-action="pot-correct" data-id="${id}">Bestand korrigieren</button><button class="textbtn" data-action="pot-edit" data-id="${id}">Topf bearbeiten</button>${g?`<button class="textbtn" data-action="goal-edit" data-id="${g.id}">Ziel bearbeiten</button><button class="textbtn" data-action="goal-done" data-id="${g.id}">Ziel erledigt</button>`:`<button class="textbtn" data-action="goal-new" data-pot="${id}">Ziel setzen</button>`}</div></div>`);
  }

  function startPlan(goalId,months){
    const g=S().goals.find(x=>x.id===goalId&&x.status==='active');
    if(!g)throw Error('Dieser Wunsch ist nicht mehr vorhanden.');
    if(g.potId)throw Error('Für diesen Wunsch läuft bereits ein Sparplan.');
    months=Math.max(1,Math.min(MAX_MONTHS,Math.round(Number(months)||defaultMonths(g))));
    const pl=plan(g,months);
    let n=S(),name=g.title.slice(0,80),k=1;
    while(n.pots.some(p=>p.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de')))name=g.title.slice(0,70)+' ('+(++k)+')';
    n=createPot(n,{name,month:pl.start,balance:0,color:POT_COLORS[n.pots.length%POT_COLORS.length]});
    const potId=n.pots.at(-1).id;
    n=saveGoal(n,{...g,potId,deadline:pl.deadline},g.id);
    n=upsertItem(n,{title:'Sparen für '+g.title.slice(0,140),amount:pl.rate,type:'saving',category:suggestCategory(n,'Sparen '+g.title,'saving').id,frequency:'month',start:pl.start,end:pl.deadline,note:'',potId},null,pl.start);
    return {n,pl};
  }

  function slide(el){
    const g=S().goals.find(x=>x.id===el.dataset.wishRange);
    if(!g)return;
    const months=Number(el.value),pl=plan(g,months),card=el.closest('[data-wish]');
    const out=card?.querySelector('.wish-out');
    if(out)out.innerHTML=wishText(g,pl);
    const btn=card?.querySelector('[data-action="wish-start"]');
    if(btn)btn.dataset.months=String(months);
  }

  const actions={
    'savings-pot':el=>potSheet(el.dataset.id),
    'wish-start':el=>{
      const g=S().goals.find(x=>x.id===el.dataset.id),months=Number(el.dataset.months),{n,pl}=startPlan(el.dataset.id,months);
      if(ctx.commitUndo(n,`Sparplan gestartet: ${euro(pl.rate)} im Monat für ${g.title}`))ctx.closeDialog();
    }
  };
  return {render,actions,slide,startPlan,plan};
}
