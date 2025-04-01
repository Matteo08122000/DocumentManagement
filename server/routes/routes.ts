import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { insertNotificationSchema, documentStatus } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import * as auth from "../auth";
const { isAuthenticated } = auth;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Rotte di autenticazione

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

  // Email notifications - Solo utenti autenticati
  app.post("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }

      console.error("Error creating notification:", error);
      res
        .status(500)
        .json({ message: "Errore nella creazione della notifica" });
    }
  });

  // Get notifications
  app.get("/api/notifications", async (req, res) => {
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
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Errore nel recupero delle notifiche" });
    }
  });

  // Endpoint per il supporto
  app.post("/api/support", async (req, res) => {
    try {
      // Verifica che la risposta sia JSON
      res.setHeader("Content-Type", "application/json");

      // Valida i dati di input
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          error: "Dati mancanti",
          message: "Tutti i campi sono obbligatori",
        });
      }

      // In una implementazione reale, qui salveremmo il messaggio o invieremmo una email
      console.log("Messaggio di supporto ricevuto:", {
        name,
        email,
        subject,
        message,
      });

      // Invio risposta di successo
      res.status(200).json({
        success: true,
        message: "Messaggio inviato con successo",
      });
    } catch (error) {
      console.error(
        "Errore nell'elaborazione della richiesta di supporto:",
        error
      );
      res.status(500).json({
        error: "Errore del server",
        message:
          "Si è verificato un errore durante l'elaborazione della richiesta",
      });
    }
  });

  // Get document statistics
  app.get("/api/statistics", async (req, res) => {
    try {
      const documents = await storage.getDocuments();

      // Per le statistiche dei documenti obsoleti, è necessario essere autenticati
      let obsoleteCount = 0;

      // @ts-ignore - req.session è definito dal middleware express-session
      if (req.session && req.session.userId) {
        const obsolete = await storage.getDocuments(true);
        obsoleteCount = obsolete.filter((doc) => doc.isObsolete).length;
      }

      const valid = documents.filter(
        (doc) => doc.status === documentStatus.VALID
      ).length;
      const expiring = documents.filter(
        (doc) => doc.status === documentStatus.EXPIRING
      ).length;
      const expired = documents.filter(
        (doc) => doc.status === documentStatus.EXPIRED
      ).length;

      res.json({
        valid,
        expiring,
        expired,
        obsolete: obsoleteCount,
        total: documents.length,
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
