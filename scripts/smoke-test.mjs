// Local data only. Run db:migrate:local first. Uses a disposable test account.
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const child=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:['ignore','pipe','pipe'],detached:true});
let logs='';
child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
let cookie='';
async function api(path,method='GET',data){
 const headers={origin:base};if(cookie)headers.cookie=cookie;
 if(data&&!(data instanceof FormData))headers['content-type']='application/json';
 return fetch(base+path,{method,headers,body:data instanceof FormData?data:data?JSON.stringify(data):undefined,redirect:'manual'});
}
try{
 let ready=false;
 for(let i=0;i<90;i++){try{await fetch(base+'/ingresar');ready=true;break}catch{await new Promise(r=>setTimeout(r,500))}}
 assert.ok(ready,'Local server failed to start');
 const credentials={email:'prueba@example.com',password:'Prueba-local-2026-segura'};
 const setupKey=readFileSync('.dev.vars','utf8').trim().split('=')[1];
 let r=await api('/api/auth/setup','POST',{...credentials,setupKey});assert.ok([201,409].includes(r.status),`setup: ${r.status} ${await r.text()}`);
 r=await api('/api/auth/login','POST',credentials);assert.equal(r.status,200,`login: ${await r.clone().text()}`);cookie=r.headers.get('set-cookie').split(';')[0];
 const payload={name:'Persona de prueba',phone:'',principal:250,interestMode:'none',rate:0,installment:100,firstDue:'2026-01-15',frequencyDays:15,dueMode:'semi_monthly',monthlyCharge:0,notes:'Prueba local',consent:false,reminderDays:0};
 r=await api('/api/loans','POST',payload);assert.equal(r.status,201);const loan=await r.json();assert.equal(loan.scheduleKnown,1);assert.equal(loan.messageTemplate,'');
 r=await api('/api/loans','POST',{...payload,borrowerId:loan.borrowerId});assert.equal(r.status,201);const second=await r.json();
 r=await api('/api/loans','POST',{...payload,firstDue:'2026-02-30'});assert.equal(r.status,400);
 r=await api('/api/payments','POST',{loanId:loan.id,amount:100,paidAt:'2026-01-15',allocation:'principal',note:'Prueba'});assert.equal(r.status,201);
 r=await api('/api/payments','POST',{loanId:loan.id,amount:200,paidAt:'2026-01-15',allocation:'principal',note:''});assert.equal(r.status,400);
 const data=new FormData();data.set('file',new File(['%PDF-1.4\nTest local\n%%EOF'], 'prueba.pdf',{type:'application/pdf'}));
 r=await api(`/api/loans/${loan.id}/documents`,'POST',data);assert.equal(r.status,201,await r.clone().text());const doc=await r.json();
 r=await api(`/api/loans/${second.id}/documents`);assert.ok((await r.json()).some(x=>x.id===doc.id));
 r=await api(`/api/documents/${doc.id}`);assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);
 const unauthorized=await fetch(base+`/api/documents/${doc.id}`);assert.equal(unauthorized.status,401);
 r=await api(`/api/documents/${doc.id}`,'DELETE');assert.equal(r.status,200);
 for(const path of ['/','/reportes',`/expedientes/${loan.id}`]){r=await api(path);assert.equal(r.status,200,path);}
 r=await api('/api/auth/logout','POST');assert.equal(r.status,200);
 r=await api(`/api/documents/${doc.id}`);assert.equal(r.status,401);
 console.log('PASS: account, login, loans, validations, payments, shared dossier, private document access, pages and logout');
}catch(e){console.error(logs.slice(-6000));throw e}finally{process.kill(-child.pid,'SIGTERM')}
