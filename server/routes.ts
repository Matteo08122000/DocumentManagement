import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertDocumentSchema, 
  insertExpirationSchema,
  type Document,
  type DocumentWithExpirations
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Setup file upload with multer
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const documentsDir = path.join(process.cwd(), "uploads");
      const obsoleteDir = path.join(documentsDir, "obsoleti");
      
      // Create directories if they don't exist
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }
      
      if (!fs.existsSync(obsoleteDir)) {
        fs.mkdirSync(obsoleteDir, { recursive: true });
      }
      
      cb(null, documentsDir);
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
  }),
  fileFilter: function (req, file, cb) {
    // Accept only excel, word and pdf files
    const filetypes = /xlsx|xls|docx|doc|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error("Only Excel, Word, and PDF files are allowed"));
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // API endpoint to get document list
  app.get('/api/documents', async (req: Request, res: Response) => {
    try {
      const includeObsolete = req.query.includeObsolete === 'true';
      const documents = await storage.getDocuments(includeObsolete);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  // API endpoint to get obsolete documents
  app.get('/api/documents/obsolete', async (req: Request, res: Response) => {
    try {
      const allDocuments = await storage.getDocuments(true);
      const obsoleteDocuments = allDocuments.filter(doc => doc.isObsolete);
      res.json(obsoleteDocuments);
    } catch (error) {
      console.error('Error fetching obsolete documents:', error);
      res.status(500).json({ message: 'Failed to fetch obsolete documents' });
    }
  });

  // API endpoint to get a single document with expirations and children
  app.get('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      res.json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Failed to fetch document' });
    }
  });

  // API endpoint to upload a document
  app.post('/api/documents/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const file = req.file;
      const filePath = file.path;
      const fileName = file.originalname;
      
      // Parse document info from filename
      // Expected format: 4.2-Sicurezza Alimentare-Rev.1-20250325.xlsx
      const nameRegex = /^([\d\.]+)-([^-]+)-Rev\.(\d+)-(\d{8})\.(.+)$/;
      const match = fileName.match(nameRegex);
      
      if (!match) {
        return res.status(400).json({ 
          message: 'Invalid filename format. Expected: PointNumber-Title-Rev.Number-YYYYMMDD.extension' 
        });
      }
      
      const [_, pointNumber, title, revision, issueDate, extension] = match;
      
      let fileType: string;
      if (extension.match(/xlsx|xls/i)) {
        fileType = 'excel';
      } else if (extension.match(/docx|doc/i)) {
        fileType = 'word';
      } else if (extension.match(/pdf/i)) {
        fileType = 'pdf';
      } else {
        fileType = 'unknown';
      }
      
      // Validate and create document
      const parentId = req.body.parentId ? parseInt(req.body.parentId) : undefined;
      
      const documentData = {
        pointNumber,
        title,
        revision: `Rev.${revision}`,
        issueDate,
        filePath,
        fileName,
        fileType,
        parentId: parentId || null,
        isObsolete: false
      };

      try {
        const validatedData = insertDocumentSchema.parse(documentData);
        const document = await storage.createDocument(validatedData);
        res.status(201).json(document);
      } catch (e) {
        if (e instanceof z.ZodError) {
          const validationError = fromZodError(e);
          return res.status(400).json({ message: validationError.message });
        }
        throw e;
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  });

  // API endpoint to add expiration date (for Excel files)
  app.post('/api/documents/:id/expirations', async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      if (document.fileType !== 'excel') {
        return res.status(400).json({ message: 'Expirations can only be added to Excel files' });
      }
      
      const expirationData = {
        ...req.body,
        documentId,
        status: 'valid' // Default status
      };
      
      try {
        const validatedData = insertExpirationSchema.parse(expirationData);
        const expiration = await storage.createExpiration(validatedData);
        res.status(201).json(expiration);
      } catch (e) {
        if (e instanceof z.ZodError) {
          const validationError = fromZodError(e);
          return res.status(400).json({ message: validationError.message });
        }
        throw e;
      }
    } catch (error) {
      console.error('Error adding expiration:', error);
      res.status(500).json({ message: 'Failed to add expiration' });
    }
  });

  // API endpoint to update document revision
  app.post('/api/documents/:id/update-revision', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const file = req.file;
      const newFilePath = file.path;
      const newFileName = file.originalname;
      
      // Parse new revision from filename
      const nameRegex = /^([\d\.]+)-([^-]+)-Rev\.(\d+)-(\d{8})\.(.+)$/;
      const match = newFileName.match(nameRegex);
      
      if (!match) {
        return res.status(400).json({ 
          message: 'Invalid filename format. Expected: PointNumber-Title-Rev.Number-YYYYMMDD.extension' 
        });
      }
      
      const [_, _pointNumber, _title, revision, _issueDate, _extension] = match;
      const newRevision = `Rev.${revision}`;
      
      // Update the document revision and mark old one as obsolete
      const updatedDocument = await storage.updateDocumentRevision(
        documentId, 
        newRevision, 
        newFilePath, 
        newFileName
      );
      
      if (!updatedDocument) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Move the old document file to "obsoleti" folder
      const oldDocument = await storage.getDocumentById(documentId);
      if (oldDocument && oldDocument.filePath) {
        const oldFilePath = oldDocument.filePath;
        const fileName = path.basename(oldFilePath);
        const obsoletePath = path.join(process.cwd(), 'uploads', 'obsoleti', fileName);
        
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.renameSync(oldFilePath, obsoletePath);
          }
        } catch (error) {
          console.error('Error moving file to obsolete folder:', error);
        }
      }
      
      res.json(updatedDocument);
    } catch (error) {
      console.error('Error updating document revision:', error);
      res.status(500).json({ message: 'Failed to update document revision' });
    }
  });

  // API endpoint to update email notification settings
  app.post('/api/notifications/settings', async (req: Request, res: Response) => {
    try {
      const { email, notifications, onlyCritical } = req.body;
      // In a real application, you'd get the user ID from the session
      const userId = 1; // Using the default user for this example
      
      const user = await storage.updateUserEmail(
        userId, 
        email, 
        notifications === true, 
        onlyCritical === true
      );
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ success: true, message: 'Notification settings updated' });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({ message: 'Failed to update notification settings' });
    }
  });

  // API endpoint to get document stats (for dashboard)
  app.get('/api/documents/stats', async (req: Request, res: Response) => {
    try {
      const allDocuments = await storage.getDocuments(true);
      const validDocuments = allDocuments.filter(doc => !doc.isObsolete);
      
      // For each document, we need to get its expirations to determine its status
      const documentStatuses: Record<string, number> = {
        valid: 0,
        expiring: 0,
        expired: 0,
        obsolete: 0
      };
      
      for (const doc of allDocuments) {
        if (doc.isObsolete) {
          documentStatuses.obsolete++;
          continue;
        }
        
        if (doc.fileType !== 'excel') {
          documentStatuses.valid++;
          continue;
        }
        
        const expirations = await storage.getExpirationsByDocumentId(doc.id);
        if (expirations.length === 0) {
          documentStatuses.valid++;
          continue;
        }
        
        if (expirations.some(exp => exp.status === 'expired')) {
          documentStatuses.expired++;
        } else if (expirations.some(exp => exp.status === 'expiring')) {
          documentStatuses.expiring++;
        } else {
          documentStatuses.valid++;
        }
      }
      
      res.json(documentStatuses);
    } catch (error) {
      console.error('Error fetching document stats:', error);
      res.status(500).json({ message: 'Failed to fetch document stats' });
    }
  });

  // API endpoint to download a document
  app.get('/api/documents/:id/download', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      if (!document.filePath || !fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      res.download(document.filePath, document.fileName);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ message: 'Failed to download document' });
    }
  });

  return httpServer;
}
