import {build} from 'esbuild';
import {writeFileSync,readFileSync} from 'node:fs';
await build({entryPoints:['google-apps-script/server.ts'],outfile:'google-apps-script/Code.gs',bundle:true,format:'iife',globalName:'CarteraGoogle',target:'es2020',platform:'browser',minify:false});
writeFileSync('google-apps-script/Code.gs',readFileSync('google-apps-script/Code.gs','utf8')+'\nfunction doGet(){return CarteraGoogle.doGet();}\nfunction instalarCartera(){return CarteraGoogle.install();}\nfunction carteraApi(action,body){return CarteraGoogle.api(action,body);}\n');
console.log('Apps Script generado: Code.gs');
