export type Loan = {
 id:string; borrowerId:string|null; name:string; phone:string; principal:number;
 principalCents:number; interestMode:string; rate:number; installment:number;
 firstDue:string; frequencyDays:number; dueMode:string; monthlyCharge:number;
 notes:string; consent:number; reminderDays:number; messageTemplate:string;
 sourceRef:string|null; scheduleKnown:number; createdAt:string;
 disbursedAt:string|null; maturityDate:string|null; installmentMode:string;
 closedAt:string|null; operationKey:string|null; requestHash:string|null; changeToken:string; revision:number; changeReason:string;
};
export type Payment = {
 id:string; loanId:string; amount:number; paidAt:string; allocation:string; note:string;
 sourceRef:string|null; amountCents:number; principalCents:number; interestCents:number;
 operationKey:string|null; requestHash:string|null; voidedAt:string|null; revision:number; changeReason:string;
};
export const cents=(value:number)=>Math.round(value*100);
export const money=(value:number)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(value);
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function paymentParts(p:Payment){
 return {amount:p.amountCents,principal:p.principalCents,interest:p.interestCents,
 pending:p.amountCents-p.principalCents-p.interestCents};
}
export function totals(payments:Payment[],asOf=today()){
 return payments.filter(p=>!p.voidedAt&&p.paidAt<=asOf).reduce((a,p)=>{
 const v=paymentParts(p);return {amount:a.amount+v.amount,principal:a.principal+v.principal,interest:a.interest+v.interest,pending:a.pending+v.pending};
 },{amount:0,principal:0,interest:0,pending:0});
}
