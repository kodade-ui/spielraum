import {fieldMoney,money,monthName,validMonth} from './planner.js';
import {createPot} from './reserves.js';
import {saveGoal,goalProgress} from './goals.js';
export function createGoalUI(ctx){
  const {esc}=ctx,close=()=>document.querySelector('#dialog').close();
  const get=id=>{
    const g=ctx.state.goals.find(g=>g.id===id);
    if(!g)throw Error('Dieses Ziel ist nicht mehr vorhanden.');
    return g;
  };
  function editor(id=null,preset='',presetPot=''){
    const g=id?get(id):null,revision=ctx.state.revision,pick=g?.potId||presetPot;
    ctx.openDialog(g?'Ziel bearbeiten':'Neues Ziel',`<form id="goal-form"><label><span>Was möchtest Du Dir ermöglichen?</span><input name="title" value="${esc(g?.title||preset)}" maxlength="100" placeholder="z. B. Kaffeemaschine" required></label><div class="form-grid spaced"><label><span>Preis / Zielbetrag (€)</span><input name="price" inputmode="decimal" value="${g?fieldMoney(g.price):''}" placeholder="0,00" required></label><label><span>Wunschmonat (optional)</span><input name="deadline" type="month" value="${g?.deadline||''}" min="2000-01" max="2100-12"></label></div><label class="spaced"><span>Rücklagentopf (optional)</span><select name="potId"><option value="" ${!pick?'selected':''}>Erst einmal als Wunsch festhalten</option>${ctx.state.pots.map(p=>{const used=ctx.state.goals.find(x=>x.id!==id&&x.status==='active'&&x.potId===p.id);return `<option value="${p.id}" ${p.id===pick?'selected':''} ${used&&g?.status!=='done'?'disabled':''}>${esc(p.name)}${used?' · bereits für '+esc(used.title):''}</option>`;}).join('')}<option value="__new">＋ Eigenen Topf für dieses Ziel anlegen</option></select></label><p class="helper">Ein neuer Topf startet Anfang ${monthName(ctx.month)} mit 0 €. Vorhandenes Geld kannst Du danach im Bereich Sparen eintragen.</p><label class="spaced"><span>Notiz (optional)</span><textarea name="note" maxlength="1000" rows="2" placeholder="z. B. Modell, Ausstattung oder Reiseidee">${esc(g?.note||'')}</textarea></label><div class="form-footer"><button class="btn btn-outline" type="button" data-action="close">Abbrechen</button><button class="btn btn-primary" type="submit">${g?'Speichern':'Ziel anlegen'}</button></div>${g?`<button class="textbtn danger-zone spaced" type="button" data-action="goal-delete" data-id="${g.id}">Ziel löschen</button>`:''}</form>`,form=>{
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
    'goal-new':el=>editor(null,'',el?.dataset?.pot||''),'goal-preset':el=>editor(null,el.dataset.title),'goal-edit':el=>editor(el.dataset.id),'goal-pot':el=>ctx.showPot(get(el.dataset.id).potId),
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
  return {actions,editor};
}
