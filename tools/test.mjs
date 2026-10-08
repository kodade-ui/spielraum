import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('..',import.meta.url));
const files=readdirSync(new URL('../tests/',import.meta.url)).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>'tests/'+n);
for(const args of [['--test',...files],['tests/ui-flow.mjs']]){
 const r=spawnSync(process.execPath,args,{cwd,stdio:'inherit'});
 if(r.error){console.error(r.error.message);process.exit(1);}
 if(r.status!==0)process.exit(r.status||1);
}
