import {fieldMoney,money,validMonth} from './planner.js';
import {saveGoal} from './goals.js';
export function createGoalUI(ctx){
  const {esc}=ctx,close=()=>document.querySelector('#dialog').close();
  const get=id=>{
    const g=ctx.state.goals.find(g=>g.id===id);
    if(!g)throw Error('Dieses Ziel ist nicht mehr vorhanden.');
    return g;
  };
  // Ab 3.3 nur noch Bearbeiten: Name, Zielbetrag, Wunschtermin, Notiz. Neue Ziele, Raten und Einzahlungen laufen über den Bereich Sparen.
  function editor(id){
    const g=get(id),revision=ctx.state.revision;
    ctx.openDialog('Ziel bearbeiten',`<form id="goal-form"><label><span>Name</span><input name="title" value="${esc(g.title)}" maxlength="100" required></label><div class="form-grid spaced"><label><span>Zielbetrag (€)</span><input name="price" inputmode="decimal" value="${fieldMoney(g.price)}" required></label><label><span>Wunschtermin (optional)</span><input name="deadline" type="month" value="${g.deadline||''}" min="2000-01" max="2100-12"></label></div><p class="helper">Eine feste Rate änderst Du im Ziel über „Rate ändern“.</p><label class="spaced"><span>Notiz (optional)</span><textarea name="note" maxlength="1000" rows="2">${esc(g.note||'')}</textarea></label><div class="form-footer"><button class="btn btn-outline" type="button" data-action="close">Abbrechen</button><button class="btn btn-primary" type="submit">Speichern</button></div><button class="textbtn danger-zone spaced" type="button" data-action="goal-delete" data-id="${g.id}">Ziel löschen</button></form>`,form=>{
      if(ctx.state.revision!==revision)throw Error('Der Stand hat sich geändert. Bitte öffne das Ziel erneut.');
      const fd=new FormData(form),title=String(fd.get('title')||'').trim(),price=money(fd.get('price')),deadline=String(fd.get('deadline')||'');
      if(!title||price<=0)throw Error('Bitte einen Namen und einen Zielbetrag größer als 0 eingeben.');
      if(deadline&&!validMonth(deadline))throw Error('Bitte einen gültigen Wunschtermin wählen.');
      const n=saveGoal(ctx.state,{...g,title,price,deadline,note:String(fd.get('note')||'').trim()},id);
      if(ctx.persist(n,'Ziel gespeichert'))close();
    });
  }
  const actions={
    'goal-edit':el=>editor(el.dataset.id),'goal-pot':el=>ctx.showPot(get(el.dataset.id).potId),
    'goal-done':el=>{
      const g=get(el.dataset.id);
      ctx.confirmDialog('Ziel abschließen?',`„${esc(g.title)}“ abschließen? Das Geld bleibt im Topf. Eine feste Rate läuft weiter, bis Du sie beendest. Den Kauf selbst erfasst Du wie gewohnt als Ausgabe.`,()=>{
        const n=saveGoal(ctx.state,{...g,status:'done'},g.id);
        if(ctx.commitUndo(n,'Ziel abgeschlossen'))close();
      },'Abschließen');
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
