import {euro,fieldMoney,money,monthName} from './planner.js';
import {suggestCategory} from './intelligence.js';
import {checkPurchase,adoptPurchase} from './purchase.js';
import {undoScenario} from './scenarios.js';

export function createPurchaseUI(ctx){
  const {esc}=ctx;
  let draft=null,checked=null,revision=null,goalId=null;
  const close=()=>document.querySelector('#dialog').close();
  const foot=(label,action)=>`<div class="form-footer"><button class="btn btn-outline" type="button" data-action="close">Schließen</button><button class="btn btn-primary" ${action?'type="button" data-action="'+action+'"':'type="submit"'}>${label}</button></div>`;
  function start(id,keep=false){
    const g=ctx.state.goals.find(g=>g.id===id);
    if(!g)throw Error('Dieses Ziel fehlt.');
    goalId=id;
    const applied=ctx.state.decisions.find(d=>d.id==='purchase_'+id&&d.applied);
    if(applied){
      ctx.openDialog('Kauf ist eingeplant',`<div class="purchase-verdict"><span class="goal-kicker">${esc(g.title)}</span><h3>Im Monatsplan ab ${monthName(applied.start)}</h3><p>Der Kauf und seine verknüpften Zahlungen wurden übernommen. Tatsächliche Ausgaben erfasst Du weiterhin unter Ausgaben.</p></div><button class="btn btn-outline spaced" data-action="purchase-undo" data-id="${id}">Übernahme zurücknehmen</button>`);
      return;
    }
    if(!keep||!draft){
      const month=g.deadline&&g.deadline>=ctx.month?g.deadline:ctx.month;
      draft={month,price:g.price,running:0,potId:g.potId||'',funding:0,minFree:ctx.state.timeline?.minFree||0,category:suggestCategory(ctx.state,g.title,'expense').id};
    }
    revision=ctx.state.revision;
    ctx.openDialog('Wann passt dieser Kauf?',`<form id="purchase-form"><p class="purchase-goal-name">${esc(g.title)}</p><div class="form-grid spaced"><label><span>Kaufpreis (€)</span><input name="price" inputmode="decimal" value="${fieldMoney(draft.price)}" required></label><label><span>Kaufmonat</span><input name="month" type="month" min="2000-01" max="2100-01" value="${draft.month}" required></label></div><label class="spaced"><span>Zusätzliche Kosten pro Monat (€)</span><input name="running" inputmode="decimal" value="${fieldMoney(draft.running)}" required></label><p class="helper">Ab dem Kaufmonat, zusätzlich zu bereits geplanten Ausgaben. Beispielsweise Versicherung oder Betriebskosten.</p><details class="purchase-settings" ${draft.funding?'open':''}><summary>Rücklage verwenden & gewünschten Spielraum festlegen</summary><label class="spaced"><span>Rücklagentopf</span><select name="potId"><option value="">Aus dem Monatsbudget bezahlen</option>${ctx.state.pots.map(p=>`<option value="${p.id}" ${p.id===draft.potId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><div class="form-grid spaced"><label><span>Davon aus dem Topf (€)</span><input name="funding" inputmode="decimal" value="${fieldMoney(draft.funding)}" required></label><label><span>Mindestens frei pro Monat (€)</span><input name="minFree" inputmode="decimal" value="${fieldMoney(draft.minFree)}" required></label></div><label class="spaced"><span>Kategorie des Kaufs & der Folgekosten</span><select name="category">${ctx.state.categories.map(c=>`<option value="${c.id}" ${c.id===draft.category?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><p class="helper spaced">Geschützte Mindeststände aus Deinem Zielzeitplan gelten auch hier. Bestehende Sparraten laufen weiter.</p></details><p class="helper spaced">Vergleich über zwölf Monate. Dein Monatsplan bleibt beim Prüfen unverändert.</p>${foot('Kauf prüfen')}</form>`,form=>{
      if(revision!==ctx.state.revision)throw Error('Der Plan hat sich geändert. Bitte erneut prüfen.');
      const fd=new FormData(form);
      draft={month:String(fd.get('month')),price:money(fd.get('price')),running:money(fd.get('running')),funding:money(fd.get('funding')),minFree:money(fd.get('minFree')),potId:String(fd.get('potId')||''),category:String(fd.get('category'))};
      calculate();
    });
  }
  function calculate(){
    checked=checkPurchase(ctx.state,goalId,draft);
    revision=ctx.state.revision;
    show();
  }
  function show(){
    const {base,result,later}=checked,ok=!result.violations.length,row=result.rows[0],pot=row.reserves.pots.find(p=>p.id===draft.potId),max=Math.max(1,...result.rows.map(r=>Math.abs(r.remaining)),...base.rows.map(r=>Math.abs(r.remaining)));
    const other=result.goals.filter(g=>g.goal.id!==goalId&&g.balance!==null).map(g=>({g,b:base.goals.find(b=>b.goal.id===g.goal.id)}));
    ctx.openDialog('Dein Kauf im Budget',`<section class="purchase-verdict ${ok?'':'is-warning'}"><span class="goal-kicker">${esc(checked.decision.title)} · ${monthName(draft.month)}</span><h3>${ok?'Passt zu Deinen eingestellten Grenzen':'So wird es zu knapp'}</h3><p>${ok?'Kaufpreis, Folgekosten und geplante Zahlungen sind für zwölf Monate berücksichtigt.':'Mindestens ein Monatsbetrag oder Rücklagentopf unterschreitet Deine Grenze.'}</p></section><div class="purchase-metrics"><div><span>Frei im Kaufmonat</span><strong class="${row.remaining<draft.minFree?'negative':''}">${euro(row.remaining)}</strong><small>Bisher ${euro(base.rows[0].remaining)}</small></div><div><span>Knappster Monat</span><strong class="${result.minRemaining<draft.minFree?'negative':''}">${euro(result.minRemaining)}</strong><small>Grenze ${euro(draft.minFree)}</small></div></div>${draft.funding?`<p class="purchase-funding">${euro(draft.funding)} aus <strong>${esc(pot?.name||'Rücklage')}</strong> · danach ${euro(pot?.balance||0)} zum Monatsende.</p>`:''}<div class="purchase-month-chart" aria-label="Freier Betrag nach dem Kauf">${result.rows.map((r,i)=>`<button data-action="purchase-month" data-id="${i}" aria-label="${monthName(r.month)}: ${euro(r.remaining)} frei"><span class="purchase-bar-track"><i style="height:${Math.max(2,Math.abs(r.remaining)/max*100)}%;background:${r.remaining<draft.minFree?'var(--red)':'var(--green)'}"></i></span><span>${r.month.slice(5)}</span></button>`).join('')}</div><p class="helper">Freier Betrag je Monat · Rot: unter Deiner Grenze. Balken antippen für genaue Werte.</p>${result.violations.length?`<ul class="purchase-warnings">${result.violations.slice(0,4).map(v=>`<li>${monthName(v.month)}: ${v.kind==='free'?'Frei verfügbar':esc(v.name)} ${euro(v.value)} · mindestens ${euro(v.minimum)}</li>`).join('')}</ul>${later?`<button class="btn btn-outline spaced" data-action="purchase-later">Stattdessen ${monthName(later)} prüfen</button>`:'<p class="helper spaced">Kein passender späterer Beginn innerhalb der nächsten 24 Monate gefunden. Freies Geld wird nicht automatisch angespart.</p>'}`:''}${other.length?`<details><summary>Auswirkungen auf andere Ziele</summary>${other.map(({g,b})=>`<div class="purchase-goal-effect"><strong>${esc(g.goal.title)}</strong><p>Deckung bisher: ${b.reach?monthName(b.reach):'nicht im Vergleichszeitraum'} · mit Kauf: ${g.reach?monthName(g.reach):'nicht im Vergleichszeitraum'}</p></div>`).join('')}<p class="helper">Verglichen wird die Deckung durch bestehende Topfpläne. Eine Neuverteilung gemeinsamer Sparraten erfolgt hier nicht. Ziele ohne Topf können nicht berechnet werden.</p></details>`:''}<p class="helper spaced">Geplante Monatsendstände, keine Kontostände. Es werden keine künftigen Überschüsse automatisch angespart. Sparraten bleiben bestehen.</p><div class="form-footer"><button class="btn btn-outline" data-action="purchase-edit">Angaben ändern</button>${ok?'<button class="btn btn-primary" data-action="purchase-preview">Übernahme prüfen</button>':''}</div>`);
  }
  function guard(){
    if(!checked||ctx.state.revision!==revision)throw Error('Der Plan wurde geändert. Bitte den Kauf erneut prüfen.');
  }
  function preview(){
    guard();
    ctx.openDialog('In den Monatsplan übernehmen?',`<p class="helper">Diese zusätzlichen Posten werden gespeichert. Bereits erfasste Ausgaben bleiben erhalten.</p><ul class="scenario-preview">${checked.decision.variants[0].lines.map(l=>`<li><strong>${esc(l.title)}</strong><span>${euro(l.amount)} · ${l.frequency==='once'?'einmalig':'monatlich'} ab ${monthName(l.start)}${l.potId?' · Entnahme aus '+esc(ctx.state.pots.find(p=>p.id===l.potId)?.name):''}</span></li>`).join('')}</ul><p class="helper">Prüfe, ob der Kauf schon als Planposten vorhanden ist. Die Übernahme legt neue Posten an. Der Wunsch bleibt offen, bis Du ihn als erledigt markierst.</p>${foot('Jetzt einplanen','purchase-adopt')}`);
  }
  return {
    actions:{
      'purchase-start':el=>start(el.dataset.id),'purchase-edit':()=>start(goalId,true),'purchase-later':()=>{
        guard();
        draft.month=checked.later;
        calculate();
      },'purchase-preview':preview,'purchase-adopt':()=>{
        guard();
        if(ctx.persist(adoptPurchase(ctx.state,checked.decision),'Kauf im Monatsplan gespeichert'))close();
      },'purchase-month':el=>{
        guard();
        const i=Number(el.dataset.id),r=checked.result.rows[i],b=checked.base.rows[i];
        if(!r)return;
        ctx.openDialog(monthName(r.month),`<div class="purchase-metrics"><div><span>Bisher frei</span><strong>${euro(b.remaining)}</strong></div><div><span>Mit Kauf frei</span><strong>${euro(r.remaining)}</strong></div></div><dl class="flow-details">${[['Einnahmen ohne Topfentnahmen',r.income-r.reserveWithdrawals],['Aus Rücklagen',r.reserveWithdrawals],['Ausgaben',r.expense],['Sparen & Rücklagen',r.saving]].map(([n,v])=>`<div><dt>${n}</dt><dd>${euro(v)}</dd></div>`).join('')}</dl><button class="btn btn-outline spaced" data-action="purchase-result">Zurück zum Ergebnis</button>`);
      },'purchase-result':()=>{
        guard();
        show();
      },'purchase-undo':el=>{
        const id='purchase_'+el.dataset.id,rev=ctx.state.revision;
        ctx.confirmDialog('Kaufplanung zurücknehmen?','Die unveränderten Posten dieses Kaufs werden entfernt. Deine erfassten Ausgaben bleiben erhalten.',()=>{
          if(rev!==ctx.state.revision)throw Error('Bitte erneut öffnen.');
          if(ctx.persist(undoScenario(ctx.state,id),'Kaufplanung zurückgenommen'))close();
        },'Zurücknehmen');
      }
    }
  };
}
