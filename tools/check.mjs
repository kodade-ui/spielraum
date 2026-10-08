import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url));let checked=0;
for(const dir of ['dist','tools','scripts','tests'].filter(d=>existsSync(resolve(root,d))))for(const name of readdirSync(resolve(root,dir))){
 if(!/\.(?:js|mjs|cjs)$/.test(name))continue;
 const path=resolve(root,dir,name),r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
 if(r.status!==0)throw Error(r.stderr||r.error?.message||'Syntaxprüfung fehlgeschlagen');checked++;
 if(dir==='dist')for(const m of readFileSync(path,'utf8').matchAll(/\bfrom\s*['"](\.\/[^'"]+)['"]/g))if(!existsSync(resolve(root,dir,m[1])))throw Error('Modul fehlt: '+m[1]);
}
for(const m of readFileSync(resolve(root,'dist/index.html'),'utf8').matchAll(/(?:src|href)=["'](\.\/[^"']+)["']/g))if(!existsSync(resolve(root,'dist',m[1])))throw Error('HTML-Ressource fehlt: '+m[1]);
const sw=readFileSync(resolve(root,'dist/sw.js'),'utf8'),assets=sw.match(/const ASSETS\s*=\s*\[([^\]]+)\]/)?.[1];
if(!assets)throw Error('Service-Worker-Assetliste nicht gefunden.');
for(const m of assets.matchAll(/['"](\.\/[^'"]+)['"]/g))if(!existsSync(resolve(root,'dist',m[1])))throw Error('Offline-Ressource fehlt: '+m[1]);
const manifest=JSON.parse(readFileSync(resolve(root,'dist/manifest.webmanifest'),'utf8'));
if(!manifest.icons?.length)throw Error('Installationsicons fehlen.');
for(const icon of [...manifest.icons,...(manifest.shortcuts||[]).flatMap(s=>s.icons||[])]){if(String(icon.src).startsWith('data:'))throw Error('Manifest-Icons bitte als Dateien, nicht eingebettet.');if(!existsSync(resolve(root,'dist',icon.src)))throw Error('Icon fehlt: '+icon.src);}
if(!manifest.icons.some(i=>i.purpose==='maskable'))throw Error('Maskierbares Icon fehlt.');
const listed=new Set([...assets.matchAll(/['"]\.\/([^'"]+)['"]/g)].map(m=>m[1])),seen=new Set(),walk=f=>{if(seen.has(f))return;seen.add(f);for(const m of readFileSync(resolve(root,'dist',f),'utf8').matchAll(/\bfrom\s*['"]\.\/([^'"]+)['"]/g))walk(m[1]);};walk('planner-ui.js');
for(const f of seen)if(!listed.has(f))throw Error('Modul nicht im Offline-Cache: '+f);
console.log(`${checked} JavaScript-Dateien syntaktisch gültig; Modul-, HTML- und Offline-Ressourcen vorhanden. Kein visueller Browsertest.`);
