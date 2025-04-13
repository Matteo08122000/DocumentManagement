// lib/documentItemUtils.ts

import fs from "fs";
import path from "path";
import { Pool } from "mysql";

export const markPreviousObsolete = (
  latest: { id: number; file_url?: string | null } | undefined,
  reject: (reason?: any) => void,
  cb: () => void,
  pool: Pool
) => {
  if (!latest || typeof latest.id !== "number") return cb();

  const updates: Partial<{ isObsolete: boolean; file_url?: string }> = {};
  updates.isObsolete = true;

  // Se esiste un file_url, prova a spostarlo
  if (latest.file_url) {
    const absolutePath = path.resolve("." + latest.file_url);
    const fileName = path.basename(absolutePath);
    const destPath = path.resolve("uploads", "obsoleti", fileName);

    try {
      if (fs.existsSync(absolutePath)) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.renameSync(absolutePath, destPath);
        updates.file_url = "/uploads/obsoleti/" + fileName;
      }
    } catch (err) {
      console.error("❌ Errore spostando file obsoleto:", err);
    }
  }

  const fields = Object.keys(updates)
    .filter((key) => updates[key as keyof typeof updates] !== undefined)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.values(updates).filter((v) => v !== undefined);

  if (!fields || values.length === 0) {
    console.warn(
      "⚠️ Nessun campo valido da aggiornare per markPreviousObsolete"
    );
    return cb();
  }

  const query = `UPDATE document_items SET ${fields} WHERE id = ?`;
  pool.query(query, [...values, latest.id], (err) => {
    if (err) return reject(err);
    cb();
  });
};

export const handleDocumentItemRevisionUpdate = async (
  pool: Pool,
  itemId: number,
  newRevision: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const getQuery = `
      SELECT id, revision, file_url, documentId, title
      FROM document_items
      WHERE id = ?
    `;

    pool.query(getQuery, [itemId], (err, results) => {
      if (err) return reject(err);
      const current = results[0];
      if (!current) return reject("Elemento non trovato");

      const latestQuery = `
        SELECT id, revision, file_url FROM document_items
        WHERE documentId = ? AND title = ? AND id != ? AND isObsolete = false
        ORDER BY revision DESC
        LIMIT 1
      `;

      pool.query(
        latestQuery,
        [current.documentId, current.title, itemId],
        (latestErr, revs) => {
          if (latestErr) return reject(latestErr);
          const latest = revs[0];

          if (latest && newRevision <= latest.revision) {
            return reject(
              new Error(
                "Revisione non valida: uguale o inferiore alla più recente"
              )
            );
          }
          console.log("📄 Documento più recente trovato:", latest);
          console.log("⚠️ Marking obsoleto ID:", latest?.id);

          markPreviousObsolete(latest, reject, resolve, pool);
        }
      );
    });
  });
};
