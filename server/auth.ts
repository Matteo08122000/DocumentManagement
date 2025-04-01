// auth.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { storage } from "./storage";

// Estendi il tipo Request per includere la sessione
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Schemi di validazione con Zod
const registerSchema = z.object({
  username: z.string().min(3, "Il nome utente deve avere almeno 3 caratteri"),
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
});

const loginSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
});

// Middleware per verificare se l'utente è autenticato
export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res
    .status(401)
    .json({ error: "Non autorizzato. Effettua il login per continuare." });
};

// Funzione di registrazione
export const register = async (req: Request, res: Response) => {
  try {
    const userData = registerSchema.parse(req.body);

    // Controlla se l'username esiste già nel DB
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ error: "Username già in uso" });
    }

    // Controlla se l'email esiste già nel DB
    const existingEmail = await storage.getUserByEmail(userData.email);
    if (existingEmail) {
      return res.status(400).json({ error: "Email già in uso" });
    }

    // Hash della password con salt 10
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Crea il nuovo utente nel database
    const newUser = await storage.createUser({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
    });

    // Rimuovi la password dalla risposta
    const { password, ...userWithoutPassword } = newUser;

    // Imposta la sessione (auto-login)
    req.session.userId = newUser.id;

    res.status(200).json({
      message: "Utente registrato con successo",
      user: userWithoutPassword,
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

// Funzione di login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Recupera l'utente dal DB in base all'email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Email o password non validi" });
    }

    // Confronta la password inserita con quella hashata
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Email o password non validi" });
    }

    // Imposta la sessione
    req.session.userId = user.id;

    // Rimuovi la password dalla risposta
    const { password: pw, ...userWithoutPassword } = user;
    res.status(200).json({
      message: "Login effettuato con successo",
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dati non validi", details: error.errors });
    }
    console.error("Errore di login:", error);
    res.status(500).json({ error: "Errore durante il login" });
  }
};

// Funzione di logout
export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Errore durante il logout:", err);
      return res.status(500).json({ error: "Errore durante il logout" });
    }
    res.status(200).json({ message: "Logout effettuato con successo" });
  });
};

// Recupera l'utente corrente
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Non autenticato" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Errore nel recupero dell'utente corrente:", error);
    res
      .status(500)
      .json({ error: "Errore durante il recupero dei dati utente" });
  }
};
