import {getPortfolioOwner} from '../owner';
import {readState} from '@/lib/excel-store';
import Reports from './reports';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(!await getPortfolioOwner())redirect('/ingresar');const s=await readState();return <Reports loans={s.loans} payments={s.payments}/>;}
