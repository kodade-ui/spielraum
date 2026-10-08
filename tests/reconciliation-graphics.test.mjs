import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blank,parseBackup} from '../dist/planner.js';
import {enhanceState} from '../dist/intelligence.js';
import {createPot} from '../dist/reserves.js';
import {reconcileMonth,recordPlannedExpense} from '../dist/reconciliation.js';
import {reconciliationBreakdown,renderReconciliationGraphics,renderRemainingGraphic} from '../dist/reconciliation-graphics.js';
const month='2026-10';
const item=(id,amount,type='expense')=>({id,title:id,amount,type,category:'c1',frequency:'month',start:month,end:'',note:''});
function setup(){const s=createPot(enhanceState(blank()),{name:'Puffer',balance:80000,month});s.items=[item('Gehalt',292500,'income'),{...item('Entnahme',2000,'income'),potId:s.pots[0].id},item('Miete',80000),item('Lebensmittel',40000),item('Sparrate',40000,'saving')];return s;}
test('Separate income sources fund one consistent allocation; payment moves open to spent without changing free money',()=>{
 let s=recordPlannedExpense(setup(),'Lebensmittel',month,{amount:10000,date:month+'-03'});const before=JSON.stringify(s);let r=reconcileMonth(s,month),v=reconciliationBreakdown(r);
 assert.equal(r.budgetIncome,292500);assert.equal(r.reserveWithdrawals,2000);assert.equal(r.availableIncome,294500);assert.deepEqual(r.incomeSources.map(i=>i.title),['Gehalt']);assert.equal(r.afterRecorded,244500);assert.equal(r.planOpen,110000);assert.equal(r.afterOpen,134500);assert.equal(v.total,294500);assert.equal(v.covered+v.free+v.uncovered,v.restTotal);assert.equal(v.free,134500);assert.equal(JSON.stringify(s),before);
 s=recordPlannedExpense(s,'Miete',month,{complete:true,date:month+'-03'});r=reconcileMonth(s,month);v=reconciliationBreakdown(r);assert.equal(r.actualTotal,90000);assert.equal(r.planOpen,30000);assert.equal(v.free,134500);assert.equal(v.total,294500);assert.deepEqual(parseBackup(JSON.stringify(s)),s);
 // A journal copy of salary/transfer is not a second source of planned money.
 s.actualExpenses.push({id:'income-record',title:'Gehalt',kind:'income',amount:292500,category:'c1',date:month+'-01',note:''});assert.equal(reconcileMonth(s,month).availableIncome,294500);
});
test('Empty, zero-income, deficit and overspent months produce explicit finite graphics',()=>{
 const s=enhanceState(blank());let r=reconcileMonth(s,month);assert.equal(reconciliationBreakdown(r).total,0);assert.match(renderReconciliationGraphics(r),/Noch kein Plan/);
 s.items=[item('Miete',80000)];r=reconcileMonth(s,month);let v=reconciliationBreakdown(r);assert.equal(v.deficit,80000);assert.equal(v.free,0);assert.equal(v.uncovered,80000);assert.match(renderRemainingGraphic(r),/rest-uncovered/);
 let n=recordPlannedExpense(s,'Miete',month,{amount:90000,date:month+'-03'});r=reconcileMonth(n,month);v=reconciliationBreakdown(r);assert.equal(v.deficit,90000);assert.equal(v.restTotal,0);assert.match(renderReconciliationGraphics(r),/900,00/);
 for(const sample of [reconcileMonth(enhanceState(blank()),month),reconcileMonth(s,month),r]){const html=renderReconciliationGraphics(sample)+renderRemainingGraphic(sample);assert.doesNotMatch(html,/NaN|Infinity|width:-/);assert.match(html,/role="img"/);}
});
