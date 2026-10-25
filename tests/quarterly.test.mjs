import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blank,totals,upsertItem,removeItem,parseBackup} from '../dist/planner.js';
import {enhanceState} from '../dist/intelligence.js';
import {createPot,reserveSummary} from '../dist/reserves.js';
import {reconcileMonth,recordPlannedExpense} from '../dist/reconciliation.js';
const item=(id,amount,type='expense',frequency='quarter',start='2026-11')=>({id,title:id,amount,type,frequency,start,end:'',category:'c1',note:''});
test('Quarterly charges occur in full every third month across years, respect end and skip, and survive backup',()=>{
 const s=enhanceState(blank());s.items=[item('GEZ',6000)];
 for(const [m,amount] of [['2026-10',0],['2026-11',6000],['2026-12',0],['2027-01',0],['2027-02',6000],['2027-05',6000]])assert.equal(totals(s,m).expense,amount,m);
 s.items[0].end='2027-02';assert.equal(totals(s,'2027-05').expense,0);s.skips.push('GEZ@2027-02');assert.equal(totals(s,'2027-02').expense,0);
 assert.deepEqual(parseBackup(JSON.stringify(s)),s);
 assert.throws(()=>recordPlannedExpense(s,'GEZ','2026-12',{complete:true,date:'2026-12-02'}),/nicht mehr aktiv/);
 const n=recordPlannedExpense(s,'GEZ','2026-11',{complete:true,date:'2026-11-02'});assert.equal(n.actualExpenses[0].amount,6000);
});
test('Revisions in intermediate months retain the original quarterly phase and past amounts',()=>{
 let s=enhanceState(blank());s.items=[item('GEZ',6000)];s=upsertItem(s,{...s.items[0],start:'2026-12',amount:7000},'GEZ','2026-12');
 assert.equal(totals(s,'2026-11').expense,6000);assert.equal(totals(s,'2026-12').expense,0);assert.equal(totals(s,'2027-02').expense,7000);
 const revision=s.items.find(x=>x.start==='2026-12');assert.equal(revision.cycleStart,'2026-11');assert.deepEqual(parseBackup(JSON.stringify(s)),s);
 const once=upsertItem(s,{...revision,amount:8000},revision.id,'2027-02','once');assert.equal(totals(once,'2027-02').expense,8000);assert.equal(totals(once,'2027-05').expense,7000);
 const removed=removeItem(s,revision.id,'2027-02');assert.equal(totals(removed,'2026-11').expense,6000);assert.equal(totals(removed,'2027-02').expense,0);
});
test('Quarterly pot deposits accrue only in payment months and annual provisions remain monthly',()=>{
 let s=createPot(enhanceState(blank()),{name:'Rücklage',balance:10000,month:'2026-11'});s.items=[{...item('Sparen',3000,'saving'),potId:s.pots[0].id},item('Jahresbeitrag',12000,'expense','year')];
 assert.equal(reserveSummary(s,'2026-11').balance,13000);assert.equal(reserveSummary(s,'2027-01').balance,13000);assert.equal(reserveSummary(s,'2027-02').balance,16000);assert.equal(totals(s,'2027-01').expense,1000);
});
test('Reconciliation starts with income separately from pot withdrawals and combines recorded, reserved and open amounts',()=>{
 let s=createPot(enhanceState(blank()),{name:'Urlaub',balance:100000,month:'2026-10'});s.items=[item('Gehalt',300000,'income','month','2026-10'),{...item('Entnahme',50000,'income','month','2026-10'),potId:s.pots[0].id},item('Sparen',20000,'saving','month','2026-10'),item('Lebensmittel',40000,'expense','month','2026-10')];
 s=recordPlannedExpense(s,'Lebensmittel','2026-10',{amount:10000,date:'2026-10-02'});
 let r=reconcileMonth(s,'2026-10');assert.equal(r.budgetIncome,300000);assert.equal(r.afterRecorded,340000);assert.equal(r.planOpen,30000);assert.equal(r.afterOpen,310000);
 s=recordPlannedExpense(s,'Lebensmittel','2026-10',{complete:true,date:'2026-10-03'});r=reconcileMonth(s,'2026-10');assert.equal(r.afterRecorded,310000);assert.equal(r.planOpen,0);assert.equal(r.afterOpen,310000);
});
