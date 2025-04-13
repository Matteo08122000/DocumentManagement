// src/hooks/useDocumentUpload.ts
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { apiRequest, invalidateDocumentsCache } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export const useDocumentUpload = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { csrfToken } = useAuth();

  const refreshIndexMutation = useMutation({
    mutationFn: async () => {
      if (!csrfToken) {
        throw new Error("Token CSRF mancante");
      }
      return apiRequest("POST", "/api/refresh-index", undefined, csrfToken);
    },
    onSuccess: () => {
      toast({
        title: "Indice aggiornato",
        description: "L'indice dei documenti è stato aggiornato con successo",
      });
      invalidateDocumentsCache(queryClient);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile aggiornare l'indice: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`,
        variant: "destructive",
      });
    },
  });

  const openUploadModal = () => setIsUploadModalOpen(true);
  const closeUploadModal = () => setIsUploadModalOpen(false);
  const refreshIndex = () => refreshIndexMutation.mutate();

  return {
    isUploadModalOpen,
    openUploadModal,
    closeUploadModal,
    refreshIndex,
    isRefreshing: refreshIndexMutation.isPending,
  };
};
