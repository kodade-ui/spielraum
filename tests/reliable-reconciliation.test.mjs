import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blank,totals,upsertItem,removeItem,parseBackup,validate} from '../dist/planner.js';
import {enhanceState} from '../dist/intelligence.js';
import {reconcileMonth,recordPlannedExpense,saveEntryClassification} from '../dist/reconciliation.js';
import {createPot,reserveSummary,paymentSchedule} from '../dist/reserves.js';
import {newVariant,saveDecision,evaluateScenario,adoptScenario,undoScenario} from '../dist/scenarios.js';
const item=(id,amount,extra={})=>({id,title:id,amount,type:'expense',frequency:'month',category:'c1',start:'2026-09',end:'',note:'',...extra});
function setup(){const s=enhanceState(blank());s.items=[item('food',40000),item('rent',90000,{category:'c0'})];return s;}
test('Old and new actuals stay linked across amount, title, category and one-month revisions without duplicate payment',()=>{
 let s=recordPlannedExpense(setup(),'food','2026-10',{amount:10000,date:'2026-10-03'});delete s.actualExpenses[0].planGroupId;const actual=structuredClone(s.actualExpenses);
 s=upsertItem(s,{...s.items[0],title:'Einkäufe',amount:45000,category:'c4'},'food','2026-10');let r=reconcileMonth(s,'2026-10'),line=r.links.find(i=>i.title==='Einkäufe');assert.equal(line.paid,10000);assert.equal(line.open,35000);assert.equal(r.unlinked.length,0);assert.deepEqual(s.actualExpenses,actual);assert.equal(totals(s,'2026-09').expense,130000);
 s=recordPlannedExpense(s,line.id,'2026-10',{complete:true,date:'2026-10-04'});assert.equal(s.actualExpenses[1].amount,35000);assert.equal(reconcileMonth(s,'2026-11').links.find(i=>i.title==='Einkäufe').paid,0);
 s=upsertItem(s,{...s.items.find(i=>i.id===line.id),amount:50000},line.id,'2026-10','once');r=reconcileMonth(s,'2026-10');line=r.links.find(i=>i.title==='Einkäufe');assert.equal(line.paid,45000);assert.equal(line.open,5000);assert.equal(r.unlinked.length,0);
 s=recordPlannedExpense(s,line.id,'2026-10',{complete:true,date:'2026-10-05'});assert.equal(s.actualExpenses[2].planGroupId,'food');s=removeItem(s,line.id,'2026-10');assert.equal(reconcileMonth(s,'2026-10').unlinked.length,3);s.skips=s.skips.filter(k=>!k.endsWith('@2026-10'));line=reconcileMonth(s,'2026-10').links.find(i=>i.title==='Einkäufe');assert.equal(line.paid,50000);assert.equal(line.over,5000);assert.equal(line.open,0);assert.deepEqual(parseBackup(JSON.stringify(s)),s);
 // Explicit unlink removes the stable association as well.
 s=saveEntryClassification(s,s.actualExpenses[2].id,{kind:'expense',category:'c4',planItemId:''});assert.equal(reconcileMonth(s,'2026-10').unlinked.length,1);
});
test('Fixed and variable open totals honor category defaults and item overrides, without changing money',()=>{
 let s=recordPlannedExpense(setup(),'food','2026-10',{amount:10000,date:'2026-10-03'}),r=reconcileMonth(s,'2026-10');assert.equal(r.fixedOpen,90000);assert.equal(r.variableOpen,30000);assert.equal(r.fixedOpen+r.variableOpen,r.planOpen);
 s=upsertItem(s,{...s.items[0],pace:'fixed'},'food','2026-10');const changed=reconcileMonth(s,'2026-10');assert.equal(changed.fixedOpen,120000);assert.equal(changed.variableOpen,0);assert.equal(changed.afterOpen,r.afterOpen);assert.equal(changed.actualTotal,r.actualTotal);assert.equal(changed.unlinked.length,0);
 const bad=structuredClone(s);bad.actualExpenses[0].planGroupId='bad@id';assert.throws(()=>validate(bad));
});
test('New annual payments occur in full only every twelve months, keep their phase on edits and support dates, skips and end',()=>{
 let s=upsertItem(enhanceState(blank()),item('insurance',12001,{frequency:'year',start:'2026-11',paymentDay:31}),null,'2026-11');let annual=s.items[0];assert.equal(annual.annualPayment,true);
 assert.equal(totals(s,'2026-11').expense,12001);assert.equal(totals(s,'2026-12').expense,0);assert.equal(totals(s,'2027-10').expense,0);assert.equal(totals(s,'2027-11').expense,12001);assert.equal(paymentSchedule(s,'2026-11')[0].day,30);
 const paid=recordPlannedExpense(s,annual.id,'2026-11',{complete:true,date:'2026-11-03'});assert.equal(paid.actualExpenses[0].amount,12001);assert.throws(()=>recordPlannedExpense(s,annual.id,'2026-12',{complete:true,date:'2026-12-03'}));
 s=upsertItem(s,{...annual,amount:13000},annual.id,'2026-12');annual=s.items.find(i=>i.start==='2026-12');assert.equal(annual.cycleStart,'2026-11');assert.equal(totals(s,'2026-11').expense,12001);assert.equal(totals(s,'2026-12').expense,0);assert.equal(totals(s,'2027-11').expense,13000);
 s.skips.push(annual.id+'@2027-11');assert.equal(totals(s,'2027-11').expense,0);annual.end='2027-12';assert.equal(totals(s,'2028-11').expense,0);assert.deepEqual(parseBackup(JSON.stringify(s)),s);
});
test('Legacy annual review preserves earlier monthly shares and actual records; converted pot movements occur only when due',()=>{
 let s=createPot(enhanceState(blank()),{name:'Puffer',balance:100000,month:'2026-09'});s.items=[item('annual',12000,{frequency:'year'}),item('withdraw',12000,{type:'income',frequency:'year',potId:s.pots[0].id})];const raw=JSON.stringify(s);assert.deepEqual(parseBackup(raw),s);assert.equal(totals(s,'2026-10').expense,1000);
 s=recordPlannedExpense(s,'annual','2026-09',{complete:true,date:'2026-09-03'});const actual=structuredClone(s.actualExpenses);
 s=upsertItem(s,{...s.items[0],annualPayment:true,cycleStart:'2026-12'},'annual','2026-10');s=upsertItem(s,{...s.items.find(i=>i.id==='withdraw'),annualPayment:true,cycleStart:'2026-12'},'withdraw','2026-10');
 assert.equal(totals(s,'2026-09').expense,1000);assert.equal(totals(s,'2026-10').expense,0);assert.equal(totals(s,'2026-12').expense,12000);assert.equal(totals(s,'2027-01').expense,0);assert.equal(reserveSummary(s,'2026-11').balance,99000);assert.equal(reserveSummary(s,'2026-12').balance,87000);assert.deepEqual(s.actualExpenses,actual);assert.deepEqual(parseBackup(JSON.stringify(s)),s);
});
test('Annual scenario preview, adoption, backup and undo share payment-month semantics',()=>{
 let s=enhanceState(blank()),v=newVariant('Variante','2026-10');v.lines=[item('annual',12000,{frequency:'year',annualPayment:true,cycleStart:'2026-11',start:'2026-11'})];const d={id:'annual_decision',title:'Jahreszahlung',start:'2026-10',minFree:0,protected:[],variants:[v]};s=saveDecision(s,d);const result=evaluateScenario(s,d,v);assert.equal(result.rows[0].expense,0);assert.equal(result.rows[1].expense,12000);assert.equal(result.rows[2].expense,0);const n=adoptScenario(s,d.id,v.id);assert.equal(totals(n,'2027-11').expense,12000);assert.deepEqual(undoScenario(parseBackup(JSON.stringify(n)),d.id).items,s.items);
});
