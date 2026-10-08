// Keep the manifest URL and application identity stable. Package exact raster bytes
// in the manifest so the native icon downloader does not need another signed-in request.
const fs=require('node:fs');
const file='dist/manifest.webmanifest';
const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
const images=[['app-icon-v3-192.png',192,'any'],['app-icon-v3-512.png',512,'any'],['app-icon-v3-1024.png',1024,'any'],['app-icon-v3-maskable-512.png',512,'maskable']];
manifest.icons=images.map(([name,size,purpose])=>({src:'data:image/png;base64,'+fs.readFileSync('dist/'+name).toString('base64'),sizes:`${size}x${size}`,type:'image/png',purpose}));
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
console.log('Manifest embeds four raster icons; app ID and start URL preserved.');
