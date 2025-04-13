// middlewares/security.ts

import rateLimit from "express-rate-limit";
import helmet from "helmet";
import csurf from "csurf";
import cookieParser from "cookie-parser";
import type { Express } from "express";

// Limita le richieste a 5 ogni minuto per rotte sensibili
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: "Troppe richieste, riprova tra un minuto",
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware globale di sicurezza
export const applySecurityMiddleware = (app: Express) => {
  app.use(helmet());
  app.use(cookieParser()); // necessario per CSRF
  app.use(csurf({ cookie: true }));

  // Middleware globale per gestire errori CSRF
   app.use((err: any, req: any, res: any, next: any) => {
    if (err.code !== "EBADCSRFTOKEN") return next(err);
    res.status(403).json({ message: "Token CSRF mancante o non valido" });
  });
};
