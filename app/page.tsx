import {getPortfolioOwner} from './owner';
import {readState} from '@/lib/excel-store';
import Dashboard from './dashboard';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Home(){if(!await getPortfolioOwner())redirect('/ingresar');try{const s=await readState();return <Dashboard initialLoans={s.loans} initialPayments={s.payments} initialSourceEntries={s.sourceEntries}/>;}catch{return <main className="center"><h1>No se pudo leer el libro de cartera</h1><p>Revisa el almacenamiento e intenta de nuevo.</p><a href="/">Volver a cargar</a></main>;}}
