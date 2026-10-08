import {checkpointFor} from './reserves.js';
import {uid,validate,validDate,money,projected,totals,shiftMonth,validMonth,resolveExpensePlan} from './planner.js';
import {suggestCategory,paceFor} from './intelligence.js';
import {makeJournal,undoJournal} from './scenarios.js';
export const merchantKey=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('de').replace(/\s+/g,' ').trim().slice(0,160);
export function recordPlannedExpense(state,id,month,{amount,date,complete=false}){
  if((state.monthClosures||[]).some(c=>c.month===month))throw Error('Dieser Monat ist abgeschlossen. Bitte den Abschluss zuerst zurücknehmen.');
  const item=reconcileMonth(state,month).links.find(i=>i.id===id);
  if(!item)throw Error('Dieser Ausgabenposten ist im ausgewählten Monat nicht mehr aktiv.');
  if(!validDate(date)||date.slice(0,7)!==month)throw Error('Bitte ein Datum innerhalb des ausgewählten Monats wählen.');
  const value=complete?item.open:amount;
  if(!Number.isSafeInteger(value)||value<=0||value>100000000000)throw Error(complete?'Der Planbetrag ist bereits vollständig erfasst.':'Bitte einen Betrag größer als null eingeben.');
  const n=structuredClone(state);
  n.actualExpenses??=[];
  n.actualExpenses.push({id:uid(),title:item.title,amount:value,date,category:item.category,note:'',kind:'expense',direction:'out',planItemId:item.id,planGroupId:item.groupId||item.id});
  return validate(n);
}
export function fingerprint(value){
  let h=2166136261;
  for(const c of String(value)){
    h^=c.charCodeAt(0);
    h=Math.imul(h,16777619);
  }
  return (h>>>0).toString(16);
}
export function parseCSV(text,delimiter='auto'){
  text=String(text).replace(/^\uFEFF/,'');
  if(text.length>5000000)throw Error('Bitte eine CSV mit höchstens 5 MB verwenden.');
  const parse=sep=>{
    const rows=[];
    let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(ch==='"'){
        if(quoted&&text[i+1]==='"'){
          cell+='"';
          i++;
        }else if(quoted||cell==='')quoted=!quoted;
        else cell+=ch;
      }else if(ch===sep&&!quoted){
        row.push(cell);
        cell='';
      }else if((ch==='\n'||ch==='\r')&&!quoted){
        if(ch==='\r'&&text[i+1]==='\n')i++;
        row.push(cell);
        if(row.some(x=>x.trim()))rows.push(row);
        row=[];
        cell='';
      }else cell+=ch;
    }
    if(quoted)throw Error('Die CSV enthält ein nicht geschlossenes Anführungszeichen.');
    row.push(cell);
    if(row.some(x=>x.trim()))rows.push(row);
    return rows;
  };
  if(delimiter==='auto'){
    const scores=[';',',','\t'].map(d=>{
      const rows=parse(d),counts=rows.slice(0,20).map(r=>r.length),score=counts.filter(n=>n>1).length*10+Math.max(0,...counts);
      return {d,rows,score};
    }).sort((a,b)=>b.score-a.score);
    return {delimiter:scores[0].d,rows:scores[0].rows};
  }
  return {delimiter,rows:parse(delimiter)};
}
export function guessColumns(headers){
  const h=headers.map(x=>merchantKey(x)),find=patterns=>h.findIndex(x=>patterns.some(p=>p.test(x)));
  return {date:find([/^buchungstag/,/^buchungsdatum/,/^datum$/, /^date$/, /valuta/]),title:find([/zahlungsempf/,/begünstig/,/auftraggeber/,/empfänger/,/name/,/beschreibung/,/ausgabe/,/payee/,/merchant/]),details:find([/verwendungszweck/,/buchungstext/,/purpose/]),amount:find([/^betrag/,/^umsatz$/, /^amount/]),debit:find([/^soll/,/debit/]),credit:find([/^haben/,/credit/]),currency:find([/währung/,/waehrung/,/currency/]),mode:h.some(x=>x==='ausgabe')?'expenses':'signed',decimal:'comma'};
}
export function csvDate(raw){
  const s=String(raw||'').trim();
  if(validDate(s))return s;
  const m=s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if(m){
    const d=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
    if(validDate(d))return d;
  }
  throw Error('Datum nicht erkannt (TT.MM.JJJJ oder JJJJ-MM-TT).');
}
function signedMoney(raw,decimal){
  let s=String(raw||'').trim().replace(/[€\s]/g,'').replace(/EUR/gi,'');
  if(!s)return 0;
  let sign=1;
  if(/^\(.*\)$/.test(s)){
    sign=-1;
    s=s.slice(1,-1);
  }
  if(s.startsWith('-')||s.endsWith('-')){
    sign=-1;
    s=s.replace(/^-|-$/g,'');
  }
  s=s.replace(/^\+/,'');
  if(decimal==='dot'){
    if(!/^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(s))throw Error('Betrag passt nicht zum gewählten Dezimalformat.');
    s=s.replace(/,/g,'');
  }
  return sign*money(s);
}
const matchKey=x=>[x.date,merchantKey(x.merchant||x.title),x.amount,x.kind||'expense'].join('|');
export function previewCSV(state,rows,map){
  if(rows.length>3000)throw Error('Bitte höchstens 3.000 Umsätze pro Import verwenden.');
  if(map.date<0||map.title<0||(map.mode==='split'?map.debit<0&&map.credit<0:map.amount<0))throw Error('Bitte Datum, Name und Betrag oder Soll/Haben zuordnen.');
  const seen=new Set((state.actualExpenses||[]).map(matchKey)),keys=new Set((state.actualExpenses||[]).map(x=>x.importKey).filter(Boolean));
  return rows.map((r,index)=>{
    try{
      const currency=map.currency>=0?String(r[map.currency]||'').trim().toUpperCase():'';
      if(currency&&!['EUR','€'].includes(currency))throw Error('Fremdwährung: bitte zuerst in Euro umrechnen.');
      const date=csvDate(r[map.date]),merchant=String(r[map.title]||'').trim().slice(0,160);
      if(!merchant)throw Error('Der Name fehlt.');
      let signed;
      if(map.mode==='split'){
        const debit=signedMoney(r[map.debit],map.decimal),credit=signedMoney(r[map.credit],map.decimal);
        if(debit&&credit)throw Error('Soll und Haben sind gleichzeitig gefüllt.');
        signed=Math.abs(credit)-Math.abs(debit);
      }else{
        signed=signedMoney(r[map.amount],map.decimal);
        if(map.mode==='expenses')signed=-Math.abs(signed);
      }
      if(!signed)throw Error('Nullbetrag wird nicht importiert.');
      const rule=(state.importRules||[]).find(x=>x.merchant===merchantKey(merchant)&&(x.direction?x.direction===(signed<0?'out':'in'):x.kind===(signed<0?'expense':'income')||x.kind==='transfer')),kind=rule?.kind||(signed<0?'expense':'income'),category=state.categories.some(c=>c.id===rule?.category)?rule.category:suggestCategory(state,merchant,kind==='income'?'income':'expense').id,entry={id:'csv_'+index,title:merchant,merchant,date,amount:Math.abs(signed),kind,category,direction:signed<0?'out':'in',note:map.details>=0?String(r[map.details]||'').slice(0,1000):'',planItemId:'',potId:''};
      const matches=projected(state,date.slice(0,7)).filter(i=>i.type==='expense'&&merchantKey(i.title)===merchantKey(merchant));
      if(kind==='expense'&&matches.length===1)entry.planItemId=matches[0].id;
      entry.importKey=fingerprint([date,merchantKey(merchant),signed].join('|'));
      const duplicate=seen.has(matchKey(entry))||keys.has(entry.importKey);
      seen.add(matchKey(entry));
      keys.add(entry.importKey);
      return {...entry,duplicate,selected:!duplicate,error:''};
    }catch(e){
      return {id:'csv_'+index,error:e.message,row:index+1,selected:false};
    }
  });
}
export function importEntries(state,rows){
  const n=structuredClone(state);
  n.importRules??=[];
  for(const r of rows.filter(r=>r.selected&&!r.error)){
    const x={id:uid(),title:r.title,amount:r.amount,date:r.date,category:r.category,kind:r.kind,direction:r.direction,note:r.note||'',merchant:r.merchant||r.title,importKey:r.importKey,planItemId:r.planItemId||'',potId:r.potId||''};
    if(x.planItemId&&(x.kind!=='expense'||!projected(n,x.date.slice(0,7)).some(i=>i.id===x.planItemId&&i.type==='expense')))throw Error('Ein zugeordneter Planposten passt nicht zum Buchungsmonat. Bitte die Zuordnung prüfen.');
    if(x.planItemId){
      const p=n.items.find(i=>i.id===x.planItemId);
      x.planGroupId=p.groupId||p.id;
    }
    n.actualExpenses.push(x);
    const merchant=merchantKey(x.merchant);
    n.importRules=n.importRules.filter(r=>r.merchant!==merchant||r.direction!==x.direction);
    n.importRules.push({merchant,category:x.category,kind:x.kind,direction:x.direction});
  }
  return validate(n);
}
export function reconcileMonth(state,month){
  const entries=(state.actualExpenses||[]).filter(x=>x.date.slice(0,7)===month),expenses=entries.filter(x=>!x.kind||x.kind==='expense'),plan=projected(state,month).filter(i=>i.type==='expense'),resolved=new Map(expenses.map(x=>[x.id,resolveExpensePlan(state,plan,x)])),categories=state.categories.map(c=>{
    const planned=plan.filter(i=>i.category===c.id).reduce((n,i)=>n+i.monthlyAmount,0),spent=expenses.filter(x=>{
      const match=resolved.get(x.id);
      return (match?.category||x.category)===c.id;
    }).reduce((n,x)=>n+x.amount,0);
    return {...c,planned,spent,reserved:Math.max(planned,spent)};
  }).filter(c=>c.planned||c.spent),t=totals(state,month),actualTotal=expenses.reduce((n,x)=>n+x.amount,0);
  const links=plan.map(i=>{
    const payments=expenses.filter(x=>resolved.get(x.id)?.id===i.id),paid=payments.reduce((n,x)=>n+x.amount,0);
    return {...i,budgetKind:paceFor(state,i)==='spread'?'variable':'fixed',payments,paid,open:Math.max(0,i.monthlyAmount-paid),over:Math.max(0,paid-i.monthlyAmount)};
  });
  return {entries,expenses,links,categories,actualTotal,fixedOpen:links.filter(i=>i.budgetKind==='fixed').reduce((n,i)=>n+i.open,0),variableOpen:links.filter(i=>i.budgetKind==='variable').reduce((n,i)=>n+i.open,0),budgetIncome:t.income-t.reserveWithdrawals,reserveWithdrawals:t.reserveWithdrawals,availableIncome:t.income,incomeSources:t.items.filter(i=>i.type==='income'&&!i.potId),plannedSaving:t.saving,afterRecorded:t.income-actualTotal-t.saving,afterOpen:t.income-actualTotal-t.saving-links.reduce((n,i)=>n+i.open,0),planOpen:links.reduce((n,i)=>n+i.open,0),planPaid:links.reduce((n,i)=>n+i.paid,0),planTotal:links.reduce((n,i)=>n+i.monthlyAmount,0),opening:(state.monthClosures||[]).find(c=>c.month===shiftMonth(month,-1))?.available||0,income:entries.filter(x=>x.kind==='income').reduce((n,x)=>n+x.amount,0),deposits:entries.filter(x=>x.kind==='transfer'&&x.direction==='out'&&x.potId).reduce((n,x)=>n+x.amount,0),withdrawals:entries.filter(x=>x.kind==='transfer'&&x.direction==='in'&&x.potId).reduce((n,x)=>n+x.amount,0),remaining:t.income-t.saving-categories.reduce((n,c)=>n+c.reserved,0),unlinked:expenses.filter(x=>!resolved.get(x.id)),signature:fingerprint(JSON.stringify({entries,items:t.items,pots:state.pots}))};
}
export function saveEntryClassification(state,id,{kind,category,planItemId='',potId='',direction='out',learn=false,title,amount,date}){
  const n=structuredClone(state),x=n.actualExpenses.find(x=>x.id===id);
  if(!x)throw Error('Umsatz nicht mehr vorhanden.');
  if(title!==undefined)x.title=title;
  if(amount!==undefined)x.amount=amount;
  if(date!==undefined){
    if(!validDate(date))throw Error('Bitte ein gültiges Datum wählen.');
    x.date=date;
  }
  if(planItemId&&!projected(n,x.date.slice(0,7)).some(i=>i.id===planItemId&&i.type==='expense'))throw Error('Der Planposten ist in diesem Monat nicht aktiv.');
  if(potId&&!n.pots.some(p=>p.id===potId))throw Error('Dieser Topf fehlt.');
  const linked=planItemId?n.items.find(i=>i.id===planItemId):null;
  Object.assign(x,{kind,category,planItemId:kind==='expense'?planItemId:'',planGroupId:kind==='expense'&&linked?(linked.groupId||linked.id):'',potId:kind==='transfer'?potId:'',direction});
  if(learn){
    n.importRules??=[];
    const merchant=merchantKey(x.merchant||x.title);
    n.importRules=n.importRules.filter(r=>r.merchant!==merchant||r.direction!==direction);
    n.importRules.push({merchant,kind,category,direction});
  }
  return validate(n);
}
export function closeMonth(state,month,{income,deposits,withdrawals,opening=0,assigned=0,potId='',confirmed=false}){
  if(!confirmed)throw Error('Bitte Vollständigkeit und tatsächliche Beträge bestätigen.');
  if((state.monthClosures||[]).some(c=>c.month===month))throw Error('Dieser Monat ist bereits abgeschlossen. Öffne ihn zuerst wieder.');
  const next=shiftMonth(month,1);
  if(!validMonth(next))throw Error('Für diesen Monat ist kein Folgezeitraum verfügbar.');
  if([income,deposits,withdrawals,opening,assigned].some(x=>!Number.isSafeInteger(x)||x<0||x>100000000000))throw Error('Bitte gültige Beträge angeben.');
  const r=reconcileMonth(state,month),available=Math.max(0,opening+income+withdrawals-deposits-r.actualTotal);
  if(assigned>available||assigned<0)throw Error('Die Zuweisung darf den bestätigten Restbetrag nicht übersteigen.');
  if(assigned&&!state.pots.some(p=>p.id===potId&&checkpointFor(p,next)))throw Error('Bitte einen vorhandenen Rücklagentopf auswählen.');
  let n=structuredClone(state);
  const ids=[],category=n.categories.find(c=>c.group==='saving')?.id||n.categories[0].id;
  if(available){
    if(projected(n,next).some(i=>i.source==='legacy-budget'))throw Error('Bitte zuerst den übernommenen Monatsrahmen im Folgemonat durch eine normale Einnahme ersetzen.');
    const carry={id:uid(),title:'Übertrag aus '+month,amount:available,type:'income',frequency:'once',start:next,end:'',category,note:'Bestätigter Monatsabschluss · vorhandener Restbetrag, kein neuer Verdienst'};
    n.items.push(carry);
    ids.push(carry.id);
    if(assigned){
      const saving={...carry,id:uid(),title:'Restbetrag in Rücklage',amount:assigned,type:'saving',potId};
      n.items.push(saving);
      ids.push(saving.id);
    }
  }
  const applied=ids.length?makeJournal(state,n):null;
  n.monthClosures??=[];
  n.monthClosures.push({month,available,assigned,opening,income,deposits,withdrawals,potId:assigned?potId:'',target:assigned?'pot':'free',signature:r.signature,at:new Date().toISOString(),itemIds:ids,...(applied?{applied}:{})});
  return validate(n);
}
export function reopenMonth(state,month){
  const c=state.monthClosures.find(c=>c.month===month);
  if(!c)throw Error('Kein Abschluss vorhanden.');
  if(state.monthClosures.some(x=>x.month===shiftMonth(month,1)))throw Error('Bitte zuerst den direkt folgenden Monatsabschluss zurücknehmen, damit Überträge konsistent bleiben.');
  const n=c.applied?undoJournal(state,c.applied):structuredClone(state);
  n.monthClosures=n.monthClosures.filter(c=>c.month!==month);
  return validate(n);
}
