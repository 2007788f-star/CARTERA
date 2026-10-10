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
 if(data&&method==='POST'&&(path==='/api/loans'||path==='/api/payments')&&!data.operationKey)data={...data,operationKey:crypto.randomUUID()};
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
 r=await api('/api/payments','POST',{loanId:loan.id,amount:200,paidAt:'2026-01-15',allocation:'principal',note:''});assert.equal(r.status,409);
 const data=new FormData();data.set('file',new File(['%PDF-1.4\nTest local\n%%EOF'], 'prueba.pdf',{type:'application/pdf'}));
 r=await api(`/api/loans/${loan.id}/documents`,'POST',data);assert.equal(r.status,201,await r.clone().text());const doc=await r.json();
 r=await api(`/api/loans/${second.id}/documents`);assert.ok((await r.json()).some(x=>x.id===doc.id));
 r=await api(`/api/documents/${doc.id}`);assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);
 const unauthorized=await fetch(base+`/api/documents/${doc.id}`);assert.equal(unauthorized.status,401);
 r=await api(`/api/documents/${doc.id}`,'DELETE');assert.equal(r.status,200);

 // Integrity and collection regression tests. Never use remote data.
 const loanData={...payload,operationKey:crypto.randomUUID(),principal:100};
 r=await api('/api/loans','POST',loanData);assert.equal(r.status,201);const race=await r.json();
 r=await api('/api/loans','POST',loanData);assert.equal(r.status,200);assert.equal((await r.json()).id,race.id);
 const concurrent=await Promise.all(Array.from({length:5},()=>api('/api/payments','POST',{loanId:race.id,amount:80,paidAt:'2026-01-15',allocation:'principal',note:'Concurrencia'})));
 assert.equal(concurrent.filter(r=>r.status===201).length,1,'Solo un abono de 80 puede entrar contra capital 100');assert.ok(concurrent.every(r=>[201,409].includes(r.status)));

 r=await api('/api/loans','POST',{...payload,principal:100});assert.equal(r.status,201);const classificationLoan=await r.json();
 const pendingRows=await Promise.all(Array.from({length:3},async()=>{const r=await api('/api/payments','POST',{loanId:classificationLoan.id,amount:80,paidAt:'2026-01-15',allocation:'combined',note:'Por conciliar'});assert.equal(r.status,201);return r.json();}));
 const classifications=await Promise.all(pendingRows.map(p=>api(`/api/payments/${p.id}`,'PATCH',{amount:80,paidAt:'2026-01-15',allocation:'principal',note:'Clasificado',revision:p.revision,reason:'Clasificación concurrente'})));
 assert.equal(classifications.filter(r=>r.status===200).length,1,'La reclasificación también debe proteger el capital en concurrencia');assert.ok(classifications.every(r=>[200,409].includes(r.status)));
 const paymentData={loanId:race.id,amount:20,paidAt:'2026-01-15',allocation:'principal',note:'Reintento',operationKey:crypto.randomUUID()};
 const retries=await Promise.all(Array.from({length:3},()=>api('/api/payments','POST',paymentData)));
 assert.ok(retries.every(r=>[200,201].includes(r.status)));const replayRows=await Promise.all(retries.map(r=>r.json()));assert.ok(replayRows.every(p=>p.id===replayRows[0].id));
 r=await api('/api/payments','POST',{...paymentData,amount:10});assert.equal(r.status,409,'No reutilizar clave con otro monto');
 r=await api('/api/payments','POST',{loanId:race.id,amount:1,paidAt:'2099-01-01',allocation:'principal',note:''});assert.equal(r.status,400);
 r=await api('/api/payments','POST',{loanId:race.id,amount:1,paidAt:'2026-01-15',allocation:'interest',note:''});assert.equal(r.status,409);
 r=await api('/api/loans','POST',{...payload,firstDue:'2026-01-10'});assert.equal(r.status,400);
 let portfolio=await (await api('/api/portfolio')).json();let currentLoan=portfolio.loans.find(l=>l.id===loan.id);
 const {borrowerId:omitBorrower,consent:omitConsent,reminderDays:omitReminder,...terms}=payload;
 r=await api(`/api/loans/${loan.id}`,'PATCH',{...terms,principal:50,revision:currentLoan.revision,reason:'Corrección de prueba'});assert.equal(r.status,409);
 r=await api(`/api/loans/${loan.id}`,'PATCH',{...terms,name:'Persona actualizada',revision:currentLoan.revision,reason:'Corrección de nombre'});assert.equal(r.status,200,await r.clone().text());
 portfolio=await (await api('/api/portfolio')).json();assert.equal(portfolio.loans.find(l=>l.id===second.id).name,'Persona actualizada');
 r=await api(`/api/loans/${loan.id}`,'PATCH',{...terms,name:'Nombre viejo',revision:currentLoan.revision,reason:'Conflicto de prueba'});assert.equal(r.status,409);
 const interestData={...payload,principal:1000,interestMode:'balance',rate:10,installment:50,installmentMode:'calculated_interest'};
 r=await api('/api/loans','POST',interestData);assert.equal(r.status,201);const interestLoan=await r.json();
 r=await api('/api/payments','POST',{loanId:interestLoan.id,amount:150,paidAt:'2026-01-15',allocation:'split',principalAmount:100,interestAmount:50,note:'Mixto con desglose'});assert.equal(r.status,201);const split=await r.json();assert.equal(split.principalCents,10000);assert.equal(split.interestCents,5000);
 r=await api('/api/payments','POST',{loanId:interestLoan.id,amount:150,paidAt:'2026-01-15',allocation:'split',principalAmount:100,interestAmount:40,note:''});assert.equal(r.status,400);
 r=await api(`/api/payments/${split.id}`,'PATCH',{amount:160,paidAt:'2026-01-16',allocation:'split',principalAmount:110,interestAmount:50,note:'Corregido',revision:split.revision,reason:'Error de monto y fecha'});assert.equal(r.status,200);const corrected=await r.json();
 r=await api(`/api/payments/${split.id}`,'PATCH',{action:'void',revision:corrected.revision,reason:'Anular prueba duplicada'});assert.equal(r.status,200);
 r=await api(`/api/payments/${split.id}`,'PATCH',{action:'void',revision:corrected.revision,reason:'Anular otra vez'});assert.equal(r.status,409);
 const audit=await (await api(`/api/loans/${interestLoan.id}/audit`)).json();assert.ok(audit.some(e=>e.entityId===split.id&&e.action==='void'));assert.ok(audit.some(e=>e.entityId===split.id&&e.beforeJson?.includes('150')));
 portfolio=await (await api('/api/portfolio')).json();currentLoan=portfolio.loans.find(l=>l.id===race.id);
 r=await api(`/api/loans/${race.id}`,'PATCH',{action:'close',revision:currentLoan.revision,reason:'Capital totalmente liquidado'});assert.equal(r.status,200);const closed=await r.json();
 r=await api('/api/payments','POST',{loanId:race.id,amount:1,paidAt:'2026-01-15',allocation:'combined',note:''});assert.equal(r.status,409);
 r=await api(`/api/loans/${race.id}`,'PATCH',{action:'reopen',revision:closed.revision,reason:'Reapertura de prueba'});assert.equal(r.status,200);
 const unauthPortfolio=await fetch(base+'/api/portfolio');assert.equal(unauthPortfolio.status,401);
 console.log('PASS: atomic concurrency, idempotency, future dates, splits, corrections, voids, immutable terms, person batch, revisions, closure and audit');
 for(const path of ['/','/reportes',`/expedientes/${loan.id}`]){r=await api(path);assert.equal(r.status,200,path);}
 r=await api('/api/auth/logout','POST');assert.equal(r.status,200);
 r=await api(`/api/documents/${doc.id}`);assert.equal(r.status,401);
 console.log('PASS: account, login, loans, validations, payments, shared dossier, private document access, pages and logout');
}catch(e){console.error(logs.slice(-6000));throw e}finally{process.kill(-child.pid,'SIGTERM')}
