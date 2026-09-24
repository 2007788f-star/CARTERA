"""Genera SQL local a partir del JSON de importación anterior, sin empaquetar datos personales."""
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--source-json', required=True, type=Path)
parser.add_argument('--out', required=True, type=Path)
args = parser.parse_args()
data = json.loads(args.source_json.read_text(encoding='utf-8'))
if not all(isinstance(data.get(k), list) for k in ('loans', 'payments', 'entries')):
    raise SystemExit('JSON incompatible')

def q(value):
    if value is None:
        return 'NULL'
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"

def insert(table, record):
    cols = ', '.join('"'+c+'"' for c in record)
    vals = ', '.join(q(v) for v in record.values())
    return f'INSERT OR IGNORE INTO "{table}" ({cols}) VALUES ({vals});'

owner='primary'
source=data.get('source', 'excel-anterior')
lines=[]
rows={}
for row in data['loans']:
    rid=row['row'];id=f'{owner}-xls-loan-{rid}';rows[rid]=id
    lines.append(insert('borrowers',{'id':f'{owner}-xls-borrower-{rid}','owner':owner,'name':row['name'],'phone':row['phone'],'created_at':'2026-09-23T00:00:00.000Z'}))
    lines.append(insert('loans', {'id':id,'owner':owner,'borrower_id':f'{owner}-xls-borrower-{rid}','source_ref':f'{source}:Hoja1:{rid}','name':row['name'],'phone':row['phone'],'principal':row['principal'],'interest_mode':'fixed' if row['rate'] else 'manual','rate':row['rate'],'installment':row['monthlyCharge']/2 if row['monthlyCharge'] else 0,'first_due':row['firstDue'],'frequency_days':15,'due_mode':'semi_monthly','monthly_charge':row['monthlyCharge'],'notes':row['notes'],'consent':0,'reminder_days':0,'schedule_known':0,'created_at':'2026-09-23T00:00:00.000Z'}))
for p in data['payments']:
    if p['loanRow'] not in rows: continue
    lines.append(insert('payments',{'id':f'{owner}-xls-payment-{p["cell"]}','owner':owner,'loan_id':rows[p['loanRow']],'source_ref':f'{source}:{p["cell"]}','amount':p['amount'],'paid_at':p['paidAt'],'allocation':'unverified','note':p['note']}))
for c in data['entries']:
    cell=f'{c["column"]}{c["row"]}'
    lines.append(insert('source_entries',{'id':f'{owner}-xls-cell-{cell}','owner':owner,'source':source,'source_cell':cell,'loan_id':rows.get(c.get('loanRow')),'kind':c['kind'],'value':c['value']}))
args.out.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(f'Archivo listo: {len(data["loans"])} préstamos, {len(data["payments"])} abonos, {len(data["entries"])} celdas. Revisa el SQL antes de ejecutarlo.')
