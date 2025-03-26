import { 
  ChildDocument, 
  InsertChildDocument, 
  ParentDocument, 
  InsertParentDocument,
  ActivityLog,
  InsertActivityLog,
  NotificationSubscription,
  InsertNotificationSubscription,
  User,
  InsertUser 
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations (from original)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Parent document operations
  getParentDocuments(): Promise<ParentDocument[]>;
  getParentDocument(id: number): Promise<ParentDocument | undefined>;
  createParentDocument(document: InsertParentDocument): Promise<ParentDocument>;
  updateParentDocument(id: number, document: Partial<InsertParentDocument>): Promise<ParentDocument | undefined>;
  deleteParentDocument(id: number): Promise<boolean>;

  // Child document operations
  getChildDocuments(parentId?: number): Promise<ChildDocument[]>;
  getChildDocument(id: number): Promise<ChildDocument | undefined>;
  getChildDocumentsByPointNumber(pointNumber: string): Promise<ChildDocument[]>;
  createChildDocument(document: InsertChildDocument): Promise<ChildDocument>;
  updateChildDocument(id: number, document: Partial<InsertChildDocument>): Promise<ChildDocument | undefined>;
  deleteChildDocument(id: number): Promise<boolean>;
  getExpiringDocuments(): Promise<ChildDocument[]>;
  getObsoleteDocuments(): Promise<ChildDocument[]>;
  markDocumentAsObsolete(id: number): Promise<ChildDocument | undefined>;

  // Activity log operations
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Notification subscription operations
  getNotificationSubscriptions(documentId: number): Promise<NotificationSubscription[]>;
  createNotificationSubscription(subscription: InsertNotificationSubscription): Promise<NotificationSubscription>;
  deleteNotificationSubscription(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private parentDocuments: Map<number, ParentDocument>;
  private childDocuments: Map<number, ChildDocument>;
  private activityLogs: Map<number, ActivityLog>;
  private notificationSubscriptions: Map<number, NotificationSubscription>;

  private userCurrentId: number;
  private parentDocCurrentId: number;
  private childDocCurrentId: number;
  private activityLogCurrentId: number;
  private notificationSubscriptionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.parentDocuments = new Map();
    this.childDocuments = new Map();
    this.activityLogs = new Map();
    this.notificationSubscriptions = new Map();

    this.userCurrentId = 1;
    this.parentDocCurrentId = 1;
    this.childDocCurrentId = a1;
    this.activityLogCurrentId = 1;
    this.notificationSubscriptionCurrentId = 1;

    // Add a default parent document
    this.createParentDocument({ title: "Main Document" });

    // Add some sample child documents for testing
    this.seedSampleData();
  }

  // User operations (from original)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Parent document operations
  async getParentDocuments(): Promise<ParentDocument[]> {
    return Array.from(this.parentDocuments.values());
  }

  async getParentDocument(id: number): Promise<ParentDocument | undefined> {
    return this.parentDocuments.get(id);
  }

  async createParentDocument(document: InsertParentDocument): Promise<ParentDocument> {
    const id = this.parentDocCurrentId++;
    const now = new Date();
    const parentDocument: ParentDocument = { 
      ...document, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    
    this.parentDocuments.set(id, parentDocument);
    return parentDocument;
  }

  async updateParentDocument(id: number, document: Partial<InsertParentDocument>): Promise<ParentDocument | undefined> {
    const existingDoc = this.parentDocuments.get(id);
    if (!existingDoc) return undefined;

    const updatedDoc: ParentDocument = { 
      ...existingDoc, 
      ...document, 
      updatedAt: new Date() 
    };
    
    this.parentDocuments.set(id, updatedDoc);
    return updatedDoc;
  }

  async deleteParentDocument(id: number): Promise<boolean> {
    return this.parentDocuments.delete(id);
  }

  // Child document operations
  async getChildDocuments(parentId?: number): Promise<ChildDocument[]> {
    const documents = Array.from(this.childDocuments.values())
      .filter(doc => !doc.isObsolete && (parentId === undefined || doc.parentId === parentId))
      .sort((a, b) => {
        // Sort by point number
        const pointA = parseFloat(a.pointNumber);
        const pointB = parseFloat(b.pointNumber);
        return pointA - pointB;
      });
    
    return documents;
  }

  async getChildDocument(id: number): Promise<ChildDocument | undefined> {
    return this.childDocuments.get(id);
  }

  async getChildDocumentsByPointNumber(pointNumber: string): Promise<ChildDocument[]> {
    return Array.from(this.childDocuments.values())
      .filter(doc => doc.pointNumber === pointNumber);
  }

  async createChildDocument(document: InsertChildDocument): Promise<ChildDocument> {
    const id = this.childDocCurrentId++;
    const now = new Date();
    
    // Check if there's an older revision of the same document
    const existingDocs = await this.getChildDocumentsByPointNumber(document.pointNumber);
    
    // If the document exists, mark the old one as obsolete
    if (existingDocs.length > 0) {
      for (const doc of existingDocs) {
        if (doc.title === document.title && !doc.isObsolete) {
          await this.markDocumentAsObsolete(doc.id);
          
          // Create activity log for obsoleting document
          await this.createActivityLog({
            documentId: doc.id,
            action: "obsoleted",
            details: `${doc.pointNumber}-${doc.title}-${doc.revision} moved to obsolete`
          });
        }
      }
    }
    
    // Determine appropriate status based on expiration date
    let status = "active";
    if (document.expirationDate) {
      const today = new Date();
      const expiryDate = new Date(
        parseInt(document.expirationDate.substring(0, 4)),
        parseInt(document.expirationDate.substring(4, 6)) - 1,
        parseInt(document.expirationDate.substring(6, 8))
      );
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        status = "critical";
      } else if (document.noticePeriod && daysUntilExpiry <= document.noticePeriod) {
        status = "warning";
      }
    }

    const childDocument: ChildDocument = { 
      ...document, 
      id, 
      status: status as any,
      isObsolete: false,
      createdAt: now, 
      updatedAt: now 
    };
    
    this.childDocuments.set(id, childDocument);
    
    // Create activity log for new document
    await this.createActivityLog({
      documentId: id,
      action: "created",
      details: `New document: ${childDocument.pointNumber}-${childDocument.title}-${childDocument.revision}`
    });
    
    return childDocument;
  }

  async updateChildDocument(id: number, document: Partial<InsertChildDocument>): Promise<ChildDocument | undefined> {
    const existingDoc = this.childDocuments.get(id);
    if (!existingDoc) return undefined;

    // Update document
    const updatedDoc: ChildDocument = { 
      ...existingDoc, 
      ...document, 
      updatedAt: new Date() 
    };
    
    // Determine status if expiration date changed
    if (document.expirationDate) {
      const today = new Date();
      const expiryDate = new Date(
        parseInt(document.expirationDate.substring(0, 4)),
        parseInt(document.expirationDate.substring(4, 6)) - 1,
        parseInt(document.expirationDate.substring(6, 8))
      );
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        updatedDoc.status = "critical" as any;
      } else if (updatedDoc.noticePeriod && daysUntilExpiry <= updatedDoc.noticePeriod) {
        updatedDoc.status = "warning" as any;
      } else {
        updatedDoc.status = "active" as any;
      }
    }
    
    this.childDocuments.set(id, updatedDoc);
    
    // Create activity log
    await this.createActivityLog({
      documentId: id,
      action: "updated",
      details: `Updated document: ${updatedDoc.pointNumber}-${updatedDoc.title}-${updatedDoc.revision}`
    });
    
    return updatedDoc;
  }

  async deleteChildDocument(id: number): Promise<boolean> {
    return this.childDocuments.delete(id);
  }

  async getExpiringDocuments(): Promise<ChildDocument[]> {
    return Array.from(this.childDocuments.values())
      .filter(doc => 
        !doc.isObsolete && 
        (doc.status === "warning" || doc.status === "critical") &&
        doc.expirationDate !== undefined
      );
  }

  async getObsoleteDocuments(): Promise<ChildDocument[]> {
    return Array.from(this.childDocuments.values())
      .filter(doc => doc.isObsolete);
  }

  async markDocumentAsObsolete(id: number): Promise<ChildDocument | undefined> {
    const document = this.childDocuments.get(id);
    if (!document) return undefined;
    
    const updatedDoc: ChildDocument = {
      ...document,
      isObsolete: true,
      updatedAt: new Date()
    };
    
    this.childDocuments.set(id, updatedDoc);
    return updatedDoc;
  }

  // Activity log operations
  async getActivityLogs(limit: number = 10): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogCurrentId++;
    const activityLog: ActivityLog = {
      ...log,
      id,
      timestamp: new Date()
    };
    
    this.activityLogs.set(id, activityLog);
    return activityLog;
  }

  // Notification subscription operations
  async getNotificationSubscriptions(documentId: number): Promise<NotificationSubscription[]> {
    return Array.from(this.notificationSubscriptions.values())
      .filter(sub => sub.documentId === documentId);
  }

  async createNotificationSubscription(subscription: InsertNotificationSubscription): Promise<NotificationSubscription> {
    const id = this.notificationSubscriptionCurrentId++;
    const notificationSubscription: NotificationSubscription = {
      ...subscription,
      id,
      createdAt: new Date()
    };
    
    this.notificationSubscriptions.set(id, notificationSubscription);
    return notificationSubscription;
  }

  async deleteNotificationSubscription(id: number): Promise<boolean> {
    return this.notificationSubscriptions.delete(id);
  }

  // Seed data for testing
  private seedSampleData() {
    // Add sample documents
    const sampleDocs = [
      {
        parentId: 1,
        filename: "4.2-Sicurezza Alimentare-Rev.2-20250325.xlsx",
        pointNumber: "4.2",
        title: "Sicurezza Alimentare",
        revision: "Rev.2",
        issueDate: "20250325",
        fileType: "excel" as const,
        expirationDate: "20250915",
        noticePeriod: 30,
        content: "Base64 content would go here",
        status: "active" as const
      },
      {
        parentId: 1,
        filename: "5.1-Controllo Qualità-Rev.1-20250210.xlsx",
        pointNumber: "5.1",
        title: "Controllo Qualità",
        revision: "Rev.1",
        issueDate: "20250210",
        fileType: "excel" as const,
        expirationDate: "20250615",
        noticePeriod: 30,
        content: "Base64 content would go here",
        status: "warning" as const
      },
      {
        parentId: 1,
        filename: "3.7-Procedure Operative-Rev.3-20250105.xlsx",
        pointNumber: "3.7",
        title: "Procedure Operative",
        revision: "Rev.3",
        issueDate: "20250105",
        fileType: "excel" as const,
        expirationDate: "20250501",
        noticePeriod: 15,
        content: "Base64 content would go here",
        status: "critical" as const
      },
      {
        parentId: 1,
        filename: "6.3-Manutenzione-Rev.1-20250412.docx",
        pointNumber: "6.3",
        title: "Manutenzione",
        revision: "Rev.1",
        issueDate: "20250412",
        fileType: "word" as const,
        content: "Base64 content would go here",
        status: "active" as const
      },
      {
        parentId: 1,
        filename: "7.1-Documenti Normativi-Rev.2-20250218.pdf",
        pointNumber: "7.1",
        title: "Documenti Normativi",
        revision: "Rev.2",
        issueDate: "20250218",
        fileType: "pdf" as const,
        content: "Base64 content would go here",
        status: "active" as const
      }
    ];

    sampleDocs.forEach(doc => {
      const id = this.childDocCurrentId++;
      const now = new Date();
      
      const childDocument: ChildDocument = { 
        ...doc, 
        id,
        isObsolete: false,
        createdAt: now, 
        updatedAt: now 
      };
      
      this.childDocuments.set(id, childDocument);
    });

    // Add obsolete document
    const obsoleteDoc: ChildDocument = {
      id: this.childDocCurrentId++,
      parentId: 1,
      filename: "4.2-Sicurezza Alimentare-Rev.1-20250220.xlsx",
      pointNumber: "4.2",
      title: "Sicurezza Alimentare",
      revision: "Rev.1",
      issueDate: "20250220",
      fileType: "excel",
      expirationDate: "20250815",
      noticePeriod: 30,
      content: "Base64 content would go here",
      status: "active",
      isObsolete: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.childDocuments.set(obsoleteDoc.id, obsoleteDoc);

    // Add some activity logs
    const sampleLogs = [
      {
        documentId: 1,
        action: "created",
        details: "New document: 4.2-Sicurezza Alimentare-Rev.2"
      },
      {
        documentId: 6,
        action: "obsoleted",
        details: "4.2-Sicurezza Alimentare-Rev.1 moved to obsolete"
      },
      {
        documentId: 5,
        action: "created",
        details: "New document: 7.1-Documenti Normativi-Rev.2"
      }
    ];

    sampleLogs.forEach(log => {
      const id = this.activityLogCurrentId++;
      
      const activityLog: ActivityLog = {
        ...log,
        id,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)) // Random time in last 24 hours
      };
      
      this.activityLogs.set(id, activityLog);
    });
  }
}

export const storage = new MemStorage();
