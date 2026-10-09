import {createMonthUI} from './month-ui.js';
import {createSavingsUI} from './savings-ui.js';
import {createYearUI} from './year-ui.js';
import {renderPlanChanges,planChanges} from './budget-insights.js';
import {createReconciliationUI} from './reconciliation-ui.js';
import {themeColor} from './theme.js';
import {KEY,LEGACY_KEY,COLORS,uid,currentMonth,validMonth,shiftMonth,monthName,euro,amountText,compact,fieldMoney,money,blank,validate,parseBackup,migrate,projected,totals,distribution,forecast,removeItem,upsertItem,demo,legacyAnnual} from './planner.js';
import {enhanceState,UPDATE_BACKUP_KEY,suggestCategory,suggestionsForExisting,rememberCategory,capturePlan} from './intelligence.js';
import {RESERVE_BACKUP_KEY,reserveSummary} from './reserves.js';
import {createReserveUI} from './reserves-ui.js';
import {createActualUI} from './actuals-ui.js';
import {createGoalUI} from './goals-ui.js';
import {actualSummary} from './actuals.js';
const FLOW_BACKUP_KEY='spielraum.before-cashflow-2026-09';
const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={bars:'M5 20v-8M10 20V5M15 20v-5M20 20V9M3 20h18',jar:'M8 3h8M9 3v3.6C6.6 7.5 5 9.6 5 12.2V18a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5.8c0-2.6-1.6-4.7-4-5.6V3M8.5 14h7',target:'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9a4.5 4.5 0 0 0 0 9zM12 12.5v-1',mark:'M5 18C5 8 19 16 19 6M5 13C5 3 19 11 19 1M5 23C5 13 19 21 19 11',plus:'M12 5v14M5 12h14',close:'M6 6l12 12M6 18L18 6',left:'M15 6l-6 6 6 6',right:'M9 6l6 6-6 6',down:'M12 4v16M6 14l6 6 6-6',up:'M12 20V4M6 10l6-6 6 6',arrow:'M6 18L18 6M6 6h12v12',wallet:'M3 6h18v14H3zM3 6l14-3v3M16 12h5v4h-5z',chart:'M12 3v9h9M9 3.5a9 9 0 1 0 11.5 11.5',settings:'M4 7h16M4 17h16M8 4v6M16 14v6',lock:'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M15 15l6 6',repeat:'M3 8h14a4 4 0 0 1 4 4M3 8l4-4M3 8l4 4M21 16H7a4 4 0 0 1-4-4M21 16l-4 4M21 16l-4-4',home:'M3 10l9-7 9 7M5 9v12h14V9M9 21v-8h6v8',bag:'M4 7h16l-1 14H5L4 7zM8 7V5a4 4 0 0 1 8 0v2',travel:'M4 16h16V7H4zM7 16v3M17 16v3M4 11h16M7 14h.01M17 14h.01',sun:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1',heart:'M12 21L3 12C-3 4 8 0 12 7C16 0 27 4 21 12z',spark:'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',save:'M4 3h13l4 4v14H3V3zM7 3v6h9V3M7 21v-8h10v8',download:'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',edit:'M14 5l5 5M4 20l5-1L21 7l-5-5L4 14v6z',check:'M4 12l5 5L20 6',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',calendar:'M3 6h18v15H3zM7 3v6M17 3v6M3 12h18',circle:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',ring:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v6M12 7h.01',undo:'M8 4L3 9l5 5M3 9h11a6 6 0 0 1 0 12'};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.wallet}"/></svg>`;
const categoryIcon=id=>['home','bag','travel','sun','bag','heart','repeat','wallet'][Number(id.replace('c',''))]||'wallet';
let state=enhanceState(blank()),loadedRaw=null,loadError='',saveError='',month=currentMonth(),view='plan',itemFilter='all',categoryFilter=null,query='',searchVisible=false,selectedSlice=null,allLegend=false,demoMode=false,realState=null,undo=null,installPrompt=null,submitHandler=null,editContext=null,installHealth=null,swError='',swRegistration=null;
const reserveUI=createReserveUI({get state(){return state},get month(){return month},esc,icon,btn:(...args)=>btn(...args),openDialog,persist,itemDialog,formError,confirmDialog,commitUndo,render,showPot:id=>savingsUI.actions['savings-pot']({dataset:{id}})});
const actualUI=createActualUI({get state(){return state},get month(){return month},setMonth:m=>{month=m},esc,icon,btn:(...args)=>btn(...args),openDialog,persist,commitUndo,download,render});
const goalUI=createGoalUI({get state(){return state},get month(){return month},esc,icon,btn:(...a)=>btn(...a),openDialog,persist,commitUndo,confirmDialog,itemDialog,render,showPot:id=>savingsUI.actions['savings-pot']({dataset:{id}})});
const reconciliationUI=createReconciliationUI({get state(){return state},get month(){return month},esc,icon,btn:(...a)=>btn(...a),openDialog,persist,commitUndo,confirmDialog,render});
const monthUI=createMonthUI({get state(){return state},get month(){return month},esc,icon,openDialog,commitUndo,itemDialog:(...a)=>itemDialog(...a),closeDialog:()=>{$('#dialog').close();editContext=null},deleteItem:id=>deletePost(id)});
const savingsUI=createSavingsUI({get state(){return state},get month(){return month},esc,icon,openDialog,commitUndo,closeDialog:()=>{$('#dialog').close();editContext=null}});
const yearUI=createYearUI({get state(){return state},get month(){return month},esc,icon,render,openMonth:m=>{
  if(!validMonth(m))return;
  month=m;
  view='plan';
  render();
  window.scrollTo({top:0,behavior:'instant'});
}});
const VIEWS={plan:'Monat',savings:'Sparen',year:'Jahr'},OLD_VIEWS={reserves:'savings',goals:'savings'};

