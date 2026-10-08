import {themeColor} from './theme.js';
import {euro,compact,fieldMoney,money,monthName,currentMonth,validMonth,shiftMonth,projected,legacyAnnual} from './planner.js';
import {reserveSummary,reserveForecast,createPot,correctPot,paymentSchedule} from './reserves.js';
export function createReserveUI(ctx){
  const {esc,icon,btn}=ctx,potById=id=>ctx.state.pots.find(p=>p.id===id);
  const get=()=>reserveSummary(ctx.state,ctx.month);
  const potOptions=value=>ctx.state.pots.map(p=>`<option value="${p.id}" ${p.id===value?'selected':''}>${esc(p.name)}</option>`).join('');
  const close=()=>document.querySelector('#dialog').close();
  let ledgerFilter='withdrawal';
  const cadence=i=>i.frequency==='year'?(legacyAnnual(i)?'Bisheriger Jahresanteil / 12':'jährlich'):i.frequency==='once'?'einmalig':i.frequency==='quarter'?'alle 3 Monate':'monatlich';
  function movementRow(i){
    return `<div class="cashflow-row"><button class="cashflow-open" data-action="edit-item" data-id="${i.id}"><span class="flow-direction ${i.type==='saving'?'in':'out'}">${icon(i.type==='saving'?'down':'up')}</span><span><strong>${esc(i.title)}</strong><small>${cadence(i)}${i.paymentDay&&!legacyAnnual(i)?' · am '+i.paymentDay+'.':''}</small></span><b class="${i.type==='saving'?'positive':''}">${i.type==='saving'?'+':'−'}${euro(i.monthlyAmount)}</b></button></div>`;
  }
  function trend(){
    const f=reserveForecast(ctx.state,ctx.month);
    return `<section class="surface reserve-trend"><div class="section-head"><div><h2>Deine Rücklagen vorausgeplant</h2><p>Alle verknüpften Posten werden monatlich weitergerechnet.</p></div></div><div class="table-scroll"><table><thead><tr><th>Monat</th><th>Einzahlungen</th><th>Entnahmen</th><th>Endbestand</th></tr></thead><tbody>${f.map(p=>`<tr><td>${monthName(p.month,true)}</td><td>+${euro(p.deposits)}</td><td>−${euro(p.withdrawals)}</td><td class="${p.balance<0?'negative':''}"><strong>${euro(p.balance)}</strong></td></tr>`).join('')}</tbody></table></div><p class="helper">Neue Anfangsbestände und Bestandskorrekturen sind enthalten. Es sind Planwerte, keine bestätigten Kontostände.</p></section>`;
  }
  function potCard(p){
    const ratio=p.goal?Math.max(0,Math.min(100,p.balance/p.goal*100)):0;
    return `<article class="surface reserve-pot" style="--pot-color:${themeColor(p.color)}"><div class="section-head"><h2><i class="dot" style="background:${themeColor(p.color)}"></i>${esc(p.name)}</h2><button class="iconbtn" data-action="pot-edit" data-id="${p.id}" aria-label="${esc(p.name)} bearbeiten">${icon('edit')}</button></div><span class="reserve-label">${p.checkpoint?'Geplant zum Monatsende':'Beginnt im '+monthName(p.checkpoints[0].month)}</span><strong class="pot-balance ${p.balance<0?'negative':''}">${euro(p.balance)}</strong><div class="pot-equation"><span>Anfang <b>${euro(p.opening)}</b></span><span>Einzahlungen <b>+${euro(p.deposits)}</b></span><span>Entnahmen <b>−${euro(p.withdrawals)}</b></span></div>${p.goal?`<div class="pot-progress" role="progressbar" aria-label="Sparziel ${esc(p.name)}" aria-valuenow="${Math.round(ratio)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${ratio}%;background:${themeColor(p.color)}"></span></div><p class="helper">${p.balance>=p.goal?'Ziel erreicht':euro(Math.max(0,p.goal-p.balance))+' bis zum Ziel'} · Ziel ${euro(p.goal)}</p>`:''}${p.balance<0?`<p class="pot-warning">Für diesen Plan fehlen im Topf ${euro(-p.balance)}.</p>`:''}${ctx.state.goals.some(g=>g.potId===p.id&&g.status==='active')?`<button class="textbtn spaced" data-view="goals">Ziel: ${esc(ctx.state.goals.find(g=>g.potId===p.id&&g.status==='active').title)}</button>`:''}<div class="pot-flow"><h3>Aus Deinem Monatsplan</h3>${p.movements.map(movementRow).join('')||'<p class="helper">Keine Zahlung für diesen Monat verknüpft.</p>'}</div><div class="pot-actions"><button class="btn btn-outline" data-action="pot-deposit" data-id="${p.id}">${icon('plus')}Einplanen</button><button class="btn btn-outline" data-action="pot-withdraw" data-id="${p.id}">${icon('up')}Entnehmen</button></div><div class="pot-bottom"><button class="textbtn" data-action="pot-detail" data-id="${p.id}">Details & Verlauf</button><button class="textbtn" data-action="pot-correct" data-id="${p.id}">Bestand anpassen</button></div></article>`;
  }
  function ledger(){
    const rows=paymentSchedule(ctx.state,ctx.month),selected=rows.filter(i=>ledgerFilter==='all'||i.kind===ledgerFilter),total=selected.reduce((n,i)=>n+i.monthlyAmount,0),labels={expense:'Ausgabe',deposit:'Rücklage',withdrawal:'Entnahme'},groups=[...new Set(selected.map(i=>i.day))];
    return `<section class="surface payment-ledger"><div class="section-head"><div><h2>Abbuchungen & Entnahmen</h2><p>Geplante Zahlungen im ${monthName(ctx.month)}.</p></div><strong>${euro(total)}</strong></div><div class="ledger-tabs">${[['withdrawal','Aus Töpfen'],['deposit','In Töpfe / Sparen'],['expense','Ausgaben'],['all','Alle']].map(([v,l])=>`<button data-action="payment-filter" data-filter-value="${v}" class="${ledgerFilter===v?'active':''}" aria-pressed="${ledgerFilter===v}">${l}</button>`).join('')}</div>${groups.map(day=>`<div class="payment-day"><h3>${day?day+'. '+monthName(ctx.month):'Ohne Abbuchungstermin'}</h3>${selected.filter(i=>i.day===day).map(i=>`<div class="payment-entry"><button class="cashflow-open" data-action="edit-item" data-id="${i.id}"><span class="flow-direction ${i.kind==='withdrawal'?'out':'in'}">${icon(i.kind==='withdrawal'?'up':'down')}</span><span><strong>${esc(i.title)}</strong><small>${labels[i.kind]} · ${esc(ctx.state.pots.find(p=>p.id===i.potId)?.name||cadence(i))}${legacyAnnual(i)?' · bisheriger Monatsanteil':i.frequency==='year'?' · Jahreszahlung':''}</small></span><b>${euro(i.monthlyAmount)}</b></button><button class="iconbtn" data-action="delete-item" data-id="${i.id}" aria-label="${esc(i.title)} löschen">${icon('trash')}</button></div>`).join('')}</div>`).join('')||'<div class="quiet-empty">Für diese Auswahl sind keine Zahlungen eingeplant.</div>'}<p class="helper">Tippe auf einen Posten, um Betrag, Wiederholung oder Zahlungstag zu ändern. Entnahmen geben Geld für den Monatsplan frei; ein damit bezahlter Kauf kann zusätzlich als Ausgabe erscheinen. „Alle“ summiert Zahlungsbewegungen, nicht den Verbrauch.</p></section>`;
  }
  function render(){
    const s=get(),unlinked=projected(ctx.state,ctx.month).filter(i=>i.type==='saving'&&!i.potId),positive=s.pots.reduce((n,p)=>n+Math.max(0,p.balance),0);
    return `<div class="reserve-intro"><p>Bestand + Einzahlungen − Entnahmen.</p>${btn('Neuer Topf','pot-new','primary','plus')}</div>${!s.pots.length?`<section class="surface reserve-empty"><span class="empty-icon">${icon('save')}</span><h2>Deine Rücklagen, klar aufgeteilt.</h2><p>Trage vorhandenes Geld als Anfangsbestand ein. Ordne dann Deine Sparposten im Monatsplan einem Topf zu.</p><div class="starter-chips">${['Urlaubstopf','Notgroschen','Sonstiges','Vertragsboni'].map(name=>`<button data-action="pot-preset" data-name="${name}">+ ${name}</button>`).join('')}</div></section>`:`<section class="reserve-overview"><div class="reserve-hero"><span class="eyebrow">Rücklagen · Ende ${monthName(ctx.month)}</span><strong class="reserve-grand-total ${s.balance<0?'negative':''}">${euro(s.balance)}</strong><div class="reserve-bridge"><div><span>Monatsanfang</span><b>${euro(s.opening)}</b></div><div><span>Einzahlungen</span><b>+${euro(s.deposits)}</b></div><div><span>Entnahmen</span><b>−${euro(s.withdrawals)}</b></div></div></div><div class="reserve-composition surface"><h2>So setzt sich die Summe zusammen</h2><div class="composition-strip" aria-hidden="true">${s.pots.filter(p=>p.balance>0).map(p=>`<span style="flex:${p.balance/positive};background:${themeColor(p.color)}"></span>`).join('')}</div>${s.pots.map(p=>`<button class="composition-row" data-action="pot-detail" data-id="${p.id}"><i class="dot" style="background:${themeColor(p.color)}"></i><span>${esc(p.name)}</span><b class="${p.balance<0?'negative':''}">${euro(p.balance)}</b>${icon('right')}</button>`).join('')}${s.pots.some(p=>p.balance<0)?'<p class="helper">Negative Töpfe sind in der Gesamtsumme abgezogen. Der Farbstreifen zeigt nur positive Bestände.</p>':''}</div></section>`}${unlinked.length?`<div class="notice spaced"><span><strong>${euro(unlinked.reduce((n,i)=>n+i.monthlyAmount,0))} ohne Topfzuordnung.</strong> ${unlinked.length} Sparposten sind im Budget reserviert, erhöhen aber noch keinen Topf.</span><button class="textbtn" data-action="pot-link">Zuordnen</button></div>`:''}${s.pots.length?`<div class="reserve-grid">${s.pots.map(potCard).join('')}</div>`:''}${s.pots.length?trend():''}<details class="reserve-help"><summary>So rechnet Deine Rücklagenplanung</summary><p>Eine im Monatsplan einem Topf zugeordnete Ausgabe wird zur Rücklage. Sie verringert den freien Monatsbetrag einmal und erhöht den Topf. Entnahmen verringern den Topf und erhöhen den verfügbaren Monatsbetrag. Alle Zahlungen zählen sofort für den ausgewählten Monat.</p><p>Anfangsbestände und Korrekturen gelten vor den Zahlungen des jeweiligen Monats. Jahreszahlungen zählen vollständig im Zahlungsmonat. Nur noch nicht umgestellte ältere Jahresposten behalten zunächst ihren bisherigen Monatsanteil. Tatsächlich erfasste Monatsausgaben verändern diese Planung nicht.</p></details>`;
  }
  function editor(id=null,preset=''){
    const p=id?potById(id):null;
    ctx.openDialog(p?'Topf bearbeiten':'Neuer Rücklagentopf',`<form id="pot-form"><label><span>Name</span><input name="name" value="${esc(p?.name||preset)}" maxlength="80" required placeholder="z. B. Urlaubstopf"></label>${!p?`<div class="form-grid spaced"><label><span>Vorhandener Bestand (€)</span><input name="balance" inputmode="decimal" value="0,00" required></label><label><span>Zu Beginn dieses Monats</span><input name="month" type="month" value="${ctx.month}" min="2000-01" max="2100-12" required></label></div><p class="helper">Vor den geplanten Ein- und Auszahlungen dieses Monats. Bereits enthaltene Sparraten bitte nicht noch einmal einplanen.</p>`:'<p class="helper spaced">Den Geldbestand änderst Du über „Bestand anpassen“. Die bisherigen Bewegungen bleiben dabei nachvollziehbar.</p>'}<div class="form-grid spaced"><label><span>Sparziel (€), optional</span><input name="goal" inputmode="decimal" value="${fieldMoney(p?.goal||0)}"><p class="helper">0 = ohne Ziel</p></label><label><span>Farbe</span><input name="color" type="color" value="${themeColor(p?.color||['#4b5660','#e79058','#5d9da4','#82975b'][ctx.state.pots.length%4])}"></label></div><label class="spaced"><span>Notiz, optional</span><textarea name="note" rows="2" maxlength="1000" placeholder="z. B. Bonus für die nächsten 24 Vertragsmonate">${esc(p?.note||'')}</textarea></label><div class="form-footer"><button class="btn btn-outline" type="button" data-action="close">Abbrechen</button><button class="btn btn-primary" type="submit">${p?'Speichern':'Topf anlegen'}</button></div>${p?`<button type="button" class="textbtn danger-zone spaced" data-action="pot-delete" data-id="${p.id}">Topf löschen</button>`:''}</form>`,form=>{
      const fd=new FormData(form),fields={name:String(fd.get('name')||'').trim(),color:fd.get('color'),goal:money(fd.get('goal')||'0'),note:String(fd.get('note')||'')};
      let n;
      if(!p)n=createPot(ctx.state,{...fields,balance:money(fd.get('balance')),month:fd.get('month')});
      else{
        if(!fields.name)throw Error('Bitte einen Namen eingeben.');
        if(ctx.state.pots.some(v=>v.id!==p.id&&v.name.toLowerCase()===fields.name.toLowerCase()))throw Error('Diesen Topfnamen gibt es schon.');
        n=structuredClone(ctx.state);
        Object.assign(n.pots.find(v=>v.id===p.id),fields);
      }
      if(ctx.persist(n,p?'Topf gespeichert':'Rücklagentopf angelegt'))close();
    });
  }
  function correction(id){
    const p=potById(id),r=get().pots.find(p=>p.id===id);
    ctx.openDialog('Bestand anpassen',`<form><p class="bodycopy"><strong>${esc(p.name)}</strong> · Trage den Bestand zu Beginn eines Monats ein. Ab dort wird mit diesem Betrag weitergerechnet; frühere Monate behalten ihren Verlauf.</p><div class="form-grid spaced"><label><span>Bestand (€)</span><input name="balance" value="${fieldMoney(Math.max(0,r.opening))}" inputmode="decimal" required></label><label><span>Zu Monatsbeginn</span><input name="month" type="month" value="${ctx.month}" min="2000-01" max="2100-12" required></label></div><p class="helper">Das korrigiert nur den Topfbestand. Es erzeugt keine Einnahme oder Ausgabe im Monatsplan.</p><div class="form-footer"><button type="button" class="btn btn-outline" data-action="close">Abbrechen</button><button type="submit" class="btn btn-primary">Bestand speichern</button></div></form>`,form=>{
      const fd=new FormData(form),n=correctPot(ctx.state,id,fd.get('month'),money(fd.get('balance')));
      if(ctx.commitUndo(n,'Bestand angepasst'))close();
    });
  }
  function detail(id){
    const p=potById(id),r=get().pots.find(p=>p.id===id),future=ctx.state.items.filter(i=>i.potId===id&&i.start>ctx.month).sort((a,b)=>a.start.localeCompare(b.start)),row=i=>`<div class="reserve-movement"><button class="item-open" data-action="edit-item" data-id="${i.id}"><span class="item-info"><strong>${esc(i.title)}</strong><small>${i.type==='saving'?'Einzahlung':'Entnahme'} · ${i.start>ctx.month?'ab '+monthName(i.start):i.frequency==='once'?'einmalig':i.frequency==='month'?'monatlich':i.frequency==='quarter'?'alle 3 Monate':legacyAnnual(i)?'bisheriger Monatsanteil':'jährlich im Zahlungsmonat'}</small></span><b>${i.type==='saving'?'+':'−'}${euro(i.monthlyAmount??(legacyAnnual(i)?Math.round(i.amount/12):i.amount))}</b></button><button class="iconbtn" data-action="delete-item" data-id="${i.id}" aria-label="${esc(i.title)} entfernen">${icon('trash')}</button></div>`;
    ctx.openDialog(esc(p.name),`<div class="stack"><p class="bodycopy">${esc(p.note)||'Alle Änderungen laufen über dieselben Posten wie im Monatsplan.'}</p><h3>${monthName(ctx.month)}</h3>${r.movements.map(row).join('')||'<p class="helper">Keine Bewegung in diesem Monat geplant.</p>'}${future.length?'<h3>Später eingeplant</h3>'+future.map(row).join(''):''}<details><summary>Eingetragene Bestände</summary>${[...p.checkpoints].sort((a,b)=>b.month.localeCompare(a.month)).map(c=>`<div class="category-row"><span>Anfang ${monthName(c.month)}</span><strong>${euro(c.balance)}</strong>${p.checkpoints.length>1?`<button class="iconbtn" data-action="pot-remove-checkpoint" data-id="${id}" data-month="${c.month}" aria-label="Bestand Anfang ${monthName(c.month)} entfernen">${icon('trash')}</button>`:''}</div>`).join('')}</details><div class="pot-actions"><button class="btn btn-primary" data-action="pot-deposit" data-id="${id}">${icon('plus')}Einzahlen</button><button class="btn btn-outline" data-action="pot-withdraw" data-id="${id}">Entnehmen</button></div></div>`);
  }
  function link(){
    const items=projected(ctx.state,ctx.month).filter(i=>i.type==='saving'&&!i.potId);
    ctx.openDialog('Vorhandene Sparraten zuordnen',`<div class="stack"><p class="bodycopy">Öffne einen Posten und wähle seinen Rücklagentopf. Der Monatsbetrag wird dabei nicht verdoppelt.</p>${items.map(i=>`<button class="btn btn-outline" data-action="edit-item" data-id="${i.id}">${esc(i.title)} · ${euro(i.monthlyAmount)}</button>`).join('')}</div>`);
  }
  const actions={
    'payment-filter':el=>{
      ledgerFilter=el.dataset.filterValue;
      ctx.render();
    },'pot-new':()=>editor(),'pot-preset':el=>editor(null,el.dataset.name),'pot-edit':el=>editor(el.dataset.id),'pot-correct':el=>correction(el.dataset.id),'pot-detail':el=>detail(el.dataset.id),'pot-link':link,
    'pot-deposit':el=>ctx.itemDialog('saving',null,'Einzahlung '+potById(el.dataset.id).name,{potId:el.dataset.id,frequency:'once'}),
    'pot-withdraw':el=>ctx.itemDialog('income',null,'Entnahme '+potById(el.dataset.id).name,{potId:el.dataset.id,frequency:'once'}),
    'pot-delete':el=>{
      const p=potById(el.dataset.id);
      if(ctx.state.goals.some(g=>g.potId===p.id)){
        ctx.formError('Dieser Topf ist mit einem Ziel verknüpft. Löse zuerst die Zuordnung unter Ziele.');
        return;
      }
      if(ctx.state.items.some(i=>i.potId===p.id)){
        ctx.formError('Dieser Topf hat verknüpfte Posten. Löse zuerst deren Topfzuordnung, damit Dein Monatsplan erhalten bleibt.');
        return;
      }
      ctx.confirmDialog('Topf löschen?',`„${esc(p.name)}“ und seine eingetragenen Bestände entfernen?`,()=>{
        const n=structuredClone(ctx.state);
        n.pots=n.pots.filter(v=>v.id!==p.id);
        if(ctx.commitUndo(n,'Topf gelöscht'))close();
      },'Löschen');
    },
    'pot-remove-checkpoint':el=>{
      const n=structuredClone(ctx.state),p=n.pots.find(p=>p.id===el.dataset.id);
      if(p.checkpoints.length<=1)return;
      p.checkpoints=p.checkpoints.filter(c=>c.month!==el.dataset.month);
      if(ctx.commitUndo(n,'Bestandseintrag entfernt'))detail(p.id);
    }
  };
  return {render,actions,potOptions};
}
