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
    console.warn("✅ Documento precedente marcato come obsoleto:", latest.id);
    cb();
  });
};

export async function handleDocumentItemRevisionUpdate(
  pool: Pool,
  currentItemId: number,
  newRevision: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 1. Prendi il documento corrente per ottenere titolo e documentId
    const getCurrentQuery = `
      SELECT documentId, title FROM document_items WHERE id = ?
    `;

    pool.query(getCurrentQuery, [currentItemId], (err, results) => {
      if (err) return reject(err);
      if (!results.length) return reject(new Error("Documento non trovato"));

      const { documentId, title } = results[0];

      // 2. Marca come obsolete tutte le revisioni più vecchie
      const markObsoleteQuery = `
        UPDATE document_items
        SET isObsolete = true
        WHERE documentId = ? AND title = ? AND revision < ? AND id != ?
      `;

      pool.query(
        markObsoleteQuery,
        [documentId, title, newRevision, currentItemId],
        (updateErr) => {
          if (updateErr) return reject(updateErr);
          resolve();
        }
      );
    });
  });
}
