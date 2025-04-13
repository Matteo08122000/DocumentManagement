import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Filter only Excel, Word and PDF files
      const validFiles = acceptedFiles.filter((file) => {
        const type = file.type;
        return (
          type.includes("excel") ||
          type.includes("spreadsheet") ||
          type.includes("word") ||
          type.includes("pdf")
        );
      });

      if (validFiles.length !== acceptedFiles.length) {
        toast({
          title: "Alcuni file non sono supportati",
          description: "Solo Excel, Word e PDF sono accettati.",
          variant: "destructive",
        });
      }

      setFiles(validFiles);
    },
    [toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
      "application/msword": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [],
      "application/pdf": [],
    },
  });

  const { csrfToken } = useAuth();

  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      const formData = new FormData();

      filesToUpload.forEach((file) => {
        formData.append("files", file);
      });

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.open("POST", "/api/upload");
        xhr.setRequestHeader("X-CSRF-Token", csrfToken || "");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(
              new Error(
                `Upload failed with status ${xhr.status}: ${xhr.statusText}`
              )
            );
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));

        xhr.send(formData);
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Caricamento completato",
        description: `${files.length} file caricati con successo`,
      });

      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });

      // Reset state and close modal
      setFiles([]);
      setUploadProgress(0);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Errore nel caricamento",
        description:
          error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleUpload = () => {
    if (files.length === 0) {
      toast({
        title: "Nessun file selezionato",
        description: "Seleziona almeno un file da caricare",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(files);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-icons-round text-primary-600">
              upload_file
            </span>
            Carica Documenti
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <p className="text-sm text-gray-500 mb-4">
            Seleziona i file da caricare. Il sistema processerà automaticamente
            i documenti seguendo il formato stabilito (es. "4.2-Sicurezza
            Alimentare-Rev.1-20250325").
          </p>

          <div
            {...getRootProps()}
            className={`flex flex-col justify-center items-center w-full h-64 bg-gray-50 rounded-lg border-2 border-dashed cursor-pointer hover:bg-gray-100 ${
              isDragActive
                ? "border-primary-500 bg-primary-50"
                : "border-gray-300"
            }`}
          >
            <div className="flex flex-col justify-center items-center pt-5 pb-6">
              <span
                className="material-icons-round text-gray-400 mb-3"
                style={{ fontSize: "3rem" }}
              >
                cloud_upload
              </span>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Clicca per selezionare</span> o
                trascina i file
              </p>
              <p className="text-xs text-gray-500">
                I formati supportati sono Excel, Word e PDF
              </p>
            </div>
            <input {...getInputProps()} />
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                File selezionati ({files.length})
              </h4>
              <ul className="max-h-32 overflow-y-auto text-sm text-gray-600 divide-y divide-gray-200">
                {files.map((file, index) => (
                  <li key={index} className="py-2 flex items-center">
                    <span className="material-icons-round text-primary-600 mr-2 text-sm">
                      {file.type.includes("pdf")
                        ? "picture_as_pdf"
                        : file.type.includes("word")
                        ? "article"
                        : "description"}
                    </span>
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uploadMutation.isPending && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">
                Caricamento in corso... {uploadProgress}%
              </p>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={uploadMutation.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Caricamento..." : "Carica"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
