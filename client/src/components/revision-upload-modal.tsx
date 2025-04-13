import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Document } from "@shared/schema";
import { FileUpload, AlertCircle, File } from "lucide-react";
import { parseDocumentName } from "@/lib/document-parser";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface RevisionUploadModalProps {
  isOpen: boolean;
  document: Document;
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function RevisionUploadModal({
  isOpen,
  document,
  onClose,
  onUploadComplete,
}: RevisionUploadModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Extract current revision number to suggest next
  const currentRevNum = parseInt(document.revision.replace("Rev.", ""));
  const suggestedRevision = `Rev.${currentRevNum + 1}`;
  const queryClient = useQueryClient();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const result = parseDocumentName(file.name);

      if (!result.isValid) {
        toast({
          title: "Nome file non valido",
          description:
            result.error ||
            "Il nome del file non segue il formato richiesto: PointNumber-Title-Rev.Number-YYYYMMDD.extension",
          variant: "destructive",
        });
        return;
      }

      // Check if point number and title match
      if (
        result.pointNumber !== document.pointNumber ||
        result.title !== document.title
      ) {
        toast({
          title: "Incongruenza documento",
          description:
            "Il punto norma e il titolo del documento devono corrispondere al documento originale.",
          variant: "destructive",
        });
        return;
      }

      // Check if revision is newer
      const newRevNum = parseInt(result.revision.replace("Rev.", ""));
      if (newRevNum <= currentRevNum) {
        toast({
          title: "Revisione non valida",
          description: `La nuova revisione deve essere superiore a ${document.revision}.`,
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    },
    [document, currentRevNum, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Nessun file selezionato",
        description: "Seleziona un file da caricare.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      await apiRequest(
        "POST",
        `/api/documents/${document.id}/update-revision`,
        formData
      );

      // Invalidate queries to refresh document list
      await queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      await queryClient.invalidateQueries({
        queryKey: ["/api/documents/obsolete"],
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });

      onUploadComplete();
    } catch (error) {
      console.error("Error uploading revision:", error);
      toast({
        title: "Errore di caricamento",
        description:
          "Si è verificato un errore durante il caricamento della nuova revisione.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <FileUpload className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle>Aggiorna Revisione Documento</DialogTitle>
          </div>
          <DialogDescription>
            Carica una nuova revisione del documento. La versione precedente
            verrà spostata automaticamente nella cartella "Obsoleti".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <div className="text-sm">
              <div className="font-medium">Documento attuale:</div>
              <div className="text-gray-700">{document.fileName}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" /> Nuova revisione
                suggerita: {suggestedRevision}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Nuova revisione
            </label>
            <div
              {...getRootProps()}
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer ${
                isDragActive ? "bg-gray-50" : ""
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-1 text-center">
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <File className="h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      {selectedFile.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileUpload className="mx-auto h-10 w-10 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <span className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark">
                        Carica un file
                      </span>
                      <p className="pl-1">o trascina qui</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Excel, Word o PDF fino a 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Annulla
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "Caricamento in corso..." : "Carica Revisione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
