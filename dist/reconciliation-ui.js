// Dialoge rund um erfasste Käufe: Zahlungen zu Planposten (plan-payments-ui) und das Zuordnen eines einzelnen Kaufs.
// Seit 3.1 ohne CSV-Import, Monatsabschluss und die frühere Ausgabenansicht; die Logik dazu liegt weiter in reconciliation.js.
import {createPlanPaymentsUI} from './plan-payments-ui.js';
import {euro,fieldMoney,money,projected,validDate,resolveExpensePlan} from './planner.js';
import {saveEntryClassification,reopenMonth} from './reconciliation.js';
export function createReconciliationUI(ctx){
  const {esc}=ctx;
  const payments=createPlanPaymentsUI(ctx);
  const close=()=>document.querySelector('#dialog').close(),options=(list,value)=>list.map(([v,t])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join(''),foot=label=>`<div class="form-footer"><button type="button" class="btn btn-outline" data-action="close">Abbrechen</button><button type="submit" class="btn btn-primary">${label}</button></div>`;
  function form(title,html,fn){
    const revision=ctx.state.revision;
    ctx.openDialog(title,`<form>${html}</form>`,f=>{
      if(revision!==ctx.state.revision)throw Error('Der Stand hat sich geändert. Bitte erneut öffnen.');
      fn(new FormData(f));
    });
  }
  function classification(id){
    const x=ctx.state.actualExpenses.find(r=>r.id===id);
    if(!x)throw Error('Dieser Umsatz fehlt.');
    if(ctx.state.monthClosures.some(c=>c.month===x.date.slice(0,7)))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
    const plan=projected(ctx.state,x.date.slice(0,7)).filter(i=>i.type==='expense');
    form('Umsatz zuordnen',`<div class="reconcile-entry-heading"><strong>${esc(x.title)}</strong><span>${x.date} · ${euro(x.amount)}</span></div><label class="spaced"><span>Name</span><input name="title" value="${esc(x.title)}" maxlength="160" required></label><div class="form-grid spaced"><label><span>Betrag (€)</span><input name="amount" inputmode="decimal" value="${fieldMoney(x.amount)}" required></label><label><span>Datum</span><input name="date" type="date" value="${x.date}" min="2000-01-01" max="2100-12-31" required></label><label><span>Art</span><select name="kind">${options([['expense','Ausgabe'],['income','Einnahme / Erstattung'],['transfer','Umbuchung zwischen eigenen Konten']],x.kind||'expense')}</select></label><label><span>Kategorie</span><select name="category">${options(ctx.state.categories.map(c=>[c.id,c.name]),x.category)}</select></label><label><span>Richtung einer Umbuchung</span><select name="direction">${options([['out','Vom Konto zum Rücklagentopf'],['in','Aus dem Rücklagentopf zum Konto']],x.direction||'out')}</select></label><label><span>Topf bei Umbuchung (optional)</span><select name="potId">${options([['','Kein Topf / anderes eigenes Konto'],...ctx.state.pots.map(p=>[p.id,p.name])],x.potId||'')}</select></label></div><label class="spaced"><span>Gehört zu diesem Ausgaben-Planposten</span><select name="planItemId">${options([['','Ohne Zuordnung zum Planposten'],...plan.map(i=>[i.id,i.title+' · '+euro(i.monthlyAmount)])],resolveExpensePlan(ctx.state,plan,x)?.id||'')}</select></label><p class="helper spaced">Mehrere Käufe können zu einem Planposten gehören. Umbuchungen werden nur gekennzeichnet; eine geplante Topfbewegung wird dadurch nicht doppelt gebucht. Bei einer Erstattung bleibt die ursprüngliche Ausgabe bestehen, die Erstattung zählt als Einnahme.</p><label class="scenario-check"><input name="learn" type="checkbox" value="yes" checked><span>Art und Kategorie für diesen Händlernamen merken</span></label>${foot('Zuordnung speichern')}`,fd=>{
      const fields={title:String(fd.get('title')||'').trim(),amount:money(fd.get('amount')),date:fd.get('date'),kind:fd.get('kind'),category:fd.get('category'),direction:fd.get('direction'),planItemId:fd.get('planItemId')||'',potId:fd.get('potId')||'',learn:fd.get('learn')==='yes'};
      if(!fields.title||!validDate(fields.date)||!fields.amount)throw Error('Bitte Name, Datum und einen Betrag größer als null prüfen.');
      if(ctx.state.monthClosures.some(c=>c.month===fields.date.slice(0,7)))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
      if(fields.kind!=='expense')fields.planItemId='';
      if(fields.kind!=='transfer')fields.potId='';
      if(ctx.persist(saveEntryClassification(ctx.state,id,fields),'Umsatz zugeordnet'))close();
    });
  }
  return {
    paymentPreview:payments.preview,actions:{
      ...payments.actions,'reconcile-edit':el=>classification(el.dataset.id),
      // Monate, die mit einer früheren Version abgeschlossen wurden, lassen sich wieder öffnen.
      'month-reopen':()=>{
        const revision=ctx.state.revision;
        ctx.confirmDialog('Abschluss zurücknehmen?','Die unveränderten Übertragsposten im Folgemonat werden entfernt. Erfasste Umsätze bleiben erhalten.',()=>{
          if(revision!==ctx.state.revision)throw Error('Der Stand hat sich geändert.');
          if(ctx.persist(reopenMonth(ctx.state,ctx.month),'Monat wieder geöffnet'))close();
        },'Zurücknehmen');
      }
    }
  };
}
