// Structural checks keep drafts/backups safe; live references are checked before simulation.
export function validateDecisions(s){
  if(s.decisions===undefined)return;
  const fail=()=>{
    throw Error('Die gespeicherten Entscheidungsszenarien sind ungültig.');
  };
  const str=(v,n)=>typeof v==='string'&&v.length<=n,id=v=>str(v,100)&&/^[a-zA-Z0-9_-]+$/.test(v)&&!['__proto__','constructor','prototype'].includes(v),money=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000000;
  const month=v=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v)&&v>='2000-01'&&v<='2100-12';
  const serial=m=>Number(m.slice(0,4))*12+Number(m.slice(5));
  const list=(v,n)=>Array.isArray(v)&&v.length<=n;
  const item=i=>i&&id(i.id)&&str(i.title,160)&&i.title.length&&money(i.amount)&&i.amount>0&&['income','expense','saving'].includes(i.type)&&['month','quarter','year','once'].includes(i.frequency)&&month(i.start)&&(!i.end||(month(i.end)&&i.end>=i.start))&&id(i.category)&&str(i.note,1000)&&(!i.potId||id(i.potId))&&(!i.groupId||id(i.groupId))&&(i.cycleStart===undefined||month(i.cycleStart))&&(i.annualPayment===undefined||typeof i.annualPayment==='boolean')&&(!i.pace||['fixed','spread'].includes(i.pace));
  if(!list(s.decisions,50))fail();
  const ids=new Set();
  for(const d of s.decisions){
    if(!d||!id(d.id)||ids.has(d.id)||!str(d.title,100)||!d.title.trim()||!month(d.start)||d.start>'2100-01'||!money(d.minFree)||!list(d.protected,100)||!list(d.variants,5)||!d.variants.length)fail();
    ids.add(d.id);
    const pids=new Set();
    for(const p of d.protected){
      if(!p||!id(p.potId)||pids.has(p.potId)||!money(p.minimum))fail();
      pids.add(p.potId);
    }
    const vids=new Set();
    for(const v of d.variants){
      if(!v||!id(v.id)||vids.has(v.id)||!str(v.name,80)||!v.name.trim()||!list(v.lines,60)||!list(v.removedIds,1000)||v.removedIds.some(x=>!id(x))||new Set(v.removedIds).size!==v.removedIds.length)fail();
      vids.add(v.id);
      const lids=new Set();
      for(const l of v.lines){
        if(!item(l)||l.start<d.start||lids.has(l.id))fail();
        lids.add(l.id);
      }
      const t=v.stress;
      if(!t||!money(t.monthly)||!money(t.once)||!month(t.month)||t.month<d.start||serial(t.month)-serial(d.start)>11||(!str(t.potId,100))||(t.potId&&!id(t.potId)))fail();
    }
    if(d.applied){
      const a=d.applied;
      if(!vids.has(a.variantId)||typeof a.stress!=='boolean'||!str(a.at,40)||!list(a.changes,5000)||!list(a.skipsAdded,100000)||!list(a.skipsRemoved,100000)||!list(a.groups,5000)||a.groups.some(x=>!id(x))||!list(a.guardItems,10000)||a.guardItems.some(i=>!item(i))||!list(a.guardSkips,100000))fail();
      const touched=new Set();
      for(const c of a.changes){
        if(!c||!id(c.id)||touched.has(c.id)||(!c.before&&!c.after)||(c.before&&(!item(c.before)||c.before.id!==c.id))||(c.after&&(!item(c.after)||c.after.id!==c.id)))fail();
        touched.add(c.id);
      }
      for(const k of [...a.skipsAdded,...a.skipsRemoved,...a.guardSkips])if(typeof k!=='string'||k.split('@').length!==2||!id(k.split('@')[0])||!month(k.split('@')[1]))fail();
    }
  }
}
