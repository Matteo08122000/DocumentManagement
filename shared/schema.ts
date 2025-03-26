import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  emailNotifications: boolean("email_notifications").default(false),
  notifyOnlyForCritical: boolean("notify_only_for_critical").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  emailNotifications: true,
  notifyOnlyForCritical: true,
});

// Document schema for tracking uploaded files
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  pointNumber: text("point_number").notNull(), // e.g. "4.2"
  title: text("title").notNull(), // e.g. "Sicurezza Alimentare"
  revision: text("revision").notNull(), // e.g. "Rev.1"
  issueDate: text("issue_date").notNull(), // e.g. "20250325"
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // pdf, excel, word
  parentId: integer("parent_id").references(() => documents.id, { onDelete: "set null" }),
  isObsolete: boolean("is_obsolete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ 
  id: true,
  createdAt: true
});

// Expiration data schema (only for Excel files)
export const expirations = pgTable("expirations", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  expirationDate: text("expiration_date").notNull(),
  warningDays: integer("warning_days").notNull(), // Days before expiration to send notification
  status: text("status").notNull().default("valid"), // valid, expiring, expired
});

export const insertExpirationSchema = createInsertSchema(expirations).omit({
  id: true
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Expiration = typeof expirations.$inferSelect;
export type InsertExpiration = z.infer<typeof insertExpirationSchema>;

// Custom types for frontend use
export type DocumentWithExpirations = Document & {
  expirations?: Expiration[];
  children?: DocumentWithExpirations[];
  worstStatus?: string;
};
