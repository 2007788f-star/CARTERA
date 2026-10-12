import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeBook,decodeBook} from '../lib/excel-codec.ts';
import {unzipSync,strFromU8} from 'fflate';
test('Excel conserva texto, centavos, nulos, fechas, Unicode y columnas posteriores a Z',()=>{
 const row=Object.fromEntries(Array.from({length:40},(_,i)=>['col'+i,i]));
 const book={Control:[{version:1}],Deudores:[{id:'001',name:'Ramírez & <familia>',phone:'04431306633',date:'2026-10-12',notes:'=SUM(A1:A2)\nTexto',amount:12.34,optional:null}],Cobros:[],Ancho:[row]};
 assert.deepEqual(decodeBook(encodeBook(book)),book);
 const files=unzipSync(encodeBook(book)),xml=strFromU8(files['xl/worksheets/sheet2.xml']);assert.ok(!xml.includes('<f>'),'Texto del usuario nunca debe convertirse en fórmula');
});
