import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MySQLStoreFactory = require("express-mysql-session");
const MySQLStore = MySQLStoreFactory(session);

import { registerRoutes } from "./routes/routes";
import documentRoutes from "./routes/documentRoutes";
import { log } from "./vite";

const app = express();

// ✅ CORS prima di tutto (per supportare cookie con credentials)
app.use(
  cors({
    origin: "http://localhost:5173", // dominio del frontend
    credentials: true,
  })
);

// ✅ Middleware di parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Configurazione dello store MySQL per le sessioni
const dbOptions = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "docgenius",
};

const sessionStore = new MySQLStore(dbOptions);

// ✅ Middleware di sessione (dopo cors e parser)
app.use(
  session({
    secret: "docgenius-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: "docgenius.sid",
    cookie: {
      secure: process.env.NODE_ENV === "production", // true solo in produzione
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 giorni
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// ✅ Middleware di log per tutte le route API
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// ✅ Mount delle route modularizzate (REST API)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api", documentRoutes);

// ✅ Avvio server + error handling
(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  app._router.stack
    .filter((r) => r.route)
    .forEach((r) => {
      const path = r.route.path;
      const method = Object.keys(r.route.methods)[0].toUpperCase();
      console.log(`[ROUTE] ${method} ${path}`);
    });

  const port = 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`Backend API listening on port ${port}`);
    }
  );
})();
