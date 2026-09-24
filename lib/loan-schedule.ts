export type Schedule = {firstDue:string;dueMode:string;frequencyDays:number;installment:number;scheduleKnown:number;principal:number;interestMode:string};
export function dueDate(loan:Schedule,index:number):string {
 const date=new Date(`${loan.firstDue}T12:00:00Z`);
 if(loan.dueMode!=="semi_monthly") date.setUTCDate(date.getUTCDate()+index*loan.frequencyDays);
 else for(let i=0;i<index;i++) {
  const y=date.getUTCFullYear(),m=date.getUTCMonth(),day=date.getUTCDate();
  const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  date.setTime(day<15?Date.UTC(y,m,15,12):day<last?Date.UTC(y,m,last,12):Date.UTC(y,m+1,15,12));
 }
 return date.toISOString().slice(0,10);
}
export function scheduleStatus(loan:Schedule,eligible:number,asOf:string) {
 if(!loan.scheduleKnown||loan.installment<=0)return {next:null,late:false,unpaid:0,settled:false};
 const paid=Math.round(eligible*100),quota=Math.round(loan.installment*100);
 const principal=Math.round(loan.principal*100);
 const settled=loan.interestMode==="none"&&paid>=principal;
 if(settled)return {next:null,late:false,unpaid:0,settled:true};
 let due=0;
 while(dueDate(loan,due)<asOf)due++;
 const expected=loan.interestMode==="none"?Math.min(due*quota,principal):due*quota;
 const unpaid=Math.max(0,expected-paid)/100;
 const covered=Math.floor(paid/quota);
 return {next:dueDate(loan,covered),late:unpaid>0,unpaid,settled:false};
}
