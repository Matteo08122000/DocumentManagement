import { Router } from "express";
import { storage } from "../storage";
import { ZodError } from "zod";
import { uploadSingleDoc } from "../middlewares/uploadSingleDoc";
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
import { uploadItemFile } from "../middlewares/uploadItemFile";
import { db } from "../lib/db";

const router = Router();

// GET /documents
router.get("/documents", isAuthenticated, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Non autenticato" });

    const includeObsolete = req.query.includeObsolete === "true";

    const documents = await storage.getDocuments(userId, includeObsolete);

    const parentDocs = documents.filter((doc) => !doc.parentId);
    parentDocs.sort((a, b) => {
      const aNum = parseFloat(a.pointNumber.replace(/,/g, "."));
      const bNum = parseFloat(b.pointNumber.replace(/,/g, "."));
      return aNum - bNum;
    });

    res.json(parentDocs);
  } catch (error) {
    console.error("Errore nel recupero dei documenti:", error);
    res.status(500).json({ message: "Errore nel recupero dei documenti" });
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
    const document = await storage.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({ message: "Documento non trovato" });
    }

    const items = await storage.getDocumentItems(documentId);
    res.json(items);
  } catch (error) {
    console.error("Error fetching document items:", error);
    res
      .status(500)
      .json({ message: "Errore nel recupero degli elementi del documento" });
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

    let processedData = {
      ...req.body,
      documentId,
    };

    if (processedData.expirationDate) {
      processedData.expirationDate = new Date(processedData.expirationDate);
    }

    if (processedData.notificationDays) {
      processedData.notificationDays = parseInt(processedData.notificationDays);
    }

    if (!processedData.status) {
      processedData.status = "valid";
    }

    const itemData = insertDocumentItemSchema.parse(processedData);
    const item = await storage.createDocumentItem(itemData);

    res.status(201).json(item);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: fromZodError(error).message,
        details: error.errors,
      });
    }

    console.error("Error creating document item:", error);
    res
      .status(500)
      .json({ message: "Errore nella creazione dell'elemento del documento" });
  }
});

router.post(
  "/documents/items/:id/files",
  isAuthenticated,
  uploadItemFile.single("file"),
  async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "Nessun file ricevuto" });
      }

      const fileType = getFileType(file.mimetype);

      await storage.saveDocumentItemFile({
        itemId,
        filePath: file.path,
        fileType,
        originalName: file.originalname,
      });

      const file_url = `/uploads/items/${itemId}/${file.filename}`;

      await db
        .update(documentItems)
        .set({ file_url })
        .where(eq(documentItems.id, itemId));

      res.status(201).json({
        message: "File allegato con successo",
        file_url,
      });
    } catch (error) {
      console.error("Errore durante l'upload file item:", error);
      res.status(500).json({ message: "Errore upload file item" });
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
      return res.status(500).json({
        message: "Errore nello spostamento del file nella cartella obsoleti",
      });
    }

    const updated = await storage.markDocumentObsolete(id);
    res.json(updated);
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
        updateData.filePath = file.path;
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
      if (revision?.trim()) updateData.revision = revision;
      if (emissionDateParsed) updateData.emissionDate = emissionDateParsed;

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
            filePath: file.path,
            fileType: fileType as any,
            status: documentStatus.VALID as any,
            expirationDate: null,
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
