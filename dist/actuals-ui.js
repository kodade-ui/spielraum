import {themeColor} from './theme.js';
import {euro,compact,fieldMoney,money,currentMonth,validDate,uid,COLORS,projected,resolveExpensePlan} from './planner.js';
import {actualSummary,saveActual} from './actuals.js';
import {suggestCategory,rememberCategory} from './intelligence.js';
export function createActualUI(ctx){
  const {esc,icon,btn}=ctx;
  let filter=null,filterMonth=null;
  const close=()=>document.querySelector('#dialog').close();
  const dateLabel=d=>new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'long',weekday:'short'}).format(new Date(d+'T12:00:00'));
  function chart(s){
    const cats=s.categories.filter(c=>c.value);
    let offset=0;
    return `<div class="actual-ring"><svg viewBox="0 0 240 240" role="group" aria-label="Erfasste Ausgaben nach Kategorie"><circle cx="120" cy="120" r="88" fill="none" stroke="#e0ddd3" stroke-width="29"/>${cats.map(c=>{const share=c.value/s.total*100,gap=cats.length>1?Math.min(.9,share*.1):0,part=`<circle cx="120" cy="120" r="88" fill="none" stroke="${themeColor(c.color)}" stroke-width="${filter===c.id?35:29}" pathLength="100" stroke-dasharray="${share-gap} ${100-share+gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 120 120)"><title>${esc(c.name)}: ${euro(c.value)} (${Math.round(share)} %)</title></circle>`;offset+=share;return part;}).join('')}</svg><div><strong>${compact(s.total)} €</strong><span>erfasst</span></div></div>`;
  }
  function render(){
    if(filterMonth!==ctx.month){
      filter=null;
      filterMonth=ctx.month;
    }
    const s=actualSummary(ctx.state,ctx.month),entries=s.entries.filter(x=>!filter||x.category===filter),days=[...new Set(entries.map(x=>x.date))],selection=s.categories.find(c=>c.id===filter);
    return `<div class="actual-intro"><p>Einzelne Käufe erfassen und Deinen Monat besser verstehen.</p>${btn('Ausgabe erfassen','actual-new','primary','plus')}</div><div class="actual-dashboard"><section class="actual-total-card"><span class="eyebrow">Tatsächlich erfasst</span><strong>${euro(s.total)}</strong><p>${s.entries.length} ${s.entries.length===1?'Ausgabe':'Ausgaben'} in diesem Monat</p><div class="actual-plan-compare"><span>Im Monatsplan vorgesehen</span><b>${euro(s.planned)}</b></div><p class="helper">Deine Einträge werden separat gespeichert. Sie werden nicht zusätzlich vom Monatsplan oder von Rücklagentöpfen abgezogen.</p></section><section class="surface actual-allocation"><div class="section-head"><h2>Wohin Dein Geld geht</h2></div><div class="actual-chart-layout">${chart(s)}<div class="actual-legend">${s.categories.filter(c=>c.value).map(c=>`<button class="composition-row ${filter===c.id?'selected':''}" data-action="actual-filter" data-id="${c.id}" aria-pressed="${filter===c.id}"><i class="dot" style="background:${themeColor(c.color)}"></i><span>${esc(c.name)}<small>${Math.round(c.value/s.total*100)} %</small></span><b>${euro(c.value)}</b></button>`).join('')||'<p class="quiet-empty">Mit Deiner ersten Ausgabe entsteht hier die Verteilung.</p>'}</div></div></section></div><section class="surface actual-entries"><div class="section-head"><div><h2>${selection?esc(selection.name):'Deine Ausgaben'}</h2><p>${filter?euro(entries.reduce((n,x)=>n+x.amount,0))+' in dieser Kategorie':'Nach Datum sortiert · Antippen zum Bearbeiten'}</p></div><button class="textbtn" data-action="actual-csv">${icon('download')}CSV</button></div>${filter?'<button class="filter-chip" data-action="actual-clear">Alle Kategorien anzeigen ×</button>':''}${days.map(d=>`<div class="actual-day"><div class="actual-day-heading"><h3>${dateLabel(d)}</h3><span>${euro(entries.filter(x=>x.date===d).reduce((n,x)=>n+x.amount,0))}</span></div>${entries.filter(x=>x.date===d).map(x=>{const c=ctx.state.categories.find(c=>c.id===x.category);return `<div class="actual-row"><button class="cashflow-open" data-action="actual-edit" data-id="${x.id}"><span class="entry-rail" style="--item-color:${themeColor(c.color)}" aria-hidden="true"></span><span><strong>${esc(x.title)}</strong><small>${esc(c.name)}${x.note?' · '+esc(x.note):''}</small></span><b>${euro(x.amount)}</b></button><button class="iconbtn" data-action="actual-delete" data-id="${x.id}" aria-label="${esc(x.title)} löschen">${icon('trash')}</button></div>`;}).join('')}</div>`).join('')||`<div class="empty-state"><span class="empty-icon">${icon('bag')}</span><h3>${filter?'Noch keine Ausgabe in dieser Kategorie.':'Was hast Du heute ausgegeben?'}</h3><p>Ob Einkauf, Kaffee oder ein größerer Kauf: Jeder Eintrag fließt sofort in Deine Auswertung ein.</p>${btn('Erste Ausgabe erfassen','actual-new')}</div>`}</section>${s.categories.length?`<section class="surface actual-comparison"><div class="section-head"><div><h2>Plan & erfasste Ausgaben</h2><p>Nur die eingetragenen Käufe werden verglichen.</p></div></div>${s.categories.map(c=>{const width=Math.min(100,c.planned?c.value/c.planned*100:c.value?100:0),over=c.planned>0&&c.value>c.planned;return `<button class="category-comparison" data-action="actual-filter" data-id="${c.id}"><span class="comparison-title"><span>${esc(c.name)}</span><strong>${euro(c.value)} <small>/ ${c.planned?euro(c.planned):'ohne Planbetrag'}</small></strong></span><span class="category-meter"><span style="width:${width}%;background:${over?'#a04f43':themeColor(c.color)}"></span></span><small>${c.planned?(over?euro(c.value-c.planned)+' über dem Plan':euro(c.planned-c.value)+' noch nicht als Ausgabe erfasst'):'Für diese Kategorie ist kein Ausgabenbetrag eingeplant.'}</small></button>`;}).join('')}<p class="helper">Dieser Vergleich ist erst vollständig, wenn Du alle Ausgaben erfasst hast. Sparraten zählen nicht als Konsumausgaben.</p></section>`:''}`;
  }
  function editor(id=null){
    if(ctx.state.monthClosures?.some(c=>c.month===ctx.month))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
    const x=id?ctx.state.actualExpenses.find(x=>x.id===id):null;
    if(id&&!x)throw Error('Diese Ausgabe ist nicht mehr vorhanden.');
    const revision=ctx.state.revision,date=x?.date||(ctx.month===currentMonth()?ctx.month+'-'+String(new Date().getDate()).padStart(2,'0'):ctx.month+'-01');
    ctx.openDialog(x?'Ausgabe bearbeiten':'Ausgabe erfassen',`<form id="actual-form"><label><span>Wofür?</span><input name="title" value="${esc(x?.title||'')}" placeholder="z. B. Wocheneinkauf" maxlength="160" required autocomplete="off"></label><div class="form-grid spaced"><label><span>Betrag (€)</span><input name="amount" inputmode="decimal" value="${x?fieldMoney(x.amount):''}" placeholder="0,00" required></label><label><span>Datum</span><input name="date" type="date" min="2000-01-01" max="2100-12-31" value="${date}" required></label></div><label class="spaced"><span>Kategorie</span><select name="category" id="actual-category"><option value="auto">Automatisch passend zum Namen</option>${[...ctx.state.categories].sort((a,b)=>a.name.localeCompare(b.name,'de')).map(c=>`<option value="${c.id}" ${x?.category===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}<option value="__new">＋ Neue Kategorie</option></select></label><div id="actual-new-category" class="inline-category-fields" hidden><label><span>Name der Kategorie</span><input name="newCategory" maxlength="45" placeholder="z. B. Garten"></label></div><label class="spaced"><span>Gehört zu einem geplanten Posten?</span><select name="planItemId"><option value="">Zusätzliche Ausgabe · ohne Planposten</option>${projected(ctx.state,date.slice(0,7)).filter(i=>i.type==='expense').map(i=>`<option value="${i.id}" ${resolveExpensePlan(ctx.state,projected(ctx.state,date.slice(0,7)).filter(i=>i.type==='expense'),x||{})?.id===i.id?'selected':''}>${esc(i.title)} · ${euro(i.monthlyAmount)}</option>`).join('')}</select></label><label class="spaced"><span>Notiz (optional)</span><textarea name="note" maxlength="1000" rows="2">${esc(x?.note||'')}</textarea></label><p class="helper spaced">Wähle z. B. „Lebensmittel“, damit dieser Einkauf direkt auf Dein vorhandenes Budget angerechnet wird.</p><div class="form-footer"><button class="btn btn-outline" type="button" data-action="close">Abbrechen</button><button class="btn btn-primary" type="submit">${x?'Speichern':'Ausgabe erfassen'}</button></div></form>`,form=>{
      if(ctx.state.revision!==revision)throw Error('Der Stand wurde geändert. Bitte öffne die Ausgabe erneut.');
      const fd=new FormData(form),title=String(fd.get('title')||'').trim(),amount=money(fd.get('amount')),date=String(fd.get('date'));
      if(!title||amount<=0)throw Error('Bitte einen Namen und einen Betrag größer als 0 eingeben.');
      if(!validDate(date))throw Error('Bitte ein gültiges Datum eingeben.');
      if(ctx.state.monthClosures?.some(c=>c.month===date.slice(0,7)||x&&c.month===x.date.slice(0,7)))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
      const planId=String(fd.get('planItemId')||''),plan=projected(ctx.state,date.slice(0,7)).find(i=>i.id===planId&&i.type==='expense');
      if(planId&&!plan)throw Error('Der Planposten passt nicht zum Ausgabemonat. Bitte die Zuordnung prüfen.');
      const base=structuredClone(ctx.state);
      let category=fd.get('category');
      if(category==='auto')category=suggestCategory(base,title,'expense').id;
      else if(category==='__new'){
        const name=String(fd.get('newCategory')||'').trim();
        if(!name)throw Error('Bitte die neue Kategorie benennen.');
        const exists=base.categories.find(c=>c.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de'));
        category=exists?.id||uid();
        if(!exists)base.categories.push({id:category,name,color:COLORS[base.categories.length%COLORS.length],group:'expense',pace:'spread'});
      }
      if(plan)category=plan.category;
      rememberCategory(base,title,'expense',category);
      const n=saveActual(base,{title,amount,date,category,planItemId:plan?.id||'',planGroupId:plan?(plan.groupId||plan.id):'',note:String(fd.get('note')||'').trim()},id),oldMonth=ctx.month;
      ctx.setMonth(date.slice(0,7));
      if(ctx.persist(n,'Ausgabe gespeichert')){
        filter=null;
        ctx.render();
        close();
      }else ctx.setMonth(oldMonth);
    });
  }
  function csv(){
    const s=actualSummary(ctx.state,ctx.month),cell=v=>'"'+String(v).replace(/^[=+@\t\r-]/,"'").replace(/"/g,'""')+'"',rows=[['Datum','Ausgabe','Betrag EUR','Kategorie','Notiz'],...s.entries.map(x=>[x.date,x.title,fieldMoney(x.amount),ctx.state.categories.find(c=>c.id===x.category).name,x.note])];
    ctx.download('\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),`spielraum-ausgaben-${ctx.month}.csv`,'text/csv;charset=utf-8');
  }
  return {
    render,actions:{
      'actual-new':()=>editor(),'actual-edit':el=>editor(el.dataset.id),'actual-filter':el=>{
        filter=filter===el.dataset.id?null:el.dataset.id;
        filterMonth=ctx.month;
        ctx.render();
      },'actual-clear':()=>{
        filter=null;
        ctx.render();
      },'actual-delete':el=>{
        const x=ctx.state.actualExpenses.find(x=>x.id===el.dataset.id);
        if(x&&ctx.state.monthClosures?.some(c=>c.month===x.date.slice(0,7)))throw Error('Bitte den Monatsabschluss zuerst zurücknehmen.');
        const n=structuredClone(ctx.state);
        n.actualExpenses=n.actualExpenses.filter(x=>x.id!==el.dataset.id);
        ctx.commitUndo(n,'Ausgabe gelöscht');
      },'actual-csv':csv
    }
  };
}
