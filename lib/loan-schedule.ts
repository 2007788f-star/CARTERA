import { cents, totals, type Loan, type Payment } from './portfolio.ts';
export type Schedule={firstDue:string;dueMode:string;frequencyDays:number;installment:number;scheduleKnown:number;principal:number;interestMode:string};
const MAX_DATE='2100-12-31';
const stamp=(date:string)=>Date.parse(`${date}T12:00:00Z`);
// Constant-time calendar calculation, including an exceptional legacy first date.
export function dueDate(loan:Schedule,index:number):string {
 if(!Number.isSafeInteger(index)||index<0||index>74000||!Number.isFinite(stamp(loan.firstDue)))return '';
 const d=new Date(stamp(loan.firstDue));
 if(index>0&&loan.dueMode==='semi_monthly'){
 const y=d.getUTCFullYear(),m=d.getUTCMonth(),day=d.getUTCDate();
 const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();
 let slot=day<15?m*2:day<last?m*2+1:(m+1)*2;
 slot+=index-1;
 const month=Math.floor(slot/2),year=y+Math.floor(month/12),monthOfYear=month%12;
 d.setTime(Date.UTC(year,monthOfYear,slot%2===0?15:new Date(Date.UTC(year,monthOfYear+1,0)).getUTCDate(),12));
 }else if(index>0)d.setUTCDate(d.getUTCDate()+index*loan.frequencyDays);
 if(!Number.isFinite(d.getTime()))return '';
 const value=d.toISOString().slice(0,10);return value<=MAX_DATE?value:'';
}
export function dueCount(loan:Schedule,asOf:string,inclusive=false){
 let low=0,high=74001;
 while(low<high){const middle=Math.floor((low+high)/2),date=dueDate(loan,middle);
 if(date&&(inclusive?date<=asOf:date<asOf))low=middle+1;else high=middle;}
 return low;
}
export function scheduleStatus(loan:Schedule,eligible:number,asOf:string){
 if(!loan.scheduleKnown||loan.installment<=0)return {next:null,late:false,unpaid:0,settled:false};
 const paid=cents(eligible),quota=cents(loan.installment),principal=cents(loan.principal);
 const settled=loan.interestMode==='none'&&paid>=principal;
 if(settled)return {next:null,late:false,unpaid:0,settled:true};
 const expected=dueCount(loan,asOf)*quota;
 const unpaid=Math.max(0,(loan.interestMode==='none'?Math.min(expected,principal):expected)-paid)/100;
 return {next:dueDate(loan,Math.floor(paid/quota))||null,late:unpaid>0,unpaid,settled:false};
}
export function loanStatus(loan:Loan,allPayments:Payment[],asOf:string){
 const payments=allPayments.filter(p=>p.loanId===loan.id&&!p.voidedAt&&p.paidAt<=asOf).sort((a,b)=>a.paidAt.localeCompare(b.paidAt)||a.id.localeCompare(b.id));
 const paid=totals(payments,asOf),remaining=Math.max(0,loan.principalCents-paid.principal);
 const invalid=loan.principalCents<=0||paid.principal>loan.principalCents||payments.some(p=>p.amountCents<1||p.principalCents<0||p.interestCents<0||p.principalCents+p.interestCents>p.amountCents);
 const base={paid:paid.amount/100,capitalPaid:paid.principal/100,capitalRemaining:remaining/100,interestPaid:paid.interest/100,pending:paid.pending/100,invalid,progress:Math.min(100,paid.principal/loan.principalCents*100)};
 if(!loan.scheduleKnown||invalid)return {...base,next:null,nextAmount:0,dueToday:0,unpaid:0,late:false,settled:false,review:true,interestOutstanding:0};
 const maturity=loan.maturityDate;
 let next:string|null=null,nextCents=0,lateCents=0,dueCents=0,interestOutstanding=0;
 if(loan.interestMode==='none'){
 const quota=cents(loan.installment);
 const expected=(inclusive:boolean)=>Math.min(loan.principalCents,dueCount(loan,asOf,inclusive)*quota);
 lateCents=Math.max(0,expected(false)-paid.principal);
 dueCents=Math.max(0,expected(true)-paid.principal);
 if(maturity&&maturity<=asOf){dueCents=remaining;if(maturity<asOf)lateCents=remaining;}
 if(remaining){next=dueDate(loan,Math.floor(paid.principal/quota))||null;
 nextCents=Math.min(remaining,quota-(paid.principal%quota));
 if(maturity&&(!next||maturity<=next)){next=maturity;nextCents=remaining;}}
 }else{
 // Each scheduled charge is explicit: contractual cuota, or monthly interest
 // split into two semimonthly charges / frequencyDays over a 30-day month.
 let principalAtDate=loan.principalCents,paymentIndex=0,cumulative=0,expectedPast=0,expectedNow=0;
 const periodCharge=(monthly:number,date:string)=>loan.dueMode==='semi_monthly'?(date.slice(8)==='15'?Math.floor(monthly/2):Math.ceil(monthly/2)):Math.round(monthly*loan.frequencyDays/30);
 const limit=dueCount(loan,asOf,true);
 for(let i=0;i<Math.min(limit,74001);i++){
 const date=dueDate(loan,i);if(!date||loan.closedAt&&date>loan.closedAt||maturity&&date>maturity)break;
 while(paymentIndex<payments.length&&payments[paymentIndex].paidAt<date){principalAtDate-=payments[paymentIndex++].principalCents;}
 if(principalAtDate<=0)break;
 const monthly=loan.monthlyCharge>0?cents(loan.monthlyCharge):Math.round((loan.interestMode==='balance'?principalAtDate:loan.principalCents)*loan.rate/100);
 const charge=loan.installmentMode==='calculated_interest'?periodCharge(monthly,date):cents(loan.installment);
 cumulative+=charge;
 if(date<asOf)expectedPast=cumulative;
 if(date<=asOf)expectedNow=cumulative;
 if(!next&&cumulative>paid.interest){next=date;nextCents=cumulative-paid.interest;}
 }
 if(!next&&remaining>0){
 const monthly=loan.monthlyCharge>0?cents(loan.monthlyCharge):Math.round((loan.interestMode==='balance'?remaining:loan.principalCents)*loan.rate/100);
 let index=limit,prepaid=Math.max(0,paid.interest-cumulative),charge=cents(loan.installment);
 if(loan.installmentMode==='calculated_interest'&&loan.dueMode==='semi_monthly'){
 if(monthly>0){index+=Math.floor(prepaid/monthly)*2;prepaid%=monthly;charge=periodCharge(monthly,dueDate(loan,index));if(prepaid>=charge){prepaid-=charge;index++;charge=periodCharge(monthly,dueDate(loan,index));}}else charge=0;
 }else{
 if(loan.installmentMode==='calculated_interest')charge=Math.round(monthly*loan.frequencyDays/30);
 if(charge>0){index+=Math.floor(prepaid/charge);prepaid%=charge;}
 }
 const date=dueDate(loan,index);if(charge>0&&date&&(!maturity||date<=maturity)&&(!loan.closedAt||date<=loan.closedAt)){next=date;nextCents=charge-prepaid;}

 }
 lateCents=Math.max(0,expectedPast-paid.interest);
 dueCents=Math.max(0,expectedNow-paid.interest);interestOutstanding=dueCents;
 if(maturity&&maturity<=asOf){dueCents+=remaining;if(maturity<asOf)lateCents+=remaining;}
 if(remaining&&maturity&&(!next||maturity<=next)){nextCents=maturity===next?nextCents+remaining:remaining;next=maturity;}
 }
 const settled=remaining===0&&interestOutstanding===0&&paid.pending===0;
 if(settled||loan.closedAt){next=null;nextCents=0;}
 const review=paid.pending>0||allPayments.some(p=>p.loanId===loan.id&&!p.voidedAt&&p.paidAt>asOf);
 return {...base,next,nextAmount:nextCents/100,dueToday:dueCents/100,unpaid:lateCents/100,late:lateCents>0,settled,review,interestOutstanding:interestOutstanding/100};
}
export function borrowerRows(loans:Loan[],payments:Payment[],asOf:string){
 const groups=new Map<string,{id:string;name:string;phone:string;loans:ReturnType<typeof row>[]}>();
 function row(l:Loan){return {...l,...loanStatus(l,payments,asOf)};}
 for(const l of loans){const key=l.borrowerId||l.id,g=groups.get(key)||{id:key,name:l.name,phone:l.phone,loans:[]};g.loans.push(row(l));groups.set(key,g);}
 return [...groups.values()].map(g=>{
 const sum=(key:'principal'|'capitalRemaining'|'capitalPaid'|'paid'|'interestPaid'|'pending'|'dueToday'|'unpaid')=>g.loans.reduce((a,l)=>a+l[key],0);
 const next=g.loans.filter(l=>l.next).sort((a,b)=>a.next!.localeCompare(b.next!))[0]?.next||null;
 const principal=sum('principal'),capitalPaid=sum('capitalPaid');
 return {...g,principal,capitalPaid,capitalRemaining:sum('capitalRemaining'),paid:sum('paid'),interestPaid:sum('interestPaid'),pending:sum('pending'),dueToday:sum('dueToday'),unpaid:sum('unpaid'),next,nextAmount:g.loans.filter(l=>l.next===next).reduce((a,l)=>a+l.nextAmount,0),review:g.loans.some(l=>l.review),settled:g.loans.every(l=>l.settled),progress:Math.min(100,capitalPaid/principal*100)};
 });
}
