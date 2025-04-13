import { Router } from "express";
import { storage } from "../storage";
import path from "path";
import { number, ZodError } from "zod";
import { eq, and, lt } from "drizzle-orm";
import { uploadSingleDoc } from "../middlewares/uploadSingleDoc";
import { checkExpiringDocumentsAndNotify } from "../jobs/checkExpiringDocumentsAndNotify";
import { aggregateDocumentStatus } from "@shared/documentUtils";
import { fromZodError } from "zod-validation-error";
import {
  insertDocumentSchema,
  insertDocumentItemSchema,
  documentStatus,
  documentItems,
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import { parseDocumentName } from "../utils/parseDocumentName";
import { getFileType } from "../utils/getFileType";
import { isAuthenticated } from "../auth";
import { uploadBulkDocuments } from "../middlewares/uploadBulk";
import uploadItemFile from "../middlewares/uploadItemFile";
import { db } from "../lib/db";
import connectDatabase from "server/dbConnection";
import { saveDocumentItemFile } from "../lib/documentItemUtils";
import { isRouteErrorResponse } from "react-router-dom";

const router = Router();

// GET /documents
// GET /documents
router.get("/documents", isAuthenticated, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Non autenticato" });

    const includeObsolete = req.query.includeObsolete === "true";
    const documents = await storage.getDocuments(userId, includeObsolete);

    const parentDocs = documents.filter((doc) => !doc.parentId);

    const documentsWithStatus = await Promise.all(
      parentDocs.map(async (doc) => {
        const items = await storage.getDocumentItems(doc.id);
        const status = aggregateDocumentStatus(items);
        return { ...doc, status };
      })
    );

    res.json(
      documentsWithStatus.sort((a, b) => {
        const aNum = parseFloat(a.pointNumber.replace(/,/g, "."));
        const bNum = parseFloat(b.pointNumber.replace(/,/g, "."));
        return aNum - bNum;
      })
    );
  } catch (error) {
    console.error("Errore nel recupero dei documenti:", error);
    res.status(500).json({ message: "Errore nel recupero dei documenti" });
  }
});

router.get("/utils/check-expiring", async (req, res) => {
  await checkExpiringDocumentsAndNotify();
  res.json({ message: "Controllo completato" });
});

router.get("/uploads/items/:itemId/:filename", (req, res) => {
  const { itemId, filename } = req.params;
  const filePath = path.join(
    __dirname,
    "..",
    "uploads",
    "items",
    itemId,
    filename
  );
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Errore nel servire il file:", err);
      res.status(404).send("File non trovato");
    }
  });
});

router.get("/documents/obsolete", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const docs = await storage.getDocuments(userId, true);
    const obsoleti = docs.filter((d) => d.isObsolete === true);
    res.json(obsoleti);
  } catch (err) {
    console.error("Errore caricamento obsoleti:", err);
    res
      .status(500)
      .json({ message: "Errore nel caricamento dei documenti obsoleti" });
  }
});

// POST /documents
router.post("/documents", isAuthenticated, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Non autenticato" });

    const data = insertDocumentSchema.parse(req.body);

    const document = await storage.createDocument({
      ...data,
      userId, // <<<<<< AGGIUNGI QUESTO
    });

    res.status(201).json(document);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: fromZodError(error).message });
    }
    console.error("Error creating document:", error);
    res.status(500).json({ message: "Errore nella creazione del documento" });
  }
});

// GET /documents/:id
router.get("/documents/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await storage.getDocumentById(id);

    if (!document) {
      return res.status(404).json({ message: "Documento non trovato" });
    }

    res.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ message: "Errore nel recupero del documento" });
  }
});

// GET /documents/:id/children
router.get("/documents/:id/children", isAuthenticated, async (req, res) => {
  try {
    const parentId = parseInt(req.params.id);
    const children = await storage.getChildDocuments(parentId);

    children.sort((a, b) => {
      const aNum = parseFloat(a.pointNumber.replace(/,/g, "."));
      const bNum = parseFloat(b.pointNumber.replace(/,/g, "."));
      return aNum - bNum;
    });

    res.json(children);
  } catch (error) {
    console.error("Error fetching child documents:", error);
    res
      .status(500)
      .json({ message: "Errore nel recupero dei documenti figli" });
  }
});

// GET /documents/:id/items
router.get("/documents/:id/items", isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: "ID documento non valido" });
    }

    const document = await storage.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({ message: "Documento non trovato" });
    }

    // Legge il parametro dalla query
    const isObsoleteParam = req.query.isObsolete;
    const isObsolete =
      isObsoleteParam === "true"
        ? true
        : isObsoleteParam === "false"
        ? false
        : null;

    if (isObsolete === null) {
      return res.status(400).json({
        message: "Parametro isObsolete mancante o non valido (usa true/false)",
      });
    }

    const items = await storage.getDocumentItems(documentId, isObsolete);
    res.json(items);
  } catch (error) {
    console.error("Error fetching document items:", error);
    res.status(500).json({
      message: "Errore nel recupero degli elementi del documento",
    });
  }
});

