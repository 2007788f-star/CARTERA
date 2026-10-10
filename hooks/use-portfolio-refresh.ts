'use client';
import {useEffect,useState} from 'react';
import {today,type Loan,type Payment} from '@/lib/portfolio';
export default function usePortfolioRefresh(initialLoans:Loan[],initialPayments:Payment[]){
 const [ready,setReady]=useState(false);
 const [loans,setLoans]=useState(initialLoans),[payments,setPayments]=useState(initialPayments),[asOf,setAsOf]=useState(today()),[error,setError]=useState('');
 useEffect(()=>{setReady(true);let active=true,running=false;async function refresh(){if(running||document.hidden)return;running=true;try{const r=await fetch('/api/portfolio',{cache:'no-store'});if(r.status===401){location.assign('/ingresar');return;}const data=await r.json() as {loans:Loan[];payments:Payment[];error?:string};if(!r.ok)throw Error(data.error);if(active){setLoans(data.loans);setPayments(data.payments);setAsOf(today());setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'No se pudo actualizar');}finally{running=false;}}
 const update=()=>void refresh();window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);const timer=setInterval(update,45000);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};},[]);
 return {loans,payments,asOf,error,ready};
}
