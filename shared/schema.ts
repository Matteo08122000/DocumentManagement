import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define file types
export const fileTypeEnum = pgEnum('file_type', ['excel', 'word', 'pdf']);

// Define document statuses
export const documentStatusEnum = pgEnum('document_status', ['active', 'warning', 'critical']);

// Users table (from original schema)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Parent Documents (main documents)
export const parentDocuments = pgTable("parent_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Child Documents (individual files within parent documents)
export const childDocuments = pgTable("child_documents", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"),
  filename: text("filename").notNull(),
  pointNumber: text("point_number").notNull(), // e.g., "4.2"
  title: text("title").notNull(), // e.g., "Sicurezza Alimentare"
  revision: text("revision").notNull(), // e.g., "Rev.1"
  issueDate: text("issue_date").notNull(), // e.g., "20250325"
  fileType: fileTypeEnum("file_type").notNull(),
  expirationDate: text("expiration_date"), // Only for Excel files
  noticePeriod: integer("notice_period"), // In days, for reminders
  status: documentStatusEnum("status").default("active"),
  content: text("content"), // Store file content as base64 for in-memory storage
  isObsolete: boolean("is_obsolete").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Email notification subscriptions
export const notificationSubscriptions = pgTable("notification_subscriptions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  email: text("email").notNull(),
  noticeDays: integer("notice_days").notNull(), // Days before expiration to send notification
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define activity log for document changes
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  action: text("action").notNull(), // e.g., "created", "updated", "obsoleted"
  details: text("details").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Schema for inserting parent documents
export const insertParentDocumentSchema = createInsertSchema(parentDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting child documents
export const insertChildDocumentSchema = createInsertSchema(childDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  isObsolete: true,
});

// Schema for inserting notification subscriptions
export const insertNotificationSubscriptionSchema = createInsertSchema(notificationSubscriptions).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting activity logs
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

// Types for the schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertParentDocument = z.infer<typeof insertParentDocumentSchema>;
export type ParentDocument = typeof parentDocuments.$inferSelect;

export type InsertChildDocument = z.infer<typeof insertChildDocumentSchema>;
export type ChildDocument = typeof childDocuments.$inferSelect;

export type InsertNotificationSubscription = z.infer<typeof insertNotificationSubscriptionSchema>;
export type NotificationSubscription = typeof notificationSubscriptions.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Original user insertion schema
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
