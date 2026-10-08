import {renderReconciliationGraphics,renderRemainingGraphic} from './reconciliation-graphics.js';
import {euro,money,currentMonth,monthName,legacyAnnual,upsertItem} from './planner.js';
import {reconcileMonth,recordPlannedExpense,saveEntryClassification,merchantKey} from './reconciliation.js';
import {themeColor} from './theme.js';
export function createPlanPaymentsUI(ctx){
  const {esc,icon}=ctx;
  let editing=null;
  const close=()=>document.querySelector('#dialog').close(),dateFor=m=>m===currentMonth()?m+'-'+String(new Date().getDate()).padStart(2,'0'):m+'-01';
  const get=(id,m=ctx.month)=>{
    const r=reconcileMonth(ctx.state,m),item=r.links.find(i=>i.id===id);
    if(!item)throw Error('Dieser Planposten ist in diesem Monat nicht mehr aktiv.');
    return {r,item};
  };
  const candidates=(r,item)=>r.unlinked.filter(x=>x.category===item.category||merchantKey(x.title)===merchantKey(item.title));
  const isClosed=m=>(ctx.state.monthClosures||[]).some(c=>c.month===m);
  function dueHint(i){
    if(i.budgetKind!=='fixed'||!i.open||!i.paymentDay||legacyAnnual(i))return '';
    const last=new Date(Number(ctx.month.slice(0,4)),Number(ctx.month.slice(5)),0).getDate(),day=Math.min(last,i.paymentDay),past=ctx.month<currentMonth()||ctx.month===currentMonth()&&day<new Date().getDate();
    return `<p class="checkoff-due ${past?'is-past':''}">${past?'Termin vorbei · noch nicht vollständig erfasst':'Zahlung geplant'} · ${day}. ${monthName(ctx.month)}</p>`;
  }
  function renderItem(i,r,closed){
    const c=ctx.state.categories.find(c=>c.id===i.category),color=themeColor(c?.color||'#4b5660'),percent=i.monthlyAmount?Math.min(100,Math.round(i.paid/i.monthlyAmount*100)):100,pending=candidates(r,i),variable=i.budgetKind==='variable';
    return `<article class="checkoff-item ${!i.open?'is-complete':''}" style="--post-color:${color}"><div class="checkoff-item-main"><button class="checkoff-tick" data-action="${i.open?'plan-pay-full':'plan-payments'}" data-id="${i.id}" aria-label="${esc(i.title)}: ${i.open?'Restbetrag '+euro(i.open)+' als Ausgabe erfassen':'Zahlungen anzeigen'}" ${closed&&i.open?'disabled':''}>${!i.open?icon('check'):icon('circle')}</button><button class="checkoff-name" data-action="plan-payments" data-id="${i.id}"><strong>${esc(i.title)}</strong><span>${esc(c?.name||'')} · ${i.frequency==='year'?(legacyAnnual(i)?'Zahlungsmonat prüfen':'Jährlich'):i.frequency==='quarter'?'Alle 3 Monate':i.frequency==='once'?'Einmalig':'Monatlich'}</span></button><div class="checkoff-open"><b class="${i.over?'negative':''}">${euro(i.monthlyAmount)}</b><span class="payment-status ${i.over?'over':!i.open?'done':i.paid?'partial':''}">${i.over?'Über Plan':!i.open?'Erfasst':i.paid?'Teilweise':'Offen'}</span></div></div><div class="checkoff-progress"><div role="progressbar" aria-label="${esc(i.title)}: ${euro(i.paid)} erfasst" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></div><span>${euro(i.paid)} von ${euro(i.monthlyAmount)}</span></div><p class="payment-remaining ${i.over?'negative':''}">${i.over?euro(i.over)+' über Plan':i.open?euro(i.open)+(variable?' noch im Budget':' noch zu bezahlen'):'Vollständig erfasst'}</p>${dueHint(i)}<div class="checkoff-actions">${!closed?`<button class="btn btn-outline" data-action="plan-pay-part" data-id="${i.id}">${i.paid?'Weitere Ausgabe':'Teilbetrag erfassen'}</button>`:''}<button class="textbtn checkoff-detail-link" data-action="plan-payments" data-id="${i.id}">${pending.length?'Vorhandene zuordnen ('+pending.length+')':'Details'+(i.payments.length?' · '+i.payments.length:'')}</button></div></article>`;
  }
  function changeKind(id){
    const m=ctx.month,{item}=get(id,m),revision=ctx.state.revision;
    if(isClosed(m))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
    ctx.openDialog('Einordnung · '+esc(item.title),`<form><label><span>Dieser Posten ist</span><select name="pace"><option value="fixed" ${item.budgetKind==='fixed'?'selected':''}>Eine feste Rechnung</option><option value="spread" ${item.budgetKind==='variable'?'selected':''}>Ein variables Budget</option></select></label><p class="helper spaced">Gilt ab ${monthName(m)}. Beträge und bereits erfasste Zahlungen bleiben erhalten.</p><div class="form-footer"><button type="button" class="btn btn-outline" data-action="close">Abbrechen</button><button type="submit" class="btn btn-primary">Speichern</button></div></form>`,form=>{
      if(ctx.state.revision!==revision)throw Error('Der Stand hat sich geändert. Bitte erneut öffnen.');
      const original=ctx.state.items.find(i=>i.id===id),pace=new FormData(form).get('pace');
      if(!['fixed','spread'].includes(pace))throw Error('Bitte eine Einordnung wählen.');
      if(ctx.commitUndo(upsertItem(ctx.state,{...original,pace},id,m),'Einordnung gespeichert'))close();
    });
  }
  function render(r,{filter='',kind='all',status='all'}={}){
    const closed=isClosed(ctx.month),items=r.links.filter(i=>(!filter||i.category===filter)&&(kind==='all'||i.budgetKind===kind)&&(status==='all'||(status==='open'?i.open>0:!i.open))),done=r.links.filter(i=>!i.open).length;
    return `<section class="plan-checkoff"><div class="spending-heading"><div><span class="goal-kicker">${monthName(ctx.month)}</span><h2>Dein verfügbarer Rahmen</h2></div>${ctx.btn('Ausgabe erfassen','actual-new')}</div><div class="reconcile-income"><span>Einnahmen laut Monatsplan</span><div class="reconcile-income-line"><div><strong>${euro(r.budgetIncome)}</strong><span>${r.incomeSources.length===1?esc(r.incomeSources[0].title):'Einnahmen'}</span></div>${r.reserveWithdrawals?`<button class="reconcile-income-reserve" data-action="spending-flow" data-id="withdrawals"><strong>+ ${euro(r.reserveWithdrawals)}</strong><span>aus Rücklagen · aufschlüsseln</span></button>`:''}</div></div><div class="spending-kpis"><button data-action="spending-flow" data-id="free"><span>Frei nach allen offenen Posten</span><strong class="${r.afterOpen<0?'negative':''}">${euro(r.afterOpen)}</strong><small>Alle geplanten Sparbeträge berücksichtigt</small></button><button data-action="spending-flow" data-id="spent"><span>Bereits ausgegeben</span><strong>${euro(r.actualTotal)}</strong><small>Erfasste Zahlungen ansehen</small></button><button data-action="spending-flow" data-id="bills"><span>Rechnungen offen</span><strong>${euro(r.fixedOpen)}</strong><small>Noch zu bezahlen</small></button><button data-action="spending-flow" data-id="budgets"><span>Variable Budgets übrig</span><strong>${euro(r.variableOpen)}</strong><small>Für weitere Käufe eingeplant</small></button></div>${renderRemainingGraphic(r)}<details class="money-flow"><summary>Geldfluss & Monatsrechnung ansehen</summary>${renderReconciliationGraphics(r)}<div class="reconcile-equation"><span>Nach erfassten Ausgaben und geplanten Sparbeträgen noch übrig</span><b>${euro(r.afterRecorded)}</b></div><p class="helper">Die Rechnung nutzt geplante Einnahmen und Topfentnahmen; sie ist kein Kontostand. Noch nicht erfasste Planposten bleiben reserviert.</p></details>${r.unlinked.length?`<div class="checkoff-unlinked">${r.unlinked.length} Ausgabe${r.unlinked.length===1?'':'n'} ohne Planzuordnung. Zusätzliche Käufe zählen bereits mit. Gehört ein Kauf zu einem Budget, ordne ihn in den Zahlungen zu, damit der offene Planbetrag sinkt. <button class="textbtn" data-action="spending-unlinked">Einträge prüfen</button></div>`:''}<div class="plan-checkoff-heading"><div><span class="goal-kicker">Abhaken oder Teilbetrag erfassen</span><h2>Deine Posten</h2></div><span class="checkoff-count">${done} / ${r.links.length} erfasst</span></div><div class="spending-filters"><button class="${status==='all'?'active':''}" aria-pressed="${status==='all'}" data-action="spending-status" data-id="all">Alle</button><button class="${status==='open'?'active':''}" aria-pressed="${status==='open'}" data-action="spending-status" data-id="open">Offen</button><button class="${status==='done'?'active':''}" aria-pressed="${status==='done'}" data-action="spending-status" data-id="done">Erfasst</button>${filter||kind!=='all'?'<button data-action="spending-clear">Filter aufheben ×</button>':''}</div>${filter?`<p class="selected-category">Kategorie: ${esc(ctx.state.categories.find(c=>c.id===filter)?.name||'')}</p>`:''}<div class="checkoff-list" id="spending-posts">${[['fixed','Feste Rechnungen'],['variable','Variable Budgets']].map(([k,title])=>{const group=items.filter(i=>i.budgetKind===k);return group.length?`<section class="checkoff-group ${k}"><div class="checkoff-group-heading"><h3>${title}</h3><span>${euro(group.reduce((n,i)=>n+i.open,0))} ${k==='fixed'?'offen':'übrig'}</span></div>${group.map(i=>renderItem(i,r,closed)).join('')}</section>`:'';}).join('')||'<p class="quiet-empty">Keine Posten für diese Auswahl. Neue geplante Ausgaben legst Du im Monatsplan an.</p>'}</div>${closed?'<p class="helper spaced">Dieser Monat ist abgeschlossen. Öffne den Abschluss wieder, um Zahlungen zu ändern.</p>':''}</section>`;
  }
  function full(id,bypass=false){
    const m=ctx.month,{r,item}=get(id,m);
    if(isClosed(m))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
    if(!item.open)return details(id,m);
    if(!bypass&&candidates(r,item).length)return details(id,m,true);
    ctx.commitUndo(recordPlannedExpense(ctx.state,id,m,{complete:true,date:dateFor(m)}),item.title+' · '+euro(item.open)+' erfasst');
    if(bypass)close();
  }
  function partial(id){
    const m=ctx.month,{r,item}=get(id,m),revision=ctx.state.revision;
    if(isClosed(m))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
    editing={id,month:m};
    ctx.openDialog('Ausgabe · '+item.title,`<form id="plan-payment-form"><div class="payment-context"><span>Für ${monthName(m)} geplant</span><strong>${euro(item.monthlyAmount)}</strong><small>Bereits erfasst: ${euro(item.paid)}</small></div>${candidates(r,item).length?`<p class="checkoff-unlinked">Es gibt passende, noch nicht zugeordnete Ausgaben. ${'<button type="button" class="textbtn" data-action="plan-payments" data-id="'+id+'">Vorhandene ansehen</button>'}</p>`:''}<div class="form-grid spaced"><label><span>Jetzt zusätzlich ausgegeben (€)</span><input name="amount" inputmode="decimal" placeholder="z. B. 100,00" required autofocus></label><label><span>Ausgabedatum</span><input name="date" type="date" value="${dateFor(m)}" min="${m}-01" max="${m}-${new Date(Number(m.slice(0,4)),Number(m.slice(5)),0).getDate()}" required></label></div><div id="payment-preview" class="payment-preview" aria-live="polite"><span>Danach noch offen</span><strong>${euro(item.open)}</strong></div><p class="helper">Dieser Betrag wird zu Deinen bereits erfassten Ausgaben addiert und automatisch mit „${esc(item.title)}“ verknüpft. Name und Kategorie werden übernommen.</p><div class="form-footer"><button type="button" class="btn btn-outline" data-action="close">Abbrechen</button><button type="submit" class="btn btn-primary">Ausgabe speichern</button></div></form>`,f=>{
      if(ctx.state.revision!==revision)throw Error('Der Stand hat sich geändert. Bitte den Posten erneut öffnen.');
      const fd=new FormData(f),amount=money(fd.get('amount')),date=fd.get('date');
      if(ctx.commitUndo(recordPlannedExpense(ctx.state,id,m,{amount,date}),euro(amount)+' für '+item.title+' erfasst')){
        editing=null;
        close();
      }
    });
  }
  function preview(form){
    if(!editing)return;
    const el=document.querySelector('#payment-preview');
    if(!el)return;
    try{
      const {item}=get(editing.id,editing.month),raw=new FormData(form).get('amount'),value=raw?money(raw):0,remaining=item.monthlyAmount-item.paid-value;
      el.innerHTML=`<span>${remaining<0?'Danach über dem Plan':'Danach noch offen'}</span><strong class="${remaining<0?'negative':''}">${euro(Math.abs(remaining))}</strong>`;
    }catch{
      el.innerHTML='<span>Bitte einen gültigen Betrag eingeben.</span>';
    }
  }
  function details(id,m=ctx.month,guard=false){
    const {r,item}=get(id,m),pending=candidates(r,item),closed=isClosed(m);
    editing=null;
    ctx.openDialog('Zahlungen · '+item.title,`<div class="payment-context"><strong>${euro(item.paid)} erfasst</strong><span>${euro(item.open)} noch offen · ${monthName(m)}</span></div>${guard?'<p class="checkoff-unlinked">Prüfe zuerst, ob die Ausgabe bereits vorhanden ist. Eine Zuordnung erzeugt keine zweite Ausgabe.</p>':''}<div class="payment-history">${item.payments.map(x=>`<article><div><strong>${esc(x.title)}</strong><span>${x.date}</span></div><b>${euro(x.amount)}</b>${!closed?`<button class="textbtn" data-action="reconcile-edit" data-id="${x.id}">Bearbeiten</button><button class="iconbtn" data-action="plan-payment-delete" data-id="${x.id}" data-plan="${id}" data-month="${m}" aria-label="Ausgabe ${esc(x.title)} vom ${x.date} löschen">${icon('trash')}</button>`:''}</article>`).join('')||'<p class="helper spaced">Noch keine Zahlungen zugeordnet.</p>'}</div>${pending.length?`<h3 class="spaced">Bereits erfasst, noch ohne Zuordnung</h3><div class="payment-history">${pending.map(x=>`<article><div><strong>${esc(x.title)}</strong><span>${x.date}</span></div><b>${euro(x.amount)}</b>${!closed?`<button class="btn btn-outline" data-action="plan-payment-link" data-id="${x.id}" data-plan="${id}" data-month="${m}">Zuordnen</button>`:''}</article>`).join('')}</div>`:''}<div class="payment-detail-actions">${!closed?`<button class="textbtn" data-action="plan-payment-kind" data-id="${id}">${item.budgetKind==='variable'?'Variables Budget':'Feste Rechnung'} · Einordnung ändern</button><button class="textbtn" data-action="edit-item" data-id="${id}">Planposten bearbeiten</button>`:''}</div><div class="form-footer"><button class="btn btn-outline" data-action="close">Schließen</button>${guard&&item.open&&!closed?`<button class="btn btn-primary" data-action="plan-pay-full-new" data-id="${id}">${euro(item.open)} zusätzlich erfassen</button>`:''}</div>`);
  }
  const actions={
    'plan-payment-kind':el=>changeKind(el.dataset.id),
    'plan-pay-full':el=>full(el.dataset.id),'plan-pay-full-new':el=>full(el.dataset.id,true),'plan-pay-part':el=>partial(el.dataset.id),'plan-payments':el=>details(el.dataset.id),
    'plan-payment-link':el=>{
      const {id,plan,month}=el.dataset,{item,r}=get(plan,month);
      if(isClosed(month))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
      const x=ctx.state.actualExpenses.find(x=>x.id===id);
      if(!x||x.date.slice(0,7)!==month||r.links.some(i=>i.payments.some(p=>p.id===x.id)))throw Error('Diese Ausgabe wurde inzwischen geändert. Bitte erneut öffnen.');
      const n=saveEntryClassification(ctx.state,id,{kind:'expense',category:item.category,planItemId:plan,direction:x.direction||'out'});
      if(ctx.commitUndo(n,'Vorhandene Ausgabe zugeordnet'))details(plan,month);
    },
    'plan-payment-delete':el=>{
      const {id,plan,month}=el.dataset;
      if(isClosed(month))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
      const n=structuredClone(ctx.state),x=get(plan,month).item.payments.find(x=>x.id===id);
      if(!x)throw Error('Diese Ausgabe wurde inzwischen geändert.');
      n.actualExpenses=n.actualExpenses.filter(x=>x.id!==id);
      if(ctx.commitUndo(n,'Ausgabe entfernt – wieder im Plan offen'))details(plan,month);
    }
  };
  return {render,actions,preview};
}
