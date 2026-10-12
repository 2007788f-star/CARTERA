import {type Loan,type Payment} from './portfolio';
export type DocumentRow={id:string;owner:string;loanId:string;filename:string;mimeType:string;bytes:number;objectKey:string;uploadedAt:string};
export type AuditRow={id:string;loanId:string;entityId:string;action:string;beforeJson:string|null;afterJson:string;reason:string;changedAt:string;actor:string};
export type State={loans:(Loan&{owner:string})[];payments:(Payment&{owner:string})[];borrowers:{id:string;owner:string;name:string;phone:string;createdAt:string}[];documents:DocumentRow[];audit:AuditRow[];sourceEntries:{id:string;loanId:string|null;sourceCell:string;kind:string;value:string}[];revision:number};
export const emptyState=():State=>({loans:[],payments:[],borrowers:[],documents:[],audit:[],sourceEntries:[],revision:0});
export class StoreError extends Error{constructor(message:string,public status=409){super(message);}}
function auditJSON(value:unknown){if(!value||typeof value!=='object')return JSON.stringify(value);return JSON.stringify(Object.fromEntries(Object.entries(value).map(([key,v])=>[key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()),v])));}
export function audit(s:State,actor:string,loanId:string,entityId:string,before:unknown,after:unknown,reason:string,action='update'){s.audit.push({id:crypto.randomUUID(),loanId,entityId,actor,beforeJson:before?auditJSON(before):null,afterJson:auditJSON(after),reason,action,changedAt:new Date().toISOString()});}
