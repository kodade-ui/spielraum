// Bereich „Sparen“ (ab 3.3): Ziele und Rücklagen als Kacheln mit Fortschrittsring, ohne Regler.
// Geld kommt per fester Monatsrate oder per Einzahlung, wann es passt. Jahreskosten lassen sich glätten.
// Rechnet nur über Fachfunktionen: reserveSummary, goalProgress, reconcileMonth, goals.js (Raten) und sinking.js.
import {euro,amountText,monthName,shiftMonth,currentMonth,totals,projected,money,fieldMoney,validMonth} from './planner.js';
import {reserveSummary} from './reserves.js';
import {goalProgress,monthsBetween,potRate,planRate,applyRate,addDeposit,ensureGoalPot,createGoal,saveGoal,withoutRates} from './goals.js';
import {reconcileMonth} from './reconciliation.js';
import {sinkingCandidates,sinkingOptions,applySinking,sinkingStatus} from './sinking.js';

export function createSavingsUI(ctx){
  const {esc,icon}=ctx;
  const S=()=>ctx.state,M=()=>ctx.month;
  const short=m=>new Intl.DateTimeFormat('de-DE',{month:'short',year:'numeric'}).format(new Date(m+'-01T12:00:00')).replace('.','');
  const monthOnly=m=>new Intl.DateTimeFormat('de-DE',{month:'long'}).format(new Date(m+'-01T12:00:00'));
  const money2=v=>{const [w,c]=amountText(v).split(',');return `${w},<small>${c} €</small>`};
  const whole=v=>v%100===0?euro(v).replace(/,00(?=\s?€)/,''):euro(v);
  const euroUp=c=>Math.ceil(c/100)*100;
  const activeGoals=()=>S().goals.filter(g=>g.status==='active');
  const goalOfPot=potId=>S().goals.find(g=>g.status==='active'&&g.potId===potId);
  const getGoal=id=>{const g=S().goals.find(x=>x.id===id);if(!g)throw Error('Dieses Ziel ist nicht mehr vorhanden.');return g};
  const getPot=id=>{const p=S().pots.find(x=>x.id===id);if(!p)throw Error('Dieser Topf ist nicht mehr vorhanden.');return p};
  // Neue Raten und Einzahlungen nie in der Vergangenheit: frühestens der aktuelle Monat.
  const firstMonth=()=>M()<currentMonth()?currentMonth():M();
  const freeIn=(state,m)=>reconcileMonth(state,m).afterOpen;
  const close=()=>ctx.closeDialog();
  // Welcher Dialog gerade offen ist (für die Live-Vorschau): kind = deposit | rate | goal, dazu Ziel bzw. Topf.
  let live={kind:'',goalId:'',potId:''};
  const field=(form,k)=>String(new FormData(form).get(k)||'');
  const readMoney=(v,allowEmpty=true)=>{const s=String(v??'').trim();if(!s)return allowEmpty?0:NaN;try{return money(s)}catch{return NaN}};

  // Fortschrittsring: eine Farbe; erreicht = Gold wie im Logo. Ohne Ziel ein ruhiger Kreis mit Symbol.
  function ring(pct,size,done=false){
    const p=Math.max(0,Math.min(100,pct));
    return `<span class="ring${done?' is-done':''}" style="--size:${size}px" aria-hidden="true"><svg class="ring-svg" viewBox="0 0 40 40"><circle class="ring-track" cx="20" cy="20" r="17"/>${p>0?`<circle class="ring-bar" cx="20" cy="20" r="17" pathLength="100" stroke-dasharray="${p.toFixed(1)} 100"/>`:''}</svg><b>${done?icon('check'):Math.floor(p)+'<small>%</small>'}</b></span>`;
  }
  const badge=(name,size)=>`<span class="ring is-plain" style="--size:${size}px" aria-hidden="true">${icon(name)}</span>`;

  // ---- Zustand je Ziel / Rücklage ----
  function goalInfo(g){
    const m=M(),gp=goalProgress(S(),g,m),rate=g.potId?potRate(S(),g.potId,m):null,missing=gp.missing;
    const until=g.deadline&&g.deadline>=m?monthsBetween(m,g.deadline)+1:0;
    const need=until?euroUp(Math.ceil(Math.max(0,gp.months?g.price-gp.deadlineBalance:missing)/until)):0;
    let kind,line;
    if(missing<=0){kind='done';line='Geschafft'}
    else if(gp.overdue){kind='warn';line='Termin '+short(g.deadline)+' vorbei'}
    else if(rate){
      if(g.deadline&&gp.extra>0){kind='warn';line=whole(euroUp(gp.extra))+' im Monat fehlen'}
      else{kind='rate';line=whole(rate.amount)+' im Monat'+(rate.running?'':' ab '+short(rate.start))}
    }
    else{kind='flex';line=until&&need?'bis '+short(g.deadline):'flexibel'}
    return {gp,rate,missing,kind,line,need,until,balance:gp.balance,pct:g.price?gp.balance/g.price*100:0};
  }
  function potInfo(p){
    const m=M(),sink=sinkingStatus(S(),p.id,m),rate=potRate(S(),p.id,m);
    if(sink&&!sink.done){
      return {sink,rate,target:sink.amount,pct:sink.amount?p.balance/sink.amount*100:0,kind:sink.short?'warn':'rate',line:sink.short?'es fehlen '+whole(sink.short):whole(sink.amount)+' im '+monthOnly(sink.month)};
    }
    if(p.goal)return {rate,target:p.goal,pct:p.balance/p.goal*100,kind:'rate',line:rate?whole(rate.amount)+' im Monat':'Sparziel '+whole(p.goal)};
    return {rate,target:0,pct:0,kind:rate?'rate':'flex',line:rate?'+'+whole(rate.amount)+' im Monat':'ohne feste Rate'};
  }

  // ---- Kacheln ----
  function goalTile(g,pot){
    const i=goalInfo(g),bal=pot?pot.balance:0;
    // Zweite Zeile: bei fester Rate der Termin, bei flexibel mit Termin der nötige Monatsbetrag.
    const sub=i.kind==='rate'&&g.deadline?'bis '+short(g.deadline):i.kind==='flex'&&i.until&&i.need?whole(i.need)+' im Monat nötig':'';
    return `<button class="tile" data-action="goal-open" data-id="${g.id}">${ring(i.pct,48,i.kind==='done')}<span class="tile-name">${esc(g.title)}</span><span class="tile-amount ${bal<0?'is-negative':''}">${whole(bal)}<small> von ${whole(g.price)}</small></span><span class="tile-line is-${i.kind}">${esc(i.line)}${sub?'<br><span>'+esc(sub)+'</span>':''}</span></button>`;
  }
  function potTile(p){
    const i=potInfo(p),mark=i.target?ring(i.pct,48):badge(i.sink?'calendar':'jar',48);
    return `<button class="tile" data-action="savings-pot" data-id="${p.id}">${mark}<span class="tile-name">${esc(p.name)}</span><span class="tile-amount ${p.balance<0?'is-negative':''}">${whole(p.balance)}${i.target?`<small> von ${whole(i.target)}</small>`:''}</span><span class="tile-line is-${i.kind}">${esc(i.line)}</span></button>`;
  }
  const addLine=(action,label)=>`<button class="add-line" data-action="${action}">${icon('plus')}${label}</button>`;

  function render(){
    const m=M(),s=reserveSummary(S(),m),t=totals(S(),m),free=freeIn(S(),m);
    const goals=activeGoals(),goalPots=new Set(goals.map(g=>g.potId).filter(Boolean)),rest=s.pots.filter(p=>!goalPots.has(p.id));
    const done=S().goals.filter(g=>g.status==='done'),cands=sinkingCandidates(S(),currentMonth());
    const unlinked=projected(S(),m).filter(i=>i.type==='saving'&&!i.potId);
    const empty=!goals.length&&!s.pots.length;
    const hint=cands.length?`<button class="sv-hint" data-action="sinking-open">${icon('calendar')}<span><b>Jahreskosten glätten</b><small>${cands.length===1?esc(cands[0].item.title)+' kostet':cands.length+' Zahlungen kosten'} ${whole(cands.reduce((n,c)=>n+Math.round(c.amount*12/c.interval),0))} im Jahr. Mit ${whole(cands.reduce((n,c)=>n+c.monthly,0))} im Monat trifft Dich kein Zahlungsmonat mehr unvorbereitet.</small></span>${icon('right')}</button>`:'';
    return `<section class="hero"><p class="hero-label">Angespart · Ende ${esc(monthName(m))}</p><p class="hero-value ${s.balance<0?'is-negative':''}">${money2(s.balance)}</p><p class="hero-sub">${t.saving?`${euro(t.saving)} gehen im ${esc(monthOnly(m))} in Deine Töpfe · ${euro(free)} frei`:`${euro(free)} im ${esc(monthOnly(m))} frei`}</p></section>
${unlinked.length?`<div class="notice"><span>${euro(unlinked.reduce((n,i)=>n+i.monthlyAmount,0))} Sparen ohne Topf: im Budget reserviert, aber keinem Topf zugeordnet.</span><button class="textbtn" data-action="pot-link">Zuordnen</button></div>`:''}
${empty?'<p class="sv-intro">Ein Ziel ist etwas, das Du Dir leisten willst. Eine Rücklage ist Geld mit Zweck, etwa ein Notgroschen. Du sparst mit fester Monatsrate oder zahlst ein, wann es passt.</p>':''}
<section class="sv-group"><header class="group-head"><h2>Ziele</h2>${goals.length?`<span>${whole(goals.reduce((n,g)=>n+g.price,0))}</span>`:''}</header><div class="tiles">${goals.map(g=>goalTile(g,s.pots.find(p=>p.id===g.potId))).join('')}</div>${addLine('goal-new','Neues Ziel')}</section>
<section class="sv-group"><header class="group-head"><h2>Rücklagen</h2>${rest.length?`<span>${whole(rest.reduce((n,p)=>n+p.balance,0))}</span>`:''}</header><div class="tiles">${rest.map(potTile).join('')}</div>${addLine('pot-new','Neue Rücklage')}${hint}</section>
${done.length?`<details class="journal"><summary>Erreichte Ziele <span>${done.length}</span></summary><ul class="rows">${done.map(g=>`<li class="row is-plain"><button class="row-main" data-action="goal-edit" data-id="${g.id}"><span class="row-title">${esc(g.title)}</span><span class="row-sub">${euro(g.price)}</span></button><button class="textbtn" data-action="goal-reopen" data-id="${g.id}">Wieder öffnen</button></li>`).join('')}</ul></details>`:''}`;
  }

  // ---- Blätter ----
  function history(id){
    const m=M(),p=reserveSummary(S(),m).pots.find(x=>x.id===id),raw=S().pots.find(x=>x.id===id);
    if(!p||!raw)return '';
    const future=S().items.filter(i=>i.potId===id&&i.start>m).sort((a,b)=>a.start.localeCompare(b.start));
    const mv=i=>i.type==='saving'?'Einzahlung':'Entnahme';
    return `<details class="sheet-more"><summary>Verlauf und Bestände</summary><div class="figures four"><div><span>Anfang</span><b>${euro(p.opening)}</b></div><div><span>Ein</span><b>${p.deposits?'+':''}${euro(p.deposits)}</b></div><div><span>Aus</span><b>${p.withdrawals?'−':''}${euro(p.withdrawals)}</b></div><div><span>Ende</span><b class="${p.balance<0?'is-negative':''}">${euro(p.balance)}</b></div></div><h3 class="sheet-h">Im ${esc(monthName(m))}</h3>${p.movements.length?`<ul class="rows compact">${p.movements.map(i=>`<li class="row is-plain"><button class="row-main" data-action="edit-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${mv(i)}</span></button><span class="row-amount">${i.type==='saving'?'+':'−'}${euro(i.monthlyAmount)}</span></li>`).join('')}</ul>`:'<p class="helper">Keine Bewegung in diesem Monat.</p>'}${future.length?`<h3 class="sheet-h">Später</h3><ul class="rows compact">${future.map(i=>`<li class="row is-plain"><button class="row-main" data-action="edit-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${mv(i)} ab ${esc(short(i.start))}</span></button><span class="row-amount">${i.type==='saving'?'+':'−'}${euro(i.amount)}</span></li>`).join('')}</ul>`:''}<h3 class="sheet-h">Eingetragene Bestände</h3><ul class="rows compact">${[...raw.checkpoints].sort((a,b)=>b.month.localeCompare(a.month)).map(c=>`<li class="row is-plain"><span class="row-main"><span class="row-title">Anfang ${esc(monthName(c.month))}</span></span><span class="row-amount">${euro(c.balance)}</span>${raw.checkpoints.length>1?`<button class="iconbtn" data-action="pot-remove-checkpoint" data-id="${id}" data-month="${c.month}" aria-label="Bestand Anfang ${esc(monthName(c.month))} entfernen">${icon('trash')}</button>`:''}</li>`).join('')}</ul></details>`;
  }
  const rateLine=r=>r?`Feste Rate: <b>${whole(r.amount)}</b> im Monat${r.running?'':' ab '+esc(short(r.start))}${r.end?' bis '+esc(short(r.end)):''}.`:'';

  function goalSheet(id){
    const g=getGoal(id),i=goalInfo(g),m=M(),free=freeIn(S(),m),lines=[];
    if(i.kind==='done')lines.push('Das Geld für dieses Ziel ist da.');
    else{
      if(i.rate)lines.push(rateLine(i.rate));
      if(i.kind==='warn'&&!i.gp.overdue)lines.push(`Bis ${esc(short(g.deadline))} fehlen damit <b>${whole(euroUp(i.gp.extra))}</b> im Monat.`);
      if(i.gp.overdue)lines.push(`Der Termin ${esc(short(g.deadline))} ist vorbei. Setze einen neuen oder zahle den Rest ein.`);
      if(!i.rate&&i.until&&i.need)lines.push(`Du zahlst ein, wann es passt. Bis ${esc(short(g.deadline))} wären es <b>${whole(i.need)}</b> im Monat.`);
      if(!i.rate&&!i.until&&!i.gp.overdue)lines.push('Du zahlst ein, wann es passt. Mit einer festen Rate siehst Du, wann es geschafft ist.');
      lines.push(`Im ${esc(monthOnly(m))} sind noch <b class="${free<0?'is-negative':''}">${euro(free)}</b> frei${i.rate?.running?', die Rate ist schon abgezogen':''}.`);
    }
    const actionsHTML=i.kind==='done'?`<div class="sheet-actions"><button class="btn btn-primary" data-action="goal-done" data-id="${g.id}">${icon('check')}Ziel abschließen</button></div>`:`<div class="sheet-actions"><button class="btn btn-primary" data-action="sv-deposit" data-goal="${g.id}">${icon('plus')}Einzahlen</button><button class="btn btn-outline" data-action="sv-rate" data-goal="${g.id}">${icon('repeat')}${i.rate?'Rate ändern':'Feste Rate'}</button></div>`;
    ctx.openDialog(esc(g.title),`<div class="sheet-body"><div class="sv-top">${ring(i.pct,84,i.kind==='done')}<div><p class="sv-big">${euro(i.balance)}</p><p class="sv-of">von ${euro(g.price)}${g.deadline?' · bis '+esc(short(g.deadline)):''}</p>${i.missing>0?`<p class="sv-missing">Es fehlen ${euro(i.missing)}</p>`:''}</div></div><div class="sv-text">${lines.map(l=>`<p>${l}</p>`).join('')}</div>${actionsHTML}<div class="sheet-links"><button class="textbtn" data-action="sv-correct" data-goal="${g.id}">Bestand anpassen</button><button class="textbtn" data-action="goal-edit" data-id="${g.id}">Bearbeiten</button>${i.kind!=='done'?`<button class="textbtn" data-action="goal-done" data-id="${g.id}">Ziel abschließen</button>`:''}</div>${g.potId?history(g.potId):''}</div>`);
  }
  function potSheet(id){
    const g=goalOfPot(id);
    if(g)return goalSheet(g.id);
    const m=M(),p=reserveSummary(S(),m).pots.find(x=>x.id===id);
    if(!p)throw Error('Dieser Topf ist nicht mehr vorhanden.');
    const i=potInfo(p),lines=[];
    if(i.sink){
      lines.push(`Für <b>${esc(i.sink.title)}</b>: ${euro(i.sink.amount)} im ${esc(monthName(i.sink.month))}. Bis dahin sind ${euro(i.sink.before)} drin.`);
      lines.push(i.sink.short?`<span class="is-negative">Das reicht nicht, es fehlen ${euro(i.sink.short)}.</span> Zahle einmal etwas ein oder erhöhe die Rate.`:'Die Zahlung kommt aus diesem Topf und belastet den Monat nicht.');
    }
    if(i.rate)lines.push(rateLine(i.rate));
    else if(!i.sink)lines.push(p.checkpoint?'Keine feste Rate. Zahle ein, wann es passt.':`Startet im ${esc(monthName(p.checkpoints[0].month))}.`);
    ctx.openDialog(esc(p.name),`<div class="sheet-body"><div class="sv-top">${i.target?ring(i.pct,84):badge(i.sink?'calendar':'jar',84)}<div><p class="sv-big ${p.balance<0?'is-negative':''}">${euro(p.balance)}</p><p class="sv-of">Ende ${esc(monthName(m))}</p></div></div><div class="sv-text">${lines.map(l=>`<p>${l}</p>`).join('')}</div><div class="sheet-actions"><button class="btn btn-primary" data-action="sv-deposit" data-pot="${id}">${icon('plus')}Einzahlen</button><button class="btn btn-outline" data-action="sv-rate" data-pot="${id}">${icon('repeat')}${i.rate?'Rate ändern':'Feste Rate'}</button></div><div class="sheet-links"><button class="textbtn" data-action="pot-correct" data-id="${id}">Bestand anpassen</button><button class="textbtn" data-action="pot-withdraw" data-id="${id}">Entnahme einplanen</button><button class="textbtn" data-action="pot-edit" data-id="${id}">Bearbeiten</button>${i.sink?'':`<button class="textbtn" data-action="goal-new" data-pot="${id}">Ziel setzen</button>`}</div>${history(id)}</div>`);
  }

  // ---- Dialoge: Einzahlen, Rate, neues Ziel ----
  const monthOptions=name=>{const a=firstMonth(),b=shiftMonth(a,1);return `<select name="${name}">${[a,b].map((x,k)=>`<option value="${x}" ${k?'':'selected'}>ab ${esc(monthName(x))}</option>`).join('')}</select>`};
  const footer=label=>`<div class="form-footer"><button type="button" class="btn btn-outline" data-action="close">Abbrechen</button><button type="submit" class="btn btn-primary">${label}</button></div>`;

  function deposit(el){
    const goalId=el.dataset.goal||'',g=goalId?getGoal(goalId):null,potId=g?g.potId:el.dataset.pot,title=g?g.title:getPot(potId).name,revision=S().revision;
    live={kind:'deposit',goalId,potId:potId||''};
    ctx.openDialog('Einzahlen',`<form id="sv-deposit-form" data-live data-goal="${goalId}" data-pot="${potId||''}"><p class="bodycopy">${esc(title)}</p><div class="form-grid spaced"><label><span>Betrag (€)</span><input name="amount" inputmode="decimal" placeholder="0,00" required autocomplete="off"></label><label><span>Monat</span><input name="month" type="month" value="${firstMonth()}" min="2000-01" max="2100-12" required></label></div><p class="sv-preview" id="sv-preview" aria-live="polite"></p><p class="helper">Wird als einmalige Einzahlung im gewählten Monat eingeplant und senkt dort, was frei ist.</p>${footer('Einzahlen')}</form>`,form=>{
      if(S().revision!==revision)throw Error('Der Stand hat sich geändert. Bitte erneut öffnen.');
      const amount=readMoney(field(form,'amount'),false),month=field(form,'month');
      if(!(amount>0))throw Error('Bitte einen Betrag größer als 0 eingeben.');
      if(!validMonth(month))throw Error('Bitte einen gültigen Monat wählen.');
      let n=S(),pid=potId;
      if(g&&!pid)({state:n,potId:pid}=ensureGoalPot(n,goalId,month));
      n=addDeposit(n,{potId:pid,title,amount,month});
      if(ctx.commitUndo(n,`${euro(amount)} für ${title} eingeplant`))close();
    });
    preview(document.querySelector('#dialog form'));
  }

  function rateDialog(el){
    const goalId=el.dataset.goal||'',g=goalId?getGoal(goalId):null,potId=(g?g.potId:el.dataset.pot)||'',title=g?g.title:getPot(potId).name;
    const current=potId?potRate(S(),potId,M()):null,revision=S().revision,f=firstMonth();
    live={kind:'rate',goalId,potId};
    const mode=g&&!current&&g.deadline&&g.deadline>=f?'date':'rate';
    const deadline=g?.deadline&&g.deadline>=f?g.deadline:shiftMonth(f,11);
    const seg=g?`<div class="seg" role="radiogroup" aria-label="Was gibst Du vor?"><label><input type="radio" name="mode" value="date" ${mode==='date'?'checked':''}><span>Termin</span></label><label><input type="radio" name="mode" value="rate" ${mode==='rate'?'checked':''}><span>Rate</span></label><label><input type="radio" name="mode" value="none"><span>Keine</span></label></div>`:`<div class="seg" role="radiogroup" aria-label="Feste Rate"><label><input type="radio" name="mode" value="rate" checked><span>Feste Rate</span></label><label><input type="radio" name="mode" value="none"><span>Keine</span></label></div>`;
    ctx.openDialog(current?'Rate ändern':'Feste Rate',`<form id="sv-rate-form" class="sv-form" data-live data-goal="${goalId}" data-pot="${potId}"><p class="bodycopy">${esc(title)}</p>${seg}<div class="form-grid spaced">${g?`<label class="only-date"><span>Fertig bis</span><input name="deadline" type="month" value="${deadline}" min="2000-01" max="2100-12"></label>`:''}<label class="only-rate"><span>Rate pro Monat (€)</span><input name="rate" inputmode="decimal" placeholder="0,00" value="${current?fieldMoney(current.amount):''}" autocomplete="off"></label><label><span>Gilt</span>${monthOptions('start')}</label></div><p class="sv-preview" id="sv-preview" aria-live="polite"></p>${footer('Übernehmen')}</form>`,form=>{
      if(S().revision!==revision)throw Error('Der Stand hat sich geändert. Bitte erneut öffnen.');
      const c=computeRate(form);
      if(c.error)throw Error(c.error);
      let n=S(),pid=potId;
      if(c.mode==='none'||c.plan.done){
        if(pid)n=applyRate(n,{potId:pid,title,rate:0,start:c.start});
        if(g&&c.mode==='date')n=saveGoal(n,{...n.goals.find(x=>x.id===goalId),deadline:c.deadline},goalId);
        if(n===S()||ctx.commitUndo(n,c.mode==='none'?'Feste Rate beendet':'Schon gedeckt, keine Rate nötig'))close();
        return;
      }
      if(g&&!pid)({state:n,potId:pid}=ensureGoalPot(n,goalId,c.start));
      n=applyRate(n,{potId:pid,title,rate:c.rate,start:c.start,end:g?c.plan.end:''});
      if(g){
        const cur=n.goals.find(x=>x.id===goalId);
        if(c.mode==='date'||!cur.deadline)n=saveGoal(n,{...cur,deadline:c.plan.end},goalId);
      }
      if(ctx.commitUndo(n,`Feste Rate: ${whole(c.rate)} im Monat`))close();
    });
    preview(document.querySelector('#dialog form'));
  }
  // Liest Rate-Dialog und „Neues Ziel“ und rechnet Termin ↔ Rate.
  function computeRate(form){
    const mode=field(form,'mode')||'rate',start=field(form,'start')||firstMonth();
    if(mode==='none'||mode==='flex')return {mode,start};
    const {goalId,potId:livePot,kind}=live,g=goalId?S().goals.find(x=>x.id===goalId):null,potId=g?g.potId||'':livePot;
    if(kind==='rate'&&!g){
      const rate=readMoney(field(form,'rate'),false);
      return rate>0?{mode,start,rate,plan:{rate,end:'',months:0}}:{mode,start,error:'Bitte eine Monatsrate größer als 0 eingeben.'};
    }
    const price=g?g.price:readMoney(field(form,'price'),false),saved=g?0:readMoney(field(form,'saved'));
    if(!(price>0))return {mode,start,error:'Bitte einen Zielbetrag größer als 0 eingeben.'};
    if(Number.isNaN(saved))return {mode,start,error:'Bitte beim angesparten Betrag eine Zahl eingeben.'};
    try{
      if(mode==='date'){
        const deadline=field(form,'deadline');
        if(!validMonth(deadline))return {mode,start,error:'Bitte einen Monat wählen, bis wann es fertig sein soll.'};
        const plan=planRate(S(),{potId,price,start,deadline,saved});
        return plan.tooLong?{mode,start,error:'Das sind mehr als zehn Jahre. Bitte einen früheren Termin wählen.'}:{mode,start,deadline,rate:plan.rate,plan};
      }
      const rate=readMoney(field(form,'rate'),false);
      if(!(rate>0))return {mode,start,error:'Bitte eine Monatsrate größer als 0 eingeben.'};
      const plan=planRate(S(),{potId,price,start,rate,saved});
      return plan.tooLong?{mode,start,error:'Mit dieser Rate dauert es länger als zehn Jahre.'}:{mode,start,rate,plan};
    }catch(e){return {mode,start,error:e.message}}
  }
  // Was die Rate kostet: frei im Startmonat danach und der knappste Monat (höchstens zwei Jahre geprüft).
  function costText(potId,start,rate,end){
    const base=potId?withoutRates(S(),potId,start):S(),last=end||shiftMonth(start,11);
    let first=null,worst=null;
    for(let m=start,k=0;m<=last&&k<24;m=shiftMonth(m,1),k++){
      const left=freeIn(base,m)-rate;
      if(first===null)first=left;
      if(!worst||left<worst.left)worst={m,left};
    }
    let out=`Im ${esc(monthName(start))} bleiben damit <b class="${first<0?'is-negative':''}">${euro(first)}</b> frei.`;
    if(worst&&worst.left<0)out+=` <span class="is-negative">Im ${esc(monthName(worst.m))} fehlen dann ${euro(-worst.left)}.</span>`;
    else if(worst&&worst.m!==start&&worst.left<first-100)out+=` Knappster Monat: ${esc(monthName(worst.m))} mit ${euro(worst.left)}.`;
    return out;
  }
  function preview(form){
    const out=document.querySelector('#sv-preview');
    if(!form||!out)return;
    if(live.kind==='deposit'){
      const amount=readMoney(field(form,'amount')),month=field(form,'month');
      if(!validMonth(month)||Number.isNaN(amount)){out.innerHTML='';return}
      const left=freeIn(S(),month)-amount;
      out.innerHTML=`Im ${esc(monthName(month))} bleiben danach <b class="${left<0?'is-negative':''}">${euro(left)}</b> frei.`;
      return;
    }
    const c=computeRate(form);
    if(c.mode==='none'){out.innerHTML=live.potId?`Die feste Rate endet ab ${esc(monthName(c.start))}. Bereits Eingezahltes bleibt im Topf.`:'Keine feste Rate.';return}
    if(c.mode==='flex'){out.innerHTML='Du zahlst ein, wann es passt. Am Ziel siehst Du, was bis zum Termin im Monat nötig wäre.';return}
    if(c.error){out.innerHTML=field(form,'rate')||field(form,'price')?`<span class="is-negative">${esc(c.error)}</span>`:'';return}
    if(c.plan.done){out.innerHTML='Schon gedeckt, keine Rate nötig.';return}
    const span=!c.plan.end?`ab ${esc(monthName(c.start))}`:c.plan.months>1?`${esc(short(c.start))} bis ${esc(short(c.plan.end))}, ${c.plan.months} Raten`:`einmal im ${esc(monthName(c.start))}`;
    out.innerHTML=`<b>${whole(c.rate)}</b> im Monat · ${span}.<br>${costText(live.goalId?(S().goals.find(x=>x.id===live.goalId)?.potId||''):live.potId,c.start,c.rate,c.plan.end)}`;
  }

  function goalNew(el){
    const pot=el?.dataset?.pot||'';
    if(pot)return goalOnPot(pot);
    const revision=S().revision,preset=el?.dataset?.title||'';
    live={kind:'goal',goalId:'',potId:''};
    ctx.openDialog('Neues Ziel',`<form id="sv-goal-form" class="sv-form" data-live><label><span>Was möchtest Du Dir leisten?</span><input name="title" maxlength="100" placeholder="z. B. Rundreise" value="${esc(preset)}" required autocomplete="off"></label><div class="form-grid spaced"><label><span>Kostet (€)</span><input name="price" inputmode="decimal" placeholder="0,00" required autocomplete="off"></label><label><span>Schon angespart (€)</span><input name="saved" inputmode="decimal" placeholder="0,00" autocomplete="off"></label></div><p class="field-label spaced">Wie willst Du sparen?</p><div class="seg" role="radiogroup" aria-label="Wie willst Du sparen?"><label><input type="radio" name="mode" value="flex" checked><span>Flexibel</span></label><label><input type="radio" name="mode" value="date"><span>Bis Termin</span></label><label><input type="radio" name="mode" value="rate"><span>Feste Rate</span></label></div><div class="form-grid spaced"><label class="only-date only-flex"><span class="only-flex">Wunschtermin (optional)</span><span class="only-date">Fertig bis</span><input name="deadline" type="month" min="2000-01" max="2100-12"></label><label class="only-rate"><span>Rate pro Monat (€)</span><input name="rate" inputmode="decimal" placeholder="0,00" autocomplete="off"></label><label class="only-date only-rate"><span>Gilt</span>${monthOptions('start')}</label></div><p class="sv-preview" id="sv-preview" aria-live="polite"></p><label class="spaced"><span>Notiz (optional)</span><textarea name="note" maxlength="1000" rows="2"></textarea></label>${footer('Ziel anlegen')}</form>`,form=>{
      if(S().revision!==revision)throw Error('Der Stand hat sich geändert. Bitte erneut öffnen.');
      const title=field(form,'title').trim(),price=readMoney(field(form,'price'),false),saved=readMoney(field(form,'saved')),deadline=field(form,'deadline');
      if(!title)throw Error('Bitte einen Namen eingeben.');
      if(!(price>0))throw Error('Bitte einen Zielbetrag größer als 0 eingeben.');
      if(Number.isNaN(saved))throw Error('Bitte beim angesparten Betrag eine Zahl wie 250,00 eingeben.');
      const c=computeRate(form);
      if(c.error)throw Error(c.error);
      if(c.mode==='flex'&&deadline&&!validMonth(deadline))throw Error('Bitte einen gültigen Wunschtermin wählen.');
      const rate=c.mode==='flex'||c.plan.done?null:{rate:c.rate,start:c.start,end:c.plan.end};
      const n=createGoal(S(),{title,price,saved,month:firstMonth(),deadline:c.mode==='flex'?deadline:c.plan.end,note:field(form,'note').trim(),rate});
      if(ctx.commitUndo(n,'Ziel angelegt'))close();
    });
    preview(document.querySelector('#dialog form'));
  }
  // Ziel auf eine vorhandene Rücklage setzen: der Topf bleibt, das Ziel zeigt den Fortschritt.
  function goalOnPot(potId){
    const p=getPot(potId),revision=S().revision;
    ctx.openDialog('Ziel setzen',`<form id="sv-goalpot-form"><p class="bodycopy">Für die Rücklage „${esc(p.name)}“</p><label class="spaced"><span>Wofür?</span><input name="title" maxlength="100" value="${esc(p.name)}" required></label><div class="form-grid spaced"><label><span>Zielbetrag (€)</span><input name="price" inputmode="decimal" placeholder="0,00" required></label><label><span>Wunschtermin (optional)</span><input name="deadline" type="month" min="2000-01" max="2100-12"></label></div>${footer('Ziel setzen')}</form>`,form=>{
      if(S().revision!==revision)throw Error('Der Stand hat sich geändert. Bitte erneut öffnen.');
      const title=field(form,'title').trim(),price=readMoney(field(form,'price'),false),deadline=field(form,'deadline');
      if(!title||!(price>0))throw Error('Bitte einen Namen und einen Zielbetrag größer als 0 eingeben.');
      if(deadline&&!validMonth(deadline))throw Error('Bitte einen gültigen Monat wählen.');
      const n=saveGoal(S(),{title,price,deadline,potId,note:'',status:'active'});
      if(ctx.commitUndo(n,'Ziel gesetzt'))close();
    });
  }
  // Bestand anpassen geht auch bei einem Ziel, das noch keinen Topf hat.
  function correct(el){
    const g=getGoal(el.dataset.goal);
    if(g.potId)return ctx.correctPot(g.potId);
    const revision=S().revision;
    ctx.openDialog('Bestand anpassen',`<form id="sv-correct-form"><p class="bodycopy">${esc(g.title)}</p><div class="form-grid spaced"><label><span>Schon angespart (€)</span><input name="balance" inputmode="decimal" value="0,00" required></label><label><span>Zu Beginn von</span><input name="month" type="month" value="${firstMonth()}" min="2000-01" max="2100-12" required></label></div><p class="helper">Das ändert nur den Bestand, nicht Deinen Monatsplan.</p>${footer('Speichern')}</form>`,form=>{
      if(S().revision!==revision)throw Error('Der Stand hat sich geändert. Bitte erneut öffnen.');
      const balance=readMoney(field(form,'balance'),false),month=field(form,'month');
      if(!(balance>=0))throw Error('Bitte einen Betrag wie 250,00 eingeben.');
      if(!validMonth(month))throw Error('Bitte einen gültigen Monat wählen.');
      if(ctx.commitUndo(ensureGoalPot(S(),g.id,month,balance).state,'Bestand gespeichert'))close();
    });
  }

  // ---- Jahreskosten ----
  function sinkingList(){
    // Jahreskosten gelten immer ab heute, unabhängig vom gerade angezeigten Monat.
    const cands=sinkingCandidates(S(),currentMonth());
    if(!cands.length)return close();
    ctx.openDialog('Jahreskosten glätten',`<div class="sheet-body"><p class="bodycopy">Diese Zahlungen kommen nicht jeden Monat und reißen dann ein Loch. Mit einer Rücklage legst Du jeden Monat einen Teil zurück; im Zahlungsmonat kommt das Geld aus dem Topf.</p><ul class="rows compact spaced">${cands.map(c=>`<li class="row is-plain"><span class="row-main"><span class="row-title">${esc(c.item.title)}</span><span class="row-sub">${euro(c.amount)} ${c.interval===3?'alle 3 Monate':'im Jahr'}, nächste im ${esc(monthName(c.next))}</span></span><button class="btn btn-outline small" data-action="sinking-start" data-key="${c.key}">${whole(c.monthly)} / Monat</button></li>`).join('')}</ul><details class="sheet-more"><summary>Vorschläge ausblenden</summary><div class="sheet-links">${cands.map(c=>`<button class="textbtn" data-action="sinking-dismiss" data-key="${c.key}">${esc(c.item.title)} nicht mehr vorschlagen</button>`).join('')}</div></details></div>`);
  }
  function sinkingStart(el){
    const m=currentMonth(),c=sinkingCandidates(S(),m).find(x=>x.key===el.dataset.key);
    if(!c)throw Error('Für diese Zahlung gibt es schon eine Rücklage.');
    const o=sinkingOptions(c,m),revision=S().revision;
    const choice=o.onlyLater?`<p class="bodycopy spaced">Die Zahlung im ${esc(monthName(c.next))} geht noch wie bisher vom Monat ab. Ab ${esc(monthName(o.laterStart))} legst Du ${whole(o.regular)} im Monat zurück, ab ${esc(monthName(o.firstLater))} kommt sie aus dem Topf.</p><input type="hidden" name="mode" value="later">`:o.catchUp?`<div class="opt-list spaced"><label><input type="radio" name="mode" value="now" checked><span><b>Schon die nächste Zahlung abdecken</b><small>${whole(o.catchUp)} im Monat bis ${esc(monthName(c.next))}, danach ${whole(o.regular)}.</small></span></label><label><input type="radio" name="mode" value="later"><span><b>${whole(o.regular)} im Monat ab ${esc(monthName(o.laterStart))}</b><small>Die Zahlung im ${esc(monthName(c.next))} geht noch wie bisher vom Monat ab. Ab ${esc(monthName(o.firstLater))} kommt sie aus dem Topf.</small></span></label></div>`:`<p class="bodycopy spaced">${whole(o.regular)} im Monat ab ${esc(monthName(m))}. Bis ${esc(monthName(c.next))} ist das Geld für die nächste Zahlung zusammen.</p>`;
    ctx.openDialog(esc(c.item.title),`<form id="sv-sinking-form"><p class="bodycopy">${euro(c.amount)} ${c.interval===3?'alle 3 Monate':'einmal im Jahr'}, nächste im ${esc(monthName(c.next))}.</p>${choice}<p class="helper spaced">Angelegt werden ein Topf „${esc(c.item.title)}“, die Monatsrate und im Zahlungsmonat eine Entnahme in Höhe der Zahlung. Mit „Rückgängig“ ist alles wieder weg.</p>${footer('Rücklage anlegen')}</form>`,form=>{
      if(S().revision!==revision)throw Error('Der Stand hat sich geändert. Bitte erneut öffnen.');
      const n=applySinking(S(),c,m,{mode:field(form,'mode')||'now'});
      if(ctx.commitUndo(n,`Rücklage für ${c.item.title} angelegt`))close();
    });
  }
  function sinkingDismiss(el){
    const n=structuredClone(S());
    n.settings.sinkingDismissed=[...new Set([...(n.settings.sinkingDismissed||[]),el.dataset.key])];
    if(ctx.commitUndo(n,'Wird nicht mehr vorgeschlagen')){
      if(sinkingCandidates(n,currentMonth()).length)sinkingList();
      else close();
    }
  }

  const actions={
    'savings-pot':el=>potSheet(el.dataset.id),
    'goal-open':el=>goalSheet(el.dataset.id),
    'goal-new':el=>goalNew(el),
    'goal-preset':el=>goalNew(el),
    'goal-plan':el=>rateDialog({dataset:{goal:el.dataset.id}}),
    'sv-deposit':deposit,
    'sv-rate':rateDialog,
    'sv-correct':correct,
    'sinking-open':sinkingList,
    'sinking-start':sinkingStart,
    'sinking-dismiss':sinkingDismiss
  };
  return {render,actions,preview};
}
