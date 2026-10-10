import test from 'node:test';
import assert from 'node:assert/strict';
import {dueDate,scheduleStatus,loanStatus,borrowerRows} from '../lib/loan-schedule.ts';
import {type Loan,type Payment,totals} from '../lib/portfolio.ts';
const loan:Loan={id:'loan',borrowerId:'person',name:'Cliente',phone:'',principal:250,principalCents:25000,interestMode:'none',rate:0,monthlyCharge:0,installment:100,firstDue:'2026-01-15',dueMode:'semi_monthly',frequencyDays:15,scheduleKnown:1,notes:'',consent:0,reminderDays:0,messageTemplate:'',sourceRef:null,createdAt:'2026-01-01',disbursedAt:null,maturityDate:null,installmentMode:'contractual',closedAt:null,operationKey:null,requestHash:null,changeToken:'',revision:0,changeReason:''};
function payment(principal:number,interest=0,date='2026-01-15',amount=principal+interest):Payment{return {id:crypto.randomUUID(),loanId:'loan',amount,amountCents:Math.round(amount*100),principalCents:Math.round(principal*100),interestCents:Math.round(interest*100),paidAt:date,allocation:'split',note:'',sourceRef:null,operationKey:null,requestHash:null,voidedAt:null,revision:0,changeReason:''};}
test('parcial y última cuota usan importe restante, incluyendo el día de cobro',()=>{
 const partial=loanStatus(loan,[payment(50)],'2026-01-15');assert.equal(partial.nextAmount,50);assert.equal(partial.dueToday,50);assert.equal(partial.unpaid,0);
 const final=loanStatus(loan,[payment(200)],'2026-02-15');assert.equal(final.nextAmount,50);assert.equal(final.dueToday,50);
 assert.equal(loanStatus(loan,[payment(250)],'2026-03-01').settled,true);
});
test('mixtos desconocidos no cubren cuotas y fechas futuras/anulados se excluyen',()=>{
 const pending=payment(0,0,'2026-01-15',100);const future=payment(100,0,'2099-01-01');const voided={...payment(100),voidedAt:'2026-01-16'};
 const result=loanStatus(loan,[pending,future,voided],'2026-01-16');assert.equal(result.dueToday,100);assert.equal(result.pending,100);assert.equal(result.capitalRemaining,250);assert.equal(result.review,true);
 assert.equal(totals([future,voided],'2026-01-16').amount,0);
});
test('interés sobre saldo toma los abonos históricos y se liquida al pagar capital y cargos',()=>{
 const l={...loan,principal:1000,principalCents:100000,interestMode:'balance',rate:10,installment:50,installmentMode:'calculated_interest'};
 const result=loanStatus(l,[payment(500,0,'2026-01-16')],'2026-02-01');assert.equal(result.interestOutstanding,75);
 const paid=loanStatus(l,[payment(1000,50,'2026-01-16')],'2026-02-01');assert.equal(paid.settled,true);assert.equal(paid.next,null);
});
test('adelantos de interés mueven calendario y saldo final de capital se exige en vencimiento',()=>{
 const l={...loan,interestMode:'fixed'};const advance=loanStatus(l,[payment(0,1000)],'2026-01-16');assert.equal(advance.next,'2026-06-15');assert.equal(advance.nextAmount,100);
 const maturity=loanStatus({...l,maturityDate:'2026-01-31'},[],'2026-01-31');assert.equal(maturity.dueToday,450);assert.equal(maturity.unpaid,100);
});
test('consolidación por ID suma préstamos del cliente sin juntar homónimos',()=>{
 const rows=borrowerRows([loan,{...loan,id:'second'},{...loan,id:'third',borrowerId:'other'}],[payment(100)],'2026-01-16');assert.equal(rows.length,2);assert.equal(rows[0].principal,500);assert.equal(rows[0].capitalRemaining,400);assert.equal(rows[0].dueToday,100);
});
test('calendario acotado evita fechas inválidas con límites admitidos',()=>{
 assert.equal(dueDate(loan,100000000000),'');assert.equal(scheduleStatus({...loan,dueMode:'interval',frequencyDays:365,interestMode:'fixed',installment:0.01},1000000000,'2026-10-09').next,null);
 assert.equal(dueDate({...loan,firstDue:'2024-02-15'},1),'2024-02-29');assert.equal(dueDate({...loan,firstDue:'2026-01-10'},2),'2026-01-31');
});
test('el centavo impar del cargo mensual se conserva en fin de mes',()=>{
 const l={...loan,interestMode:'manual',monthlyCharge:1.01,installmentMode:'calculated_interest'};
 assert.equal(loanStatus(l,[],'2026-01-15').dueToday,0.5);
 assert.equal(loanStatus(l,[],'2026-01-31').dueToday,1.01);
 assert.equal(loanStatus(l,[payment(0,1.01)],'2026-01-16').next,'2026-02-15');
});
test('el vencimiento final sin interés exige el capital completo en esa fecha',()=>{
 assert.equal(loanStatus({...loan,maturityDate:'2026-01-15'},[],'2026-01-15').nextAmount,250);
});
