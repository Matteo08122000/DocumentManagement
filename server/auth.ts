import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { InsertUser, User } from "@shared/schema";

// Estendi il tipo Request per includere session
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Valida le credenziali di login
const loginSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(6),
});

// Valida i dati di registrazione
const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

// Verifica se l'utente è autenticato
export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.session && req.session.userId) {
    return next();
  }

  res
    .status(401)
    .json({ error: "Non autorizzato. Effettua il login per continuare." });
};

// Login con email invece di username
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Ottieni tutti gli utenti e filtra per email
    // In un database reale useremmo una query diretta
    const users = Array.from(storage.getUsers().values());
    const user = users.find(u => u.email === email) as User | undefined;

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Email o password non validi" });
    }

    // Salva l'ID utente nella sessione
    req.session.userId = user.id;

    // Rimuovi la password prima di inviare i dati utente
    const { password: _, ...userData } = user;

    res.status(200).json({
      message: "Login effettuato con successo",
      user: userData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dati non validi",
        details: error.errors,
      });
    }

    console.error("Errore di login:", error);
    res.status(500).json({ error: "Errore durante il login" });
  }
};

// Registrazione
export const register = async (req: Request, res: Response) => {
  try {
    const userData = registerSchema.parse(req.body);

    // Controlla se l'username esiste già
    const existingUser = await storage.getUserByUsername(userData.username);

    if (existingUser) {
      return res.status(400).json({ error: "Username già in uso" });
    }

    // Crea il nuovo utente con valori di default per campi mancanti
    const newUser = await storage.createUser({
      username: userData.username,
      email: userData.email,
      password: userData.password,
    });

    // Rimuovi la password prima di inviare i dati utente
    const { password: _, ...newUserData } = newUser;

    // Imposta la sessione dopo la registrazione (auto-login)
    req.session.userId = newUser.id;

    res.status(200).json({
      message: "Utente registrato con successo",
      user: newUserData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dati non validi",
        details: error.errors,
      });
    }

    console.error("Errore di registrazione:", error);
    res.status(500).json({ error: "Errore durante la registrazione" });
  }
};

// Logout
export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Errore durante il logout:", err);
      return res.status(500).json({ error: "Errore durante il logout" });
    }

    res.status(200).json({ message: "Logout effettuato con successo" });
  });
};

// Ottieni informazioni sull'utente corrente
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }

    const user = await storage.getUser(req.session.userId);

    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // Rimuovi la password prima di inviare i dati utente
    const { password: _, ...userData } = user;

    res.status(200).json(userData);
  } catch (error) {
    console.error("Errore nel recupero dell'utente corrente:", error);
    res
      .status(500)
      .json({ error: "Errore durante il recupero dei dati utente" });
  }
};
