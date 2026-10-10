'use client';
import { useState } from 'react';
import { today, type Loan } from '@/lib/portfolio';
export function nextSemiDue(){const [y,m,day]=today().split('-').map(Number);return new Date(Date.UTC(y,m-1,day<=15?15:new Date(Date.UTC(y,m,0)).getUTCDate())).toISOString().slice(0,10);}
export function readTerms(form:HTMLFormElement){const f=new FormData(form);return {name:String(f.get('name')||''),phone:String(f.get('phone')||''),principal:Number(f.get('principal')),interestMode:String(f.get('interestMode')),rate:Number(f.get('rate')),monthlyCharge:Number(f.get('monthlyCharge')),installment:Number(f.get('installment')),firstDue:String(f.get('firstDue')),frequencyDays:Number(f.get('frequencyDays')),dueMode:String(f.get('dueMode')),notes:String(f.get('notes')||''),disbursedAt:String(f.get('disbursedAt')||'')||null,maturityDate:String(f.get('maturityDate')||'')||null,installmentMode:String(f.get('installmentMode'))};}
export default function LoanFields({loan,person,locked=false}:{loan?:Loan;person?:{name:string;phone:string};locked?:boolean}){
 const [mode,setMode]=useState(loan?.interestMode||'none');
 const [quotaMode,setQuotaMode]=useState(loan?.installmentMode||'contractual');
 return <><div className="grid2">
 <label>Nombre<input name="name" key={`name-${person?.name}`} defaultValue={person?.name||loan?.name||''} readOnly={!!person} required minLength={2} maxLength={120}/></label>
 <label>WhatsApp<input name="phone" key={`phone-${person?.phone}`} defaultValue={person?.phone||loan?.phone||''} readOnly={!!person} type="tel" maxLength={25}/></label>
 <label>Capital entregado<input name="principal" type="number" min="0.01" max="1000000000" step="0.01" defaultValue={loan?.principal} readOnly={locked} required/></label>
 <label>Fecha de entrega<input name="disbursedAt" type="date" max={today()} defaultValue={loan?.disbursedAt||(!loan?today():'')} readOnly={locked}/></label>
 <label>Tipo de acuerdo<select name="interestMode" value={mode} onChange={e=>{if(!locked){setMode(e.target.value);if(e.target.value==='none')setQuotaMode('contractual');}}} aria-readonly={locked}>{['none','fixed','balance','manual'].map((v,i)=><option key={v} value={v} disabled={locked&&v!==mode}>{['Sin interés','Interés sobre capital inicial','Interés sobre saldo pendiente','Cargo manual'][i]}</option>)}</select></label>
 <label>Forma de calcular las cuotas<select name="installmentMode" value={quotaMode} onChange={e=>{if(!locked)setQuotaMode(e.target.value);}}>{['contractual','calculated_interest'].map((v,i)=><option key={v} value={v} disabled={locked&&v!==(loan?.installmentMode||'contractual')||mode==='none'&&v==='calculated_interest'}>{['Cuota pactada por fecha','Interés mensual dividido por periodo'][i]}</option>)}</select></label>
 <label>Porcentaje mensual (%)<input name="rate" type="number" min="0" max="1000" step="0.01" defaultValue={loan?.rate||0} readOnly={locked} required/></label>
 <label>Cargo mensual manual (0 usa porcentaje)<input name="monthlyCharge" type="number" min="0" step="0.01" defaultValue={loan?.monthlyCharge||0} readOnly={locked} required/></label>
 <label>Cuota pactada por fecha<input name="installment" type="number" min="0.01" step="0.01" defaultValue={loan?.installment||''} readOnly={locked} required/></label>
 <label>Primera fecha de cobro<input name="firstDue" type="date" defaultValue={loan?.firstDue||nextSemiDue()} readOnly={locked} required/></label>
 <label>Calendario<select name="dueMode" defaultValue={loan?.dueMode||'semi_monthly'}>{['semi_monthly','interval'].map((v,i)=><option key={v} value={v} disabled={locked&&v!==loan?.dueMode}>{['Día 15 y último de cada mes','Cada cierto número de días'][i]}</option>)}</select></label>
 <label>Días entre cobros (intervalo)<input name="frequencyDays" type="number" min="1" max="365" defaultValue={loan?.frequencyDays||15} readOnly={locked} required/></label>
 <label>Vencimiento final del capital (opcional)<input name="maturityDate" type="date" defaultValue={loan?.maturityDate||''} readOnly={locked}/></label>
 <label className="wide">Notas del acuerdo<input name="notes" defaultValue={loan?.notes||''} maxLength={1000}/></label>
 </div><p className="hint">Sin interés: las cuotas reducen capital. Con interés: la cuota pactada corresponde al interés por fecha; el capital se abona por separado. Para calcular por tasa se usa la mitad del cargo mensual en cada quincena, o días ÷ 30 en intervalos; el saldo se toma antes del día de cobro. No se capitaliza interés. Los acuerdos existentes conservan su cuota pactada.</p>{locked&&<p className="hint">Las condiciones financieras están protegidas porque ya hay movimientos. Puedes corregir datos y notas; una renegociación requiere conservar este acuerdo y registrar uno nuevo.</p>}</>;
}
