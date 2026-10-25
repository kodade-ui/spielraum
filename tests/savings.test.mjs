import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blank,totals,shiftMonth} from '../dist/planner.js';
import {enhanceState} from '../dist/intelligence.js';
import {createPot,reserveSummary} from '../dist/reserves.js';
import {createGoal,planRate,applyRate,addDeposit,ensureGoalPot,potRate,saveGoal} from '../dist/goals.js';
import {sinkingCandidates,sinkingOptions,applySinking,sinkingStatus} from '../dist/sinking.js';
const M='2026-10';
const base=()=>{const s=enhanceState(blank());s.items.push({id:'sal',title:'Gehalt',amount:300000,type:'income',category:'c7',frequency:'month',start:M,end:'',note:''});return s};
const bal=(s,id,m)=>reserveSummary(s,m).pots.find(p=>p.id===id).balance;

test('Deadline gives the rate, rate gives the deadline; existing money counts, rates are whole euros',()=>{
  const s=base();
  assert.deepEqual(planRate(s,{price:250000,start:M,deadline:'2027-07',saved:100000}),{rate:15000,end:'2027-07',months:10,done:false,tooLong:false});
  assert.deepEqual(planRate(s,{price:100000,start:M,deadline:'2027-02',saved:0}),{rate:20000,end:'2027-02',months:5,done:false,tooLong:false});
  assert.deepEqual(planRate(s,{price:100001,start:M,deadline:'2027-02',saved:0}).rate,20100);
  assert.deepEqual(planRate(s,{price:250000,start:M,rate:15000,saved:100000}),{rate:15000,end:'2027-07',months:10,done:false});
  assert.equal(planRate(s,{price:50000,start:M,rate:10000,saved:50000}).done,true);
  assert.equal(planRate(s,{price:10000000,start:M,rate:100}).tooLong,true);
  assert.throws(()=>planRate(s,{price:1000,start:M,deadline:'2026-09'}),/Termin/);
});
test('A new goal creates pot, existing balance and optional fixed rate in one step; plan reaches the price',()=>{
  let s=createGoal(base(),{title:'Rundreise',price:250000,saved:100000,month:M,rate:{rate:15000,start:M,end:'2027-07'}});
  const g=s.goals[0];
  assert.equal(g.deadline,'2027-07');assert.equal(bal(s,g.potId,M),115000);assert.equal(bal(s,g.potId,'2027-07'),250000);assert.equal(bal(s,g.potId,'2027-08'),250000);
  assert.equal(totals(s,M).saving,15000);assert.equal(totals(s,M).income,300000,'existing money is not income');
  s=createGoal(s,{title:'Lampe',price:9000,month:M});assert.equal(s.goals[1].deadline,'');assert.equal(totals(s,M).saving,15000,'flexible goal adds no rate');
});
test('Changing the rate from a later month keeps earlier months; stopping ends it; deposits are one-off',()=>{
  let s=createGoal(base(),{title:'Auto',price:600000,month:M,rate:{rate:20000,start:M,end:'2028-12'}});
  const id=s.goals[0].potId,nov=shiftMonth(M,1);
  const plan=planRate(s,{potId:id,price:600000,start:nov,rate:30000});
  s=applyRate(s,{potId:id,title:'Auto',rate:30000,start:nov,end:plan.end});
  assert.equal(totals(s,M).saving,20000);assert.equal(totals(s,nov).saving,30000);assert.equal(potRate(s,id,M).amount,20000);assert.equal(potRate(s,id,nov).amount,30000);
  assert.equal(bal(s,id,plan.end)>=600000,true);assert.equal(bal(s,id,shiftMonth(plan.end,-1))<600000,true);
  s=applyRate(s,{potId:id,title:'Auto',rate:0,start:'2027-01'});
  assert.equal(totals(s,'2027-01').saving,0);assert.equal(totals(s,'2026-12').saving,30000);
  s=addDeposit(s,{potId:id,title:'Auto',amount:5000,month:'2027-02'});
  assert.equal(totals(s,'2027-02').saving,5000);assert.equal(totals(s,'2027-03').saving,0);
});
test('A goal without pot (old wish) gets one on first money; the rate then starts there',()=>{
  let s=saveGoal(base(),{title:'Kamera',price:120000,deadline:'',potId:'',note:'',status:'active'});
  const r=ensureGoalPot(s,s.goals[0].id,M,30000);
  assert.ok(r.potId);assert.equal(r.state.goals[0].potId,r.potId);assert.equal(bal(r.state,r.potId,M),30000);
  assert.equal(ensureGoalPot(r.state,s.goals[0].id,M).potId,r.potId,'no second pot');
});
test('Annual cost is smoothed: monthly rate, withdrawal in the payment month, the month no longer dips',()=>{
  let s=base();
  s.items.push({id:'ins',title:'Versicherung',amount:60000,type:'expense',category:'c6',frequency:'year',annualPayment:true,cycleStart:'2027-03',start:'2027-03',end:'',note:''});
  s.items.push({id:'water',title:'Wasser',amount:9000,type:'expense',category:'c0',frequency:'quarter',cycleStart:'2026-11',start:'2026-11',end:'',note:''});
  s.items.push({id:'old',title:'Alt',amount:12000,type:'expense',category:'c0',frequency:'year',start:'2026-01',end:'',note:''});
  const c=sinkingCandidates(s,M);
  assert.deepEqual(c.map(x=>[x.key,x.next,x.monthly]),[['ins','2027-03',5000],['water','2026-11',3000]],'legacy monthly share is not offered');
  assert.deepEqual(sinkingOptions(c[0],M),{months:6,regular:5000,catchUp:10000,onlyLater:false,laterStart:'2027-04',firstLater:'2028-03'});
  const marchBefore=totals(s,'2027-03').remaining;
  let n=applySinking(s,c[0],M,{mode:'now'});const pid=n.pots.at(-1).id;
  assert.equal(totals(n,'2027-03').remaining,marchBefore+60000-10000);
  assert.equal(bal(n,pid,'2027-02'),50000);assert.equal(bal(n,pid,'2027-03'),0);assert.equal(bal(n,pid,'2028-03'),0);
  assert.equal(totals(n,'2027-04').saving,5000);
  assert.deepEqual(sinkingStatus(n,pid,M),{month:'2027-03',title:'Versicherung',amount:60000,before:60000,short:0});
  assert.ok(!sinkingCandidates(n,M).some(x=>x.key==='ins'));
  n=applySinking(s,c[0],M,{mode:'later'});const p2=n.pots.at(-1).id;
  assert.equal(totals(n,'2027-03').remaining,marchBefore,'next payment still from the month, nothing changes before');
  assert.equal(totals(n,M).saving,0);assert.equal(totals(n,'2027-04').saving,5000);assert.equal(bal(n,p2,'2028-02'),55000);assert.equal(bal(n,p2,'2028-03'),0);
});
test('A payment due this month is only smoothed from the next cycle',()=>{
  const s=base();s.items.push({id:'q',title:'Kfz',amount:18000,type:'expense',category:'c6',frequency:'quarter',cycleStart:M,start:M,end:'',note:''});
  const c=sinkingCandidates(s,M)[0],o=sinkingOptions(c,M);assert.equal(o.onlyLater,true);
  const before=totals(s,M).remaining,n=applySinking(s,c,M,{mode:'now'}),pid=n.pots.at(-1).id;
  assert.equal(totals(n,M).remaining,before);assert.equal(totals(n,'2026-11').saving,6000);assert.equal(bal(n,pid,'2027-01'),0);assert.equal(totals(n,'2027-01').remaining,totals(s,'2027-01').remaining+18000-6000);
});
test('A payment due before the first rate month is only smoothed from the next cycle',()=>{
  const s=base();s.items.push({id:'q',title:'Kfz',amount:18000,type:'expense',category:'c6',frequency:'quarter',cycleStart:M,start:M,end:'',note:''});
  const c=sinkingCandidates(s,M)[0],next=shiftMonth(M,1),o=sinkingOptions(c,next);
  assert.equal(o.onlyLater,true);assert.ok(Number.isFinite(o.catchUp));
  const n=applySinking(s,c,next,{mode:'now'}),pid=n.pots.at(-1).id;
  assert.equal(totals(n,M).remaining,totals(s,M).remaining);assert.equal(totals(n,next).saving,6000);assert.equal(bal(n,pid,'2027-01'),0);
});
test('Backups with covers and dismissed suggestions validate; broken links are rejected',async()=>{
  const {validate}=await import('../dist/planner.js');
  let s=base();s=createPot(s,{name:'R',month:M,balance:0});const pid=s.pots[0].id;
  s.items.push({id:'w',title:'X aus Rücklage',amount:100,type:'income',category:'c7',frequency:'month',start:M,end:'',note:'',potId:pid,covers:'ins'});
  s.settings.sinkingDismissed=['ins'];
  assert.doesNotThrow(()=>validate(structuredClone(s)));
  const bad=structuredClone(s);bad.items.at(-1).type='saving';assert.throws(()=>validate(bad));
  const bad2=structuredClone(s);bad2.settings.sinkingDismissed=['a b'];assert.throws(()=>validate(bad2));
});
