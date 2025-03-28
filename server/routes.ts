import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertDocumentSchema, insertDocumentItemSchema, 
  insertNotificationSchema, parseDocumentNameSchema,
  documentStatus, documentTypes
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import * as auth from "./auth";
const { isAuthenticated } = auth;

// Set up multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      // Ottieni solo il nome del file, senza percorsi
      const fileName = file.originalname.split('/').pop() || file.originalname;
      // Aggiungiamo un timestamp per evitare sovrascritture di file con lo stesso nome
      cb(null, `${Date.now()}-${fileName}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Only accept office docs (excel, word, pdf)
    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato file non supportato. Carica Excel, Word o PDF.'));
    }
  }
});

// Helper function to parse document name
const parseDocumentName = (filename: string) => {
  try {
    // Remove file extension
    const nameWithoutExt = path.basename(filename, path.extname(filename));
    
    // Try to parse the filename based on our format: "4.2-Sicurezza Alimentare-Rev.1-20250325"
    const parts = nameWithoutExt.split('-');
    
    if (parts.length !== 4) {
      throw new Error(`Formato nome file non valido: ${filename}. Formato atteso: "4.2-Sicurezza Alimentare-Rev.1-20250325"`);
    }
    
    const [pointNumber, title, revision, dateStr] = parts;
    
    // Parse the date (format: YYYYMMDD or DDMMYYYY)
    let date: Date;
    if (dateStr.length === 8) {
      // Try YYYYMMDD
      if (/^\d{8}$/.test(dateStr)) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // Months are 0-based
        const day = parseInt(dateStr.substring(6, 8));
        date = new Date(year, month, day);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          // Try DDMMYYYY format
          const day = parseInt(dateStr.substring(0, 2));
          const month = parseInt(dateStr.substring(2, 4)) - 1;
          const year = parseInt(dateStr.substring(4, 8));
          date = new Date(year, month, day);
          
          if (isNaN(date.getTime())) {
            throw new Error(`Data non valida nel nome del file: ${dateStr}`);
          }
        }
      } else {
        throw new Error(`Formato data non valido nel nome del file: ${dateStr}`);
      }
    } else {
      throw new Error(`Formato data non valido nel nome del file: ${dateStr}`);
    }
    
    // Validate with schema
    return parseDocumentNameSchema.parse({
      pointNumber: pointNumber.trim(),
      title: title.trim(),
      revision: revision.trim(),
      date: date.toISOString()
    });
    
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(fromZodError(error).message);
    }
    throw error;
  }
};

// Determine file type from mimetype
const getFileType = (mimetype: string): string => {
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) {
    return documentTypes.EXCEL;
  } else if (mimetype.includes('word')) {
    return documentTypes.WORD;
  } else if (mimetype.includes('pdf')) {
    return documentTypes.PDF;
  }
  
  return 'unknown';
};

// Calculate document status based on expiration date
const calculateStatus = (expirationDate: Date | null, notificationDays: number = 30): string => {
  if (!expirationDate) return documentStatus.VALID;
  
  const today = new Date();
  
  if (expirationDate < today) {
    return documentStatus.EXPIRED;
  }
  
  // Calculate days until expiration
  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= notificationDays) {
    return documentStatus.EXPIRING;
  }
  
  return documentStatus.VALID;
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Rotte di autenticazione

  // Rotte di autenticazione standardizzate sotto "/api/auth"
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Assicuriamoci che la risposta sia in formato JSON
      res.setHeader('Content-Type', 'application/json');
      await auth.register(req, res);
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      res.status(500).json({ error: 'Errore durante la registrazione' });
    }
  });
  
  app.post('/api/auth/login', auth.login);
  app.post('/api/auth/logout', auth.logout);
  app.get('/api/auth/current-user', auth.getCurrentUser);
  
  // Routes di autenticazione per retrocompatibilità (reindirizzano ai nuovi percorsi)
  app.post('/api/register', (req, res) => {
    console.log('Reindirizzamento da /api/register a /api/auth/register');
    req.url = '/api/auth/register';
    app._router.handle(req, res);
  });
  
  app.post('/api/login', (req, res) => {
    console.log('Reindirizzamento da /api/login a /api/auth/login');
    req.url = '/api/auth/login';
    app._router.handle(req, res);
  });
  
  app.post('/api/logout', (req, res) => {
    console.log('Reindirizzamento da /api/logout a /api/auth/logout');
    req.url = '/api/auth/logout';
    app._router.handle(req, res);
  });
  
  app.get('/api/user', (req, res) => {
    console.log('Reindirizzamento da /api/user a /api/auth/current-user');
    req.url = '/api/auth/current-user';
    app._router.handle(req, res);
  });

  // Set up routes with /api prefix
  
  // Get all documents (parent documents only)
  app.get('/api/documents', async (req, res) => {
    try {
      const includeObsolete = req.query.includeObsolete === 'true';
      
      // Se si richiede di includere documenti obsoleti, verificare se l'utente è autenticato
      if (includeObsolete) {
        // @ts-ignore - req.session è definito dal middleware express-session
        if (!req.session || !req.session.userId) {
          return res.status(401).json({ message: 'Autenticazione richiesta per accedere ai documenti obsoleti' });
        }
      }
      
      // Verifica se l'utente è autenticato per qualsiasi richiesta di documenti
      // @ts-ignore - req.session è definito dal middleware express-session
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Autenticazione richiesta per accedere ai documenti' });
      }
      
      const documents = await storage.getDocuments(includeObsolete);
      
      // Filter to only return parent documents (no parentId)
      const parentDocs = documents.filter(doc => !doc.parentId);
      
      // Sort by pointNumber, numerically
      parentDocs.sort((a, b) => {
        const aNum = parseFloat(a.pointNumber.replace(/,/g, '.'));
        const bNum = parseFloat(b.pointNumber.replace(/,/g, '.'));
        return aNum - bNum;
      });
      
      res.json(parentDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Errore nel recupero dei documenti' });
    }
  });
  
  // Get document by ID
  app.get('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Documento non trovato' });
      }
      
      res.json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Errore nel recupero del documento' });
    }
  });
  
  // Get child documents by parent ID
  app.get('/api/documents/:id/children', isAuthenticated, async (req, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const children = await storage.getChildDocuments(parentId);
      
      // Sort by pointNumber, numerically
      children.sort((a, b) => {
        const aNum = parseFloat(a.pointNumber.replace(/,/g, '.'));
        const bNum = parseFloat(b.pointNumber.replace(/,/g, '.'));
        return aNum - bNum;
      });
      
      res.json(children);
    } catch (error) {
      console.error('Error fetching child documents:', error);
      res.status(500).json({ message: 'Errore nel recupero dei documenti figli' });
    }
  });
  
  // Get document items by document ID
  app.get('/api/documents/:id/items', isAuthenticated, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const items = await storage.getDocumentItems(documentId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching document items:', error);
      res.status(500).json({ message: 'Errore nel recupero degli elementi del documento' });
    }
  });
  
  // Create a document - Solo utenti autenticati
  app.post('/api/documents', isAuthenticated, async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      
      console.error('Error creating document:', error);
      res.status(500).json({ message: 'Errore nella creazione del documento' });
    }
  });
  
  // Create a document item - Solo utenti autenticati
  app.post('/api/documents/:id/items', isAuthenticated, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      
      // Check if document exists
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: 'Documento non trovato' });
      }
      
      const itemData = insertDocumentItemSchema.parse({
        ...req.body,
        documentId
      });
      
      const item = await storage.createDocumentItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      
      console.error('Error creating document item:', error);
      res.status(500).json({ message: 'Errore nella creazione dell\'elemento del documento' });
    }
  });
  
  // Upload files (supports multiple files) - Solo utenti autenticati
  app.post('/api/upload', isAuthenticated, upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'Nessun file caricato' });
      }
      
      const results = [];
      
      for (const file of files) {
        try {
          // Ottieni solo il nome del file, senza il percorso
          const fileName = file.originalname.split('/').pop() || file.originalname;
          
          // Parse document name
          const parsedName = parseDocumentName(fileName);
          
          // Get file type
          const fileType = getFileType(file.mimetype);
          
          // Create document record
          const document = await storage.createDocument({
            pointNumber: parsedName.pointNumber,
            title: parsedName.title,
            revision: parsedName.revision,
            emissionDate: new Date(parsedName.date),
            filePath: file.path,
            fileType,
            status: documentStatus.VALID,
            expirationDate: null, // Will be set later if it's an Excel file
          });
          
          results.push({
            id: document.id,
            filename: file.originalname,
            parsed: parsedName,
            status: 'success'
          });
        } catch (error) {
          results.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Error parsing document',
            status: 'error'
          });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ message: 'Errore nel caricamento dei file' });
    }
  });
  
  // Mark document as obsolete and move to obsolete folder - Solo utenti autenticati
  app.put('/api/documents/:id/obsolete', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Documento non trovato' });
      }
      
      // Move file to obsolete folder
      const newPath = await storage.moveToObsolete(document.filePath);
      
      if (!newPath) {
        return res.status(500).json({ message: 'Errore nello spostamento del file nella cartella obsoleti' });
      }
      
      // Update document record
      const updated = await storage.markDocumentObsolete(id);
      
      res.json(updated);
    } catch (error) {
      console.error('Error marking document as obsolete:', error);
      res.status(500).json({ message: 'Errore nel marcare il documento come obsoleto' });
    }
  });
  
  // Update document - Solo utenti autenticati
  app.put('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const documentUpdate = req.body;
      
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: 'Documento non trovato' });
      }
      
      const updated = await storage.updateDocument(id, documentUpdate);
      res.json(updated);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ message: 'Errore nell\'aggiornamento del documento' });
    }
  });
  
  // Update document item - Solo utenti autenticati
  app.put('/api/documents/items/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemUpdate = req.body;
      
      const item = await storage.getDocumentItemById(id);
      if (!item) {
        return res.status(404).json({ message: 'Elemento non trovato' });
      }
      
      const updated = await storage.updateDocumentItem(id, itemUpdate);
      res.json(updated);
    } catch (error) {
      console.error('Error updating document item:', error);
      res.status(500).json({ message: 'Errore nell\'aggiornamento dell\'elemento del documento' });
    }
  });
  
  // Email notifications - Solo utenti autenticati
  app.post('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      
      console.error('Error creating notification:', error);
      res.status(500).json({ message: 'Errore nella creazione della notifica' });
    }
  });
  
  // Get notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const email = req.query.email as string;
      
      let notifications;
      if (email) {
        notifications = await storage.getNotificationsByEmail(email);
      } else {
        notifications = await storage.getNotifications();
      }
      
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Errore nel recupero delle notifiche' });
    }
  });
  
  // Endpoint temporaneo per eliminare utenti con password non hashate
  app.post('/api/clean-users', async (req, res) => {
    try {
      // Imposta esplicitamente l'header Content-Type per JSON
      res.setHeader('Content-Type', 'application/json');
      // Ottieni tutti gli utenti
      const users = Array.from(storage.getUsers().values());
      console.log(`Utenti totali nel sistema: ${users.length}`);
      
      // Conta gli utenti con password hashata (inizia con $2b$)
      const hashedUsers = users.filter(user => user.password.startsWith('$2b$'));
      console.log(`Utenti con password hashata: ${hashedUsers.length}`);
      
      // Identifica gli utenti con password non hashata
      const nonHashedUsers = users.filter(user => !user.password.startsWith('$2b$'));
      console.log(`Utenti con password non hashata: ${nonHashedUsers.length}`);
      
      // Elimina gli utenti con password non hashata
      const deletedUsers = [];
      for (const user of nonHashedUsers) {
        const deleted = await storage.deleteUser(user.id);
        if (deleted) {
          deletedUsers.push({
            id: user.id,
            username: user.username,
            email: user.email
          });
        }
      }
      
      // Ottieni la lista aggiornata
      const updatedUsers = Array.from(storage.getUsers().values());
      
      res.json({
        before: users.length,
        after: updatedUsers.length,
        deleted: deletedUsers.length,
        deletedUsers: deletedUsers,
        remainingUsers: updatedUsers.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          isHashed: u.password.startsWith('$2b$')
        }))
      });
    } catch (error) {
      console.error('Errore nell\'operazione di pulizia utenti:', error);
      res.status(500).json({ 
        error: 'Errore del server', 
        message: 'Si è verificato un errore durante l\'operazione' 
      });
    }
  });

  // Endpoint per il supporto
  app.post('/api/support', async (req, res) => {
    try {
      // Verifica che la risposta sia JSON
      res.setHeader('Content-Type', 'application/json');
      
      // Valida i dati di input
      const { name, email, subject, message } = req.body;
      
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ 
          error: 'Dati mancanti', 
          message: 'Tutti i campi sono obbligatori' 
        });
      }
      
      // In una implementazione reale, qui salveremmo il messaggio o invieremmo una email
      console.log('Messaggio di supporto ricevuto:', { name, email, subject, message });
      
      // Invio risposta di successo
      res.status(200).json({ 
        success: true, 
        message: 'Messaggio inviato con successo' 
      });
    } catch (error) {
      console.error('Errore nell\'elaborazione della richiesta di supporto:', error);
      res.status(500).json({ 
        error: 'Errore del server', 
        message: 'Si è verificato un errore durante l\'elaborazione della richiesta' 
      });
    }
  });

  // Get document statistics
  app.get('/api/statistics', async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      
      // Per le statistiche dei documenti obsoleti, è necessario essere autenticati
      let obsoleteCount = 0;
      
      // @ts-ignore - req.session è definito dal middleware express-session
      if (req.session && req.session.userId) {
        const obsolete = await storage.getDocuments(true);
        obsoleteCount = obsolete.filter(doc => doc.isObsolete).length;
      }
      
      const valid = documents.filter(doc => doc.status === documentStatus.VALID).length;
      const expiring = documents.filter(doc => doc.status === documentStatus.EXPIRING).length;
      const expired = documents.filter(doc => doc.status === documentStatus.EXPIRED).length;
      
      res.json({
        valid,
        expiring,
        expired,
        obsolete: obsoleteCount,
        total: documents.length
      });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({ message: 'Errore nel recupero delle statistiche' });
    }
  });

  return httpServer;
}
