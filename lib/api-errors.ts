export function databaseError(error:unknown){
 const msg=String(error instanceof Error?`${error.message} ${String(error.cause||'')}`:error);
 const errors:[string,string][]=[['CAPITAL_EXCEEDED','El abono supera el capital pendiente'],['NO_INTEREST','Este préstamo no admite pagos de interés'],['FUTURE_PAYMENT','Un cobro recibido no puede tener fecha futura'],['BEFORE_DISBURSEMENT','El cobro no puede ser anterior a la entrega del capital'],['TERMS_LOCKED','Las condiciones con movimientos registrados están protegidas. Anula los cobros incorrectos o registra un nuevo acuerdo.'],['LOAN_CLOSED','El préstamo está cerrado. Reábrelo antes de corregir movimientos.'],['PAYMENT_PARTS','El desglose de capital e interés debe corresponder al monto recibido'],['PAYMENT_IMMUTABLE','El movimiento cambió o ya está anulado. Actualiza la cartera.'],['LOAN_IMMUTABLE','El préstamo cambió. Actualiza la cartera.'],['NOT NULL constraint failed: borrowers.id','El préstamo cambió. Actualiza la cartera.']];
 const match=errors.find(([code])=>msg.includes(code));
 if(match)return Response.json({error:match[1]},{status:409});
 console.error('Operación de cartera fallida',error);return Response.json({error:'No se pudo guardar. Actualiza la cartera e inténtalo de nuevo.'},{status:500});
}