const toastEl=$('#toast');
function toast(message,canUndo=false){
  clearTimeout(toast.timer);
  toastEl.innerHTML=`<span>${esc(message)}</span>${canUndo?'<button data-action="undo">Rückgängig</button>':''}`;
  toastEl.classList.add('visible');
  toast.timer=setTimeout(()=>toastEl.classList.remove('visible'),canUndo?14000:4500);
}
try {
  const raw=localStorage.getItem(KEY);
  loadedRaw=raw;
  if(raw){
    if(!localStorage.getItem(FLOW_BACKUP_KEY))localStorage.setItem(FLOW_BACKUP_KEY,raw);
    const parsed=validate(JSON.parse(raw));
    state=enhanceState(parsed);
    if(!parsed.settings.categoryEdition||!parsed.settings.reservesEdition){
      if(!parsed.settings.categoryEdition&&!localStorage.getItem(UPDATE_BACKUP_KEY))localStorage.setItem(UPDATE_BACKUP_KEY,raw);
      if(!parsed.settings.reservesEdition&&!localStorage.getItem(RESERVE_BACKUP_KEY))localStorage.setItem(RESERVE_BACKUP_KEY,raw);
      state.settings.reservesEdition=1;
      if(totals(state,currentMonth()).income>0)state.snapshots[currentMonth()]=capturePlan(state,currentMonth());
      state.revision++;
      state.updatedAt=new Date().toISOString();
      const encoded=JSON.stringify(state);
      localStorage.setItem(KEY,encoded);
      loadedRaw=encoded;
    }
  }
  else {
    const old=localStorage.getItem(LEGACY_KEY);
    if(old){
      state=enhanceState(migrate(JSON.parse(old)));
      state.updatedAt=new Date().toISOString();
      state.revision=1;
      const encoded=JSON.stringify(state);
      localStorage.setItem(KEY,encoded);
      loadedRaw=encoded;
    }
  }
} catch(error){
  loadError='Deine Daten konnten nicht sicher geladen werden. Sie bleiben unangetastet. Bitte nutze „Daten & Backup“.';
}
function persist(next,message='Gespeichert',{restore=false,keepUndo=false,capture=true}={}){
  try {
    next=enhanceState(next);
    next.settings.reservesEdition=1;
    if(capture&&totals(next,currentMonth()).income>0)next.snapshots[currentMonth()]=capturePlan(next,currentMonth());
    validate(next);
    if(loadError&&!restore)throw Error('Bitte zuerst unter „Daten & Backup“ ein Backup wiederherstellen.');
    if(!demoMode){
      const raw=localStorage.getItem(KEY);
      if(raw!==loadedRaw&&!restore){
        if(raw){
          state=enhanceState(validate(JSON.parse(raw)));
          loadedRaw=raw;
          render();
        }
        throw Error('Der Stand wurde in einem anderen Fenster geändert. Bitte öffne den Posten erneut.');
      }
    }
    next.updatedAt=new Date().toISOString();
    next.revision=(state.revision||0)+1;
    if(!demoMode){
      const encoded=JSON.stringify(next);
      localStorage.setItem(KEY,encoded);
      loadedRaw=encoded;
    }
    state=next;
    loadError='';
    saveError='';
    if(!keepUndo)undo=null;
    render();
    if(message)toast(demoMode?'Demo aktualisiert':message);
    return true;
  }catch(e){
    saveError=e.message.includes('anderen Fenster')||e.message.includes('wiederherstellen')?e.message:'Speichern nicht möglich. Deine bisherigen Daten bleiben erhalten. Bitte erstelle ein Backup.';
    if($('#dialog').open)formError(saveError);
    else{
      render();
      toast(saveError);
    }
    return false;
  }
}
const category=id=>state.categories.find(c=>c.id===id)||state.categories.at(-1);
const allOptions=(value)=>[...state.categories].sort((a,b)=>a.name.localeCompare(b.name,'de')).map(c=>`<option value="${c.id}" ${c.id===value?'selected':''}>${esc(c.name)}</option>`).join('');
const btn=(label,action,style='primary',ico='plus',extra='')=>`<button class="btn btn-${style}" data-action="${action}" ${extra}>${ico?icon(ico):''}${label}</button>`;
function reviewCategories(){
  const choices=suggestionsForExisting(state);
  openDialog('Zuordnungen prüfen',`<form><p class="bodycopy">Nur ausgewählte Posten werden umgeordnet. Beträge, Namen und Zeiträume bleiben erhalten.</p><div class="suggestion-list">${choices.map(({item,suggestion})=>`<label class="suggestion-row"><input type="checkbox" name="pick" value="${item.id}" checked><span><strong>${esc(item.title)}</strong><small>${monthName(item.start,true)} · Sonstiges → ${esc(category(suggestion.id).name)}</small></span></label>`).join('')||'<p class="helper">Aktuell keine neuen Vorschläge.</p>'}</div><div class="form-footer"><button type="button" class="btn btn-outline" data-action="close">Abbrechen</button>${choices.length?'<button class="btn btn-primary" type="submit">Auswahl übernehmen</button>':''}</div></form>`,form=>{
    const ids=new Set(new FormData(form).getAll('pick')),n=structuredClone(state);
    for(const {item,suggestion} of choices)if(ids.has(item.id)){
      n.items.find(i=>i.id===item.id).category=suggestion.id;
      rememberCategory(n,item.title,item.type,suggestion.id);
    }
    if(persist(n,'Ausgewählte Kategorien aktualisiert'))$('#dialog').close();
  });
}
function showInlineCategory(){
  const on=$('#editor-category').value==='__new';
  $('#inline-category-fields').hidden=!on;
  $('#item-form [name="new-category-name"]').required=on;
  previewForm();
}
async function installApp(){
  if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){
    toast('Spielraum ist bereits im App-Modus geöffnet.');
    return;
  }
  if(installPrompt){
    const prompt=installPrompt;
    installPrompt=null;
    try{
      await prompt.prompt();
      const result=await prompt.userChoice;
      toast(result.outcome==='accepted'?'Installation angefragt. Chrome übernimmt den nächsten Schritt.':'Installation abgebrochen. Deine Daten bleiben erhalten.');
    }catch{
      toast('Chrome konnte den Installationsdialog nicht öffnen. Bitte erneut versuchen.');
    }
    return;
  }
  openDialog('Spielraum als App',`<div class="dialog-plain"><p id="install-status" role="status">Installation wird geprüft …</p><p class="spaced">Öffne diese Adresse direkt in Chrome, melde Dich bei Bedarf an und lade die Seite neu. Wähle dann „App installieren“ oder „Zum Startbildschirm hinzufügen“.</p><p class="helper spaced">Bitte keine Website-Daten löschen: Dort liegen Deine Posten. Verwende dieselbe Adresse und dasselbe Chrome-Profil.</p>${btn('Erneut prüfen','install','outline','repeat')}</div>`);
  let message='';
  try{
    if(!window.isSecureContext)throw Error('Die Seite benötigt eine sichere HTTPS-Verbindung.');
    const response=await fetch('./manifest.webmanifest',{credentials:'include',cache:'no-store'});
    if(!response.ok)throw Error('Die Installationsdatei ist nicht erreichbar. Lade die Seite neu und prüfe Deine Anmeldung.');
    const raw=await response.text();
    let manifest;
    try{
      manifest=JSON.parse(raw);
    }catch{
      throw Error('Die Anmeldung verhindert den Zugriff auf die Installationsdatei. Öffne die Seite direkt in Chrome und melde Dich erneut an.');
    }
    if(manifest.display!=='standalone'||!manifest.icons?.some(i=>i.sizes==='512x512'))throw Error('Chrome hat eine ältere Installationsdatei geladen. Bitte die Seite neu laden.');
    if(swError||!('serviceWorker' in navigator))throw Error('Der Offline-Dienst konnte nicht starten. Bitte Seite bei bestehender Internetverbindung neu laden.');
    message='Die Installationsdatei ist erreichbar. Chrome bietet momentan keinen direkten Installationsdialog an. Nutze das Browsermenü; falls dort nur eine Verknüpfung angeboten wird, unterstützt diese Sitzung derzeit keine vollständige App-Installation.';
  }catch(e){
    message=e.message;
  }
  const status=$('#install-status');
  if(status)status.textContent=message;
}
function pendingAnnual(){
  return state.items.filter(i=>legacyAnnual(i)&&(!i.end||i.end>=month));
}
function annualNotice(){
  const pending=pendingAnnual();
  return pending.length?`<div class="annual-review-notice"><div><strong>Zahlungsmonat für ${pending.length} Jahresposten prüfen</strong><p>Diese älteren Posten sind noch monatlich verteilt. Bestätige den Zahlungsmonat, um auf die tatsächliche Jahreszahlung umzustellen.</p></div><button class="btn btn-outline" data-action="review-annual">Prüfen</button></div>`:'';
}
function reviewAnnual(){
  openDialog('Jahreszahlungen umstellen',`<p class="helper">Wähle für jeden Posten den Zahlungsmonat. Gespeicherte Ausgaben und frühere Planmonate bleiben erhalten.</p><div class="annual-review-list">${pendingAnnual().map(i=>`<button data-action="annual-review-item" data-id="${i.id}"><span>${esc(i.title)}<small>Bisher ${euro(Math.round(i.amount/12))} pro Monat · ab ${monthName(i.start)}</small></span><strong>${euro(i.amount)} / Jahr</strong></button>`).join('')}</div>`);
}
const LOGO='<svg class="logo" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="116" fill="var(--logo-bg)"/><path d="M347.4 327.4A116 116 0 1 1 284.1 143.4" fill="none" stroke="var(--logo-ring)" stroke-width="56" stroke-linecap="round"/><path d="M339.4 175.4A116 116 0 0 1 371.9 260.0" fill="none" stroke="var(--logo-gold)" stroke-width="56" stroke-linecap="round"/></svg>';
function render(){
  const t=totals(state,month),titles=VIEWS;
  view=OLD_VIEWS[view]||view;
  if(!titles[view])view='plan';
  const tab=(v,ico)=>`<button data-view="${v}" class="${view===v?'active':''}" ${view===v?'aria-current="page"':''}>${icon(ico)}<span>${titles[v]}</span></button>`;
  $('#app').innerHTML=`<header class="topbar"><span class="brand" title="Spielraum">${LOGO}<span class="visually-hidden">Spielraum</span></span><div class="monthpicker"><button class="iconbtn" data-action="prev" aria-label="Vorheriger Monat" ${month==='2000-01'?'disabled':''}>${icon('left')}</button><button class="month-button" data-action="month" aria-label="Monat wählen, aktuell ${monthName(month)}">${monthName(month)}</button><button class="iconbtn" data-action="next" aria-label="Nächster Monat" ${month==='2100-12'?'disabled':''}>${icon('right')}</button></div><button class="iconbtn" data-action="settings" aria-label="Daten, Backup und Einstellungen">${icon('settings')}</button></header><main class="main view-${view}">${demoMode?'<div class="notice">'+icon('spark')+'<span><strong>Beispielplan</strong> · Deine eigenen Daten bleiben unverändert.</span><button class="textbtn" data-action="demo">Beenden</button></div>':''}${loadError||saveError?'<div class="notice error" role="alert"><span>'+esc(loadError||saveError)+'</span><button class="textbtn" data-action="settings">Daten & Backup</button></div>':''}${state.settings.migrated&&!state.settings.migrationSeen?'<div class="notice"><span><strong>Deine bisherigen Posten sind übernommen.</strong> Bei älteren Jahresposten bitte den Zahlungsmonat bestätigen.</span><button class="textbtn" data-action="migration-seen">Verstanden</button></div>':''}${view!=='plan'?`<h1 class="view-title">${titles[view]}</h1>`:''}${view==='plan'&&!demoMode&&!t.items.length?'<div class="notice"><span>Starte mit Deinem Einkommen oder sieh Dir einen Beispielplan an.</span><button class="textbtn" data-action="demo">Beispiel ansehen</button></div>':''}${annualNotice()}${view==='plan'?monthUI.render():view==='savings'?savingsUI.render():yearUI.render()}${!demoMode&&(state.items.length||state.pots.length||state.actualExpenses.length||state.goals.length)&&(!state.settings.lastBackup||Date.now()-Date.parse(state.settings.lastBackup)>14*86400000)?'<div class="notice backup">'+icon('save')+'<span>'+(state.settings.lastBackup?'Dein letztes Backup ist über zwei Wochen alt.':'Noch kein Backup gespeichert.')+'</span><button class="textbtn" data-action="backup">Sichern</button></div>':''}<p class="footer-note">${icon('lock')}Gespeichert nur auf diesem Gerät</p></main><nav class="tabbar" aria-label="Hauptnavigation">${tab('plan','wallet')}${tab('savings','jar')}<button class="fab" data-action="quick-add" aria-label="Ausgabe erfassen">${icon('plus')}</button>${tab('year','bars')}</nav>`;
}
function openDialog(title,body,handler=null){
  const d=$('#dialog');
  if(d.open)d.close();
  d.innerHTML=`<div class="modal-content"><div class="sheet-handle"></div><div class="modal-head"><h2 id="dialog-title">${title}</h2><button class="iconbtn" data-action="close" aria-label="Schließen">${icon('close')}</button></div>${body}</div>`;
  submitHandler=handler;
  d.showModal();
}
function formError(message){
  let node=$('#form-error');
  if(!node){
    node=document.createElement('div');
    node.id='form-error';
    node.className='form-error';
    node.setAttribute('role','alert');
    const form=$('#dialog form');
    if(form)form.append(node);
    else $('#dialog .modal-content').append(node);
  }
  node.textContent=message;
}
function guessCategory(title){
  return suggestCategory(state,title,editContext?.type||'expense').id;
}
function draftFromForm(form,strict=true){
  const fd=new FormData(form),title=String(fd.get('title')||'').trim(),raw=String(fd.get('amount')||''),value=raw?money(raw):0;
  if(strict&&(!title||value<=0))throw Error('Bitte einen Namen und einen Betrag größer als 0 eingeben.');
  const annualMonth=String(fd.get('annualMonth')||''),start=editContext.frequency==='year'&&!editContext.id?(annualMonth||String(fd.get('start')||editContext.month)):String(fd.get('start')||editContext.month),end=String(fd.get('end')||'');
  if(!validMonth(start)||(end&&(!validMonth(end)||end<start)))throw Error('Bitte Anfang und Ende des Zeitraums prüfen.');
  if(editContext.frequency==='year'&&end&&annualMonth>end)throw Error('Der Zahlungsmonat liegt nach dem Ende des Postens.');
  if(editContext.frequency==='year'&&strict&&!validMonth(annualMonth))throw Error('Bitte den Zahlungsmonat für diesen Jahresposten wählen.');
  const categoryValue=fd.get('category');
  const fresh=categoryValue==='__new'?{id:editContext.pendingCategoryId,name:String(fd.get('new-category-name')||'').trim()||(!strict?'Neue Kategorie':''),color:String(fd.get('new-category-color')||'#71668b'),keywords:String(fd.get('new-category-keywords')||'').trim(),group:editContext.type,pace:editContext.type==='expense'?'spread':'fixed'}:null;
  if(fresh&&!fresh.name)throw Error('Bitte die neue Kategorie benennen.');
  const newPot=fd.get('potId')==='__new'?{id:editContext.pendingPotId,name:String(fd.get('new-pot-name')||title||'Neuer Topf').trim(),color:'#4b5660',goal:0,note:'',checkpoints:[{month:start,balance:0}]}:null;
  if(newPot&&newPot.name.length>80)throw Error('Bitte den Topfnamen auf höchstens 80 Zeichen kürzen.');
  return {newPot,paymentDay:fd.get('paymentDay')?Number(fd.get('paymentDay')):undefined,potId:newPot?newPot.id:fd.get('potId')?String(fd.get('potId')):undefined,newCategory:fresh,pace:['fixed','spread'].includes(fd.get('pace'))?fd.get('pace'):undefined,title:title||'Neuer Posten',amount:value,type:editContext.type==='expense'&&fd.get('potId')?'saving':editContext.type,category:fresh?fresh.id:categoryValue==='auto'?guessCategory(title):categoryValue,frequency:editContext.frequency,...(editContext.frequency==='year'?{annualPayment:true,cycleStart:annualMonth||start}:{}),start,end:editContext.frequency==='once'?'':end,note:String(fd.get('note')||'').trim()};
}
function applyEditorDraft(draft,scope='future'){
  const base=structuredClone(state),clean={...draft};
  if(draft.newCategory){
    const duplicate=base.categories.find(c=>c.name.toLowerCase()===draft.newCategory.name.toLowerCase());
    if(duplicate)clean.category=duplicate.id;
    else base.categories.push(draft.newCategory);
  }
  delete clean.newCategory;
  if(draft.newPot){
    const existing=base.pots.find(p=>p.name.toLocaleLowerCase('de')===draft.newPot.name.toLocaleLowerCase('de'));
    if(existing)clean.potId=existing.id;
    else base.pots.push(draft.newPot);
  }
  delete clean.newPot;
  return upsertItem(base,clean,editContext.id,editContext.month,scope);
}
function previewForm(){
  if(!editContext)return;
  try{
    const form=$('#item-form'),draft=draftFromForm(form,false),targetMonth=editContext.id?editContext.month:draft.start;
    const old=totals(state,targetMonth);
    let next=structuredClone(state);
    if(draft.amount){
      const scope=new FormData(form).get('scope')||'future';
      next=applyEditorDraft(draft,scope);
    }else if(editContext.id)next=removeItem(state,editContext.id,editContext.month);
    const targetPot=draft.newPot?(next.pots.find(p=>p.name.toLocaleLowerCase('de')===draft.newPot.name.toLocaleLowerCase('de'))?.id||draft.potId):draft.potId;
    const potPreview=targetPot?reserveSummary(next,targetMonth).pots.find(p=>p.id===targetPot):null;
    const after=totals(next,targetMonth),delta=after.remaining-old.remaining,help=$('#frequency-help');
    if(help)help.textContent=editContext.frequency==='year'?'Der volle Betrag zählt nur im gewählten Zahlungsmonat und danach alle zwölf Monate. Dazwischen wird nichts eingeplant.':editContext.frequency==='quarter'?'Der volle Betrag zählt im ersten Zahlungsmonat und danach alle drei Monate. Die Monate dazwischen bleiben frei.':editContext.frequency==='once'?'Zählt vollständig für diesen Monat.':'Wird jeden Monat eingeplant, bis Du den Posten änderst oder löschst.';
    if(editContext.frequency==='year'&&!editContext.id){
      const startInput=$('#item-form [name="start"]');
      if(startInput)startInput.value=draft.start;
    }
    const annualField=$('#annual-payment-field');
    if(annualField)annualField.hidden=editContext.frequency!=='year';
    const annualInput=$('#annual-payment-month');
    if(annualInput)annualInput.required=editContext.frequency==='year';
    const paceField=$('#expense-pace-field');
    if(paceField)paceField.hidden=editContext.type!=='expense';
    const periodLabel=$('#period-start-label');
    if(periodLabel)periodLabel.textContent=editContext.id?'Änderung ab':editContext.frequency==='quarter'?'Erster Zahlungsmonat':'Ab Monat';
    if(editContext.frequency==='quarter'){
      const period=$('#item-period');
      if(period)period.open=true;
    }
    const suggestion=$('#category-suggestion');
    if(suggestion){
      const found=suggestCategory(state,draft.title,editContext.type);
      suggestion.textContent=new FormData(form).get('category')==='auto'?'Vorschlag: '+category(found.id).name+' · '+found.reason:'';
    }
    const node=$('#live-projection');
    if(node)node.innerHTML=`<div><span>Danach bleiben im ${monthName(targetMonth)}</span><strong class="${after.remaining<0?'negative':''}">${euro(after.remaining)}</strong></div><div class="projection-diff"><b>${delta>0?'+':delta<0?'−':''}${euro(Math.abs(delta))}</b>${delta===0?'keine Änderung':delta>0?'mehr Spielraum':'weniger Spielraum'}</div>${potPreview?`<p class="linked-pot-preview ${potPreview.balance<0?'negative':''}">${draft.type==='income'?'Entnahme aus':'Rücklage für'} ${esc(potPreview.name)} · ${euro(potPreview.balance)} geplant zum Monatsende${!potPreview.checkpoint?' · Dieser Topf startet erst später.':potPreview.balance<0?' · Entnahme übersteigt den Topfbestand.':''}</p>`:''}`;
  }catch(e){
    const node=$('#live-projection');
    if(node)node.innerHTML='<span>'+esc(e.message||'Bitte prüfe Deine Eingaben.')+'</span>';
  }
}
function itemDialog(type='expense',id=null,preset='',defaults={}){
  const item=id?state.items.find(i=>i.id===id):null;
  if(id&&!item){
    toast('Dieser Posten ist nicht mehr vorhanden.');
    return;
  }
  editContext={id,type:item?.type||type,frequency:item?.frequency||defaults.frequency||'month',month,revision:state.revision,pendingCategoryId:uid(),pendingPotId:uid()};
  const amount=item?.source?totals(state,month).items.find(i=>i.id===id)?.monthlyAmount||0:item?.amount||defaults.amount||0;
  const labels={expense:'Ausgabe',income:'Einnahme',saving:'Rücklage'};
  openDialog(item?labels[editContext.type]+' bearbeiten':'Neue '+labels[editContext.type],`<form id="item-form"><div class="frequency item-kind-switch" aria-label="Art des Postens">${[['expense','Ausgabe'],['income','Einnahme'],['saving','Rücklage']].map(([v,t])=>`<button type="button" class="${editContext.type===v?'active':''}" data-item-type="${v}">${t}</button>`).join('')}</div><label class="spaced"><span>Wie heißt der Posten?</span><input name="title" placeholder="${type==='income'?'z. B. Nettogehalt':type==='saving'?'z. B. Urlaub':'z. B. Miete oder Lebensmittel'}" value="${esc(item?.title||preset)}" required maxlength="160" autocomplete="off"></label><label class="spaced"><span>Betrag</span><div class="amount-field"><input name="amount" inputmode="decimal" placeholder="0,00" value="${amount?fieldMoney(amount):''}" required autocomplete="off" aria-label="Betrag in Euro"><span>€</span></div></label><div class="frequency" aria-label="Häufigkeit">${[['month','Monatlich'],['quarter','Alle 3 Monate'],['year','Jährlich'],['once','Einmalig']].map(([v,t])=>`<button type="button" class="${editContext.frequency===v?'active':''}" data-frequency="${v}" aria-pressed="${editContext.frequency===v}">${t}</button>`).join('')}</div><p class="helper" id="frequency-help"></p><label id="annual-payment-field" class="spaced" ${editContext.frequency!=='year'?'hidden':''}><span>Zahlungsmonat (ab dann jährlich)</span><input id="annual-payment-month" name="annualMonth" type="month" min="2000-01" max="2100-12" value="${item&&legacyAnnual(item)?'':item?.annualPayment?(item.cycleStart||item.start):defaults.start||month}">${item&&legacyAnnual(item)?'<p class="helper">Bisher monatlich verteilt. Wähle den nächsten Zahlungsmonat. Ab dem ausgewählten Planmonat gilt der volle Betrag nur noch im Jahresrhythmus; frühere Monate bleiben erhalten.</p>':''}</label><label class="spaced"><span>Kategorie</span><select name="category" id="editor-category"><option value="auto" ${!item?'selected':''}>Automatisch passend zum Namen</option>${allOptions(item?.category)}<option value="__new">＋ Eigene Kategorie hinzufügen</option></select></label><p class="helper" id="category-suggestion"></p><label id="expense-pace-field" class="spaced" ${editContext.type!=='expense'?'hidden':''}><span>Im Abgleich behandeln als</span><select name="pace">${[['','Automatisch nach Kategorie'],['fixed','Feste Rechnung'],['spread','Variables Budget']].map(([v,t])=>`<option value="${v}" ${(item?.pace||'')===v?'selected':''}>${t}</option>`).join('')}</select><p class="helper">Feste Rechnung: ein Betrag ist zu bezahlen. Variables Budget: ein Rahmen für mehrere Käufe, z. B. Lebensmittel.</p></label><button type="button" class="textbtn" data-action="inline-category">${icon('plus')}Eigene Kategorie</button><div id="inline-category-fields" class="inline-category-fields" hidden><label><span>Name der neuen Kategorie</span><input name="new-category-name" maxlength="45" placeholder="z. B. Musikunterricht"></label><div class="form-grid spaced"><label><span>Farbe</span><input name="new-category-color" type="color" value="#71668b"></label><label><span>Stichwörter (optional)</span><input name="new-category-keywords" maxlength="1000" placeholder="Klavier, Musikschule"></label></div></div><div id="item-pot-field" class="item-pot-field spaced"><label><span id="item-pot-label">${editContext.type==='income'?'Aus Rücklagentopf entnehmen':'Als Rücklage in einen Topf einplanen'}</span><select name="potId" id="item-pot"><option value="" ${!item?.potId&&!defaults.potId?'selected':''}>Ohne Topfzuordnung</option>${reserveUI.potOptions(item?.potId||defaults.potId)}<option value="__new">＋ Neuen Rücklagentopf anlegen</option></select></label><div id="inline-pot-fields" class="spaced" hidden><label><span>Name des neuen Topfs</span><input name="new-pot-name" maxlength="80" placeholder="z. B. Urlaubstopf"></label><p class="helper">Startet mit 0 € im gewählten Monat. Vorhandenes Geld kannst Du später unter „Bestand anpassen“ ergänzen.</p></div><p class="helper" id="item-pot-help">${editContext.type==='income'?'Eine Entnahme verringert den Topf und steht im Monatsbudget zur Verfügung.':'Wähle einen Topf: Dieser Posten zählt dann als Rücklage und erhöht automatisch dessen Monatsvorschau.'}</p></div><label class="spaced"><span>Zahlungstag im Monat (optional)</span><input name="paymentDay" type="number" min="1" max="31" step="1" value="${item?.paymentDay||''}" placeholder="z. B. 5"><p class="helper">Für die Zahlungsübersicht. Kurze Monate nutzen den letzten Tag. Gilt jeweils in den Zahlungsmonaten.</p></label><details id="item-period"><summary>Zeitraum & weitere Optionen</summary><div class="form-grid"><label><span id="period-start-label">${item&&item.frequency!=='once'?'Änderung ab':editContext.frequency==='quarter'?'Erster Zahlungsmonat':'Ab Monat'}</span><input name="start" type="month" value="${item&&item.frequency!=='once'?month:item?.start||defaults.start||month}" min="2000-01" max="2100-12" ${item&&item.frequency!=='once'?'readonly':''}></label><label><span>Bis Monat (optional)</span><input name="end" type="month" value="${item?.end||defaults.end||''}" min="2000-01" max="2100-12"></label>${item&&item.frequency!=='once'?'<label class="full"><span>Änderung anwenden</span><select name="scope"><option value="future">Ab diesem Monat fortlaufend</option><option value="once">Nur diesen Monat</option></select></label>':''}<label class="full"><span>Notiz (optional)</span><textarea name="note" maxlength="1000" rows="2">${esc(item?.note||'')}</textarea></label></div></details>${item?.source?'<p class="helper spaced">Dies ist Dein bisheriger Budgetrahmen. Beim Speichern wird er zu einer regulären geplanten Einnahme.</p>':''}<div class="projection-preview" id="live-projection" aria-live="polite"></div><div class="form-footer"><button type="button" class="btn btn-outline" data-action="close">Abbrechen</button><button type="submit" class="btn btn-primary">${icon('check')}${item?'Änderung speichern':labels[editContext.type]+' anlegen'}</button></div></form>`,form=>{
    if(editContext.revision!==state.revision)throw Error('Der Plan hat sich inzwischen geändert. Bitte öffne den Posten erneut.');
    const draft=draftFromForm(form),scope=new FormData(form).get('scope')||'future',next=applyEditorDraft(draft,scope);
    if(new FormData(form).get('category')!=='auto')rememberCategory(next,draft.title,editContext.type,draft.newCategory?(next.categories.find(c=>c.name.toLowerCase()===draft.newCategory.name.toLowerCase())?.id||draft.category):draft.category);
    const selectedMonth=month;
    if(!id)month=draft.start;
    else if(item.frequency==='once')month=draft.start;
    if(persist(next,item?'Posten aktualisiert':'Posten angelegt')){
      $('#dialog').close();
      editContext=null;
    }else month=selectedMonth;
  });
  previewForm();
}
function confirmDialog(title,text,callback,label='Bestätigen') {
  openDialog(title,`<div class="dialog-plain"><p>${text}</p><form><div class="form-footer"><button type="button" class="btn btn-outline" data-action="close">Abbrechen</button><button type="submit" class="btn btn-dark">${label}</button></div></form></div>`,callback);
}
function deletePost(id){
  const item=state.items.find(i=>i.id===id);
  if(!item)return;
  const old=structuredClone(state),next=removeItem(state,id,month);
  if(persist(next,'',{keepUndo:true})){
    undo={state:old,revision:state.revision};
    toast(item.frequency==='once'?'Posten gelöscht':`Ab ${monthName(month)} entfernt`,true);
  }
}
function settingsDialog(){
  openDialog('Daten & Backup',`<div class="settings-section"><h3>Dein Plan bleibt auf diesem Gerät</h3><p>Deine Posten werden lokal gespeichert. Ein anderer Browser oder ein neues Handy hat einen eigenen Stand. Die App sendet Deine eingegebenen Finanzdaten nicht an einen Server oder eine KI.</p></div><div class="settings-section"><h3>Backup & Wiederherstellung</h3><p>${state.settings.lastBackup?'Letztes Backup: '+new Date(state.settings.lastBackup).toLocaleDateString('de-DE')+'.':'Noch kein Backup exportiert.'} Sichere regelmäßig eine Datei. Beim Löschen von Website-Daten oder bei Geräteverlust können lokale Daten verloren gehen.</p><div class="inline">${btn('Backup speichern','backup','dark','download')}${btn('Wiederherstellen','import','outline',null)}</div>${loadError?'<button class="textbtn danger-zone" data-action="rescue">Vorhandene Rohdaten retten</button>':''}</div><div class="settings-section"><h3>Kategorien & Farben</h3><p>Eigene Kategorien, Farben und Stichwörter. Deine manuelle Auswahl merkt sich die App für gleich benannte neue Posten.</p><div class="inline">${btn('Kategorien bearbeiten','categories','outline','edit')}${btn('Zuordnungen prüfen','review-categories','outline','spark')}</div></div><div class="settings-section"><h3>Spielraum auf dem Startbildschirm</h3><p>Öffne diese Seite in Chrome und wähle im Menü „Zum Startbildschirm hinzufügen“ oder „App installieren“.</p><div class="inline">${btn('Als App nutzen','install','outline','plus')}${btn('App neu laden','reload-app','outline','repeat')}${btn('Speicherschutz','persist-storage','outline','lock')}</div></div><div class="settings-section"><h3>Ausprobieren & exportieren</h3><div class="inline">${btn(demoMode?'Beispiel beenden':'Beispielplan ansehen','demo','outline','spark')}${btn('Posten als CSV','csv','outline','download')}${btn('Für einen Chat','analysis-export','outline','download')}</div></div><div class="settings-section"><h3>So rechnet Spielraum</h3><p>Noch frei = Einnahmen − bereits Ausgegebenes − offene Rechnungen − übrige Budgets − Sparen. Käufe innerhalb eines Budgets ändern den freien Betrag nicht, Käufe ohne Budget oder über Plan senken ihn. Alle Posten zählen sofort, unabhängig von einem Abbuchungstag. Dreimonatige Posten zählen ab dem Startmonat alle drei Monate mit dem vollen Betrag. Neue Jahresposten zählen vollständig im gewählten Zahlungsmonat, dann alle zwölf Monate. Bei älteren Jahresposten bestätigst Du zuerst den Zahlungsmonat; bis dahin bleibt der bisherige Monatsanteil erhalten. Der Bereich Jahr führt Deine bestehenden Pläne zwölf Monate fort.</p><p class="spaced">Änderst oder löschst Du einen monatlichen Posten, gilt das ab dem ausgewählten Monat. Frühere Monate bleiben erhalten.</p><p class="note">Spielraum 3.1 · Monat, Sparen & Jahr</p><button class="textbtn" data-action="update-backup">Sicherung vor diesem Update exportieren</button></div>`);
}
function categoriesDialog(){
  openDialog('Deine Kategorien',`<div class="stack"><div>${state.categories.map(c=>`<div class="category-row"><span class="dot" style="background:${themeColor(c.color)}"></span><span>${esc(c.name)}</span><button data-action="edit-category" data-id="${c.id}" aria-label="${esc(c.name)} bearbeiten">${icon('edit')}</button></div>`).join('')}</div>${btn('Kategorie hinzufügen','new-category','outline','plus')}</div>`);
}
function categoryDialog(id=null){
  const c=id?category(id):null;
  openDialog(c?'Kategorie bearbeiten':'Neue Kategorie',`<form><div class="form-grid"><label class="full"><span>Name</span><input name="name" required maxlength="45" value="${esc(c?.name||'')}"></label><label><span>Farbe</span><input type="color" name="color" value="${themeColor(c?.color||COLORS[state.categories.length%COLORS.length])}"></label><label><span>Bereich</span><select name="group">${[['expense','Ausgaben'],['saving','Rücklagen'],['income','Einnahmen'],['all','Übergreifend']].map(([v,t])=>`<option value="${v}" ${(c?.group||'expense')===v?'selected':''}>${t}</option>`).join('')}</select></label><label class="full"><span>Stichwörter für die automatische Zuordnung</span><textarea name="keywords" maxlength="1000" rows="2" placeholder="Begriffe durch Kommas trennen">${esc(c?.keywords||'')}</textarea></label></div><div class="form-footer"><button type="button" class="btn btn-outline" data-action="categories">Zurück</button><button type="submit" class="btn btn-primary">Speichern</button></div>${c?`<button class="textbtn danger-zone spaced" type="button" data-action="delete-category" data-id="${id}">Kategorie löschen</button>`:''}</form>`,form=>{
    const fd=new FormData(form),name=String(fd.get('name')).trim();
    if(!name)throw Error('Bitte einen Namen eingeben.');
    if(state.categories.some(v=>v.id!==id&&v.name.toLowerCase()===name.toLowerCase()))throw Error('Diese Kategorie gibt es schon.');
    const n=structuredClone(state),fields={name,color:fd.get('color'),group:fd.get('group'),keywords:String(fd.get('keywords')||''),limit:c?.limit||0,pace:c?.pace||'spread'};
    if(c)n.categories=n.categories.map(v=>v.id===id?{...v,...fields}:v);
    else n.categories.push({id:uid(),...fields});
    if(persist(n,'Kategorie gespeichert'))categoriesDialog();
  });
}
function download(content,name,type='application/json'){
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
  a.href=url;
  a.download=name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
}
const dateStamp=()=>new Date().toISOString().slice(0,10);
function backup(){
  if(loadError){
    actions.rescue();
    return;
  }
  const copy=structuredClone(state);
  copy.settings.lastBackup=new Date().toISOString();
  download(JSON.stringify(copy,null,2),`spielraum-backup-${dateStamp()}${demoMode?'-beispiel':''}.json`);
  persist(copy,'Backup-Download gestartet. Bitte Datei aufbewahren.');
}
function exportCSV(){
  const cell=v=>'"'+String(v).replace(/^[=+@\t\r-]/,"'").replace(/"/g,'""')+'"',rows=[['Monat','Posten','Art','Kategorie','Häufigkeit','Originalbetrag EUR','Monatlich EUR','Notiz','Rücklagentopf'],...projected(state,month).map(i=>[month,i.title,{income:'Einnahme',expense:'Ausgabe',saving:'Rücklage'}[i.type],category(i.category).name,{month:'Monatlich',quarter:'Alle 3 Monate',year:'Jährlich',once:'Einmalig'}[i.frequency],fieldMoney(i.amount),fieldMoney(i.monthlyAmount),i.note,state.pots.find(p=>p.id===i.potId)?.name||''])];
  download('\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),`spielraum-monatsplan-${month}.csv`,'text/csv;charset=utf-8');
  toast('CSV-Download gestartet.');
}
function exportAnalysis(){
  const data={format:'Spielraum Monatsplanung',version:2,waehrung:'EUR',erklaerung:'Geplante Beträge für vollständige Monate, unabhängig von Abbuchungstagen. Neue Jahresposten im Zahlungsmonat; unbestätigte Altposten weiterhin mit ihrem bisherigen Monatsanteil. Kein Kontostand. Ohne Postennamen oder Notizen.',monate:forecast(state,month,12).map(p=>({monat:p.month,erfassteAusgaben:actualSummary(state,p.month).total/100,erfassteKategorien:actualSummary(state,p.month).categories.filter(c=>c.value).map(c=>({name:c.name,betrag:c.value/100})),einnahmen:p.income/100,ausgaben:p.expense/100,ruecklagen:p.saving/100,entnahmenAusRuecklagen:p.reserveWithdrawals/100,ruecklagenbestandGeplant:reserveSummary(state,p.month).balance/100,frei:p.remaining/100,kategorien:distribution(state,p.month,'expense').map(c=>({name:c.name,betrag:c.value/100}))}))};
  download(JSON.stringify(data,null,2),`spielraum-auswertung-${month}.json`);
  toast('Auswertung exportiert. Du kannst sie im Chat anhängen.');
}
function syncPotField(){
  const el=$('#item-pot-field');
  if(!el||!editContext)return;
  el.hidden=false;
  $('#item-pot-label').textContent=editContext.type==='income'?'Aus Rücklagentopf entnehmen':'Als Rücklage in einen Topf einplanen';
  $('#item-pot-help').textContent=editContext.type==='income'?'Entnahme: Der Topf sinkt, Dein verfügbarer Monatsbetrag steigt.':'Topf wählen: Der Posten wird als Rücklage eingeplant. Der Topf wächst, der Betrag zählt im Monatsplan genau einmal.';
}
function setEditorType(type){
  if(!editContext)return;
  editContext.type=type;
  document.querySelectorAll('[data-item-type]').forEach(n=>{
    n.classList.toggle('active',n.dataset.itemType===type);
    n.setAttribute('aria-pressed',String(n.dataset.itemType===type));
  });
  const label={expense:'Ausgabe',income:'Einnahme',saving:'Rücklage'}[type];
  $('#dialog-title').textContent=label+(editContext.id?' bearbeiten':' anlegen');
  $('#item-form button[type="submit"]').textContent=editContext.id?'Änderung speichern':label+' anlegen';
  syncPotField();
}
function commitUndo(next,message){
  const old=structuredClone(state);
  if(persist(next,'',{keepUndo:true})){
    undo={state:old,revision:state.revision};
    toast(message,true);
    return true;
  }
  return false;
}
const actions={
  ...reserveUI.actions,...actualUI.actions,...goalUI.actions,...reconciliationUI.actions,...monthUI.actions,...savingsUI.actions,...yearUI.actions,
  'change-detail':el=>{
    const c=planChanges(state,el.dataset.month),x=c?.changes.find(x=>x.id===el.dataset.id);
    if(!x)return;
    openDialog(esc(x.title),`<p class="bodycopy">Dieser Posten verändert Deinen freien Betrag gegenüber ${monthName(c.previous)} um ${x.change>0?'+':'−'}${euro(Math.abs(x.change))}.</p><p class="helper spaced">Wiederholungsrhythmus, Betrag und Gültigkeitszeitraum bestimmen, in welchem Monat er zählt.</p><button class="btn btn-outline spaced" data-action="edit-item" data-id="${x.id}">Planposten ansehen</button>`);
  },
  'review-annual':reviewAnnual,'annual-review-item':el=>{
    const i=state.items.find(i=>i.id===el.dataset.id);
    if(i&&i.start>month)month=i.start;
    itemDialog(i?.type||'expense',el.dataset.id);
  },
  'new-expense':()=>itemDialog('expense'),'new-income':()=>itemDialog('income'),'new-saving':()=>itemDialog('saving'),
  'edit-item':el=>{
    const i=state.items.find(i=>i.id===el.dataset.id);
    if(view!=='plan'&&i?.start>month){
      month=i.start;
      render();
    }
    itemDialog('expense',el.dataset.id);
  },'delete-item':el=>{
    if($('#dialog').open){
      $('#dialog').close();
      editContext=null;
    }
    deletePost(el.dataset.id);
  },
  close:()=>{
    $('#dialog').close();
    editContext=null;
  },settings:settingsDialog,categories:categoriesDialog,'new-category':()=>categoryDialog(),'edit-category':el=>categoryDialog(el.dataset.id),
  'delete-category':el=>{
    const id=el.dataset.id;
    if(state.categories.length===1){
      formError('Mindestens eine Kategorie muss erhalten bleiben.');
      return;
    }
    if(state.items.some(i=>i.category===id)||state.actualExpenses.some(i=>i.category===id)){
      formError('Diese Kategorie wird noch von Posten verwendet. Ordne diese zuerst einer anderen Kategorie zu.');
      return;
    }
    confirmDialog('Kategorie löschen?',`„${esc(category(id).name)}“ entfernen?`,()=>{
      const n=structuredClone(state);
      n.categories=n.categories.filter(c=>c.id!==id);
      for(const limits of Object.values(n.legacy.limits))delete limits[id];
      for(const [key,value]of Object.entries(n.settings.assignments||{}))if(value===id)delete n.settings.assignments[key];
      if(persist(n,'Kategorie gelöscht'))categoriesDialog();
    },'Löschen');
  },
  prev:()=>{
    const m=shiftMonth(month,-1);
    if(validMonth(m)){
      month=m;
      selectedSlice=null;
      render();
    }
  },next:()=>{
    const m=shiftMonth(month,1);
    if(validMonth(m)){
      month=m;
      selectedSlice=null;
      render();
    }
  },
  month:()=>openDialog('Monat auswählen',`<form><label><span>Dein Plan für</span><input name="month" type="month" min="2000-01" max="2100-12" value="${month}" required></label><button class="textbtn spaced" type="button" data-action="today">Aktueller Monat</button><div class="form-footer"><button class="btn btn-primary" type="submit">Anzeigen</button></div></form>`,form=>{
    const m=new FormData(form).get('month');
    if(!validMonth(m))throw Error('Bitte einen gültigen Monat wählen.');
    month=m;
    selectedSlice=null;
    render();
    $('#dialog').close();
  }),
  today:()=>{
    month=currentMonth();
    selectedSlice=null;
    render();
    $('#dialog').close();
  },
  undo:()=>{
    if(!undo||undo.revision!==state.revision){
      toast('Dieser Schritt kann nicht mehr rückgängig gemacht werden.');
      return;
    }
    persist(undo.state,'Änderung rückgängig gemacht');
  },
  demo:()=>{
    if(loadError){
      toast('Bitte zuerst Deine Daten wiederherstellen.');
      return;
    }
    $('#dialog').close();
    if(demoMode){
      state=realState;
      realState=null;
      demoMode=false;
    }else{
      realState=state;
      state=enhanceState(demo());
      demoMode=true;
    }
    month=currentMonth();
    view='plan';
    selectedSlice=null;
    undo=null;
    categoryFilter=null;
    query='';
    itemFilter='all';
    render();
    window.scrollTo(0,0);
  },
  'migration-seen':()=>{
    const n=structuredClone(state);
    n.settings.migrationSeen=true;
    persist(n,'');
  },backup,csv:exportCSV,'analysis-export':exportAnalysis,
  rescue:()=>{
    let raw;
    try{
      raw=localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY);
    }catch{}download(raw||JSON.stringify(state,null,2),'spielraum-rohdaten-'+dateStamp()+'.json');
    toast('Vorhandene Rohdaten als Datei exportiert.');
  },
  import:()=>{
    $('#import-file').value='';
    $('#import-file').click();
  },
  'persist-storage':async()=>{
    if(!navigator.storage?.persist){
      toast('Dieser Browser unterstützt keinen zusätzlichen Speicherschutz.');
      return;
    }
    try{
      const ok=await navigator.storage.persist();
      toast(ok?'Speicherschutz gewährt. Bitte weiterhin Backups anlegen.':'Kein zusätzlicher Schutz gewährt. Bitte Backups nutzen.');
    }catch{
      toast('Speicherschutz konnte nicht angefragt werden.');
    }
  },
  'reload-app':async()=>{
    if(swRegistration)await Promise.race([swRegistration.update().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,2500))]);
    window.location.reload();
  },
  install:installApp,'review-categories':reviewCategories,
  'inline-category':()=>{
    $('#editor-category').value='__new';
    showInlineCategory();
    $('#item-form [name="new-category-name"]').focus();
  },
  'update-backup':()=>{
    const raw=localStorage.getItem(FLOW_BACKUP_KEY)||localStorage.getItem(RESERVE_BACKUP_KEY)||localStorage.getItem(UPDATE_BACKUP_KEY);
    if(!raw){
      toast('Keine Sicherung vor diesem Update vorhanden.');
      return;
    }
    download(raw,'spielraum-vor-update.json');
    toast('Unveränderten Stand vor dem Update exportiert.');
  }

};
document.addEventListener('click',async event=>{
  const el=event.target.closest('button')||event.target.closest('[data-action]');
  if(!el)return;
  if(el.dataset.view){
    if(!VIEWS[el.dataset.view])return;
    view=el.dataset.view;
    render();
    window.scrollTo({top:0,behavior:'instant'});
    return;
  }
  if(el.dataset.itemType&&editContext){
    setEditorType(el.dataset.itemType);
    if(editContext.type==='expense'){
      $('#item-pot').value='';
      $('#inline-pot-fields').hidden=true;
    }
    previewForm();
    return;
  }
  if(el.dataset.frequency&&editContext){
    editContext.frequency=el.dataset.frequency;
    document.querySelectorAll('[data-frequency]').forEach(n=>{
      n.classList.toggle('active',n.dataset.frequency===editContext.frequency);
      n.setAttribute('aria-pressed',String(n.dataset.frequency===editContext.frequency));
    });
    previewForm();
    return;
  }
  if(el.dataset.preset){
    itemDialog('expense',null,el.dataset.preset);
    return;
  }
  const fn=actions[el.dataset.action];
  if(fn)try{
    await fn(el);
  }catch(e){
    toast(e.message||'Die Aktion konnte nicht ausgeführt werden.');
  }
});
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-action][role=button]')){
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  }
});
document.addEventListener('submit',event=>{
  if(!event.target.closest('#dialog'))return;
  event.preventDefault();
  if(submitHandler)try{
    submitHandler(event.target);
  }catch(e){
    formError(e.message||'Bitte Eingaben prüfen.');
  }
});
document.addEventListener('input',event=>{
  if(event.target.matches?.('[data-wish-range]')){
    savingsUI.slide(event.target);
    return;
  }
  if(event.target.closest('#quick-form')){
    monthUI.quickPreview(event.target.closest('#quick-form'));
    return;
  }
  if(event.target.closest('#plan-payment-form')){
    reconciliationUI.paymentPreview(event.target.closest('#plan-payment-form'));
    return;
  }
  if(event.target.closest('#item-form')){
    previewForm();
    return;
  }
});
document.addEventListener('change',async event=>{
  if(event.target.closest?.('#quick-form')){
    monthUI.quickPreview(event.target.closest('#quick-form'));
    return;
  }
  if(event.target.id==='csv-picker'){
    try{
      await reconciliationUI.handleFile(event.target.files?.[0]);
    }catch(e){
      toast(e.message);
    }
    return;
  }
  if(event.target.id==='item-pot'){
    $('#inline-pot-fields').hidden=event.target.value!=='__new';
    if(event.target.value&&editContext?.type==='expense')setEditorType('saving');
  }
  if(event.target.id==='actual-category')$('#actual-new-category').hidden=event.target.value!=='__new';
  if(event.target.id==='editor-category')showInlineCategory();
  if(event.target.closest('#item-form'))previewForm();
});
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    if(file.size>20000000)throw Error('Die Datei ist größer als 20 MB.');
    const n=enhanceState(parseBackup(await file.text()));
    confirmDialog('Backup wiederherstellen?',`${n.decisions.length} Entscheidungen, ${n.goals.length} Ziele, ${n.items.length} Planposten, ${n.actualExpenses.length} erfasste Ausgaben, ${n.pots.length} Rücklagentöpfe und ${n.categories.length} Kategorien übernehmen? Der ${demoMode?'Beispielplan':'aktuelle Stand'} wird ersetzt. Sichere bei Bedarf vorher ein Backup.`,()=>{
      if(persist(n,'Backup wiederhergestellt',{restore:true})){
        $('#dialog').close();
        month=currentMonth();
        view='plan';
        categoryFilter=null;
        render();
      }
    },'Wiederherstellen');
  }catch(e){
    toast(e instanceof SyntaxError?'Die Datei enthält kein gültiges Backup.':e.message);
  }
});
window.addEventListener('storage',event=>{
  if(event.key!==KEY)return;
  if(demoMode){
    try{
      if(event.newValue){
        realState=enhanceState(validate(JSON.parse(event.newValue)));
        loadedRaw=event.newValue;
      }
    }catch{}return;
  }
  try{
    if(!event.newValue){
      loadError='Die gespeicherten Daten wurden außerhalb dieses Fensters entfernt. Sichere den offenen Stand über „Daten & Backup“.';
    }else{
      state=enhanceState(validate(JSON.parse(event.newValue)));
      loadedRaw=event.newValue;
      loadError='';
      if($('#dialog').open){
        $('#dialog').close();
        editContext=null;
        toast('Plan in einem anderen Fenster aktualisiert. Bitte Posten erneut öffnen.');
      }
    }
    undo=null;
    render();
  }catch{
    loadError='Ein anderer Stand konnte nicht gelesen werden. Bitte nutze ein Backup.';
    render();
  }
});
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  installPrompt=e;
});
render();
try{
  const params=new URLSearchParams(window.location?.search||'');
  if(params.get('aktion')==='ausgabe'){
    window.history?.replaceState?.(null,'',window.location.pathname);
    monthUI.actions['quick-add']();
  }
}catch{}
window.addEventListener('appinstalled',()=>{
  installPrompt=null;
  toast('Spielraum wurde als App installiert.');
});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
  swRegistration=reg;
  return reg.update();
}).catch(e=>{
  swError=e.message||'Dienst nicht verfügbar';
});
