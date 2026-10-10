ALTER TABLE loans ADD COLUMN change_token TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE loans ADD COLUMN principal_cents INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE loans ADD COLUMN disbursed_at TEXT;
--> statement-breakpoint
ALTER TABLE loans ADD COLUMN maturity_date TEXT;
--> statement-breakpoint
ALTER TABLE loans ADD COLUMN installment_mode TEXT NOT NULL DEFAULT 'contractual';
--> statement-breakpoint
ALTER TABLE loans ADD COLUMN closed_at TEXT;
--> statement-breakpoint
ALTER TABLE loans ADD COLUMN operation_key TEXT;
--> statement-breakpoint
ALTER TABLE loans ADD COLUMN request_hash TEXT;
--> statement-breakpoint
ALTER TABLE loans ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE loans ADD COLUMN change_reason TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN principal_cents INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN interest_cents INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN operation_key TEXT;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN request_hash TEXT;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN voided_at TEXT;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN change_reason TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE loans SET principal_cents=CAST(ROUND(principal*100) AS INTEGER);
--> statement-breakpoint
UPDATE payments SET amount_cents=CAST(ROUND(amount*100) AS INTEGER), principal_cents=CASE WHEN allocation='principal' THEN CAST(ROUND(amount*100) AS INTEGER) ELSE 0 END, interest_cents=CASE WHEN allocation='interest' THEN CAST(ROUND(amount*100) AS INTEGER) ELSE 0 END;
--> statement-breakpoint
CREATE UNIQUE INDEX loans_operation ON loans(owner,operation_key);
--> statement-breakpoint
CREATE UNIQUE INDEX payments_operation ON payments(owner,operation_key);
--> statement-breakpoint
CREATE INDEX payments_loan_owner ON payments(loan_id,owner,paid_at);
--> statement-breakpoint
CREATE INDEX loans_borrower_owner ON loans(borrower_id,owner);
--> statement-breakpoint
CREATE TABLE audit_events (id TEXT PRIMARY KEY NOT NULL,owner TEXT NOT NULL,loan_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,before_json TEXT,after_json TEXT NOT NULL,reason TEXT NOT NULL,changed_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX audit_events_loan ON audit_events(owner,loan_id,changed_at);
--> statement-breakpoint
CREATE TRIGGER payments_guard_insert BEFORE INSERT ON payments BEGIN
SELECT CASE WHEN NEW.amount_cents<=0 OR NEW.amount_cents>100000000000 OR NEW.amount_cents<>CAST(ROUND(NEW.amount*100) AS INTEGER) OR NEW.principal_cents<0 OR NEW.interest_cents<0 OR NEW.principal_cents+NEW.interest_cents>NEW.amount_cents THEN RAISE(ABORT,'PAYMENT_PARTS') END;
SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM loans WHERE id=NEW.loan_id AND owner=NEW.owner) THEN RAISE(ABORT,'LOAN_OWNER') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND NEW.paid_at>date('now','-6 hours') THEN RAISE(ABORT,'FUTURE_PAYMENT') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND NEW.paid_at<COALESCE((SELECT disbursed_at FROM loans WHERE id=NEW.loan_id),'1900-01-01') THEN RAISE(ABORT,'BEFORE_DISBURSEMENT') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND (SELECT closed_at FROM loans WHERE id=NEW.loan_id) IS NOT NULL THEN RAISE(ABORT,'LOAN_CLOSED') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND NEW.interest_cents>0 AND (SELECT interest_mode FROM loans WHERE id=NEW.loan_id)='none' THEN RAISE(ABORT,'NO_INTEREST') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND NEW.principal_cents+COALESCE((SELECT SUM(principal_cents) FROM payments WHERE loan_id=NEW.loan_id AND owner=NEW.owner AND voided_at IS NULL),0)>(SELECT principal_cents FROM loans WHERE id=NEW.loan_id) THEN RAISE(ABORT,'CAPITAL_EXCEEDED') END;
END;
--> statement-breakpoint
CREATE TRIGGER payments_guard_update BEFORE UPDATE ON payments BEGIN
SELECT CASE WHEN NEW.amount_cents<=0 OR NEW.amount_cents>100000000000 OR NEW.amount_cents<>CAST(ROUND(NEW.amount*100) AS INTEGER) OR NEW.principal_cents<0 OR NEW.interest_cents<0 OR NEW.principal_cents+NEW.interest_cents>NEW.amount_cents THEN RAISE(ABORT,'PAYMENT_PARTS') END;
SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM loans WHERE id=NEW.loan_id AND owner=NEW.owner) THEN RAISE(ABORT,'LOAN_OWNER') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND NEW.paid_at>date('now','-6 hours') THEN RAISE(ABORT,'FUTURE_PAYMENT') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND NEW.paid_at<COALESCE((SELECT disbursed_at FROM loans WHERE id=NEW.loan_id),'1900-01-01') THEN RAISE(ABORT,'BEFORE_DISBURSEMENT') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND (SELECT closed_at FROM loans WHERE id=NEW.loan_id) IS NOT NULL THEN RAISE(ABORT,'LOAN_CLOSED') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND NEW.interest_cents>0 AND (SELECT interest_mode FROM loans WHERE id=NEW.loan_id)='none' THEN RAISE(ABORT,'NO_INTEREST') END;
SELECT CASE WHEN NEW.voided_at IS NULL AND NEW.principal_cents+COALESCE((SELECT SUM(principal_cents) FROM payments WHERE loan_id=NEW.loan_id AND owner=NEW.owner AND voided_at IS NULL AND id<>OLD.id),0)>(SELECT principal_cents FROM loans WHERE id=NEW.loan_id) THEN RAISE(ABORT,'CAPITAL_EXCEEDED') END;
SELECT CASE WHEN NEW.id<>OLD.id OR NEW.loan_id<>OLD.loan_id OR NEW.owner<>OLD.owner OR NEW.operation_key IS NOT OLD.operation_key OR NEW.request_hash IS NOT OLD.request_hash OR OLD.voided_at IS NOT NULL OR NEW.revision<>OLD.revision+1 OR length(trim(NEW.change_reason))<5 THEN RAISE(ABORT,'PAYMENT_IMMUTABLE') END;
END;
--> statement-breakpoint
CREATE TRIGGER loans_guard_update BEFORE UPDATE ON loans BEGIN
 SELECT CASE WHEN NEW.principal_cents<=0 OR NEW.principal_cents<>CAST(ROUND(NEW.principal*100) AS INTEGER) OR (NEW.principal_cents IS NOT OLD.principal_cents AND NEW.principal_cents<COALESCE((SELECT SUM(principal_cents) FROM payments WHERE loan_id=OLD.id AND voided_at IS NULL),0)) THEN RAISE(ABORT,'CAPITAL_EXCEEDED') END;
 SELECT CASE WHEN (NEW.principal IS NOT OLD.principal OR NEW.principal_cents IS NOT OLD.principal_cents OR NEW.interest_mode IS NOT OLD.interest_mode OR NEW.rate IS NOT OLD.rate OR NEW.monthly_charge IS NOT OLD.monthly_charge OR NEW.installment IS NOT OLD.installment OR NEW.first_due IS NOT OLD.first_due OR NEW.frequency_days IS NOT OLD.frequency_days OR NEW.due_mode IS NOT OLD.due_mode OR NEW.disbursed_at IS NOT OLD.disbursed_at OR NEW.maturity_date IS NOT OLD.maturity_date OR NEW.installment_mode IS NOT OLD.installment_mode) AND OLD.schedule_known=1 AND EXISTS(SELECT 1 FROM payments WHERE loan_id=OLD.id) THEN RAISE(ABORT,'TERMS_LOCKED') END;
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.owner<>OLD.owner OR NEW.operation_key IS NOT OLD.operation_key OR NEW.request_hash IS NOT OLD.request_hash OR NEW.revision<>OLD.revision+1 OR length(trim(NEW.change_reason))<5 THEN RAISE(ABORT,'LOAN_IMMUTABLE') END;
END;
--> statement-breakpoint
CREATE TRIGGER loans_guard_insert BEFORE INSERT ON loans BEGIN
 SELECT CASE WHEN NEW.principal_cents<=0 OR NEW.principal_cents<>CAST(ROUND(NEW.principal*100) AS INTEGER) THEN RAISE(ABORT,'CAPITAL_EXCEEDED') END;
