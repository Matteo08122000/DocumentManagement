import { Router, Request, Response } from "express";
import { sendExpiryNotification } from "../email";

const router = Router();

// Rotta di test per inviare un’email di prova
router.get("/test-email", async (req: Request, res: Response) => {
  const recipient = req.query.email as string;
  if (!recipient) {
    return res
      .status(400)
      .json({ error: "Devi specificare un'email come query parameter" });
  }

  try {
    // Invia un’email di prova con un documento fittizio
    await sendExpiryNotification(recipient, [
      {
        title: "Documento di Test",
        expirationDate: new Date(Date.now() + 86400000),
      }, // scade domani
    ]);
    res.json({ message: "Email di test inviata, controlla la tua casella!" });
  } catch (error) {
    console.error("Errore nell'invio dell'email:", error);
    res.status(500).json({ error: "Errore nell'invio dell'email" });
  }
});

export default router;
