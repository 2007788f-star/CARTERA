import {env} from 'cloudflare:workers';
import {encodeBook,decodeBook,type Row} from './excel-codec';
import {type Loan,type Payment} from './portfolio';
import {emptyState,StoreError,type State} from './portfolio-state';
export {emptyState,StoreError,audit,type State} from './portfolio-state';
const KEY='cartera/CARTERA.xlsx';
const tabs={loans:'Prestamos',payments:'Cobros',borrowers:'Deudores',documents:'Expedientes',audit:'Historial',sourceEntries:'Origen'} as const;
export function encodeState(s:State){const book:Record<string,Row[]>={Control:[{version:1,revision:s.revision}]};for(const [key,name] of Object.entries(tabs))book[name]=s[key as keyof typeof tabs] as unknown as Row[];return encodeBook(book);}
export function decodeState(bytes:Uint8Array):State{const b=decodeBook(bytes);if(b.Control?.[0]?.version!==1)throw Error('Formato de cartera desconocido');const s=emptyState();s.revision=Number(b.Control[0].revision);for(const [key,name] of Object.entries(tabs)){if(!b[name])throw Error('Libro incompleto');(s as unknown as Record<string,unknown>)[key]=b[name];}return s;}
export async function readState(){if(!env.BUCKET)throw Error('Configura almacenamiento privado R2');const object=await env.BUCKET.get(KEY);return object?decodeState(new Uint8Array(await object.arrayBuffer())):emptyState();}
// R2 conditional PUT is the distributed compare-and-swap. No process-local lock:
// two Workers cannot silently replace each other's workbook, even after a crash.
export async function changeState<T>(run:(state:State)=>T):Promise<T>{
 if(!env.BUCKET)throw new StoreError('Almacenamiento no configurado',503);
 for(let attempt=0;attempt<5;attempt++){
 const current=await env.BUCKET.get(KEY),oldBytes=current?new Uint8Array(await current.arrayBuffer()):null,s=oldBytes?decodeState(oldBytes):emptyState();
 const result=run(s);s.revision++;
 if(current)await env.BUCKET.put(`cartera/respaldos/${s.revision-1}-${current.etag}.xlsx`,oldBytes!);
 const saved=await env.BUCKET.put(KEY,encodeState(s),{onlyIf:current?{etagMatches:current.etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}});
 if(saved)return result;
 }
 throw new StoreError('La cartera está siendo actualizada. Reintenta los mismos datos.');
}
export function excelError(e:unknown){if(e instanceof StoreError)return Response.json({error:e.message},{status:e.status});console.error('Error Excel',e);return Response.json({error:'No se pudo guardar el libro. Reintenta los mismos datos.'},{status:503});}
