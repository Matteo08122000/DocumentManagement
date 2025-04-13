import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "./.env") });
import mysql from "mysql";
import { calcolaStatus } from "@shared/documentUtils";
import fs from "fs";
import { InsertDocumentItem } from "@shared/schema";
import { handleDocumentItemRevisionUpdate } from "./lib/documentItemUtils";

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
  expiration_date?: Date | null;
  isObsolete?: boolean;
  parentId?: number | null;
  userId: number;
};

export type DocumentItem = {
  id: number;
  documentId: number;
  title: string;
  revision: number;
  description?: string;
  expiration_date?: Date | null;
  notification_unit?: "days" | "months";
  notification_value?: number;
  status: string;
  file_url?: string | null;
  emission_date?: Date;
  isObsolete: boolean;
  validity_value?: number;
  validity_unit?: "months" | "years";
  notification_email?: string | null;
};

export type Notification = {
  id: number;
  userId: number;
  documentId: number;
  message: string;
  is_read: boolean;
  email: string;
  notification_value: number;
  active: boolean;
};

export const pool = mysql.createPool({
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

  saveDocumentItemFile: async ({
    itemId,
    filePath,
    fileType,
    originalName,
  }: {
    itemId: number;
    filePath: string;
    fileType: string;
    originalName: string;
  }): Promise<string> => {
    try {
      const itemDir = path.resolve(
        process.cwd(),
        "uploads",
        "items",
        String(itemId)
      );

      fs.mkdirSync(itemDir, { recursive: true });

      const destPath = path.join(itemDir, originalName);

      fs.renameSync(filePath, destPath);

      return `/uploads/items/${itemId}/${originalName}`;
    } catch (err) {
      console.error("❌ Errore in saveDocumentItemFile:", err);
      throw err;
    }
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

  async getDocumentItems(
    documentId: number,
    includeObsolete: boolean = false
  ): Promise<DocumentItem[]> {
    return new Promise((resolve, reject) => {
      const query = includeObsolete
        ? "SELECT * FROM document_items WHERE documentId = ? AND isObsolete = true"
        : "SELECT * FROM document_items WHERE documentId = ? AND isObsolete = false";

      pool.query(query, [documentId], (error, results) => {
        if (error) return reject(error);

        const items = (results as DocumentItem[]).map((item) => ({
          ...item,
          status: calcolaStatus(item.expiration_date, item.notification_value),
        }));

        resolve(items);
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
        "INSERT INTO documents (pointNumber, title, revision, emissionDate, filePath, fileType, status, expiration_date, isObsolete, parentId, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
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
          data.expiration_date || null,
          data.isObsolete || false,
          data.parentId || null,
          data.userId,
        ],
        (error, results: any) => {
          if (error) return reject(error);

          // ✅ FIX: assegna esplicitamente l'id così:
          const newDoc: Document = {
            ...data,
            id: results.insertId, // <--- ESATTAMENTE COSÌ
          };

          resolve(newDoc);
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
  async createDocumentItem(item: InsertDocumentItem): Promise<DocumentItem> {
    return new Promise((resolve, reject) => {
      const checkQuery = `
        SELECT revision FROM document_items
        WHERE documentId = ? AND title = ? AND isObsolete = false
        ORDER BY revision DESC
        LIMIT 1
      `;

      pool.query(
        checkQuery,
        [item.documentId, item.title],
        (revErr, results) => {
          if (revErr) return reject(revErr);

          const latest = results[0];
          if (latest) {
            if (item.revision < latest.revision) {
              return reject(
                new Error("Revisione inferiore a quella esistente")
              );
            }
            if (item.revision === latest.revision) {
              return reject(
                new Error("Revisione già esistente per questo titolo")
              );
            }
          }

          // ✅ Se siamo qui, possiamo inserire
          const insertQuery = `
            INSERT INTO document_items 
            (documentId, title, revision, description, emission_date, validity_value, validity_unit,
              expiration_date, notification_value, notification_unit, status, file_url, notification_email, isObsolete)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          const values = [
            item.documentId,
            item.title,
            item.revision,
            item.description || null,
            item.emission_date,
            item.validity_value,
            item.validity_unit,
            item.expiration_date,
            item.notification_value,
            item.notification_unit,
            item.status,
            item.file_url || null,
            item.notification_email || null,
            false,
          ];

          pool.query(insertQuery, values, async (insertErr, insertResults) => {
            if (insertErr) return reject(insertErr);

            const newItem: DocumentItem = {
              id: (insertResults as any).insertId,
              ...item,
              isObsolete: false,
            };

            try {
              await handleDocumentItemRevisionUpdate(
                pool,
                newItem.id,
                newItem.revision
              );
              resolve(newItem);
            } catch (err) {
              console.error(
                "❌ Errore durante handleDocumentItemRevisionUpdate:",
                err
              );
              reject(err);
            }
          });
        }
      );
    });
  },

  async updateDocumentItem(
    id: number,
    data: Partial<DocumentItem>
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        // Revisione? Gestione obsolescenza
        if (data.revision !== undefined) {
          const { handleDocumentItemRevisionUpdate } = await import(
            "./lib/documentItemUtils"
          );
          await handleDocumentItemRevisionUpdate(pool, id, data.revision);
        }

        // Ricalcolo scadenza
        if (
          data.emission_date &&
          data.validity_value !== undefined &&
          data.validity_unit
        ) {
          const base = new Date(data.emission_date);
          if (data.validity_unit === "months") {
            base.setMonth(base.getMonth() + data.validity_value);
          } else {
            base.setFullYear(base.getFullYear() + data.validity_value);
          }
          data.expiration_date = base;
        }

        // ❗️Fix: evita update senza campi
        if (Object.keys(data).length === 0) {
          return reject(new Error("Nessun campo da aggiornare"));
        }

        const fields = Object.keys(data)
          .map((key) => `${key} = ?`)
          .join(", ");
        const values = Object.values(data);
        const query = `UPDATE document_items SET ${fields} WHERE id = ?`;

        // 👇 LOG VISIBILE SE VIENE CHIAMATO QUALSIASI UPDATE
        if (fields.includes("isObsolete")) {
          console.warn("⚠️ QUALCUNO STA MARCANDO OBSOLETO:", {
            query,
            values: [...values, id],
          });
        }

        pool.query(query, [...values, id], (error) => {
          if (error) return reject(error);
          resolve(true);
        });
      } catch (err) {
        reject(err);
      }
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

  async getDocumentsWithNotificationEmail(): Promise<DocumentItem[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM document_items
        WHERE notification_email IS NOT NULL
        AND expiration_date IS NOT NULL
        AND notification_value IS NOT NULL
        AND notification_unit IS NOT NULL
      `;
      pool.query(query, (err, results) => {
        if (err) return reject(err);
        resolve(results as DocumentItem[]);
      });
    });
  },

  // ✅ Funzione 1: Trova la revisione precedente
  findPreviousRevision: async ({ pointNumber, title, excludeId }) => {
    return new Promise((resolve, reject) => {
      const query = `
      SELECT * FROM documents
      WHERE pointNumber = ? AND title = ? AND id != ? AND isObsolete = false
      ORDER BY id DESC
      LIMIT 1
    `;
      pool.query(query, [pointNumber, title, excludeId], (error, results) => {
        if (error) return reject(error);
        resolve(results.length > 0 ? (results[0] as Document) : null);
      });
    });
  },

  // ✅ Funzione 2: Clona i figli da un documento all'altro
  cloneDocumentItems: async (oldDocId, newDocId) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO document_items (
          documentId, title, revision, description, emission_date,
          validity_value, validity_unit, expiration_date,
          notification_value, notification_unit, status, file_url, isObsolete
        )
        SELECT ?, title, revision, description, emission_date,
               validity_value, validity_unit, expiration_date,
               notification_value, notification_unit, status, file_url, isObsolete
        FROM document_items
        WHERE documentId = ?
      `;
      pool.query(query, [newDocId, oldDocId], (error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  },

  // ✅ Funzione 3: Marca un documento come obsoleto
  markDocumentObsolete: async (id: number): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      pool.query(
        "UPDATE documents SET isObsolete = true WHERE id = ?",
        [id],
        (error, results) => {
          // 👈 aggiunto results
          if (error) return reject(error);
          resolve(results.affectedRows > 0); // 👈 verifica se il documento è stato realmente aggiornato
        }
      );
    });
  },

  // ✅ Funzione 4: Aggiorna i dati del documento
  updateDocument: async (
    id: number,
    updateData: Partial<Document>
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(updateData);
      if (keys.length === 0)
        return reject(new Error("Nessun campo da aggiornare"));

      const fields = keys.map((key) => `${key} = ?`).join(", ");
      const values = Object.values(updateData);
      const query = `UPDATE documents SET ${fields} WHERE id = ?`;

      pool.query(query, [...values, id], (error) => {
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
      let newPath = path.join(obsoleteDir, fileName);

      // Gestione file duplicato in "obsoleti"
      let counter = 1;
      while (fs.existsSync(newPath)) {
        const { name, ext } = path.parse(fileName);
        newPath = path.join(obsoleteDir, `${name}_${counter++}${ext}`);
      }

      // Prova prima con renameSync
      try {
        fs.renameSync(oldPath, newPath);
      } catch (renameErr) {
        // Fallback con copia + eliminazione
        console.warn("renameSync fallito, provo con copia:", renameErr);
        fs.copyFileSync(oldPath, newPath);
        fs.unlinkSync(oldPath); // elimina il file originale
      }

      return newPath;
    } catch (err) {
      console.error("Errore spostamento in obsoleti:", err);
      return null;
    }
  },
};
