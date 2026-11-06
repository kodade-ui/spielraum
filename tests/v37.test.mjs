import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blank,totals,parseBackup,validate} from '../dist/planner.js';
import {enhanceState} from '../dist/intelligence.js';
import {reconcileMonth,recordPlannedExpense} from '../dist/reconciliation.js';
import {reserveSummary} from '../dist/reserves.js';
import {createGoal,rateMonths,skipRate,resumeRate,applyRate} from '../dist/goals.js';
import {knownNames,lastUse,targetFor,byName} from '../dist/names.js';
const M='2026-11';
const base=()=>{const s=enhanceState(blank());s.items.push({id:'sal',title:'Gehalt',amount:300000,type:'income',category:'c7',frequency:'month',start:M,end:'',note:''},{id:'food',title:'Lebensmittel',amount:40000,type:'expense',category:'c1',frequency:'month',start:M,end:'',note:'',pace:'spread'});return s};

test('Names: own names newest first without duplicates or plan titles; last use picks the budget; unknown names pick nothing',()=>{
  let s=base();
  s=recordPlannedExpense(s,'food',M,{amount:1000,date:'2026-11-02',title:'Wochenmarkt'});
  s=recordPlannedExpense(s,'food',M,{amount:500,date:'2026-11-03'});
  s=recordPlannedExpense(s,'food',M,{amount:700,date:'2026-11-04',title:'Bäcker'});
  s=recordPlannedExpense(s,'food',M,{amount:900,date:'2026-11-05',title:'wochenmarkt'});
  assert.deepEqual(knownNames(s),['wochenmarkt','Bäcker']);
  assert.equal(lastUse(s,'WOCHENMARKT ').amount,900);
  const links=reconcileMonth(s,M).links;
  assert.deepEqual(targetFor(s,'Bäcker',links),{target:'food'});
  assert.equal(targetFor(s,'Kino',links),null);
  assert.deepEqual(targetFor(s,'Bäcker',reconcileMonth(s,'2027-01').links.filter(i=>i.id!=='food')),null,'Posten läuft nicht mehr: nichts vorwählen');
  const groups=byName(reconcileMonth(s,M).links.find(i=>i.id==='food').payments);
  assert.deepEqual(groups.map(g=>[g.title,g.count,g.total]),[['Wochenmarkt',2,1900],['Bäcker',1,700],['Lebensmittel',1,500]]);
});

test('Skip a fixed rate for one month: budget of the next month is free, pot misses one rate, rate runs on, resume restores',()=>{
  let s=createGoal(base(),{title:'Urlaub',price:300000,month:M,rate:{rate:25000,start:M,end:'2027-12'}});
  const pot=s.goals[0].potId,before=reserveSummary(s,'2027-03').pots.find(p=>p.id===pot).balance;
  assert.equal(rateMonths(s,pot,M,3).length,3);
  const n=skipRate(s,pot,'2027-01');
  assert.equal(totals(n,'2027-02').saving,0,'Budget Februar nicht belastet');
  assert.equal(totals(n,'2027-01').saving,25000);assert.equal(totals(n,'2027-03').saving,25000,'läuft danach weiter');
  assert.equal(reserveSummary(n,'2027-03').pots.find(p=>p.id===pot).balance,before-25000);
  assert.equal(rateMonths(n,pot,'2027-01',1)[0].skipped,true);
  assert.equal(skipRate(n,pot,'2027-01'),n,'doppelt aussetzen ändert nichts');
  assert.deepEqual(resumeRate(n,pot,'2027-01').skips,s.skips);
  assert.throws(()=>skipRate(applyRate(s,{potId:pot,title:'Urlaub',rate:0,start:M}),pot,M),/keine feste Rate/);
  assert.doesNotThrow(()=>parseBackup(JSON.stringify(n)));
});

test('Account base for the balance check is optional, integer cents, may be negative; nonsense is rejected',()=>{
  const s=base();
  for(const v of [0,-12345,250000]){const n=structuredClone(s);n.settings.accountBase=v;assert.doesNotThrow(()=>validate(n))}
  for(const v of [1.5,'100',1e15]){const n=structuredClone(s);n.settings.accountBase=v;assert.throws(()=>validate(n))}
});
