import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { insertNotificationSchema, documentStatus } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { sendSupportEmail } from "../email"; // o il path giusto se è in un'altra cartella
import * as auth from "../auth";
const { isAuthenticated } = auth;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  app.get("/api/csrf-token", (req, res) => {
    res.status(200).json({ csrfToken: req.csrfToken() });
  });

  // Rotte di autenticazione standardizzate sotto "/api/auth"
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Assicuriamoci che la risposta sia in formato JSON
      res.setHeader("Content-Type", "application/json");
      await auth.register(req, res);
    } catch (error) {
      console.error("Errore durante la registrazione:", error);
      res.status(500).json({ error: "Errore durante la registrazione" });
    }
  });

  app.post("/api/auth/login", auth.login);
  app.post("/api/auth/logout", auth.logout);
  app.get("/api/auth/current-user", auth.getCurrentUser);

  // Routes di autenticazione per retrocompatibilità (reindirizzano ai nuovi percorsi)
  app.post("/api/register", (req, res) => {
    console.log("Reindirizzamento da /api/register a /api/auth/register");
    req.url = "/api/auth/register";
    app._router.handle(req, res);
  });

  app.post("/api/login", (req, res) => {
    console.log("Reindirizzamento da /api/login a /api/auth/login");
    req.url = "/api/auth/login";
    app._router.handle(req, res);
  });

  app.post("/api/logout", (req, res) => {
    console.log("Reindirizzamento da /api/logout a /api/auth/logout");
    req.url = "/api/auth/logout";
    app._router.handle(req, res);
  });

  app.get("/api/user", (req, res) => {
    console.log("Reindirizzamento da /api/user a /api/auth/current-user");
    req.url = "/api/auth/current-user";
    app._router.handle(req, res);
  });

  // Get notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const email = req.query.email as string;

      let items;

      if (email) {
        const query = `
          SELECT * FROM document_items
          WHERE notification_email = ?
        `;
        items = await new Promise((resolve, reject) => {
          pool.query(query, [email], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });
      } else {
        const query = `
          SELECT * FROM document_items
          WHERE notification_email IS NOT NULL
        `;
        items = await new Promise((resolve, reject) => {
          pool.query(query, (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });
      }

      res.json(items);
    } catch (error) {
      console.error(
        "Errore nel recupero delle notifiche da document_items:",
        error
      );
      res.status(500).json({ message: "Errore nel recupero delle notifiche" });
    }
  });

  // Email notifications - Solo utenti autenticati
  app.post("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const {
        itemId,
        notification_email,
        notification_value,
        notification_unit,
      } = req.body;

      if (
        !itemId ||
        !notification_email ||
        !notification_value ||
        !notification_unit
      ) {
        return res.status(400).json({ message: "Dati incompleti" });
      }

      const updateOk = await storage.updateDocumentItem(itemId, {
        notification_email,
        notification_value,
        notification_unit,
      });

      if (!updateOk) throw new Error("Errore aggiornamento notifica");

      res.status(200).json({ message: "Notifica aggiornata" });
    } catch (err) {
      console.error("Errore /api/notifications:", err);
      res.status(500).json({ message: "Errore interno", error: err });
    }
  });

  // Endpoint per il supporto
  app.post("/api/support", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          error: "Dati mancanti",
          message: "Tutti i campi sono obbligatori",
        });
      }

      await sendSupportEmail(name, email, subject, message);

      res.status(200).json({
        success: true,
        message: "Messaggio inviato con successo",
      });
    } catch (error) {
      console.error("Errore nell'invio dell'email:", error);
      res.status(500).json({
        error: "Errore del server",
        message: "Impossibile inviare il messaggio",
      });
    }
  });

  app.get("/api/statistics", async (req, res) => {
    try {
      // Assicurati che l'utente sia autenticato
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      const userId = req.session.userId;

      // Ottieni documenti NON obsoleti per l'utente
      const documents = await storage.getDocuments(userId, false);

      // Ottieni documenti obsoleti per l'utente
      const obsoleteDocuments = await storage.getDocuments(userId, true);
      const obsoleteCount = obsoleteDocuments.filter(
        (doc) => doc.isObsolete
      ).length;

      const valid = documents.filter((doc) => doc.status === "valid").length;
      const expiring = documents.filter(
        (doc) => doc.status === "expiring"
      ).length;
      const expired = documents.filter(
        (doc) => doc.status === "expired"
      ).length;

      res.json({
        valid,
        expiring,
        expired,
        obsolete: obsoleteCount,
        total: documents.length + obsoleteCount, // totale corretto
      });
    } catch (error) {
      console.error("Error getting statistics:", error);
      res
        .status(500)
        .json({ message: "Errore nel recupero delle statistiche" });
    }
  });

  app.post("/api/refresh-index", isAuthenticated, async (req, res) => {
    try {
      console.log("Richiesta di aggiornamento indice ricevuta");

      // Recupera tutti i documenti (inclusi obsoleti se necessario)
      const documents = await storage.getDocuments(true); // true = includeObsolete

      // Filtra i documenti principali (quelli senza parentId)
      const parentDocs = documents.filter((doc) => !doc.parentId);

      // Ordina per pointNumber in modo numerico
      parentDocs.sort((a, b) => {
        const aNum = parseFloat(a.pointNumber.replace(",", "."));
        const bNum = parseFloat(b.pointNumber.replace(",", "."));
        return aNum - bNum;
      });

      // Simuliamo una ricostruzione dell'indice (es. potresti salvare su file, cache, o riscrivere un foglio Google o Excel)
      console.log("Indice aggiornato con", parentDocs.length, "documenti");

      // Risposta al frontend
      res.status(200).json({
        message: "Indice aggiornato con successo",
        documentiIndicizzati: parentDocs.length,
      });
    } catch (error) {
      console.error("Errore durante l'aggiornamento dell'indice:", error);
      res
        .status(500)
        .json({ message: "Errore durante l'aggiornamento dell'indice" });
    }
  });

  return httpServer;
}
