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
  notification_value: int("notification_days").default(30),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  notification_value: true,
});

// DOCUMENT SCHEMA
export const documentStatus = {
  VALID: "valid",
  EXPIRING: "expiring",
  EXPIRED: "expired",
  REVOKED: "revoked",
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
  expiration_date: datetime("expiration_date"),
  status: varchar("status", { length: 50 }).notNull().default("valid"),
  parentId: int("parent_id"),
  isObsolete: boolean("isObsolete").default(false),
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
  documentId: int("documentId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  revision: int("revision").notNull(),
  description: varchar("description", { length: 1000 }),
  emission_date: datetime("emission_date").notNull().default(new Date()),
  validity_value: int("validity_value").notNull(),
  validity_unit: varchar("validity_unit", { length: 10 }).notNull(), // "months" | "years"
  expiration_date: datetime("expiration_date"),
  notification_value: int("notification_value").notNull().default(30),
  notification_unit: varchar("notification_unit", { length: 10 })
    .notNull()
    .default("days"), // "days" | "months"
  status: varchar("status", { length: 50 }).notNull().default("valid"),
  file_url: varchar("file_url", { length: 1024 }),
  notification_email: varchar("notification_email", { length: 255 }),
  isObsolete: boolean("isObsolete").notNull().default(false),
});
function calculate_expiration_date(
  emissionDate: Date,
  validityValue: number,
  validityUnit: "months" | "years"
): Date {
  const result = new Date(emissionDate);
  if (validityUnit === "months") {
    result.setMonth(result.getMonth() + validityValue);
  } else {
    result.setFullYear(result.getFullYear() + validityValue);
  }
  return result;
}

export const insertDocumentItemSchema = z
  .object({
    documentId: z.number(),
    title: z.string().min(1),
    description: z.string().optional(),
    emission_date: z.preprocess((val) => {
      if (typeof val === "string" || val instanceof Date) {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) return parsed;
      }
      return undefined;
    }, z.date({ required_error: "La data di emissione è obbligatoria" })),
    validity_value: z.number().min(1),
    validity_unit: z.enum(["months", "years"]),
    notification_value: z.number().min(0).default(30),
    notification_unit: z.enum(["days", "months"]).default("days"),
    file_url: z.string().optional(),
    notification_email: z.string().email().optional().nullable(),
    revision: z.number().min(1, "La revisione è obbligatoria"),
    isObsolete: z.boolean().optional(),
  })
  .transform((data) => {
    const expiration_date = calculate_expiration_date(
      data.emission_date,
      data.validity_value,
      data.validity_unit
    );

    return {
      ...data,
      expiration_date,
      status: "valid", // lo aggiungiamo qui
    };
  });
// EMAIL NOTIFICATION SCHEMA
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(), // aggiunto
  email: varchar("email", { length: 255 }).notNull(),
  message: varchar("message", { length: 1000 }).notNull(), // aggiunto
  is_read: boolean("is_read").default(false), // aggiunto
  documentId: int("documentId"),
  documentItemId: int("document_item_id"),
  notification_value: int("notification_days").notNull().default(30),
  active: boolean("active").default(true),
  createdAt: datetime("created_at").default(new Date()),
});

export const insertNotificationSchema = z.object({
  documentId: z.number().optional(),
  documentItemId: z.number().optional(),
  message: z.string(),
  email: z.string().email(),
  notification_value: z.number(),
  is_read: z.boolean().optional(),
  active: z.boolean().optional(),
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
