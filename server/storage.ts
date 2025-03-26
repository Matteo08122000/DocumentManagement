import { 
  users, type User, type InsertUser,
  documents, type Document, type InsertDocument,
  expirations, type Expiration, type InsertExpiration,
  type DocumentWithExpirations
} from "@shared/schema";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserEmail(id: number, email: string, notifications: boolean, onlyCritical: boolean): Promise<User | undefined>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocuments(includeObsolete?: boolean): Promise<Document[]>;
  getDocumentById(id: number): Promise<DocumentWithExpirations | undefined>;
  getDocumentChildren(id: number): Promise<Document[]>;
  updateDocumentRevision(id: number, newRevision: string, newFilePath: string, newFileName: string): Promise<Document | undefined>;
  markDocumentAsObsolete(id: number): Promise<Document | undefined>;
  
  // Expiration operations
  createExpiration(expiration: InsertExpiration): Promise<Expiration>;
  getExpirationsByDocumentId(documentId: number): Promise<Expiration[]>;
  updateExpirationStatus(id: number, status: string): Promise<Expiration | undefined>;
}

// In-memory implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private expirations: Map<number, Expiration>;
  private userId: number;
  private documentId: number;
  private expirationId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.expirations = new Map();
    this.userId = 1;
    this.documentId = 1;
    this.expirationId = 1;
    
    // Add a default user
    this.createUser({
      username: "admin",
      password: "admin",
      email: "",
      emailNotifications: false,
      notifyOnlyForCritical: false
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUserEmail(id: number, email: string, notifications: boolean, onlyCritical: boolean): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      email,
      emailNotifications: notifications,
      notifyOnlyForCritical: onlyCritical
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Document methods
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentId++;
    const now = new Date();
    
    const document: Document = {
      ...insertDocument,
      id,
      createdAt: now
    };
    
    this.documents.set(id, document);
    return document;
  }

  async getDocuments(includeObsolete: boolean = false): Promise<Document[]> {
    const docs = Array.from(this.documents.values())
      .filter(doc => includeObsolete ? true : !doc.isObsolete)
      .sort((a, b) => {
        // Extract numeric value from point number for sorting
        const aNum = parseFloat(a.pointNumber.replace(/[^0-9.]/g, ''));
        const bNum = parseFloat(b.pointNumber.replace(/[^0-9.]/g, ''));
        return aNum - bNum;
      });
    
    return docs;
  }

  async getDocumentById(id: number): Promise<DocumentWithExpirations | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;

    const expirations = await this.getExpirationsByDocumentId(id);
    const children = await this.getDocumentChildren(id);
    
    const childrenWithExpirations: DocumentWithExpirations[] = [];
    
    for (const child of children) {
      const childExpirations = await this.getExpirationsByDocumentId(child.id);
      childrenWithExpirations.push({
        ...child,
        expirations: childExpirations,
        worstStatus: this.getWorstStatus(childExpirations)
      });
    }

    return {
      ...document,
      expirations,
      children: childrenWithExpirations,
      worstStatus: this.getWorstStatus(expirations)
    };
  }

  async getDocumentChildren(id: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.parentId === id);
  }

  async updateDocumentRevision(id: number, newRevision: string, newFilePath: string, newFileName: string): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    // Mark the current document as obsolete
    const obsoleteDoc = { ...document, isObsolete: true };
    this.documents.set(id, obsoleteDoc);
    
    // Create a new document with updated revision
    const newDoc: InsertDocument = {
      pointNumber: document.pointNumber,
      title: document.title,
      revision: newRevision,
      issueDate: document.issueDate, // Keep the same issue date
      filePath: newFilePath,
      fileName: newFileName,
      fileType: document.fileType,
      parentId: document.parentId,
      isObsolete: false
    };
    
    // Return the newly created document
    return this.createDocument(newDoc);
  }

  async markDocumentAsObsolete(id: number): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument: Document = {
      ...document,
      isObsolete: true
    };
    
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  // Expiration methods
  async createExpiration(insertExpiration: InsertExpiration): Promise<Expiration> {
    const id = this.expirationId++;
    
    const expiration: Expiration = {
      ...insertExpiration,
      id
    };
    
    this.expirations.set(id, expiration);
    return expiration;
  }

  async getExpirationsByDocumentId(documentId: number): Promise<Expiration[]> {
    return Array.from(this.expirations.values())
      .filter(exp => exp.documentId === documentId);
  }

  async updateExpirationStatus(id: number, status: string): Promise<Expiration | undefined> {
    const expiration = this.expirations.get(id);
    if (!expiration) return undefined;
    
    const updatedExpiration: Expiration = {
      ...expiration,
      status
    };
    
    this.expirations.set(id, updatedExpiration);
    return updatedExpiration;
  }

  // Helper function to determine worst status
  private getWorstStatus(expirations: Expiration[]): string {
    if (!expirations || expirations.length === 0) return "valid";
    
    if (expirations.some(exp => exp.status === "expired")) {
      return "expired";
    } else if (expirations.some(exp => exp.status === "expiring")) {
      return "expiring";
    }
    
    return "valid";
  }
}

export const storage = new MemStorage();
