import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blank,totals,validate,parseBackup} from '../dist/planner.js';
import {enhanceState} from '../dist/intelligence.js';
import {saveGoal} from '../dist/goals.js';
import {reserveSummary} from '../dist/reserves.js';
import {wishOrder,planWishes,applyWishPlan,MAX_PLAN_MONTHS} from '../dist/wishplan.js';
const start='2027-01';
function setup(){let s=enhanceState(blank());s.items=[{id:'salary',title:'Gehalt',amount:300000,type:'income',category:'c7',frequency:'month',start:'2026-10',end:'',note:''}];for(const [t,p,d] of [['Fahrrad',150000,''],['Espresso',90000,'2027-05'],['Reise',100000,'']])s=saveGoal(s,{title:t,price:p,deadline:d,potId:'',status:'active',note:''});return s;}

test('Wishes are scheduled one after another with whole months and a rate that never exceeds the monthly amount',()=>{
  const s=setup(),rows=planWishes(wishOrder(s),40000,start);
  assert.deepEqual(rows.map(r=>[r.goal.title,r.start,r.end,r.months,r.rate]),[['Fahrrad','2027-01','2027-04',4,37500],['Espresso','2027-05','2027-07',3,30000],['Reise','2027-08','2027-10',3,33400]]);
  for(const r of rows){assert.ok(r.rate<=40000);assert.ok(r.rate*r.months>=r.goal.price);assert.ok(r.rate*(r.months-1)<r.goal.price);}
  assert.equal(rows[1].late,2);assert.equal(rows[0].late,0);
});

test('Stored order wins, unknown and stale ids are ignored, new wishes are appended',()=>{
  const s=setup(),[a,b,c]=s.goals.map(g=>g.id);s.settings.wishPlan={monthly:40000,order:[c,'geloescht',a]};validate(s);
  assert.deepEqual(wishOrder(s).map(g=>g.title),['Reise','Fahrrad','Espresso']);
  s.goals[0].potId='';s.goals[0].status='done';assert.deepEqual(wishOrder(s).map(g=>g.title),['Reise','Espresso']);
});

test('Invalid wish plan settings are rejected by validation',()=>{
  const s=setup();
  for(const bad of [{monthly:-1,order:[]},{monthly:100,order:'x'},{monthly:100,order:['a b']},[],{order:[]}]){const n=structuredClone(s);n.settings.wishPlan=bad;assert.throws(()=>validate(n));}
});

test('Applying creates one pot, deadline and saving rate per wish as a single state change; current month untouched',()=>{
  const s=setup(),before=totals(s,'2026-12'),rows=planWishes(wishOrder(s),40000,start),n=applyWishPlan(s,rows);
  assert.equal(n.pots.length,3);assert.deepEqual(totals(n,'2026-12'),before);
  for(const r of rows){const g=n.goals.find(x=>x.id===r.goal.id),items=n.items.filter(i=>i.potId===g.potId);assert.equal(g.deadline,r.end);assert.equal(items.length,1);assert.equal(items[0].amount,r.rate);assert.equal(items[0].start,r.start);assert.equal(items[0].end,r.end);assert.ok(reserveSummary(n,r.end).pots.find(p=>p.id===g.potId).balance>=g.price);}
  for(const m of ['2027-01','2027-04','2027-05','2027-10'])assert.ok(totals(n,m).saving<=40000);
  assert.equal(totals(n,'2027-11').saving,0);
  assert.equal(wishOrder(n).length,0);assert.throws(()=>applyWishPlan(n,rows),/läuft bereits/);
  assert.ok(parseBackup(JSON.stringify(n)));
});

test('A one-month wish becomes a single payment; overly long plans and tiny amounts are refused',()=>{
  let s=enhanceState(blank());s=saveGoal(s,{title:'Kopfhörer',price:12000,deadline:'',potId:'',status:'active',note:''});
  const rows=planWishes(wishOrder(s),20000,start),n=applyWishPlan(s,rows),item=n.items.at(-1);
  assert.equal(rows[0].months,1);assert.equal(item.frequency,'once');assert.equal(item.amount,12000);
  s=saveGoal(s,{title:'Haus',price:50000000,deadline:'',potId:'',status:'active',note:''});
  const long=planWishes(wishOrder(s),10000,start);assert.ok(long.at(-1).tooLong);assert.throws(()=>applyWishPlan(s,long),new RegExp(String(MAX_PLAN_MONTHS/12)));
  assert.throws(()=>planWishes(wishOrder(s),50,start));
});
