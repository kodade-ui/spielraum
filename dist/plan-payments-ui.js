import {euro,money,currentMonth,monthName,upsertItem} from './planner.js';
import {reconcileMonth,recordPlannedExpense,saveEntryClassification,merchantKey} from './reconciliation.js';
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
  return {actions,preview};
}
