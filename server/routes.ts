import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChildDocumentSchema, insertNotificationSubscriptionSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all parent documents
  app.get("/api/parent-documents", async (_req, res) => {
    try {
      const documents = await storage.getParentDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching parent documents:", error);
      res.status(500).json({ message: "Failed to fetch parent documents" });
    }
  });

  // Get a specific parent document
  app.get("/api/parent-documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getParentDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Parent document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching parent document:", error);
      res.status(500).json({ message: "Failed to fetch parent document" });
    }
  });

  // Create a parent document
  app.post("/api/parent-documents", async (req, res) => {
    try {
      const document = await storage.createParentDocument(req.body);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating parent document:", error);
      res.status(500).json({ message: "Failed to create parent document" });
    }
  });

  // Get all child documents (optionally filtered by parent ID)
  app.get("/api/child-documents", async (req, res) => {
    try {
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      const documents = await storage.getChildDocuments(parentId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching child documents:", error);
      res.status(500).json({ message: "Failed to fetch child documents" });
    }
  });

  // Get a specific child document
  app.get("/api/child-documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getChildDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Child document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching child document:", error);
      res.status(500).json({ message: "Failed to fetch child document" });
    }
  });

  // Get expiring documents
  app.get("/api/expiring-documents", async (_req, res) => {
    try {
      const documents = await storage.getExpiringDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching expiring documents:", error);
      res.status(500).json({ message: "Failed to fetch expiring documents" });
    }
  });

  // Get obsolete documents
  app.get("/api/obsolete-documents", async (_req, res) => {
    try {
      const documents = await storage.getObsoleteDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching obsolete documents:", error);
      res.status(500).json({ message: "Failed to fetch obsolete documents" });
    }
  });

  // Create/upload a child document
  app.post("/api/child-documents", async (req, res) => {
    try {
      const documentData = insertChildDocumentSchema.parse(req.body);
      const document = await storage.createChildDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error creating child document:", error);
      res.status(500).json({ message: "Failed to create child document" });
    }
  });

  // Update a child document
  app.patch("/api/child-documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.updateChildDocument(id, req.body);
      
      if (!document) {
        return res.status(404).json({ message: "Child document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error updating child document:", error);
      res.status(500).json({ message: "Failed to update child document" });
    }
  });

  // Delete a child document
  app.delete("/api/child-documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteChildDocument(id);
      
      if (!success) {
        return res.status(404).json({ message: "Child document not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting child document:", error);
      res.status(500).json({ message: "Failed to delete child document" });
    }
  });

  // Get recent activity logs
  app.get("/api/activity-logs", async (_req, res) => {
    try {
      const logs = await storage.getActivityLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Create a notification subscription
  app.post("/api/notifications", async (req, res) => {
    try {
      const validatedData = insertNotificationSubscriptionSchema.parse(req.body);
      const subscription = await storage.createNotificationSubscription(validatedData);
      res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Error creating notification subscription:", error);
      res.status(500).json({ message: "Failed to create notification subscription" });
    }
  });

  // Parse document filename
  app.post("/api/parse-document", (req, res) => {
    try {
      const { filename } = req.body;
      
      if (!filename) {
        return res.status(400).json({ message: "Filename is required" });
      }
      
      // Parse the filename based on the format: "4.2-Sicurezza Alimentare-Rev.1-20250325.ext"
      const fileExtension = path.extname(filename).toLowerCase();
      const nameWithoutExtension = path.basename(filename, fileExtension);
      const parts = nameWithoutExtension.split('-');
      
      if (parts.length < 4) {
        return res.status(400).json({ message: "Invalid filename format" });
      }
      
      // Determine file type based on extension
      let fileType;
      if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        fileType = 'excel';
      } else if (fileExtension === '.docx' || fileExtension === '.doc') {
        fileType = 'word';
      } else if (fileExtension === '.pdf') {
        fileType = 'pdf';
      } else {
        return res.status(400).json({ message: "Unsupported file type" });
      }
      
      const pointNumber = parts[0].trim();
      const title = parts[1].trim();
      const revision = parts[2].trim();
      const issueDate = parts[3].trim();
      
      res.json({
        filename,
        pointNumber,
        title,
        revision,
        issueDate,
        fileType
      });
    } catch (error) {
      console.error("Error parsing document filename:", error);
      res.status(500).json({ message: "Failed to parse document filename" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
