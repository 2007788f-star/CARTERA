import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const loans = sqliteTable("loans", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), borrowerId: text("borrower_id"), name: text("name").notNull(),
  phone: text("phone").notNull(), principal: real("principal").notNull(),
  interestMode: text("interest_mode").notNull(), rate: real("rate").notNull(),
  installment: real("installment").notNull(), firstDue: text("first_due").notNull(),
  frequencyDays: integer("frequency_days").notNull(), notes: text("notes").notNull(),
  dueMode: text("due_mode").notNull().default("interval"),
  monthlyCharge: real("monthly_charge").notNull().default(0),
  consent: integer("consent").notNull(), reminderDays: integer("reminder_days").notNull(),
  messageTemplate: text("message_template").notNull().default(""),
  sourceRef: text("source_ref").unique(),
  scheduleKnown: integer("schedule_known").notNull().default(1),
  createdAt: text("created_at").notNull(),
});
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(), loanId: text("loan_id").notNull().references(() => loans.id),
  owner: text("owner").notNull(), amount: real("amount").notNull(),
  allocation: text("allocation").notNull().default("combined"),
  paidAt: text("paid_at").notNull(), note: text("note").notNull(),
  sourceRef: text("source_ref").unique(),
});
export const sourceEntries = sqliteTable("source_entries", {
  id: text("id").primaryKey(), owner: text("owner").notNull(),
  source: text("source").notNull(), sourceCell: text("source_cell").notNull(),
  loanId: text("loan_id").references(() => loans.id), kind: text("kind").notNull(),
  value: text("value").notNull(),
});
export const importBatches = sqliteTable("import_batches", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), importedAt: text("imported_at").notNull(),
});
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), createdAt: text("created_at").notNull(),
});
export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(), userId: text("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
});
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(), owner: text("owner").notNull().references(() => users.id),
  loanId: text("loan_id").notNull().references(() => loans.id),
  filename: text("filename").notNull(), mimeType: text("mime_type").notNull(),
  bytes: integer("bytes").notNull(), objectKey: text("object_key").notNull().unique(),
  uploadedAt: text("uploaded_at").notNull(),
});
export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(), failures: integer("failures").notNull(),
  windowStart: text("window_start").notNull(),
});
export const borrowers = sqliteTable("borrowers", {
  id:text("id").primaryKey(), owner:text("owner").notNull().references(()=>users.id),
  name:text("name").notNull(), phone:text("phone").notNull(), createdAt:text("created_at").notNull(),
});
