import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blank,totals,projected,distribution,forecast,upsertItem,removeItem,migrate,validate,parseBackup,money} from '../dist/planner.js';
import {blank as oldBlank} from '../dist/legacy.js';
const item=(title,amount,type='expense',frequency='month',start='2026-09')=>({id:title,title,amount,type,frequency,start,end:'',category:'c7',note:''});
test('Every planned expense counts immediately, independent of day; charts and future months update',()=>{
  let s=blank();s.items.push(item('Gehalt',280000,'income'));
  assert.equal(totals(s,'2026-09').remaining,280000);
  s=upsertItem(s,item('Miete',95000),'', '2026-09');
  assert.equal(totals(s,'2026-09').remaining,185000);
  assert.equal(distribution(s,'2026-09').find(d=>d.id==='c7').value,95000);
  assert.equal(forecast(s,'2026-09',6)[5].remaining,185000);
  s=upsertItem(s,item('Sparen',30000,'saving'),null,'2026-09');
  assert.equal(totals(s,'2026-09').remaining,185000,'Sparrate Ende September belastet erst den Oktober');
  assert.equal(totals(s,'2026-10').saving,30000);
  assert.equal(distribution(s,'2026-09').find(d=>d.id==='saving_c7').value,30000);
});
test('Annual amounts are monthly provisions; one-off costs only count in their month',()=>{
  const s=blank();s.items.push(item('Gehalt',250000,'income'),item('Versicherung',12000,'expense','year'),item('Kopfhörer',20000,'expense','once'));
  assert.equal(totals(s,'2026-09').expense,21000);assert.equal(totals(s,'2026-10').expense,1000);
  assert.equal(totals(s,'2026-09').remaining,229000);assert.equal(totals(s,'2026-10').remaining,249000);
  s.items[1].end='2026-10';assert.equal(totals(s,'2026-11').expense,0);
});
test('Recurring edits and deletions preserve past months; one-month edits preserve later months',()=>{
  const s=blank();s.items.push(item('Miete',80000,'expense','month','2026-01'));
  let n=upsertItem(s,{...s.items[0],amount:90000},'Miete','2026-09');
  assert.equal(totals(n,'2026-08').expense,80000);assert.equal(totals(n,'2026-09').expense,90000);assert.equal(totals(n,'2026-10').expense,90000);
  n=removeItem(n,n.items.find(i=>i.start==='2026-09').id,'2026-10');assert.equal(totals(n,'2026-09').expense,90000);assert.equal(totals(n,'2026-10').expense,0);
  n=upsertItem(s,{...s.items[0],amount:50000},'Miete','2026-09','once');assert.equal(totals(n,'2026-09').expense,50000);assert.equal(totals(n,'2026-10').expense,80000);
  const a=blank();a.items.push(item('Annual',12000,'expense','year','2026-01'));const b=upsertItem(a,{...a.items[0],amount:24000},'Annual','2026-09','once');assert.equal(totals(b,'2026-09').expense,2000);assert.equal(totals(b,'2026-10').expense,1000);
});
test('V1 migration retains notes, categories, skips and all expenses including future dated ones, without doubling income',()=>{
  const old=oldBlank();old.settings.defaultBudget=250000;old.plans['2026-09']={amount:250000,limits:{c0:100000},complete:false};
  old.transactions.push({id:'salary',title:'Gehalt',amount:280000,type:'income',date:'2026-09-30',category:'c7',note:'old note'},{id:'expense',title:'End of month',amount:30000,type:'expense',date:'2026-09-30',category:'c0',note:'keep'});
  old.rules.push({id:'annual',title:'Versicherung',amount:12000,type:'expense',date:'2026-01-31',interval:'year',end:'',category:'c6',note:''});old.skips.push('annual@2026-08');
  const raw=JSON.stringify(old),s=migrate(old);assert.equal(JSON.stringify(old),raw);assert.equal(totals(s,'2026-09').income,280000);assert.equal(totals(s,'2026-09').expense,31000);assert.equal(totals(s,'2026-09').remaining,249000);assert.equal(s.items.find(i=>i.id==='expense').note,'keep');assert.equal(totals(s,'2026-08').expense,0);assert.equal(totals(s,'2026-10').income,250000);assert.equal(s.legacy.limits['2026-09'].c0,100000);validate(s);assert.equal(parseBackup(raw).version,2);
});
test('Over-budget plans have no negative pie slices; annual fractional-cent items stay editable',()=>{
  const s=blank();s.items.push(item('Income',10000,'income'),item('Expense',20000));assert.equal(totals(s,'2026-09').remaining,-10000);assert.ok(distribution(s,'2026-09').every(d=>d.value>0));assert.ok(!distribution(s,'2026-09').some(d=>d.id==='__remaining'));s.items.push(item('Tiny',1,'expense','year'));assert.ok(projected(s,'2026-09').some(i=>i.id==='Tiny'));
});
test('Amounts and backups validate before any persistence',()=>{
  assert.equal(money('29.90'),2990);assert.equal(money('1.234,56'),123456);assert.throws(()=>money('1,234'));const s=blank();s.items.push(item('test',1234));validate(s);const bad=structuredClone(s);bad.items[0].amount=-2;assert.throws(()=>validate(bad));const wrong=structuredClone(s);wrong.items[0].category='missing';assert.throws(()=>validate(wrong));assert.throws(()=>parseBackup('{}'));
});
test('Deleting an expense also removes its already scheduled future price revisions',()=>{
  const s=blank();s.items.push(item('Rent',80000,'expense','month','2026-01'));
  const n=upsertItem(s,{...s.items[0],amount:90000},'Rent','2026-12');
  const deleted=removeItem(n,'Rent','2026-09');
  assert.equal(totals(deleted,'2026-08').expense,80000);assert.equal(totals(deleted,'2026-09').expense,0);assert.equal(totals(deleted,'2026-12').expense,0);
});
