import { z } from 'zod';
import { today } from './portfolio.ts';
export const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
 const date=new Date(`${value}T12:00:00Z`);
 return value>='1900-01-01'&&value<='2100-12-31'&&!Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
},'Fecha inválida');
export const receivedDate=calendarDate.refine(value=>value<=today(),'Un cobro recibido no puede tener fecha futura');
export const moneyAmount=z.number().finite().min(0).max(1_000_000_000).refine(value=>Math.abs(value*100-Math.round(value*100))<0.0001,'Usa como máximo dos decimales');
export const positiveMoney=moneyAmount.refine(value=>value>0,'El monto debe ser mayor que cero');
export const termsSchema=z.object({name:z.string().trim().min(2).max(120),phone:z.string().trim().max(25),principal:positiveMoney,
 interestMode:z.enum(['none','fixed','balance','manual']),rate:z.number().finite().min(0).max(1000),monthlyCharge:moneyAmount,
 installment:positiveMoney,firstDue:calendarDate,frequencyDays:z.number().int().min(1).max(365),dueMode:z.enum(['interval','semi_monthly']),
 notes:z.string().max(1000),disbursedAt:calendarDate.nullable().default(null),maturityDate:calendarDate.nullable().default(null),
 installmentMode:z.enum(['contractual','calculated_interest']).default('contractual')});
export function termErrors(p:z.infer<typeof termsSchema>){
 if(p.dueMode==='semi_monthly'){const d=new Date(`${p.firstDue}T12:00:00Z`);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();if(d.getUTCDate()!==15&&d.getUTCDate()!==last)return 'El primer cobro debe ser el día 15 o el último día del mes';}
 if(p.disbursedAt&&p.disbursedAt>today())return 'La entrega del capital no puede tener fecha futura';
 if(p.disbursedAt&&p.firstDue<p.disbursedAt)return 'El primer cobro no puede ser anterior a la entrega';
 if(p.maturityDate&&p.maturityDate<p.firstDue)return 'El vencimiento final no puede ser anterior al primer cobro';
 if(p.interestMode==='none'&&(p.rate!==0||p.monthlyCharge!==0||p.installmentMode!=='contractual'))return 'Sin interés requiere tasa y cargo mensual de cero y cuota pactada';
 if(p.installmentMode==='calculated_interest'&&p.rate===0&&p.monthlyCharge===0)return 'Indica la tasa o el cargo mensual para calcular intereses';
 return null;
}
export function validationError(result:{error:{issues:{message:string;path:(string|number)[]}[]}}){const e=result.error.issues[0];return `${e.path.join('.')}: ${e.message}`;}
export const financialKeys=['principal','interestMode','rate','monthlyCharge','installment','firstDue','frequencyDays','dueMode','disbursedAt','maturityDate','installmentMode'] as const;