// POST /documents/:id/items
router.post("/documents/:id/items", isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const document = await storage.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({ message: "Documento non trovato" });
    }

    // Parsiamo i numeri correttamente e in modo sicuro
    const parsedValidityValue = parseInt(req.body.validity_value);
    const parsedNotificationValue = parseInt(req.body.notification_value);
    const parsedRevision = parseInt(req.body.revision);
    const revision = isNaN(parsedRevision) ? 1 : parsedRevision;

    const cleanData = {
      ...req.body,
      revision,
      validity_value: isNaN(parsedValidityValue) ? null : parsedValidityValue,
      notification_value: isNaN(parsedNotificationValue)
        ? null
        : parsedNotificationValue,
      documentId,
    };

    const itemData = insertDocumentItemSchema.parse(cleanData);

    const item = await storage.createDocumentItem(itemData);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: fromZodError(error).message,
        details: error.errors,
      });
    }

    console.error("❌ Errore nella creazione dell'elemento:", error);
    res
      .status(500)
      .json({ message: "Errore nella creazione dell'elemento del documento" });
  }
});
router.get("/documents/items/:id/file", async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);

    // Ottieni l'item dal DB
    const [item] = await db
      .select()
      .from(documentItems)
      .where(eq(documentItems.id, itemId));

    if (!item || !item.file_url) {
      return res.status(404).json({ message: "File non trovato" });
    }

    const filePath = path.join(process.cwd(), item.file_url.replace(/^\//, ""));
    // Percorso assoluto
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File mancante nel file system" });
    }

    // Restituisci il file
    res.sendFile(filePath);
  } catch (error) {
    console.error("Errore apertura file item:", error);
    res.status(500).json({ message: "Errore interno" });
  }
});

router.post(
  "/documents/items/:id/files",
  uploadItemFile.single("file"),
  async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "File mancante" });
      }

      const file_url = await saveDocumentItemFile({
        itemId,
        filePath: file.path,
        fileType: file.mimetype,
        originalName: file.originalname,
      });

      await db
        .update(documentItems)
        .set({ file_url })
        .where(eq(documentItems.id, itemId));

      res.status(200).json({ message: "File caricato", file_url });
    } catch (error) {
      console.error("❌ Errore nell'upload del file:", error);
      res
        .status(500)
        .json({ message: "Errore interno durante l'upload del file" });
    }
  }
);

// PUT /documents/:id/obsolete
router.put("/documents/:id/obsolete", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await storage.getDocumentById(id);

    if (!document) {
      return res.status(404).json({ message: "Documento non trovato" });
    }

    const newPath = await storage.moveToObsolete(document.filePath);

    if (!newPath) {
      console.error(
        "Errore nello spostamento file nella cartella obsoleti per documento id:",
        id
      );
      return res.status(500).json({
        message: "Errore nello spostamento del file nella cartella obsoleti",
      });
    }

    const success = await storage.markDocumentObsolete(id);

    if (!success) {
      console.error(
        "Errore nel marcare il documento come obsoleto con id:",
        id
      );
      return res.status(500).json({
        message: "Errore nella marcatura del documento come obsoleto",
      });
    }

    res.status(200).json({
      message: "Documento marcato come obsoleto con successo",
      documentId: id,
      newPath,
    });
  } catch (error) {
    console.error("Error marking document as obsolete:", error);
    res
      .status(500)
      .json({ message: "Errore nel marcare il documento come obsoleto" });
  }
});