END;
--> statement-breakpoint
CREATE TRIGGER loans_audit_insert AFTER INSERT ON loans BEGIN INSERT INTO audit_events(id,owner,loan_id,entity_type,entity_id,action,before_json,after_json,reason,changed_at) VALUES(lower(hex(randomblob(16))),NEW.owner,NEW.id,'loans',NEW.id,'insert',NULL,json_object('principal',NEW.principal,'principal_cents',NEW.principal_cents,'name',NEW.name,'phone',NEW.phone,'interest_mode',NEW.interest_mode,'rate',NEW.rate,'monthly_charge',NEW.monthly_charge,'installment',NEW.installment,'first_due',NEW.first_due,'frequency_days',NEW.frequency_days,'due_mode',NEW.due_mode,'disbursed_at',NEW.disbursed_at,'maturity_date',NEW.maturity_date,'installment_mode',NEW.installment_mode,'closed_at',NEW.closed_at,'notes',NEW.notes,'schedule_known',NEW.schedule_known,'message_template',NEW.message_template,'revision',NEW.revision),NEW.change_reason,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
--> statement-breakpoint
CREATE TRIGGER loans_audit_update AFTER UPDATE ON loans BEGIN INSERT INTO audit_events(id,owner,loan_id,entity_type,entity_id,action,before_json,after_json,reason,changed_at) VALUES(lower(hex(randomblob(16))),NEW.owner,NEW.id,'loans',NEW.id,'update',json_object('principal',OLD.principal,'principal_cents',OLD.principal_cents,'name',OLD.name,'phone',OLD.phone,'interest_mode',OLD.interest_mode,'rate',OLD.rate,'monthly_charge',OLD.monthly_charge,'installment',OLD.installment,'first_due',OLD.first_due,'frequency_days',OLD.frequency_days,'due_mode',OLD.due_mode,'disbursed_at',OLD.disbursed_at,'maturity_date',OLD.maturity_date,'installment_mode',OLD.installment_mode,'closed_at',OLD.closed_at,'notes',OLD.notes,'schedule_known',OLD.schedule_known,'message_template',OLD.message_template,'revision',OLD.revision),json_object('principal',NEW.principal,'principal_cents',NEW.principal_cents,'name',NEW.name,'phone',NEW.phone,'interest_mode',NEW.interest_mode,'rate',NEW.rate,'monthly_charge',NEW.monthly_charge,'installment',NEW.installment,'first_due',NEW.first_due,'frequency_days',NEW.frequency_days,'due_mode',NEW.due_mode,'disbursed_at',NEW.disbursed_at,'maturity_date',NEW.maturity_date,'installment_mode',NEW.installment_mode,'closed_at',NEW.closed_at,'notes',NEW.notes,'schedule_known',NEW.schedule_known,'message_template',NEW.message_template,'revision',NEW.revision),NEW.change_reason,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
--> statement-breakpoint
CREATE TRIGGER payments_audit_insert AFTER INSERT ON payments BEGIN INSERT INTO audit_events(id,owner,loan_id,entity_type,entity_id,action,before_json,after_json,reason,changed_at) VALUES(lower(hex(randomblob(16))),NEW.owner,NEW.loan_id,'payments',NEW.id,'insert',NULL,json_object('loan_id',NEW.loan_id,'amount',NEW.amount,'amount_cents',NEW.amount_cents,'principal_cents',NEW.principal_cents,'interest_cents',NEW.interest_cents,'paid_at',NEW.paid_at,'allocation',NEW.allocation,'note',NEW.note,'voided_at',NEW.voided_at,'revision',NEW.revision),NEW.change_reason,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
--> statement-breakpoint
CREATE TRIGGER payments_audit_update AFTER UPDATE ON payments BEGIN INSERT INTO audit_events(id,owner,loan_id,entity_type,entity_id,action,before_json,after_json,reason,changed_at) VALUES(lower(hex(randomblob(16))),NEW.owner,NEW.loan_id,'payments',NEW.id,CASE WHEN NEW.voided_at IS NOT NULL THEN 'void' ELSE 'update' END,json_object('loan_id',OLD.loan_id,'amount',OLD.amount,'amount_cents',OLD.amount_cents,'principal_cents',OLD.principal_cents,'interest_cents',OLD.interest_cents,'paid_at',OLD.paid_at,'allocation',OLD.allocation,'note',OLD.note,'voided_at',OLD.voided_at,'revision',OLD.revision),json_object('loan_id',NEW.loan_id,'amount',NEW.amount,'amount_cents',NEW.amount_cents,'principal_cents',NEW.principal_cents,'interest_cents',NEW.interest_cents,'paid_at',NEW.paid_at,'allocation',NEW.allocation,'note',NEW.note,'voided_at',NEW.voided_at,'revision',NEW.revision),NEW.change_reason,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
--> statement-breakpoint
CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT,'USE_VOID'); END;

--> statement-breakpoint
CREATE TRIGGER payments_parent_insert AFTER INSERT ON payments BEGIN UPDATE loans SET revision=revision+1, change_reason='Actualización de movimientos', closed_at= CASE WHEN NEW.voided_at IS NOT NULL THEN NULL ELSE closed_at END WHERE id=NEW.loan_id; END;

--> statement-breakpoint
CREATE TRIGGER payments_parent_update AFTER UPDATE ON payments BEGIN UPDATE loans SET revision=revision+1, change_reason='Actualización de movimientos', closed_at= CASE WHEN NEW.voided_at IS NOT NULL THEN NULL ELSE closed_at END WHERE id=NEW.loan_id; END;
