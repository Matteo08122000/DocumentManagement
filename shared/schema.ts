import {
  mysqlTable,
  varchar,
  serial,
  int,
  boolean,
  datetime,
  json,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// USER SCHEMA
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  notificationDays: int("notification_days").default(30),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  notificationDays: true,
});

// DOCUMENT SCHEMA
export const documentStatus = {
  VALID: "valid",
  EXPIRING: "expiring",
  EXPIRED: "expired",
} as const;

export const documentTypes = {
  EXCEL: "excel",
  WORD: "word",
  PDF: "pdf",
} as const;

export const documents = mysqlTable("documents", {
  id: serial("id").primaryKey(),
  pointNumber: varchar("point_number", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  revision: varchar("revision", { length: 255 }).notNull(),
  emissionDate: datetime("emission_date").notNull(),
  filePath: varchar("file_path", { length: 1024 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  expirationDate: datetime("expiration_date"),
  status: varchar("status", { length: 50 }).notNull().default("valid"),
  parentId: int("parent_id"),
  isObsolete: boolean("is_obsolete").default(false),
  createdAt: datetime("created_at").default(new Date()),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

// CHILD DOCUMENT ITEMS (used for Excel files with expiration dates)
// Aggiungi la colonna per il file associato agli elementi
export const documentItems = mysqlTable("document_items", {
  id: serial("id").primaryKey(),
  documentId: int("document_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  expirationDate: datetime("expiration_date"),
  notificationDays: int("notification_days").default(30),
  status: varchar("status", { length: 50 }).default("valid").notNull(),
  metadata: json("metadata"),
  fileUrl: varchar("file_url", { length: 1024 }), // Ecco come rendere il campo "nullable"
});

export const insertDocumentItemSchema = createInsertSchema(documentItems)
  .omit({
    id: true,
  })
  .transform((data) => ({
    ...data,
    // Se expirationDate è una stringa, la convertiamo in un oggetto Date
    expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
  }));

// EMAIL NOTIFICATION SCHEMA
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  documentId: int("document_id"),
  documentItemId: int("document_item_id"),
  notificationDays: int("notification_days").notNull().default(30),
  active: boolean("active").default(true),
  createdAt: datetime("created_at").default(new Date()),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// EXPORT TYPES
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Type base dal database
export type Document = typeof documents.$inferSelect & {
  file_url?: string;
  worstStatus?: (typeof documentStatus)[keyof typeof documentStatus];
  children?: Document[];
};
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type DocumentItem = typeof documentItems.$inferSelect;
export type InsertDocumentItem = z.infer<typeof insertDocumentItemSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// PARSING DOCUMENT NAME SCHEMA
export const parseDocumentNameSchema = z.object({
  pointNumber: z.string(),
  title: z.string(),
  revision: z.string(),
  date: z.string(),
});
