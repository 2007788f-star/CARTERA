import {getPortfolioOwner} from '@/app/owner';
import {readState} from '@/lib/excel-store';
import {notFound,redirect} from 'next/navigation';
import Dossier from './dossier';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){if(!await getPortfolioOwner())redirect('/ingresar');const {id}=await params,s=await readState(),loan=s.loans.find(l=>l.id===id);if(!loan)notFound();const related=loan.borrowerId?s.loans.filter(l=>l.borrowerId===loan.borrowerId):[loan];return <Dossier loan={loan} related={related} payments={s.payments.filter(p=>related.some(l=>l.id===p.loanId))}/>;}
