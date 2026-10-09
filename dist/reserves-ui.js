import {themeColor} from './theme.js';
import {euro,fieldMoney,money,projected} from './planner.js';
import {reserveSummary,createPot,correctPot} from './reserves.js';
export function createReserveUI(ctx){
  const {esc}=ctx,potById=id=>ctx.state.pots.find(p=>p.id===id);
  const get=()=>reserveSummary(ctx.state,ctx.month);
  const potOptions=value=>ctx.state.pots.map(p=>`<option value="${p.id}" ${p.id===value?'selected':''}>${esc(p.name)}</option>`).join('');
  const close=()=>document.querySelector('#dialog').close();
  function editor(id=null,preset=''){
    const p=id?potById(id):null;
    ctx.openDialog(p?'Topf bearbeiten':'Neuer Topf',`<form id="pot-form"><label><span>Name</span><input name="name" value="${esc(p?.name||preset)}" maxlength="80" required placeholder="z. B. Urlaubstopf"></label>${!p?`<div class="form-grid spaced"><label><span>Vorhandener Bestand (€)</span><input name="balance" inputmode="decimal" value="0,00" required></label><label><span>Zu Beginn dieses Monats</span><input name="month" type="month" value="${ctx.month}" min="2000-01" max="2100-12" required></label></div><p class="helper">Vor den geplanten Ein- und Auszahlungen dieses Monats. Bereits enthaltene Sparraten bitte nicht noch einmal einplanen.</p>`:'<p class="helper spaced">Den Geldbestand änderst Du über „Bestand korrigieren“. Die bisherigen Bewegungen bleiben dabei nachvollziehbar.</p>'}<div class="form-grid spaced">${p?.goal?`<label><span>Sparziel (€)</span><input name="goal" inputmode="decimal" value="${fieldMoney(p.goal)}"><p class="helper">0 = ohne Sparziel. Neue Ziele legst Du über „Ziel setzen“ an.</p></label>`:''}<label><span>Farbe</span><input name="color" type="color" value="${themeColor(p?.color||['#4b5660','#e79058','#5d9da4','#82975b'][ctx.state.pots.length%4])}"></label></div><label class="spaced"><span>Notiz, optional</span><textarea name="note" rows="2" maxlength="1000" placeholder="z. B. Bonus für die nächsten 24 Vertragsmonate">${esc(p?.note||'')}</textarea></label><div class="form-footer"><button class="btn btn-outline" type="button" data-action="close">Abbrechen</button><button class="btn btn-primary" type="submit">${p?'Speichern':'Topf anlegen'}</button></div>${p?`<button type="button" class="textbtn danger-zone spaced" data-action="pot-delete" data-id="${p.id}">Topf löschen</button>`:''}</form>`,form=>{
      const fd=new FormData(form),fields={name:String(fd.get('name')||'').trim(),color:fd.get('color'),goal:money(fd.get('goal')||'0'),note:String(fd.get('note')||'')};
      let n;
      if(!p)n=createPot(ctx.state,{...fields,balance:money(fd.get('balance')),month:fd.get('month')});
      else{
        if(!fields.name)throw Error('Bitte einen Namen eingeben.');
        if(ctx.state.pots.some(v=>v.id!==p.id&&v.name.toLowerCase()===fields.name.toLowerCase()))throw Error('Diesen Topfnamen gibt es schon.');
        n=structuredClone(ctx.state);
        Object.assign(n.pots.find(v=>v.id===p.id),fields);
      }
      if(ctx.persist(n,p?'Topf gespeichert':'Topf angelegt'))close();
    });
  }
  function correction(id){
    const p=potById(id),r=get().pots.find(p=>p.id===id);
    ctx.openDialog('Bestand anpassen',`<form><p class="bodycopy"><strong>${esc(p.name)}</strong> · Trage den Bestand zu Beginn eines Monats ein. Ab dort wird mit diesem Betrag weitergerechnet; frühere Monate behalten ihren Verlauf.</p><div class="form-grid spaced"><label><span>Bestand (€)</span><input name="balance" value="${fieldMoney(Math.max(0,r.opening))}" inputmode="decimal" required></label><label><span>Zu Monatsbeginn</span><input name="month" type="month" value="${ctx.month}" min="2000-01" max="2100-12" required></label></div><p class="helper">Das korrigiert nur den Topfbestand. Es erzeugt keine Einnahme oder Ausgabe im Monatsplan.</p><div class="form-footer"><button type="button" class="btn btn-outline" data-action="close">Abbrechen</button><button type="submit" class="btn btn-primary">Bestand speichern</button></div></form>`,form=>{
      const fd=new FormData(form),n=correctPot(ctx.state,id,fd.get('month'),money(fd.get('balance')));
      if(ctx.commitUndo(n,'Bestand angepasst'))close();
    });
  }
  function link(){
    const items=projected(ctx.state,ctx.month).filter(i=>i.type==='saving'&&!i.potId);
    ctx.openDialog('Vorhandene Sparraten zuordnen',`<div class="stack"><p class="bodycopy">Öffne einen Posten und wähle seinen Rücklagentopf. Der Monatsbetrag wird dabei nicht verdoppelt.</p>${items.map(i=>`<button class="btn btn-outline" data-action="edit-item" data-id="${i.id}">${esc(i.title)} · ${euro(i.monthlyAmount)}</button>`).join('')}</div>`);
  }
  const actions={
    'pot-new':()=>editor(),'pot-preset':el=>editor(null,el.dataset.name),'pot-edit':el=>editor(el.dataset.id),'pot-correct':el=>correction(el.dataset.id),'pot-detail':el=>ctx.showPot(el.dataset.id),'pot-link':link,
    'pot-deposit':el=>ctx.itemDialog('saving',null,'Einzahlung '+potById(el.dataset.id).name,{potId:el.dataset.id,frequency:'once'}),
    'pot-withdraw':el=>ctx.itemDialog('income',null,'Entnahme '+potById(el.dataset.id).name,{potId:el.dataset.id,frequency:'once'}),
    'pot-delete':el=>{
      const p=potById(el.dataset.id);
      if(ctx.state.goals.some(g=>g.potId===p.id)){
        ctx.formError('Dieser Topf ist mit einem Ziel verknüpft. Löse zuerst beim Ziel die Topfzuordnung oder lösche das Ziel.');
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
      if(ctx.commitUndo(n,'Bestandseintrag entfernt'))ctx.showPot(p.id);
    }
  };
  return {actions,potOptions};
}
