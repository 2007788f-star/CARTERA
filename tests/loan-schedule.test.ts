import test from 'node:test';
import assert from 'node:assert/strict';
import { dueDate, scheduleStatus } from '../lib/loan-schedule.ts';
import { calendarDate, positiveMoney } from '../lib/validation.ts';
const loan={firstDue:'2026-01-15',dueMode:'semi_monthly',frequencyDays:15,installment:100,scheduleKnown:1,principal:250,interestMode:'none'};
test('quincenas respetan febrero y años bisiestos',()=>{
 assert.equal(dueDate(loan,3),'2026-02-28');
 assert.equal(dueDate({...loan,firstDue:'2024-02-15'},1),'2024-02-29');
});
test('un adelanto mueve el próximo vencimiento',()=>{
 assert.equal(scheduleStatus(loan,200,'2026-01-16').next,'2026-02-15');
});
test('sin interés: cuota parcial, saldo final y liquidación',()=>{
 assert.equal(scheduleStatus(loan,50,'2026-01-16').unpaid,50);
 assert.equal(scheduleStatus(loan,200,'2026-03-01').unpaid,50);
 assert.deepEqual(scheduleStatus(loan,250,'2026-03-01'),{next:null,late:false,unpaid:0,settled:true});
});
test('calendario desconocido no inventa vencimientos',()=>{
 assert.equal(scheduleStatus({...loan,scheduleKnown:0},0,'2026-03-01').next,null);
});
test('rechaza fechas imposibles y montos con fracciones de centavo',()=>{
 assert.equal(calendarDate.safeParse('2026-02-30').success,false);
 assert.equal(calendarDate.safeParse('2024-02-29').success,true);
 assert.equal(positiveMoney.safeParse(12.345).success,false);
 assert.equal(positiveMoney.safeParse(12.34).success,true);
});
