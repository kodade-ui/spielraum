import {euro} from './planner.js';
// One set of amounts drives both graphics. Deficits are explicit, never a negative slice.
export function reconciliationBreakdown(r){
  const free=Math.max(0,r.afterOpen),deficit=Math.max(0,-r.afterOpen);
  const segments=[
  {key:'spent',label:'Ausgegeben',value:r.actualTotal,color:'#4b5660'},
  {key:'bills',label:'Rechnungen offen',value:r.fixedOpen,color:'#ad893b'},
  {key:'budgets',label:'Budgets übrig',value:r.variableOpen,color:'#607985'},
  {key:'saving',label:'Sparen & Rücklagen',value:r.plannedSaving,color:'#71668b'},
  {key:'free',label:'Frei verfügbar',value:free,color:'#315d54'}
  ];
  const total=segments.reduce((n,s)=>n+s.value,0),remaining=Math.max(0,r.afterRecorded),covered=Math.min(remaining,r.planOpen),uncovered=Math.max(0,r.planOpen-remaining);
  return {segments,total,free,deficit,covered,uncovered,restTotal:Math.max(remaining,r.planOpen),freePercent:r.availableIncome>0?Math.max(0,Math.min(100,Math.round(free/r.availableIncome*100))):0};
}

export function renderReconciliationGraphics(r){
  const v=reconciliationBreakdown(r);
  let offset=0;
  const arcs=v.segments.filter(s=>s.value>0).map(s=>{
    const share=s.value/v.total*100,gap=Math.min(.8,share*.12),arc=`<circle class="interactive-arc" role="button" tabindex="0" data-action="spending-flow" data-id="${s.key}" aria-label="${s.label}: ${euro(s.value)}" cx="100" cy="100" r="79" fill="none" stroke="${s.color}" stroke-width="19" pathLength="100" stroke-dasharray="${share-gap} ${100-share+gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"/>`;
    offset+=share;
    return arc;
  }).join('');
  const label=v.segments.map(s=>`${s.label}: ${euro(s.value)}`).join('; ')+(v.deficit?`; Fehlbetrag: ${euro(v.deficit)}`:'');
  return `<section class="reconcile-visual" aria-label="Grafische Monatsübersicht"><div class="reconcile-visual-heading"><h3>${v.deficit?'Dein Monatsbedarf':'Dein Monat auf einen Blick'}</h3><span>${v.deficit?'Bedarf über dem Rahmen':'So verteilt sich Dein Rahmen'}</span></div><div class="reconcile-visual-grid"><div class="reconcile-donut" role="group" aria-label="${label}"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="79" fill="none" stroke="#ddd9cf" stroke-width="19"/>${arcs}</svg><div class="reconcile-donut-center"><strong class="${v.deficit?'negative':''}">${v.deficit?'!':v.total?v.freePercent+' %':'—'}</strong><span>${v.deficit?'Unterdeckung':v.total?'frei verfügbar':'Noch kein Plan'}</span></div></div><dl class="reconcile-legend">${v.segments.map(s=>`<div data-budget-segment="${s.key}"><dt><button data-action="spending-flow" data-id="${s.key}"><i style="background:${s.color}" aria-hidden="true"></i>${s.label}</button></dt><dd>${euro(s.value)}</dd></div>`).join('')}</dl></div>${v.deficit?`<p class="reconcile-deficit"><strong>${euro(v.deficit)} fehlen</strong>, um die erfassten Ausgaben, Sparbeträge und offenen Budgets zu decken.</p>`:''}<p class="reconcile-chart-note">${r.unlinked.length?'Vorläufig: Es gibt noch nicht zugeordnete Ausgaben; der offene Betrag kann dadurch zu hoch sein. ':''}Offene Rechnungen und unverbrauchte Budgets sind getrennt ausgewiesen. Sparbeträge sind bereits reserviert.${v.deficit?' Der Ring zeigt die Aufteilung des Bedarfs.':''}</p></section>`;
}

export function renderRemainingGraphic(r){
  const v=reconciliationBreakdown(r),parts=[{label:'Für offene Posten gebunden',value:v.covered,color:'#ad893b',key:'bound'},{label:'Frei verfügbar',value:v.free,color:'#315d54',key:'free'},{label:'Offene Posten ohne Deckung',value:v.uncovered,color:'#a04f43',key:'uncovered'}];
  return `<div class="reconcile-rest-graphic"><div class="reconcile-rest-heading"><span>Was vom Rest wirklich frei ist</span></div><div class="reconcile-rest-track" role="img" aria-label="${parts.map(p=>p.label+': '+euro(p.value)).join('; ')}">${parts.filter(p=>p.value>0).map(p=>`<span class="rest-${p.key}" style="width:${p.value/v.restTotal*100}%;background-color:${p.color}"></span>`).join('')}</div><div class="reconcile-rest-labels"><span><i class="rest-bound-dot" aria-hidden="true"></i>${euro(v.covered)} gebunden</span><span><i class="rest-free-dot" aria-hidden="true"></i>${euro(v.free)} frei</span>${v.uncovered?`<span class="negative"><i class="rest-gap-dot" aria-hidden="true"></i>${euro(v.uncovered)} nicht gedeckt</span>`:''}</div></div>`;
}
