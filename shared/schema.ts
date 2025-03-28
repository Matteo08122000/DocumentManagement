import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// USER SCHEMA
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  notificationDays: integer("notification_days").default(30),
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

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  pointNumber: text("point_number").notNull(),
  title: text("title").notNull(),
  revision: text("revision").notNull(),
  emissionDate: timestamp("emission_date").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  expirationDate: timestamp("expiration_date"),
  status: text("status").notNull().default(documentStatus.VALID),
  parentId: integer("parent_id").references(() => documents.id),
  isObsolete: boolean("is_obsolete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

// CHILD DOCUMENT ITEMS (used for Excel files with expiration dates)
export const documentItems = pgTable("document_items", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  title: text("title").notNull(),
  description: text("description"),
  expirationDate: timestamp("expiration_date"),
  notificationDays: integer("notification_days").default(30),
  status: text("status").notNull().default(documentStatus.VALID),
  metadata: jsonb("metadata"),
});

export const insertDocumentItemSchema = createInsertSchema(documentItems).omit({
  id: true,
});

// EMAIL NOTIFICATION SCHEMA
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  documentId: integer("document_id").references(() => documents.id),
  documentItemId: integer("document_item_id").references(() => documentItems.id),
  notificationDays: integer("notification_days").notNull().default(30),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
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
  // Proprietà calcolata - status peggiore tra gli elementi controllati
  worstStatus?: typeof documentStatus[keyof typeof documentStatus];
  // Elementi collegati al documento
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
