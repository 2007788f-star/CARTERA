// Browser regression tests against a disposable LOCAL database only.
// Run smoke-test.mjs first to create the fictional local account.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:5174';
const child=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','5174','--strictPort'],{stdio:['ignore','pipe','pipe'],detached:true});
let logs='',browser,currentPage;child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
try{
 let ready=false;for(let i=0;i<90;i++){try{await fetch(base+'/ingresar');ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}assert.ok(ready,'Local browser test server unavailable');
 browser=await chromium.launch({headless:true,...(process.env.CARTERA_BROWSER_PATH?{executablePath:process.env.CARTERA_BROWSER_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}:{} )});
 for(const viewport of [{width:390,height:844},{width:1365,height:900}]){
 const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];currentPage=page;page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});page.on('console',msg=>{if(msg.type()==='error')console.error('CONSOLE:',msg.text());});
 await page.goto(base+'/ingresar');await page.waitForLoadState('networkidle');await page.getByLabel('Correo',{exact:true}).fill('prueba@example.com');await page.getByLabel('Contraseña',{exact:true}).fill('Prueba-local-2026-segura');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('heading',{name:'¿Quién paga y cuánto?'}).waitFor();
 const name=`Cliente navegador ${viewport.width}-${Date.now()}`;
 async function add(existing=false){
 await page.getByRole('button',{name:'Nuevo préstamo',exact:true}).click();const dialog=page.getByRole('dialog').last();
 if(existing)await dialog.getByRole('combobox',{name:'Persona',exact:true}).selectOption({label:`${name} · 4431234567`});
 else {await dialog.getByLabel('Nombre',{exact:true}).fill(name);await dialog.getByLabel('WhatsApp',{exact:true}).fill('4431234567');}
 await dialog.getByLabel('Capital entregado',{exact:true}).fill('250');await dialog.getByLabel('Fecha de entrega',{exact:true}).fill('2026-01-01');await dialog.getByLabel('Cuota pactada por fecha',{exact:true}).fill('100');await dialog.getByLabel('Primera fecha de cobro',{exact:true}).fill('2026-01-15');
 await dialog.getByRole('button',{name:'Guardar préstamo',exact:true}).click();await dialog.waitFor({state:'hidden'});
 }
 await add();await add(true);await page.getByPlaceholder('Nombre o teléfono').fill(name);
 const client=page.locator('.client-card').filter({has:page.getByRole('heading',{name,exact:true})});await client.waitFor();assert.equal(await client.count(),1);await page.waitForFunction(n=>[...document.querySelectorAll('.client-card')].some(e=>e.textContent.includes(n)&&e.textContent.includes('2 préstamo(s)')),name);
 const details=client.locator('details').first();if(!await details.evaluate(e=>e.open))await details.locator('summary').first().click();
 const first=client.locator('article.loan').first();await first.getByRole('button',{name:'Registrar cobro',exact:true}).click();let dialog=page.getByRole('dialog').last();await dialog.getByLabel('Monto recibido',{exact:true}).fill('200');await dialog.getByLabel('Fecha del cobro',{exact:true}).fill('2026-01-15');await dialog.getByRole('button',{name:'Guardar cobro',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await page.waitForFunction(n=>[...document.querySelectorAll('.client-card')].some(e=>e.textContent.includes(n)&&e.textContent.includes('$300.00')),name);
 await first.getByRole('button',{name:'WhatsApp',exact:true}).click();dialog=page.getByRole('dialog').last();assert.match(await dialog.locator('.preview').innerText(),/\$50\.00/);const url=await dialog.getByRole('link',{name:'Abrir WhatsApp',exact:true}).getAttribute('href');assert.ok(decodeURIComponent(url).includes('$50.00'));await page.keyboard.press('Escape');
 await first.getByRole('button',{name:'Movimientos',exact:true}).click();dialog=page.getByRole('dialog').last();await dialog.getByRole('button',{name:'Corregir / clasificar',exact:true}).click();const correction=page.getByRole('dialog',{name:'Corregir cobro',exact:true});await correction.getByLabel('Monto recibido',{exact:true}).fill('150');await correction.getByLabel('Motivo de la corrección',{exact:true}).fill('Error de captura ficticio');await correction.getByRole('button',{name:'Guardar corrección con historial',exact:true}).click();await correction.waitFor({state:'hidden'});await page.keyboard.press('Escape');
 await page.waitForFunction(n=>[...document.querySelectorAll('.client-card')].some(e=>e.textContent.includes(n)&&e.textContent.includes('$350.00')),name);
 await page.getByRole('button',{name:'Atrasados',exact:true}).click();assert.equal(await client.count(),1);
 await page.getByRole('button',{name:'Liquidados',exact:true}).click();await page.getByText('No hay clientes en esta vista.',{exact:true}).waitFor();await page.getByRole('button',{name:'Todos',exact:true}).click();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`Horizontal overflow at ${viewport.width}px`);
 await page.getByRole('link',{name:'Reportes',exact:true}).click();await page.getByRole('heading',{name:'Capital pendiente por cliente'}).waitFor();assert.equal(await page.locator('.bar-row').filter({hasText:name}).count(),1);await page.getByRole('button',{name:'Balance general',exact:true}).click();await page.getByRole('heading',{name:'Balance general provisional de cartera'}).waitFor();
 assert.deepEqual(errors,[],`Browser errors at ${viewport.width}px`);console.log(`PASS browser ${viewport.width}px: login, new/existing client loans, payment, actual reminder amount, correction, filters, consolidated report, layout`);await context.close();
 }
} catch(error){if(currentPage){console.error((await currentPage.locator('body').ariaSnapshot()).slice(-9000));}console.error(logs.slice(-6000));throw error;}finally{if(browser)await browser.close();process.kill(-child.pid,'SIGTERM');}
