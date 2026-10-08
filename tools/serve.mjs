import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.argv[2]||4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Bitte einen Port zwischen 1024 und 65535 wählen.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg'};
const server=http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
 try{
  const url=new URL(req.url,'http://127.0.0.1'),decoded=decodeURIComponent(url.pathname);
  const path=resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
  if(!path.startsWith(resolve(root)+sep)){res.writeHead(403);return res.end('Forbidden');}
  if(!(await stat(path)).isFile()){res.writeHead(404);return res.end('Not found');}
  const bytes=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:400);res.end('Datei nicht verfügbar');}
});
server.on('error',e=>{console.error('Server konnte nicht starten: '+e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Spielraum: http://127.0.0.1:${port}\nNur lokaler Zugriff. Beenden mit Strg+C.`));
