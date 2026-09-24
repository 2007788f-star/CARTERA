import { z } from "zod";
export const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
 const date=new Date(`${value}T12:00:00Z`);
 return value>="1900-01-01"&&value<="2100-12-31"&&!Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
},"Fecha inválida");
export const moneyAmount=z.number().finite().min(0).max(1_000_000_000).refine(value=>Math.abs(value*100-Math.round(value*100))<0.0001,"Usa como máximo dos decimales");
export const positiveMoney=moneyAmount.refine(value=>value>0,"El monto debe ser mayor que cero");
