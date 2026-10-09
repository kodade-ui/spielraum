// Bereich „Jahr“ (ab 3.1): zwölf Monate im Überblick mit Sonderzahlungen, Abos & Verträge, Rückblick auf den Vormonat.
// Rechnet nur über vorhandene Fachfunktionen: forecast/totals (Plan) und reconcileMonth (Plan gegen erfasste Käufe).
import {euro,amountText,monthName,shiftMonth,validMonth,forecast,legacyAnnual} from './planner.js';
import {reconcileMonth} from './reconciliation.js';
import {paceFor} from './intelligence.js';
import {themeColor} from './theme.js';

const MONTHS=12;
// Auch Posten in variablen Kategorien zählen als Vertrag, wenn der Name eindeutig danach klingt (z. B. „Handyvertrag“ unter Sonstiges).
const CONTRACT_WORDS=/abo|vertrag|mitglied|beitrag|versicherung|handy|mobilfunk|lizenz|gebühr|miete|leasing|rate\b/i;
export function createYearUI(ctx){
  const {esc,icon}=ctx;
  const S=()=>ctx.state,M=()=>ctx.month;
  let pick=null;
  const fmt=(m,o)=>new Intl.DateTimeFormat('de-DE',o).format(new Date(m+'-01T12:00:00')).replace('.','');
  const mon=m=>fmt(m,{month:'short'});
  const short=m=>fmt(m,{month:'short',year:'numeric'});
  const money2=v=>{const [w,c]=amountText(v).split(',');return `${w},<small>${c} €</small>`};
  const rhythm=i=>legacyAnnual(i)?'jährlich, bisher als Monatsanteil':i.frequency==='year'?'jährlich im '+fmt(i.cycleStart||i.start,{month:'long'}):i.frequency==='quarter'?'alle 3 Monate':i.frequency==='once'?'einmalig':'monatlich';
  // Sonderzahlungen: alles, was nicht jeden Monat gleich anfällt. Einmalige Abweichungen eines Monatspostens (groupId) zählen nicht dazu.
  const special=p=>p.items.filter(i=>i.type==='expense'&&!legacyAnnual(i)&&(i.frequency==='quarter'||i.frequency==='year'||(i.frequency==='once'&&!i.groupId))).sort((a,b)=>b.monthlyAmount-a.monthlyAmount);
  const median=vals=>{const v=[...vals].sort((a,b)=>a-b),h=v.length>>1;return v.length%2?v[h]:Math.round((v[h-1]+v[h])/2)};

  function chart(points,sel){
    const vals=points.map(p=>p.remaining),max=Math.max(0,...vals),min=Math.min(0,...vals),range=max-min||1,zero=-min/range*100;
    return `<div class="ybars" style="--zero:${zero.toFixed(2)}%" role="group" aria-label="Frei pro Monat">${points.map(p=>{
      const sp=special(p).length,h=Math.abs(p.remaining)/range*100;
      return `<button class="ybar${p.remaining<0?' is-neg':''}${p.month===sel?' on':''}" style="--h:${h.toFixed(2)}%" data-action="year-pick" data-month="${p.month}" aria-pressed="${p.month===sel}" aria-label="${esc(monthName(p.month))}: ${euro(p.remaining)} frei${sp?', '+sp+(sp>1?' Sonderzahlungen':' Sonderzahlung'):''}"><span class="ybar-track"><i></i>${sp?'<b class="ybar-peak"></b>':''}</span><small>${esc(mon(p.month))}</small></button>`;
    }).join('')}</div>`;
  }

  function detail(p,typical){
    const sp=special(p),diff=p.remaining-typical;
    return `<section class="ydetail"><div class="ydetail-head"><div><p class="ydetail-month">${esc(monthName(p.month))}</p><p class="ydetail-value ${p.remaining<0?'is-negative':''}">${euro(p.remaining)} <span>frei</span></p>${Math.abs(diff)>=100&&typical>0?`<p class="ydetail-diff ${diff<0?'is-negative':''}">${diff<0?euro(-diff)+' weniger':euro(diff)+' mehr'} als in einem üblichen Monat</p>`:''}</div><button class="textbtn" data-action="year-open" data-month="${p.month}">Öffnen${icon('right')}</button></div><div class="figures"><div><span>Einnahmen</span><b>${euro(p.income)}</b></div><div><span>Ausgaben</span><b>${euro(p.spending)}</b></div><div><span>Sparen</span><b>${euro(p.saving)}</b></div></div>${sp.length?`<ul class="rows compact">${sp.map(i=>`<li class="row is-plain"><button class="row-main" data-action="edit-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${esc(rhythm(i))}</span></button><span class="row-amount">${euro(i.monthlyAmount)}</span></li>`).join('')}</ul>`:'<p class="helper">Keine Sonderzahlungen, nur laufende Posten.</p>'}</section>`;
  }

  // Abos & Verträge: wiederkehrende feste Ausgaben, je Gruppe die Version, die im gewählten Monat gilt (sonst die nächste).
  function contracts(){
    const m=M(),groups=new Map();
    for(const i of S().items){
      if(i.type!=='expense'||i.frequency==='once'||i.source||(i.end&&i.end<m))continue;
      const key=i.groupId||i.id,now=i.start<=m,cur=groups.get(key);
      if(!cur||(now&&!cur.now)||(now&&cur.now&&i.start>cur.i.start)||(!now&&!cur.now&&i.start<cur.i.start))groups.set(key,{i,now});
    }
    return [...groups.values()].map(x=>x.i).filter(i=>paceFor(S(),i)==='fixed'||CONTRACT_WORDS.test(i.title)).map(i=>({...i,yearly:legacyAnnual(i)||i.frequency==='year'?i.amount:i.frequency==='quarter'?i.amount*4:i.amount*12})).sort((a,b)=>b.yearly-a.yearly||a.title.localeCompare(b.title,'de'));
  }
  function contractsHTML(){
    const list=contracts(),total=list.reduce((n,i)=>n+i.yearly,0),m=M();
    if(!list.length)return `<section class="group"><header class="group-head"><h2>Abos & Verträge</h2></header><p class="helper group-note">Sobald Du feste, wiederkehrende Ausgaben planst (Miete, Handy, Streaming, Versicherungen), siehst Du hier, was sie im Jahr kosten.</p></section>`;
    return `<section class="group"><header class="group-head"><h2>Abos & Verträge</h2><span>${euro(total)} im Jahr</span></header><ul class="rows">${list.map(i=>`<li class="row"><button class="row-main" data-action="edit-item" data-id="${i.id}"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${legacyAnnual(i)||i.frequency==='year'?esc(rhythm(i)):euro(i.amount)+' '+esc(rhythm(i))}${i.start>m?' · ab '+esc(short(i.start)):''}${i.end?' · bis '+esc(short(i.end)):''}</span></button><span class="row-amount">${euro(i.yearly)}<small>im Jahr</small></span></li>`).join('')}</ul><p class="helper group-note">Rund ${euro(Math.round(total/12))} im Monat. Feste, wiederkehrende Ausgaben; variable Budgets wie Lebensmittel zählen nicht dazu.</p></section>`;
  }

  // Rückblick: Plan gegen erfasste Käufe im Monat vor dem gewählten.
  function review(){
    const prev=shiftMonth(M(),-1);
    if(!validMonth(prev))return '';
    const r=reconcileMonth(S(),prev);
    if(!r.planTotal&&!r.actualTotal)return '';
    const head=`<header class="group-head"><h2>Rückblick ${esc(monthName(prev))}</h2><button class="textbtn small" data-action="year-open" data-month="${prev}">Öffnen</button></header>`;
    if(!r.expenses.length)return `<section class="group">${head}<p class="helper group-note">Für ${esc(monthName(prev))} sind keine Käufe erfasst. Geplant waren ${euro(r.planTotal)} Ausgaben.</p></section>`;
    const diff=r.actualTotal-r.planTotal,open=r.links.filter(i=>i.budgetKind==='fixed'&&i.open>0&&!i.paid);
    const cats=[...r.categories].sort((a,b)=>(b.spent-b.planned)-(a.spent-a.planned));
    return `<section class="group">${head}<div class="figures"><div><span>Geplant</span><b>${euro(r.planTotal)}</b></div><div><span>Ausgegeben</span><b>${euro(r.actualTotal)}</b></div><div><span>${diff>0?'Über Plan':'Unter Plan'}</span><b class="${diff>0?'is-negative':'is-positive'}">${euro(Math.abs(diff))}</b></div></div><ul class="rows">${cats.map(c=>{const over=c.spent>c.planned,pct=c.planned?Math.min(100,c.spent/c.planned*100):100;return `<li class="row review-row"><div class="row-main"><span class="row-title">${esc(c.name)}</span><span class="meter${over?' is-over':''}" style="--c:${themeColor(c.color)}"><span style="width:${pct.toFixed(1)}%"></span></span></div><span class="row-amount">${euro(c.spent)}<small>${c.planned?'von '+euro(c.planned):'ungeplant'}</small></span></li>`}).join('')}</ul>${open.length?`<p class="helper group-note">${open.length===1?'Eine Rechnung über':open.length+' Rechnungen über zusammen'} ${euro(open.reduce((n,i)=>n+i.open,0))} ${open.length===1?'ist':'sind'} nicht abgehakt (${esc(open.slice(0,3).map(i=>i.title).join(', '))}${open.length>3?' …':''}). Sie fehlen bei „Ausgegeben“.</p>`:''}</section>`;
  }

  function render(){
    // „Frei“ wie im Bereich Monat: nach erfassten Käufen und offenen Planposten (für künftige Monate gleich dem Planüberschuss).
    const points=forecast(S(),M(),MONTHS).map(p=>{const free=reconcileMonth(S(),p.month).afterOpen;return {...p,remaining:free,spending:p.income-p.saving-free}});
    if(!points.some(p=>p.income||p.planned))return `<section class="hero"><p class="hero-label">Dein Jahr</p><p class="hero-sub">Sobald Du Einnahmen und Ausgaben planst, siehst Du hier die nächsten zwölf Monate: welche Monate knapp werden und was Deine Verträge im Jahr kosten.</p></section>${contractsHTML()}`;
    if(!points.some(p=>p.month===pick))pick=points[0].month;
    const sum=points.reduce((n,p)=>n+p.remaining,0),low=points.reduce((a,p)=>p.remaining<a.remaining?p:a,points[0]),typical=median(points.map(p=>p.remaining)),sel=points.find(p=>p.month===pick);
    const peaks=points.filter(p=>special(p).length).length;
    return `<section class="hero"><p class="hero-label">Frei in 12 Monaten · ${esc(short(points[0].month))}–${esc(short(points.at(-1).month))}</p><p class="hero-value ${sum<0?'is-negative':''}">${money2(sum)}</p><p class="hero-sub">Knappster Monat: ${esc(monthName(low.month))} mit <b class="${low.remaining<0?'is-negative':''}">${euro(low.remaining)}</b></p></section>
<section class="ycard">${chart(points,pick)}<p class="ylegend"><span><i class="ylegend-bar"></i>Frei im Monat</span>${peaks?'<span><i class="ylegend-peak"></i>Sonderzahlung</span>':''}</p>${detail(sel,typical)}</section>
${contractsHTML()}
${review()}
<p class="helper group-note">Planwerte aus Deinem Monatsplan, kein Kontostand. Die Summe oben addiert, was in den zwölf Monaten jeweils frei bleibt.</p>`;
  }

  const actions={
    'year-pick':el=>{pick=el.dataset.month;ctx.render()},
    'year-open':el=>ctx.openMonth(el.dataset.month)
  };
  return {render,actions,contracts,special};
}
