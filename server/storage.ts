// storage.ts
import mysql from "mysql";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

export type User = {
  id: number;
  username: string;
  email: string;
  password: string;
  created_at?: Date;
  active?: boolean;
};

export type Document = {
  id: number;
  pointNumber: string;
  title: string;
  revision: string;
  emissionDate: Date;
  filePath: string;
  fileType: string;
  status: string;
  expirationDate?: Date | null;
  isObsolete?: boolean;
  parentId?: number | null;
  userId: number;
};

export type DocumentItem = {
  id: number;
  documentId: number;
  title: string;
  description?: string;
  expirationDate?: Date | null;
  notificationDays?: number;
  status: string;
  file_url?: string | null;
};

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || "docgenius",
});

export const storage = {
  // === USER FUNCTIONS ===
  async getUserByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email],
        (error, results) => {
          if (error) return reject(error);
          resolve(results.length > 0 ? (results[0] as User) : null);
        }
      );
    });
  },

  async getUserByUsername(username: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM users WHERE username = ? LIMIT 1",
        [username],
        (error, results) => {
          if (error) return reject(error);
          resolve(results.length > 0 ? (results[0] as User) : null);
        }
      );
    });
  },

  async createUser(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<User> {
    return new Promise((resolve, reject) => {
      const query =
        "INSERT INTO users (username, email, password, created_at, active) VALUES (?, ?, ?, NOW(), true)";
      pool.query(
        query,
        [data.username, data.email, data.password],
        (error, results) => {
          if (error) return reject(error);
          const newUser: User = {
            id: (results as any).insertId,
            username: data.username,
            email: data.email,
            password: data.password,
            created_at: new Date(),
            active: true,
          };
          resolve(newUser);
        }
      );
    });
  },

  async getUser(id: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [id],
        (error, results) => {
          if (error) return reject(error);
          resolve(results.length > 0 ? (results[0] as User) : null);
        }
      );
    });
  },

  // === DOCUMENT FUNCTIONS ===
  async getDocuments(
    userId: number,
    includeObsolete: boolean = false
  ): Promise<Document[]> {
    return new Promise((resolve, reject) => {
      const query = includeObsolete
        ? "SELECT * FROM documents WHERE userId = ?"
        : "SELECT * FROM documents WHERE userId = ? AND (isObsolete IS NULL OR isObsolete = false)";

      pool.query(query, [userId], (error, results) => {
        if (error) return reject(error);
        resolve(results as Document[]);
      });
    });
  },

  async getDocumentById(id: number): Promise<Document | null> {
    return new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM documents WHERE id = ?",
        [id],
        (error, results) => {
          if (error) return reject(error);
          resolve(results.length > 0 ? (results[0] as Document) : null);
        }
      );
    });
  },

  async getDocumentItems(documentId: number): Promise<DocumentItem[]> {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM document_items WHERE documentId = ?";
      pool.query(query, [documentId], (error, results) => {
        if (error) return reject(error);
        resolve(results as DocumentItem[]);
      });
    });
  },

  async getChildDocuments(parentId: number): Promise<Document[]> {
    return new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM documents WHERE parentId = ?",
        [parentId],
        (error, results) => {
          if (error) return reject(error);
          resolve(results as Document[]);
        }
      );
    });
  },

  async createDocument(data: Omit<Document, "id">): Promise<Document> {
    return new Promise((resolve, reject) => {
      const query =
        "INSERT INTO documents (pointNumber, title, revision, emissionDate, filePath, fileType, status, expirationDate, isObsolete, parentId, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      pool.query(
        query,
        [
          data.pointNumber,
          data.title,
          data.revision,
          data.emissionDate,
          data.filePath,
          data.fileType,
          data.status,
          data.expirationDate || null,
          data.isObsolete || false,
          data.parentId || null,
          data.userId,
        ],
        (error, results) => {
          if (error) return reject(error);
          const newDoc: Document = {
            id: (results as any).insertId,
            ...data,
          };
          resolve(newDoc);
        }
      );
    });
  },

  async markDocumentObsolete(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      pool.query(
        "UPDATE documents SET isObsolete = true WHERE id = ?",
        [id],
        (error) => {
          if (error) return reject(error);
          resolve(true);
        }
      );
    });
  },

  async updateDocument(
    id: number,
    updateData: Partial<Document>
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(updateData);
      if (keys.length === 0) {
        return reject(new Error("Nessun campo da aggiornare"));
      }

      const fields = keys.map((key) => `${key} = ?`).join(", ");
      const values = Object.values(updateData);
      const query = `UPDATE documents SET ${fields} WHERE id = ?`;

      pool.query(query, [...values, id], (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    });
  },

  async getDocumentItemById(id: number): Promise<DocumentItem | null> {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM document_items WHERE id = ?";
      pool.query(query, [id], (error, results) => {
        if (error) return reject(error);
        resolve(results.length > 0 ? (results[0] as DocumentItem) : null);
      });
    });
  },

  async createDocumentItem(item: {
    documentId: number;
    title: string;
    description?: string;
    expirationDate?: Date | null;
    notificationDays?: number;
    status: string;
  }): Promise<DocumentItem> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO document_items (documentId, title, description, expirationDate, notificationDays, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const values = [
        item.documentId,
        item.title,
        item.description || null,
        item.expirationDate || null,
        item.notificationDays || 0,
        item.status,
      ];
      pool.query(query, values, (err, results) => {
        if (err) return reject(err);
        resolve({
          id: (results as any).insertId,
          ...item,
        });
      });
    });
  },

  async saveDocumentItemFile(file: {
    itemId: number;
    filePath: string;
    fileType: string;
    originalName: string;
  }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO document_item_files (itemId, filePath, fileType, originalName)
        VALUES (?, ?, ?, ?)
      `;
      const values = [
        file.itemId,
        file.filePath,
        file.fileType,
        file.originalName,
      ];
      pool.query(query, values, (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    });
  },

  async updateDocumentItem(
    id: number,
    data: Partial<DocumentItem>
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(data)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = Object.values(data);
      const query = `UPDATE document_items SET ${fields} WHERE id = ?`;
      pool.query(query, [...values, id], (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    });
  },

  async deleteDocumentItem(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM document_items WHERE id = ?";
      pool.query(query, [id], (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    });
  },

  async deleteDocument(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM documents WHERE id = ?";
      pool.query(query, [id], (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    });
  },

  async moveToObsolete(oldPath: string): Promise<string | null> {
    try {
      const obsoleteDir = path.resolve(process.cwd(), "uploads", "obsoleti");
      fs.mkdirSync(obsoleteDir, { recursive: true });

      const fileName = path.basename(oldPath);
      const newPath = path.join(obsoleteDir, fileName);

      fs.copyFileSync(oldPath, newPath); // <-- cambia da renameSync a copyFileSync
      return newPath;
    } catch (err) {
      console.error("Errore spostamento in obsoleti:", err);
      return null;
    }
  },
};