router.put(
  "/documents/:id",
  isAuthenticated,
  uploadSingleDoc.single("file"),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      const { pointNumber, title, revision, emissionDate } = req.body;
      const file = req.file;

      const updateData: Partial<Document> = {};

      const emissionDateParsed = emissionDate?.trim()
        ? new Date(emissionDate)
        : null;

      // Verifica se ci sono differenze nei metadati
      const metadataChanged =
        (pointNumber && pointNumber !== document.pointNumber) ||
        (title && title !== document.title) ||
        (revision && revision !== document.revision) ||
        (emissionDateParsed &&
          new Date(document.emissionDate).toISOString().split("T")[0] !==
            emissionDateParsed.toISOString().split("T")[0]);

      // Se file nuovo caricato
      if (file) {
        await storage.moveToObsolete(document.filePath);
        const relativePath = path
          .relative(path.resolve(""), file.path)
          .replace(/\\/g, "/");
        updateData.filePath = `/${relativePath}`;

        updateData.fileType = file.mimetype;
      } else if (metadataChanged) {
        // Nessun nuovo file ma metadati modificati
        await storage.moveToObsolete(document.filePath);
        updateData.filePath = document.filePath; // rimane invariato
        updateData.fileType = document.fileType;
      } else {
        // Niente da aggiornare
        return res.status(200).json({
          message: "Nessuna modifica rilevata",
        });
      }

      if (pointNumber?.trim()) updateData.pointNumber = pointNumber;
      if (title?.trim()) updateData.title = title;
      const sanitizedRevision = revision?.trim();
      const isRevisionChanged =
        sanitizedRevision && sanitizedRevision !== document.revision;
      if (sanitizedRevision) updateData.revision = sanitizedRevision;

      if (emissionDateParsed) updateData.emissionDate = emissionDateParsed;

      // Se la revisione è cambiata, marca il vecchio documento come obsoleto e clona i figli

      let newDocumentId = id;

      if (isRevisionChanged) {
        await storage.markDocumentObsolete(id);
        const newDocData = {
          ...document,
          ...updateData,
          id: undefined,
          parentId: null, // 👈 CAMBIA QUESTO A NULL!
          isObsolete: false,
        };

        const newDoc = await storage.createDocument(
          newDocData as Omit<Document, "id">
        );

        if (!newDoc?.id) {
          throw new Error(
            "Errore critico: ID del nuovo documento non ricevuto"
          );
        }

        newDocumentId = newDoc.id;

        // 👉 Qui logghi il nuovo documento
        console.log("✅ Nuovo documento ID:", newDocumentId);

        const children = await storage.getDocumentItems(id);

        // 👉 Qui logghi quanti figli hai trovato
        console.log("📄 Figli clonati:", children.length);

        for (const item of children) {
          const { id, documentId, ...rest } = item;
          await storage.createDocumentItem({
            ...rest,
            documentId: newDoc.id,
          });
        }

        return res.status(200).json({
          message:
            "Documento aggiornato. Vecchia revisione spostata in obsoleti con figli clonati",
        });
      }
      const success = await storage.updateDocument(id, updateData);
      if (!success) throw new Error("Update fallito");

      res.status(200).json({
        message:
          "Documento aggiornato e versione precedente spostata in obsoleti",
      });
    } catch (error) {
      console.error("Error updating document:", error);
      res
        .status(500)
        .json({ message: "Errore nell'aggiornamento del documento" });
    }
  }
);

// DELETE /documents/:id
router.delete("/documents/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await storage.getDocumentById(id);
    if (!existing) {
      return res.status(404).json({ message: "Documento non trovato" });
    }

    await storage.deleteDocument(id);
    res.status(200).json({ message: "Documento eliminato con successo" });
  } catch (error) {
    console.error("Errore durante l'eliminazione del documento:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// PUT /documents/items/:id
router.put("/documents/items/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const itemUpdate = req.body;

    const item = await storage.getDocumentItemById(id);
    if (!item) {
      return res.status(404).json({ message: "Elemento non trovato" });
    }

    const updated = await storage.updateDocumentItem(id, itemUpdate);
    res.json(updated);
  } catch (error) {
    console.error("Error updating document item:", error);
    res.status(500).json({
      message: "Errore nell'aggiornamento dell'elemento del documento",
    });
  }
});
// DELETE /documents/items/:id
router.delete("/documents/items/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await storage.getDocumentItemById(id);
    if (!existing) {
      return res.status(404).json({ message: "Elemento non trovato" });
    }

    await storage.deleteDocumentItem(id);
    res.status(200).json({ message: "Elemento eliminato con successo" });
  } catch (error) {
    console.error("Errore durante l'eliminazione dell'elemento:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// POST /upload
router.post(
  "/upload",
  isAuthenticated,
  uploadBulkDocuments.array("files"),
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Nessun file caricato" });
      }

      // @ts-ignore
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Non autenticato" });
      }

      const results = [];

      for (const file of files) {
        try {
          const fileName =
            file.originalname.split("/").pop() || file.originalname;
          const parsedName = parseDocumentName(fileName);
          const fileType = getFileType(file.mimetype);

          const document = await storage.createDocument({
            pointNumber: parsedName.pointNumber,
            title: parsedName.title,
            revision: parsedName.revision,
            emissionDate: new Date(parsedName.date),
            filePath: path
              .join("uploads", "bulk", file.filename)
              .replace(/\\/g, "/"),

            fileType: fileType as any,
            status: documentStatus.VALID as any,
            expiration_date: null,
            userId, // ← ECCO IL CAMPO MANCANTE
          });

          results.push({
            id: document.id,
            filename: file.originalname,
            parsed: parsedName,
            status: "success",
          });
        } catch (error) {
          results.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : "Errore di parsing",
            status: "error",
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Errore nel caricamento dei file" });
    }
  }
);

export default router;
