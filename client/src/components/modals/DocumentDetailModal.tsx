import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Document, DocumentItem } from "../../../../shared/schema";
import { inferFileType, getFileIcon } from "@/lib/file-utils";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/dateUtils";
import StatusEmoji from "@/components/ui/StatusEmoji";
import FileIcon from "@/components/ui/FileIcon";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import EmailNotificationModal from "./EmailNotificationModal";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, File } from "lucide-react";

interface DocumentDetailModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DocumentItem | null>(null);
  const [activeTab, setActiveTab] = useState("items");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const {
    data: items = [],
    isLoading: isLoadingItems,
    error: itemsError,
  } = useQuery<DocumentItem[]>({
    queryKey: ["/api/documents", document?.id, "items"],
    enabled: !!document?.id && isOpen,
    queryFn: async ({ queryKey }) => {
      // L'endpoint restituisce un array vuoto se il documento non ha elementi
      const response = await fetch(`/api/documents/${document?.id}/items`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Necessario per inviare i cookie di autenticazione
      });

      if (!response.ok) {
        throw new Error(
          `Errore nel recupero degli elementi: ${response.statusText}`
        );
      }

      console.log("Risposta elementi:", response);
      return response.json();
    },
  });

  // Form setup for adding new items
  const form = useForm<any>({
    resolver: zodResolver(
      z.object({
        title: z.string().min(1, "Il titolo è obbligatorio"),
        description: z.string().optional(),
        expirationDate: z.date().nullable().optional(),
        notificationDays: z.number().min(0).default(30),
        status: z.string().default("valid"),
      })
    ),
    defaultValues: {
      title: "",
      description: "",
      expirationDate: null,
      notificationDays: 30,
      status: "valid",
    },
  });

  // Display items with status
  const renderItems = () => {
    if (isLoadingItems) return <div>Caricamento elementi...</div>;

    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{item.title}</h3>
              <StatusEmoji status={item.status} />
            </div>
            <p className="text-sm text-gray-600">{item.description}</p>
            <div className="mt-2 text-sm">
              <div>
                Scadenza:{" "}
                {item.expirationDate ? formatDate(item.expirationDate) : "-"}
              </div>
              <div>Preavviso: {item.notificationDays} giorni</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setActiveTab("items");
    }
  }, [isOpen, form]);

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!document) throw new Error("No document selected");

      console.log("Dati del form:", data);

      // Prepara i dati assicurandosi che la data sia in formato ISO string
      const formattedData = {
        ...data,
        documentId: document.id,
        // Converti la data di scadenza in formato stringa ISO se presente
        expirationDate: data.expirationDate
          ? new Date(data.expirationDate).toISOString()
          : null,
        // Inizializza lo status come 'valid'
        status: "valid",
      };

      console.log("Dati formattati:", formattedData);

      const result = await apiRequest(
        "POST",
        `/api/documents/${document.id}/items`,
        formattedData
      );
      console.log("Risultato aggiunta elemento:", result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Elemento aggiunto",
        description: "Elemento del documento aggiunto con successo",
      });
      // Invalida query sugli elementi del documento corrente
      queryClient.invalidateQueries({
        queryKey: ["/api/documents", document?.id, "items"],
      });

      // Invalida altre query per aggiornare lo stato di tutti i documenti
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });

      // Aggiorna il documento corrente
      if (document?.parentId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/documents/${document.parentId}`],
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/documents/${document.parentId}/children`],
        });
      }

      // Reset del form
      form.reset();

      // Automaticamente passa alla visualizzazione della tabella
      setActiveTab("items");
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile aggiungere l'elemento: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const createdItem = await addItemMutation.mutateAsync(data);

      // Se c'è un file caricato, inviamo l'upload
      if (file && createdItem?.id) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(
          `/api/documents/items/${createdItem.id}/files`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          }
        );

        if (!uploadRes.ok) {
          throw new Error("Errore nell'upload del file");
        }
      }

      toast({
        title: "Elemento aggiunto",
        description: "Elemento e file salvati con successo",
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/documents", document?.id, "items"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });

      if (document?.parentId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/documents/${document.parentId}`],
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/documents/${document.parentId}/children`],
        });
      }

      form.reset();
      setFile(null); // Reset file
      setActiveTab("items");
    } catch (error) {
      toast({
        title: "Errore",
        description: `Errore durante l'invio: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`,
        variant: "destructive",
      });
    }
  });

  if (!document) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex justify-between items-center border-b pb-3">
              <DialogTitle className="text-lg leading-6 font-medium text-gray-900">
                {document.pointNumber} - {document.title}
              </DialogTitle>
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                  {document.revision}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <StatusEmoji status={document.status} />{" "}
                  {document.status === "valid"
                    ? "Valido"
                    : document.status === "expiring"
                    ? "In Scadenza"
                    : "Scaduto"}
                </span>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="items">Elementi Controllati</TabsTrigger>
              <TabsTrigger value="add-item">Aggiungi Elemento</TabsTrigger>
            </TabsList>

            <TabsContent value="items">
              {isLoadingItems ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Nessun elemento controllato per questo documento.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("add-item")}
                  >
                    <span className="material-icons-round mr-2 text-sm">
                      add
                    </span>
                    Aggiungi Elemento
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg mb-6">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Evento
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Descrizione
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Data Scadenza
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          preavviso gg
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          stato
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Azioni
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          File
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {item.title}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {item.description || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {item.expirationDate
                              ? formatDate(item.expirationDate)
                              : "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                            {item.notificationDays}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <StatusEmoji status={item.status} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <button
                              className="text-primary-600 hover:text-primary-900"
                              onClick={() => {
                                setSelectedItem(item);
                                setIsEmailModalOpen(true);
                              }}
                            >
                              Notifiche
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {item.file_url ? (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={item.file_url.split("/").pop()}
                                className="flex items-center justify-center"
                              >
                                <FileIcon
                                  fileType={inferFileType(item.file_url)}
                                />
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="add-item">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="title">Evento</Label>
                    <Input
                      id="title"
                      {...form.register("title")}
                      className="mt-1"
                      placeholder="Codice evento (es. NC-001)"
                    />
                    {form.formState.errors.title && (
                      <p className="text-red-500 text-xs mt-1">
                        {form.formState.errors.title.message?.toString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notificationDays">preavviso gg</Label>
                    <Input
                      id="notificationDays"
                      type="number"
                      {...form.register("notificationDays", {
                        valueAsNumber: true,
                      })}
                      className="mt-1"
                      placeholder="30"
                    />
                    {form.formState.errors.notificationDays && (
                      <p className="text-red-500 text-xs mt-1">
                        {form.formState.errors.notificationDays.message?.toString()}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    className="mt-1"
                    placeholder="Descrizione dell'elemento"
                    rows={3}
                  />
                  {form.formState.errors.description && (
                    <p className="text-red-500 text-xs mt-1">
                      {form.formState.errors.description.message?.toString()}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Data di Scadenza</Label>
                  <div className="mt-1">
                    <Controller
                      control={form.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(new Date(field.value), "PPP", {
                                    locale: it,
                                  })
                                : "Seleziona una data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={(date) => {
                                if (date) {
                                  // Per evitare problemi di timezone, impostiamo solo la data senza l'ora
                                  const formattedDate = new Date(date);
                                  // Converti a UTC per evitare problemi di timezone
                                  formattedDate.setUTCHours(12, 0, 0, 0);
                                  field.onChange(formattedDate);
                                } else {
                                  field.onChange(null);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {form.formState.errors.expirationDate && (
                      <p className="text-red-500 text-xs mt-1">
                        {form.formState.errors.expirationDate.message?.toString()}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="file">Allega File (PDF, Word, Excel)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>

                <Button type="submit" disabled={addItemMutation.isPending}>
                  {addItemMutation.isPending
                    ? "Aggiunta in corso..."
                    : "Aggiungi Elemento"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailNotificationModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentId={document.id}
        documentItemId={selectedItem?.id}
      />
    </>
  );
};

export default DocumentDetailModal;
