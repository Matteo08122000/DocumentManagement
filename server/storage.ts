import { 
  users, type User, type InsertUser,
  documents, type Document, type InsertDocument,
  documentItems, type DocumentItem, type InsertDocumentItem,
  notifications, type Notification, type InsertNotification,
  documentStatus
} from "@shared/schema";
import path from "path";
import fs from "fs";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserEmail(id: number, email: string): Promise<User | undefined>;
  updateUserNotificationDays(id: number, days: number): Promise<User | undefined>;
  
  // Document methods
  getDocuments(includeObsolete?: boolean): Promise<Document[]>;
  getDocumentById(id: number): Promise<Document | undefined>;
  getChildDocuments(parentId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  markDocumentObsolete(id: number): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Document items methods
  getDocumentItems(documentId: number): Promise<DocumentItem[]>;
  getDocumentItemById(id: number): Promise<DocumentItem | undefined>;
  createDocumentItem(item: InsertDocumentItem): Promise<DocumentItem>;
  updateDocumentItem(id: number, item: Partial<InsertDocumentItem>): Promise<DocumentItem | undefined>;
  deleteDocumentItem(id: number): Promise<boolean>;
  
  // Notification methods
  getNotifications(): Promise<Notification[]>;
  getNotificationsByEmail(email: string): Promise<Notification[]>;
  getNotificationsByDocument(documentId: number): Promise<Notification[]>;
  getNotificationsByDocumentItem(itemId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification | undefined>;
  deleteNotification(id: number): Promise<boolean>;
  
  // File operations
  moveToObsolete(filePath: string): Promise<string | null>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private documentItems: Map<number, DocumentItem>;
  private notifications: Map<number, Notification>;
  
  private userId: number;
  private documentId: number;
  private documentItemId: number;
  private notificationId: number;
  
  // File system paths
  private basePath: string;
  private obsoletePath: string;
  
  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.documentItems = new Map();
    this.notifications = new Map();
    
    this.userId = 1;
    this.documentId = 1;
    this.documentItemId = 1;
    this.notificationId = 1;
    
    // Setup file paths
    this.basePath = path.resolve(process.cwd(), 'uploads');
    this.obsoletePath = path.resolve(process.cwd(), 'uploads/obsoleti');
    
    // Create directories if they don't exist
    this.ensureDirectories();
  }
  
  private ensureDirectories() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
    
    if (!fs.existsSync(this.obsoletePath)) {
      fs.mkdirSync(this.obsoletePath, { recursive: true });
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserEmail(id: number, email: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, email };
    this.users.set(id, updated);
    return updated;
  }
  
  async updateUserNotificationDays(id: number, days: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, notificationDays: days };
    this.users.set(id, updated);
    return updated;
  }
  
  // Document methods
  async getDocuments(includeObsolete: boolean = false): Promise<Document[]> {
    const docs = Array.from(this.documents.values());
    return includeObsolete ? docs : docs.filter(doc => !doc.isObsolete);
  }
  
  async getDocumentById(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getChildDocuments(parentId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      doc => doc.parentId === parentId && !doc.isObsolete
    );
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentId++;
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: new Date() 
    };
    
    this.documents.set(id, document);
    return document;
  }
  
  async updateDocument(id: number, documentUpdate: Partial<InsertDocument>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updated = { ...document, ...documentUpdate };
    this.documents.set(id, updated);
    return updated;
  }
  
  async markDocumentObsolete(id: number): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updated = { ...document, isObsolete: true };
    this.documents.set(id, updated);
    return updated;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
  
  // Document items methods
  async getDocumentItems(documentId: number): Promise<DocumentItem[]> {
    return Array.from(this.documentItems.values()).filter(
      item => item.documentId === documentId
    );
  }
  
  async getDocumentItemById(id: number): Promise<DocumentItem | undefined> {
    return this.documentItems.get(id);
  }
  
  async createDocumentItem(insertItem: InsertDocumentItem): Promise<DocumentItem> {
    const id = this.documentItemId++;
    const item: DocumentItem = { ...insertItem, id };
    
    this.documentItems.set(id, item);
    return item;
  }
  
  async updateDocumentItem(id: number, itemUpdate: Partial<InsertDocumentItem>): Promise<DocumentItem | undefined> {
    const item = this.documentItems.get(id);
    if (!item) return undefined;
    
    const updated = { ...item, ...itemUpdate };
    this.documentItems.set(id, updated);
    return updated;
  }
  
  async deleteDocumentItem(id: number): Promise<boolean> {
    return this.documentItems.delete(id);
  }
  
  // Notification methods
  async getNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values());
  }
  
  async getNotificationsByEmail(email: string): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      notification => notification.email === email
    );
  }
  
  async getNotificationsByDocument(documentId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      notification => notification.documentId === documentId
    );
  }
  
  async getNotificationsByDocumentItem(itemId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      notification => notification.documentItemId === itemId
    );
  }
  
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const notification: Notification = { 
      ...insertNotification, 
      id, 
      createdAt: new Date() 
    };
    
    this.notifications.set(id, notification);
    return notification;
  }
  
  async updateNotification(id: number, notificationUpdate: Partial<InsertNotification>): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updated = { ...notification, ...notificationUpdate };
    this.notifications.set(id, updated);
    return updated;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }
  
  // File operations
  async moveToObsolete(filePath: string): Promise<string | null> {
    try {
      const fileName = path.basename(filePath);
      const destPath = path.join(this.obsoletePath, fileName);
      
      // Make sure directories exist
      this.ensureDirectories();
      
      // Copy file to obsolete directory
      fs.copyFileSync(filePath, destPath);
      
      return destPath;
    } catch (error) {
      console.error('Error moving file to obsolete:', error);
      return null;
    }
  }
}

export const storage = new MemStorage();
