import {euro,fieldMoney,money,monthName,validMonth} from './planner.js';
import {createPot} from './reserves.js';
import {saveGoal,goalProgress} from './goals.js';
import {themeColor} from './theme.js';
export function createGoalUI(ctx){
  const {esc,icon,btn}=ctx,close=()=>document.querySelector('#dialog').close();
  const get=id=>{
    const g=ctx.state.goals.find(g=>g.id===id);
    if(!g)throw Error('Dieses Ziel ist nicht mehr vorhanden.');
    return g;
  };
  function card(g){
    const p=goalProgress(ctx.state,g,ctx.month),color=p.pot?themeColor(p.pot.color):'#8c887f';
    return `<article class="goal-card" style="--goal-color:${color}"><div class="goal-card-head"><div><span class="goal-kicker">${g.status==='done'?'Erledigt':p.pot?'Mit Rücklage':'Wunschliste'}</span><h2>${esc(g.title)}</h2></div><button class="iconbtn" data-action="goal-edit" data-id="${g.id}" aria-label="${esc(g.title)} bearbeiten">${icon('edit')}</button></div><div class="goal-price"><strong>${euro(g.price)}</strong><span>${g.deadline?'Wunschdatum '+monthName(g.deadline):'Ohne festen Termin'}</span></div>${g.status==='done'?`<p class="helper">Als erledigt markiert. Zahlungen werden separat im Monatsplan und unter Ausgaben geführt.</p>`:p.pot?`<div class="goal-progress" role="progressbar" aria-label="Geplante Deckung für ${esc(g.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.percent}"><span style="width:${p.percent}%"></span></div><div class="goal-funding"><div><span>Im Topf · Monatsende</span><b class="${p.balance<0?'negative':''}">${euro(p.balance)}</b></div><div><span>${p.missing?'Noch nötig':'Preis gedeckt'}</span><b>${p.missing?euro(p.missing):'100 %'}</b></div></div><button class="goal-pot-link" data-action="goal-pot" data-id="${g.id}">${icon('save')}${esc(p.pot.name)}<span>${euro(p.pot.deposits)} ein · ${euro(p.pot.withdrawals)} aus</span></button>${g.deadline?`<div class="goal-deadline">${p.overdue?'<strong>Wunschdatum liegt vor dem ausgewählten Monat.</strong><p>Du kannst es beim Bearbeiten anpassen.</p>':!p.months?'<strong>Dieser Topf startet erst nach dem Wunschdatum.</strong><p>Prüfe den Anfangsbestand oder wähle einen späteren Termin.</p>':`<strong>${p.extra?euro(p.extra)+' zusätzlich / Monat nötig':'Nach Deinem Plan zum Wunschdatum gedeckt'}</strong><p>${euro(p.deadlineBalance)} sind Ende ${monthName(g.deadline)} im Topf eingeplant.${p.extra?' Die zusätzliche Rate gilt ab '+monthName(p.rateStart)+' bis einschließlich '+monthName(g.deadline)+'.':''}</p>`}</div>`:''}`:`<p class="goal-unlinked">Noch ohne Rücklagentopf. Verknüpfe einen Topf, um Deinen Fortschritt aus dem Monatsplan zu sehen.</p>`}${g.note?`<p class="goal-note">${esc(g.note)}</p>`:''}<div class="goal-actions">${g.status!=='done'?`<button class="btn btn-primary" data-action="purchase-start" data-id="${g.id}">${ctx.state.decisions.some(d=>d.id==='purchase_'+g.id&&d.applied)?'Kauf eingeplant':'Kauf prüfen'}</button>`:''}${g.status==='done'?`<button class="textbtn" data-action="goal-reopen" data-id="${g.id}">Wieder öffnen</button>`:p.pot?`<button class="btn btn-outline" data-action="goal-plan" data-id="${g.id}">${p.pot.deposits?'Sparrate ergänzen':'Sparrate einplanen'}</button><button class="textbtn" data-action="goal-done" data-id="${g.id}">Erledigt</button>`:`<button class="btn btn-outline" data-action="goal-edit" data-id="${g.id}">Topf zuordnen</button><button class="textbtn" data-action="goal-done" data-id="${g.id}">Erledigt</button>`}</div></article>`;
  }
  function render(){
    const active=ctx.state.goals.filter(g=>g.status==='active'),done=ctx.state.goals.filter(g=>g.status==='done'),sum=active.reduce((n,g)=>n+g.price,0),covered=active.reduce((n,g)=>n+goalProgress(ctx.state,g,ctx.month).covered,0);
    return `<div class="goals-toolbar"><p>Anschaffungen und Pläne, die Dir etwas wert sind.</p>${btn('Neues Ziel','goal-new')}</div>${active.length?`<section class="goal-overview"><div><span>Offene Ziele</span><strong>${active.length}</strong></div><div><span>Geplante Preise</span><strong>${euro(sum)}</strong></div><div><span>Durch Töpfe gedeckt</span><strong>${euro(covered)}</strong></div></section><p class="goal-context">Sparstände laut Monatsplan · Ende ${monthName(ctx.month)}. Vorhandene Einzahlungen und Entnahmen sind berücksichtigt.</p><div class="goals-grid">${active.map(card).join('')}</div>`:`<section class="goal-empty"><span class="goal-kicker">Deine Wunschliste</span><h2>Wofür möchtest Du sparen?</h2><p>Ein Auto, eine Reise oder die Kaffeemaschine: Halte Deinen Wunsch und den Preis fest. Die Verbindung zum Budget kannst Du später ergänzen.</p>${btn('Erstes Ziel eintragen','goal-new')}<div class="goal-examples">${['Auto','Reise','Kaffeemaschine'].map(t=>`<button data-action="goal-preset" data-title="${t}">${t}</button>`).join('')}</div></section>`}${done.length?`<details class="goals-done"><summary>Erledigte Ziele (${done.length})</summary><div class="goals-grid">${done.map(card).join('')}</div></details>`:''}<p class="goal-footnote">Ein Ziel reserviert noch kein Geld. Erst eine gespeicherte Sparrate verändert Deinen Monatsplan. Ein Rücklagentopf kann nur einem offenen Ziel zugeordnet sein.</p>`;
  }
  function editor(id=null,preset=''){
    const g=id?get(id):null,revision=ctx.state.revision;
    ctx.openDialog(g?'Ziel bearbeiten':'Neues Ziel',`<form id="goal-form"><label><span>Was möchtest Du Dir ermöglichen?</span><input name="title" value="${esc(g?.title||preset)}" maxlength="100" placeholder="z. B. Kaffeemaschine" required></label><div class="form-grid spaced"><label><span>Preis / Zielbetrag (€)</span><input name="price" inputmode="decimal" value="${g?fieldMoney(g.price):''}" placeholder="0,00" required></label><label><span>Wunschmonat (optional)</span><input name="deadline" type="month" value="${g?.deadline||''}" min="2000-01" max="2100-12"></label></div><label class="spaced"><span>Rücklagentopf (optional)</span><select name="potId"><option value="" ${!g?.potId?'selected':''}>Erst einmal als Wunsch festhalten</option>${ctx.state.pots.map(p=>{const used=ctx.state.goals.find(x=>x.id!==id&&x.status==='active'&&x.potId===p.id);return `<option value="${p.id}" ${p.id===g?.potId?'selected':''} ${used&&g?.status!=='done'?'disabled':''}>${esc(p.name)}${used?' · bereits für '+esc(used.title):''}</option>`;}).join('')}<option value="__new">＋ Eigenen Topf für dieses Ziel anlegen</option></select></label><p class="helper">Ein neuer Topf startet Anfang ${monthName(ctx.month)} mit 0 €. Vorhandenes Geld kannst Du danach bei den Rücklagen eintragen.</p><label class="spaced"><span>Notiz (optional)</span><textarea name="note" maxlength="1000" rows="2" placeholder="z. B. Modell, Ausstattung oder Reiseidee">${esc(g?.note||'')}</textarea></label><div class="form-footer"><button class="btn btn-outline" type="button" data-action="close">Abbrechen</button><button class="btn btn-primary" type="submit">${g?'Speichern':'Ziel anlegen'}</button></div>${g?`<button class="textbtn danger-zone spaced" type="button" data-action="goal-delete" data-id="${g.id}">Ziel löschen</button>`:''}</form>`,form=>{
      if(ctx.state.revision!==revision)throw Error('Der Stand hat sich geändert. Bitte öffne das Ziel erneut.');
      const fd=new FormData(form),title=String(fd.get('title')||'').trim(),price=money(fd.get('price')),deadline=String(fd.get('deadline')||'');
      if(!title||price<=0)throw Error('Bitte einen Namen und einen Preis größer als 0 eingeben.');
      if(deadline&&!validMonth(deadline))throw Error('Bitte einen gültigen Wunschmonat wählen.');
      let n=structuredClone(ctx.state),potId=String(fd.get('potId')||'');
      if(potId==='__new'){
        let name=title.slice(0,80),suffix=1;
        while(n.pots.some(p=>p.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de')))name=title.slice(0,70)+' ('+(++suffix)+')';
        n=createPot(n,{name,month:ctx.month,balance:0,color:'#71668b'});
        potId=n.pots.at(-1).id;
      }
      n=saveGoal(n,{title,price,deadline,potId,note:String(fd.get('note')||'').trim(),status:g?.status||'active'},id);
      if(ctx.persist(n,'Ziel gespeichert'))close();
    });
  }
  const actions={
    'goal-new':()=>editor(),'goal-preset':el=>editor(null,el.dataset.title),'goal-edit':el=>editor(el.dataset.id),'goal-pot':el=>ctx.showPot(get(el.dataset.id).potId),
    'goal-plan':el=>{
      const g=get(el.dataset.id),p=goalProgress(ctx.state,g,ctx.month);
      if(!p.pot)return editor(g.id);
      ctx.itemDialog('saving',null,(p.pot.deposits?'Zusätzlich für ':'Sparen für ')+g.title,{potId:g.potId,frequency:'month',amount:p.extra||0,start:p.months?p.rateStart:ctx.month,end:p.months?g.deadline:''});
    },
    'goal-done':el=>{
      const g=get(el.dataset.id);
      ctx.confirmDialog('Ziel erledigt?',`„${esc(g.title)}“ als erledigt markieren? Dein Geldbestand bleibt gleich. Bestehende Sparraten laufen weiter, bis Du sie im Monatsplan änderst. Einen tatsächlichen Kauf erfasst Du separat unter Ausgaben.`,()=>{
        const n=saveGoal(ctx.state,{...g,status:'done'},g.id);
        if(ctx.commitUndo(n,'Ziel erledigt – bestehende Sparraten laufen weiter'))close();
      },'Als erledigt markieren');
    },
    'goal-reopen':el=>{
      const g=get(el.dataset.id);
      ctx.commitUndo(saveGoal(ctx.state,{...g,status:'active'},g.id),'Ziel wieder geöffnet');
    },
    'goal-delete':el=>{
      const g=get(el.dataset.id);
      ctx.confirmDialog('Ziel löschen?',`„${esc(g.title)}“ entfernen? Der verknüpfte Topf und alle Budgetposten bleiben erhalten.`,()=>{
        const n=structuredClone(ctx.state);
        n.goals=n.goals.filter(x=>x.id!==g.id);
        if(ctx.commitUndo(n,'Ziel gelöscht'))close();
      },'Ziel löschen');
    }
  };
  return {render,actions};
}
