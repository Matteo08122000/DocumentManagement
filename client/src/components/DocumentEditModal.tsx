import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
}

const DocumentEditModal: React.FC<Props> = ({ isOpen, onClose, document }) => {
  const [formData, setFormData] = useState({
    pointNumber: document?.pointNumber || "",
    title: document?.title || "",
    revision: document?.revision || "",
    emissionDate: document?.emissionDate
      ? new Date(document.emissionDate).toISOString().split("T")[0]
      : "",
    file: null as File | null,
    filePath: "",
  });
  const [oldRevision, setOldRevision] = useState(document?.revision);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { csrfToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append("pointNumber", formData.pointNumber);
      body.append("title", formData.title);
      body.append("revision", formData.revision);
      body.append("emissionDate", formData.emissionDate);
      if (formData.file) body.append("file", formData.file);

      const res = await fetch(`/api/documents/${document?.id}`, {
        method: "PUT",
        headers: {
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
        body,
      });

      if (!res.ok) {
        throw new Error("Errore durante l'aggiornamento del documento");
      }

      return res.json(); // ← ritorna il documento aggiornato
    },

    onSuccess: async (updatedDoc) => {
      try {
        // ✅ Se la revisione è cambiata, clona gli elementi figli
        if (oldRevision !== formData.revision) {
          const cloneRes = await fetch(
            `/api/documents/${document?.id}/clone-items/${updatedDoc.id}`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken || "",
              },
            }
          );

          if (!cloneRes.ok) {
            throw new Error("Clonazione elementi fallita");
          }

          toast({
            title: "Elementi clonati",
            description:
              "Gli elementi controllati sono stati copiati nella nuova revisione.",
          });
        }

        // ✅ Invalida tutte le query necessarie
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/documents/obsolete"],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });

        toast({
          title: "Documento aggiornato",
          description: "Le modifiche sono state salvate correttamente.",
        });

        onClose();
      } catch (err) {
        console.error("❌ Errore durante la clonazione degli elementi:", err);
        toast({
          title: "Attenzione",
          description:
            "Il documento è stato aggiornato, ma alcuni elementi non sono stati clonati.",
          variant: "destructive",
        });

        // comunque chiudiamo
        onClose();
      }
    },

    onError: (err: any) => {
      toast({
        title: "Errore",
        description:
          err instanceof Error ? err.message : "Errore durante il salvataggio",
        variant: "destructive",
      });
    },
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  useEffect(() => {
    if (document) {
      setOldRevision(document.revision);
      setFormData({
        pointNumber: document.pointNumber,
        title: document.title,
        revision: document.revision,
        emissionDate: new Date(document.emissionDate)
          .toISOString()
          .split("T")[0],
        file: null,
        filePath: document.filePath,
      });
    }
  }, [document]);

  if (!document) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0">
      <div className="fixed inset-0 bg-black bg-opacity-30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded shadow-xl max-w-md w-full p-6">
          <Dialog.Title className="text-lg font-bold mb-4">
            Modifica Documento
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Punto Norma</label>
              <input
                type="text"
                value={formData.pointNumber}
                onChange={(e) =>
                  setFormData({ ...formData, pointNumber: e.target.value })
                }
                className="mt-1 block w-full border rounded p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Titolo</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="mt-1 block w-full border rounded p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Revisione</label>
              <input
                type="text"
                value={formData.revision}
                onChange={(e) =>
                  setFormData({ ...formData, revision: e.target.value })
                }
                className="mt-1 block w-full border rounded p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Data Emissione
              </label>
              <input
                type="date"
                value={formData.emissionDate}
                onChange={(e) =>
                  setFormData({ ...formData, emissionDate: e.target.value })
                }
                className="mt-1 block w-full border rounded p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">File Allegato</label>

              {formData.filePath && !formData.file && (
                <div className="mt-1 text-sm text-green-600 flex items-center gap-2">
                  <span className="material-icons-round text-green-600 text-base">
                    check_circle
                  </span>
                  <a
                    href={formData.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    File già caricato
                  </a>
                </div>
              )}

              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    file: e.target.files?.[0] || null,
                    filePath: e.target.files?.[0] ? "" : formData.filePath, // reset se selezioni un file nuovo
                  })
                }
                className="mt-1 block w-full"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded text-gray-700"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={mutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Salva
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default DocumentEditModal;
