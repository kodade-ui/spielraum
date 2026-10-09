import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blank,totals,parseBackup,upsertItem} from '../dist/planner.js';
import {enhanceState} from '../dist/intelligence.js';
import {createPot,reserveSummary} from '../dist/reserves.js';
import {saveGoal} from '../dist/goals.js';
import {planChanges} from '../dist/budget-insights.js';
const item=(id,type,amount,extra={})=>({id,title:id,type,amount,category:'c1',frequency:'month',start:'2026-01',end:'',note:'',...extra});
function setup(){let s=createPot(enhanceState(blank()),{name:'Wünsche',month:'2026-01',balance:100000});s.items=[item('salary','income',300000),item('rent','expense',100000),item('saving','saving',10000,{potId:s.pots[0].id})];s=saveGoal(s,{title:'Kaffeeset',price:120000,deadline:'2026-07',potId:s.pots[0].id,status:'active',note:''});return {s,id:s.goals[0].id,input:{month:'2026-07',price:120000,running:5000,funding:70000,potId:s.pots[0].id,minFree:50000,category:'c1'}};}
test('Plan-change explanation reconciles exactly through recurrence, revisions and withdrawals',()=>{const {s}=setup();s.items.push(item('annual','expense',12000,{frequency:'year',annualPayment:true,cycleStart:'2026-07',start:'2026-07'}),item('quarter','expense',6000,{frequency:'quarter',start:'2026-01'}),item('withdraw','income',2000,{frequency:'once',start:'2026-07',potId:s.pots[0].id}));const n=upsertItem(s,{...s.items[1],amount:110000},'rent','2026-07'),c=planChanges(n,'2026-07');assert.equal(c.delta,-26000);assert.equal(c.changes.reduce((n,c)=>n+c.change,0),c.delta);assert.equal(c.changes.filter(x=>x.title==='rent').length,1);assert.equal(planChanges(n,'2000-01'),null);});
