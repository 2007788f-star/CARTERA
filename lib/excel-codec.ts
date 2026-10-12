import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
export type Row=Record<string,string|number|null>;
export type Book=Record<string,Row[]>;
const escape=(s:string)=>s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const unescape=(s:string)=>s.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&amp;','&');
const column=(n:number):string=>n<26?String.fromCharCode(65+n):column(Math.floor(n/26)-1)+column(n%26);
// Own, deliberately small OOXML format. Data cells are typed; text is never a formula.
// Only app-generated workbooks are accepted, never arbitrary untrusted uploads.
export function encodeBook(book:Book){
 const names=Object.keys(book),files:Record<string,Uint8Array>={};
 const xml=(path:string,body:string)=>{files[path]=strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+body);};
 xml('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+names.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>');
 xml('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 xml('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+names.map((n,i)=>`<sheet name="${escape(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>');
 xml('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+names.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+'</Relationships>');
 names.forEach((name,i)=>{const rows=book[name],keys=[...new Set(rows.flatMap(r=>Object.keys(r)))],values=[Object.fromEntries(keys.map(k=>[k,k])),...rows];
 xml(`xl/worksheets/sheet${i+1}.xml`,'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>'+values.map((row,j)=>`<row r="${j+1}">`+keys.map((key,k)=>{const v=row[key],ref=column(k)+(j+1);return v===null||v===undefined?'':typeof v==='number'?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escape(v)}</t></is></c>`;}).join('')+'</row>').join('')+'</sheetData></worksheet>');});
 return zipSync(files,{level:6});
}
export function decodeBook(bytes:Uint8Array):Book{
 if(bytes.length>20*1024*1024)throw Error('Libro demasiado grande');
 const files=unzipSync(bytes),workbook=strFromU8(files['xl/workbook.xml']),book:Book={};
 const names=[...workbook.matchAll(/<sheet name="([^"]+)"/g)].map(m=>unescape(m[1]));
 names.forEach((name,i)=>{const sheet=strFromU8(files[`xl/worksheets/sheet${i+1}.xml`]),rows:Row[]=[],keys:string[]=[];
 [...sheet.matchAll(/<row r="\d+">([\s\S]*?)<\/row>/g)].forEach((r,j)=>{const row:Row={};for(const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)){let k=0;for(const ch of c[1])k=k*26+ch.charCodeAt(0)-64;k--;const v=c[2].includes('inlineStr')?unescape(c[3].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]||''):Number(c[3].match(/<v>(.*?)<\/v>/)?.[1]);if(j===0)keys[k]=String(v);else if(keys[k])row[keys[k]]=v;}if(j>0){for(const key of keys)if(!(key in row))row[key]=null;rows.push(row);}});book[name]=rows;});return book;
}
