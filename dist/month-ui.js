// Bereich „Monat“ (ab 3.0): Monatsplan und tatsächliche Ausgaben in einer Ansicht.
// Rechnet ausschließlich über vorhandene Fachfunktionen (reconcileMonth, recordPlannedExpense,
// saveActual, saveEntryClassification). Keine eigene Geldlogik außer Summen für die Anzeige.
import {euro,amountText,monthName,currentMonth,shiftMonth,totals,projected,budgetSavings,money,validDate,legacyAnnual} from './planner.js';
import {reconcileMonth,recordPlannedExpense,saveEntryClassification} from './reconciliation.js';
import {saveActual} from './actuals.js';
import {planChanges} from './budget-insights.js';
import {themeColor,planMeter} from './theme.js';

export function createMonthUI(ctx){
  const {esc,icon}=ctx;
  const S=()=>ctx.state,M=()=>ctx.month;
  const cat=id=>S().categories.find(c=>c.id===id);
  const closed=m=>(S().monthClosures||[]).some(c=>c.month===m);
  const lastDay=m=>new Date(Number(m.slice(0,4)),Number(m.slice(5)),0).getDate();
  const defaultDate=m=>m===currentMonth()?m+'-'+String(new Date().getDate()).padStart(2,'0'):m+'-01';
  const shortDate=d=>new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'short'}).format(new Date(d+'T12:00:00'));
  const rhythm=i=>i.frequency==='quarter'?'alle 3 Monate':i.frequency==='year'?(legacyAnnual(i)?'Jahresanteil':'jährlich'):i.frequency==='once'?'einmalig':'';
  const dayOf=i=>i.paymentDay&&!legacyAnnual(i)?Math.min(i.paymentDay,lastDay(M())):0;
  function money2(v){
    const [w,c]=amountText(v).split(',');
    return `${w},<small>${c} €</small>`;
  }

  function hero(r,t){
    const m=M(),past=m<currentMonth(),free=r.afterOpen,diff=t.remaining-free,empty=!t.items.length;
    const label=past?'Übrig im '+monthName(m):'Noch frei im '+monthName(m);
    let sub;
    if(empty)sub='Lege Dein Einkommen und Deine festen Kosten an. Dann siehst Du hier, was Dir bleibt.';
    else if(free<0)sub=`Dir fehlen ${euro(-free)}${diff?` · ${euro(t.remaining)} geplant`:''}`;
    else if(!diff)sub='genau wie geplant';
    else sub=`${euro(t.remaining)} geplant · ${euro(diff)} außerhalb des Plans`;
    const change=planChanges(S(),m);
    const delta=change&&change.delta&&change.changes.length?`<button class="hero-change" data-action="month-why">${change.delta>0?'+':'−'}${euro(Math.abs(change.delta))} gegenüber ${monthName(change.previous)} <span>Warum?</span></button>`:'';
    // Ab 3.5: geschätzter Kontostand, nur im laufenden Monat. Einnahmen minus alles, was als bezahlt oder gekauft erfasst ist.
    const cashNow=m===currentMonth()&&!empty?`<button class="hero-cash" data-action="month-cash"><span>Auf dem Konto, geschätzt</span><b class="${cash(r)<0?'is-negative':''}">${euro(cash(r))}</b>${icon('info')}</button>`:'';
    return `<section class="hero" aria-label="Monatsübersicht"><p class="hero-label">${esc(label)}</p><p class="hero-value ${free<0?'is-negative':''}">${free<0?'−':''}${money2(Math.abs(free))}</p><p class="hero-sub ${free<0?'is-negative':''}">${esc(sub)}</p>${cashNow}${empty?'':flow(r)}${delta}</section>`;
  }

  // Sparraten gehen beim Nutzer sofort mit dem Gehalt weg und stehen nie im Monatsbudget (ab 3.5.1).
  const cash=r=>r.availableIncome-r.plannedSaving-r.actualTotal;
  // Rechenweg: Einnahmen − Sparen − Erfasstes = Kontostand (geschätzt); minus offene Rechnungen und Rest in Budgets = Noch frei.
  function cashSheet(){
    const m=M(),r=reconcileMonth(S(),m),c=cash(r),line=(label,value,cls='')=>`<li class="${cls}"><span>${label}</span><b>${value}</b></li>`;
    ctx.openDialog('Auf dem Konto, geschätzt',`<div class="sheet-body"><ul class="cash-table">${line('Einnahmen im '+esc(monthName(m))+(r.reserveWithdrawals?` <small>davon ${euro(r.reserveWithdrawals)} aus Töpfen</small>`:''),'+'+euro(r.availableIncome))}${line('Sparen'+(r.plannedSaving?' <small>überwiesen Ende '+esc(monthName(shiftMonth(m,-1)))+' mit dem Gehalt</small>':''),'−'+euro(r.plannedSaving))}${line('Schon bezahlt und ausgegeben','−'+euro(r.actualTotal))}${line('Auf dem Konto, geschätzt',euro(c),'is-sum'+(c<0?' is-negative':''))}<li class="cash-sub">Davon noch gebunden</li>${line('Offene Rechnungen','−'+euro(r.fixedOpen))}${line('Rest in Budgets','−'+euro(r.variableOpen))}${line('Noch frei',euro(r.afterOpen),'is-sum'+(r.afterOpen<0?' is-negative':''))}</ul><p class="helper spaced">Kein echter Kontostand, sondern gerechnet: Einnahmen des Monats minus der Sparraten, die mit diesem Gehalt überwiesen wurden, minus allem, was Du als bezahlt abgehakt oder als Kauf erfasst hast. Was Du nicht einträgst, fehlt hier. Vergleiche ab und zu mit Deinem echten Konto.</p></div>`);
  }

  function flow(r){
    const parts=[
      ['spent','Ausgegeben',r.actualTotal],
      ['bills','Rechnungen',r.fixedOpen],
      ['budgets','Budget übrig',r.variableOpen],
      ['saving','Sparen',r.plannedSaving],
      ['free','Frei',Math.max(0,r.afterOpen)]
    ],sum=parts.reduce((n,p)=>n+p[2],0),base=Math.max(r.availableIncome,sum)||1;
    return `<div class="flow" role="img" aria-label="Aufteilung von ${euro(r.availableIncome)} Einnahmen">${parts.filter(p=>p[2]>0).map(p=>`<i class="seg-${p[0]}" style="flex-grow:${(p[2]/base*1000).toFixed(1)}"></i>`).join('')}${sum<base?`<i class="seg-rest" style="flex-grow:${((base-sum)/base*1000).toFixed(1)}"></i>`:''}</div><ul class="flow-legend">${parts.map(p=>`<li><span><i class="seg-${p[0]}"></i>${p[1]}</span><b>${euro(p[2])}</b></li>`).join('')}${r.afterOpen<0?`<li class="is-negative"><span><i class="seg-minus"></i>Fehlbetrag</span><b>${euro(-r.afterOpen)}</b></li>`:''}<li class="flow-total">von ${euro(r.availableIncome)} Einnahmen${r.reserveWithdrawals?`, davon ${euro(r.reserveWithdrawals)} aus Töpfen`:''}</li></ul>`;
  }

  function billRow(i){
    const done=!i.open,day=dayOf(i),bits=[];
    if(done)bits.push(i.payments.length?'bezahlt '+shortDate(i.payments.at(-1).date):'bezahlt');
    else{
      if(day)bits.push('am '+day+'.');
      if(i.paid)bits.push(euro(i.paid)+' von '+euro(i.monthlyAmount)+' bezahlt');
    }
    if(rhythm(i))bits.push(rhythm(i));
    const locked=closed(M());
    return `<li class="row ${done?'is-done':''}"><button class="tick ${done?'on':''}" data-action="${done?'month-item':'plan-pay-full'}" data-id="${i.id}" aria-label="${esc(i.title)}: ${done?'Details anzeigen':'als bezahlt abhaken, '+euro(i.open)}" ${locked&&!done?'disabled':''}>${done?icon('check'):''}</button><button class="row-main" data-action="month-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span>${bits.length?`<span class="row-sub">${esc(bits.join(' · '))}</span>`:''}</button><span class="row-amount">${euro(done?i.monthlyAmount:i.open)}</span></li>`;
  }

  function budgetRow(i){
    const over=i.over;
    const sub=[i.paid?euro(i.paid)+' ausgegeben':'',rhythm(i)].filter(Boolean).join(' · ');
    return `<li class="row ${!i.open&&!over?'is-done':''}"><button class="tick ${!i.open?'on':''}" data-action="${i.open?'plan-pay-full':'month-item'}" data-id="${i.id}" aria-label="${esc(i.title)}: ${i.open?'Rest von '+euro(i.open)+' als ausgegeben abhaken':'Details anzeigen'}" ${closed(M())&&i.open?'disabled':''}>${!i.open?icon('check'):''}</button><button class="row-main" data-action="month-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span>${sub?`<span class="row-sub">${esc(sub)}</span>`:''}${planMeter(i.paid,i.monthlyAmount)}</button><span class="row-amount ${over?'is-negative':''}">${over?'−'+euro(over):euro(i.open)}<small>${over?'über Plan':'von '+euro(i.monthlyAmount)}</small></span></li>`;
  }

  function planRow(i){
    const pot=S().pots.find(p=>p.id===i.potId),income=i.type==='income';
    // Ab 3.5.5: Sparposten im Budget dieses Monats = feste Raten, die Ende des Vormonats vom Gehalt überwiesen wurden,
    // plus einmalige Einzahlungen in diesem Monat. Dabei steht, wann das Geld in den Topf geht.
    const name=m=>new Intl.DateTimeFormat('de-DE',{month:'long'}).format(new Date(m+'-01T12:00:00'));
    const when=i.upcoming?'geht Ende '+name(M())+' ab · zählt für '+name(shiftMonth(M(),1)):i.type==='saving'?(i.transferMonth&&i.transferMonth!==M()?'Überweisung Ende '+name(i.transferMonth):i.frequency==='once'?'Einzahlung im '+name(M()):''):'';
    const sub=[pot?(income?'aus ':'in ')+pot.name:'',when,dayOf(i)?'am '+dayOf(i)+'.':'',rhythm(i)].filter(Boolean).join(' · ');
    return `<li class="row is-plain${i.upcoming?' is-upcoming':''}"><span class="dot-mark" style="--c:${themeColor(pot?.color||cat(i.category)?.color||'#5f8f80')}"></span><button class="row-main" data-action="edit-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span>${sub?`<span class="row-sub">${esc(sub)}</span>`:''}</button><span class="row-amount ${income?'is-positive':''}">${income?'+':''}${euro(i.monthlyAmount)}</span></li>`;
  }

  function suggestFor(r,x){
    const options=r.links.filter(i=>i.category===x.category);
    return options.length===1?options[0]:null;
  }

  function looseRow(r,x){
    const s=suggestFor(r,x),c=cat(x.category);
    return `<li class="row is-plain"><span class="dot-mark" style="--c:${themeColor(c?.color||'#8d9590')}"></span><button class="row-main" data-action="reconcile-edit" data-id="${x.id}"><span class="row-title">${esc(x.title)}</span><span class="row-sub">${esc(shortDate(x.date))}${c?' · '+esc(c.name):''}</span></button><span class="row-amount">${euro(x.amount)}${s&&!closed(M())?`<button class="link-chip" data-action="month-link" data-id="${x.id}" data-plan="${s.id}">zu ${esc(s.title)}</button>`:''}</span></li>`;
  }

  function section(title,meta,rows,add){
    return `<section class="group"><header class="group-head"><h2>${title}</h2>${meta?`<span>${meta}</span>`:''}</header>${rows.length?`<ul class="rows">${rows.join('')}</ul>`:''}${add||''}</section>`;
  }

  function render(){
    const m=M(),r=reconcileMonth(S(),m),t=totals(S(),m);
    const bills=r.links.filter(i=>i.budgetKind==='fixed').sort((a,b)=>(!a.open-!b.open)||(dayOf(a)||32)-(dayOf(b)||32)||b.monthlyAmount-a.monthlyAmount);
    const budgets=r.links.filter(i=>i.budgetKind==='variable').sort((a,b)=>(!a.open-!b.open)||b.monthlyAmount-a.monthlyAmount);
    const plan=projected(S(),m),savings=budgetSavings(S(),m).sort((a,b)=>b.monthlyAmount-a.monthlyAmount),upcoming=plan.filter(i=>i.type==='saving'&&i.frequency!=='once').sort((a,b)=>b.monthlyAmount-a.monthlyAmount),incomes=plan.filter(i=>i.type==='income').sort((a,b)=>b.monthlyAmount-a.monthlyAmount);
    const loose=r.unlinked.slice().sort((a,b)=>b.date.localeCompare(a.date));
    const linkable=loose.filter(x=>suggestFor(r,x)).length;
    const addLine=(action,label)=>`<button class="add-line" data-action="${action}">${icon('plus')}${label}</button>`;
    const all=r.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title,'de'));
    return `${hero(r,t)}
${closed(m)?'<div class="notice"><span>Dieser Monat wurde mit einer früheren Version abgeschlossen. Erfasste Beträge sind gesperrt.</span><button class="textbtn" data-action="month-reopen">Wieder öffnen</button></div>':''}
${section('Rechnungen',r.fixedOpen?euro(r.fixedOpen)+' gehen noch ab':bills.length?'alles bezahlt':'',bills.map(billRow),addLine('new-expense','Rechnung oder Budget'))}
${budgets.length?section('Budgets',r.variableOpen?euro(r.variableOpen)+' übrig':'aufgebraucht',budgets.map(budgetRow),''):''}
${loose.length?section('Ohne Budget',euro(loose.reduce((n,x)=>n+x.amount,0)),loose.map(x=>looseRow(r,x)),linkable>1&&!closed(m)?`<button class="add-line" data-action="month-link-all">${icon('check')}Alle ${linkable} passend zuordnen</button>`:''):''}
${section('Sparen',savings.length?euro(r.plannedSaving)+' im Monat':'',[...savings.map(planRow),...upcoming.map(i=>planRow({...i,upcoming:true}))],addLine('new-saving','Rücklage'))}
${section('Einnahmen',incomes.length?euro(r.availableIncome):'',incomes.map(planRow),addLine('new-income','Einnahme'))}
${all.length?`<details class="journal"><summary>Alle Käufe im ${esc(monthName(m))} <span>${all.length} · ${euro(r.actualTotal)}</span></summary><ul class="rows">${all.map(x=>{const link=r.links.find(i=>i.payments.some(p=>p.id===x.id));return `<li class="row is-plain"><span class="dot-mark" style="--c:${themeColor(cat(x.category)?.color||'#8d9590')}"></span><button class="row-main" data-action="reconcile-edit" data-id="${x.id}"><span class="row-title">${esc(x.title)}</span><span class="row-sub">${esc(shortDate(x.date))} · ${link?esc(link.title):'ohne Budget'}</span></button><span class="row-amount">${euro(x.amount)}</span></li>`}).join('')}</ul></details>`:''}`;
  }

  function itemSheet(id){
    const m=M(),r=reconcileMonth(S(),m),i=r.links.find(x=>x.id===id);
    if(!i){
      const plain=S().items.find(x=>x.id===id);
      if(plain)return ctx.itemDialog(plain.type,id);
      throw Error('Dieser Posten ist in diesem Monat nicht mehr aktiv.');
    }
    const c=cat(i.category),locked=closed(m);
    const meta=[c?.name,i.budgetKind==='variable'?'Budget':'Rechnung',dayOf(i)?'am '+dayOf(i)+'.':'',rhythm(i)||'monatlich'].filter(Boolean).join(' · ');
    ctx.openDialog(esc(i.title),`<div class="sheet-body"><p class="sheet-meta">${esc(meta)}</p><div class="figures"><div><span>Geplant</span><b>${euro(i.monthlyAmount)}</b></div><div><span>Bezahlt</span><b>${euro(i.paid)}</b></div><div><span>${i.over?'Über Plan':'Offen'}</span><b class="${i.over?'is-negative':''}">${euro(i.over||i.open)}</b></div></div>${planMeter(i.paid,i.monthlyAmount)}${i.payments.length?`<h3 class="sheet-h">Zahlungen im ${esc(monthName(m))}</h3><ul class="rows compact">${i.payments.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<li class="row is-plain"><button class="row-main" data-action="reconcile-edit" data-id="${x.id}"><span class="row-title">${esc(x.title)}</span><span class="row-sub">${esc(shortDate(x.date))}</span></button><span class="row-amount">${euro(x.amount)}</span>${locked?'':`<button class="iconbtn small" data-action="month-pay-delete" data-id="${x.id}" data-plan="${i.id}" aria-label="Zahlung ${euro(x.amount)} entfernen">${icon('trash')}</button>`}</li>`).join('')}</ul>`:'<p class="helper">In diesem Monat noch nichts bezahlt.</p>'}<div class="sheet-actions">${locked?'':`<button class="btn btn-primary" data-action="plan-pay-part" data-id="${i.id}">${icon('plus')}Betrag</button>`}<button class="btn btn-outline" data-action="edit-item" data-id="${i.id}">${icon('edit')}Bearbeiten</button></div><button class="textbtn danger" data-action="month-delete" data-id="${i.id}">Posten ab ${esc(monthName(m))} entfernen</button></div>`);
  }

  function targets(r){
    const m=M(),own=S().actualExpenses.filter(x=>x.date.slice(0,7)===m&&x.planItemId).sort((a,b)=>b.date.localeCompare(a.date));
    const variable=r.links.filter(i=>i.budgetKind==='variable'),fixed=r.links.filter(i=>i.budgetKind==='fixed'&&i.open);
    return {variable,fixed,preselect:(own.map(x=>r.links.find(i=>i.payments.some(p=>p.id===x.id))).find(i=>i&&i.budgetKind==='variable')?.id)||variable.find(i=>i.open)?.id||variable[0]?.id||'none'};
  }

  const choice=(i,preselect)=>`<label class="choice"><input type="radio" name="target" value="${i.id}" ${i.id===preselect?'checked':''}><span>${esc(i.title)}</span></label>`;
  function quickAdd(){
    const m=M();
    if(closed(m))throw Error('Dieser Monat ist abgeschlossen.');
    const r=reconcileMonth(S(),m),{variable,fixed,preselect}=targets(r),expenseCats=S().categories.filter(c=>c.group!=='income'&&c.group!=='saving');
    ctx.openDialog('Ausgabe erfassen',`<form id="quick-form" class="quick" novalidate><label class="quick-amount"><span class="visually-hidden">Betrag in Euro</span><input name="amount" inputmode="decimal" autocomplete="off" placeholder="0,00" required autofocus><b>€</b></label><fieldset class="choices"><legend>Wofür?</legend>${variable.map(i=>choice(i,preselect)).join('')}<label class="choice"><input type="radio" name="target" value="none" ${preselect==='none'?'checked':''}><span>Ohne Budget</span></label>${fixed.length?`<details class="choices-more"><summary>Offene Rechnung bezahlen</summary><div class="choices">${fixed.map(i=>choice(i,preselect)).join('')}</div></details>`:''}</fieldset><div id="quick-category" class="field" ${preselect==='none'?'':'hidden'}><label><span>Kategorie</span><select name="category">${expenseCats.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label></div><p id="quick-hint" class="quick-hint" aria-live="polite"></p><details class="more"><summary>Bezeichnung und Datum</summary><div class="form-grid"><label class="full"><span>Bezeichnung (optional)</span><input name="title" maxlength="160" autocomplete="off" placeholder="z. B. Wochenmarkt"></label><label class="full"><span>Datum</span><input name="date" type="date" value="${defaultDate(m)}" min="${m}-01" max="${m}-${String(lastDay(m)).padStart(2,'0')}"></label></div></details><div class="form-footer"><button type="submit" class="btn btn-primary wide">${icon('check')}Erfassen</button></div></form>`,form=>{
      const fd=new FormData(form),raw=String(fd.get('amount')||'').trim(),amount=raw?money(raw):0;
      if(!(amount>0))throw Error('Bitte einen Betrag größer als 0 eingeben.');
      const target=String(fd.get('target')||'none'),date=String(fd.get('date')||defaultDate(m)),title=String(fd.get('title')||'').trim();
      if(!validDate(date)||date.slice(0,7)!==m)throw Error('Bitte ein Datum im '+monthName(m)+' wählen.');
      if(target!=='none'){
        const item=r.links.find(i=>i.id===target);
        if(!item)throw Error('Dieser Posten ist nicht mehr aktiv. Bitte erneut öffnen.');
        const n=recordPlannedExpense(S(),target,m,{amount,date});
        if(title)n.actualExpenses.at(-1).title=title;
        if(ctx.commitUndo(n,euro(amount)+' · '+item.title))ctx.closeDialog();
      }else{
        const category=String(fd.get('category')||expenseCats[0]?.id),n=saveActual(S(),{title:title||cat(category)?.name||'Ausgabe',amount,date,category,note:'',kind:'expense',direction:'out'});
        if(ctx.commitUndo(n,euro(amount)+' ohne Budget erfasst'))ctx.closeDialog();
      }
    });
    try{quickPreview(document.querySelector('#quick-form'))}catch{}
  }

  function quickPreview(form){
    if(!form)return;
    const hint=document.querySelector('#quick-hint'),fd=new FormData(form),target=String(fd.get('target')||'none'),raw=String(fd.get('amount')||'').trim();
    const catBox=document.querySelector('#quick-category');
    if(catBox)catBox.hidden=target!=='none';
    if(!hint)return;
    let amount=0;
    try{amount=raw?money(raw):0}catch{amount=0}
    const r=reconcileMonth(S(),M());
    if(target==='none'){
      hint.textContent=amount>0?`Senkt Deinen freien Betrag auf ${euro(r.afterOpen-amount)}.`:'Zählt zusätzlich zum Plan und senkt Deinen freien Betrag.';
      return;
    }
    const i=r.links.find(x=>x.id===target);
    if(!i){hint.textContent='';return}
    const left=i.open-amount;
    hint.textContent=left>=0?`${i.title}: danach noch ${euro(left)} übrig. Frei bleibt ${euro(r.afterOpen)}.`:`${i.title}: ${euro(-left)} über Plan. Frei sinkt auf ${euro(r.afterOpen+left)}.`;
  }

  function link(xId,planId){
    const x=S().actualExpenses.find(e=>e.id===xId),item=reconcileMonth(S(),M()).links.find(i=>i.id===planId);
    if(!x||!item)throw Error('Dieser Eintrag hat sich geändert. Bitte erneut versuchen.');
    return saveEntryClassification(S(),xId,{kind:'expense',category:x.category,planItemId:planId,direction:x.direction||'out'});
  }

  const actions={
    'quick-add':()=>quickAdd(),
    'month-item':el=>itemSheet(el.dataset.id),
    'month-link':el=>{
      const item=S().items.find(i=>i.id===el.dataset.plan);
      ctx.commitUndo(link(el.dataset.id,el.dataset.plan),'Zugeordnet zu '+(item?.title||'Budget'));
    },
    'month-link-all':()=>{
      const r=reconcileMonth(S(),M());
      let n=S(),count=0;
      for(const x of r.unlinked){
        const s=suggestFor(r,x);
        if(!s)continue;
        n=saveEntryClassification(n,x.id,{kind:'expense',category:x.category,planItemId:s.id,direction:x.direction||'out'});
        count++;
      }
      if(count)ctx.commitUndo(n,count+' Käufe zugeordnet');
    },
    'month-cash':()=>cashSheet(),
    'month-pay-delete':el=>{
      const n=structuredClone(S());
      if(!n.actualExpenses.some(x=>x.id===el.dataset.id))throw Error('Diese Zahlung gibt es nicht mehr.');
      n.actualExpenses=n.actualExpenses.filter(x=>x.id!==el.dataset.id);
      if(ctx.commitUndo(n,'Zahlung entfernt – wieder offen'))itemSheet(el.dataset.plan);
    },
    'month-delete':el=>{
      ctx.closeDialog();
      ctx.deleteItem(el.dataset.id);
    },
    'month-why':()=>{
      const c=planChanges(S(),M());
      if(!c)return;
      ctx.openDialog('Warum '+(c.delta>0?'mehr':'weniger')+' frei?',`<div class="sheet-body"><p class="sheet-meta">Plan ${esc(monthName(M()))} gegenüber ${esc(monthName(c.previous))}</p><ul class="rows compact">${c.changes.map(x=>`<li class="row is-plain"><button class="row-main" data-action="edit-item" data-id="${x.id}"><span class="row-title">${esc(x.title)}</span></button><span class="row-amount ${x.change>0?'is-positive':'is-negative'}">${x.change>0?'+':'−'}${euro(Math.abs(x.change))}</span></li>`).join('')}</ul></div>`);
    }
  };
  return {render,actions,quickPreview};
}
