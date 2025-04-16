import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Document, DocumentItem } from "../../../../shared/schema";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
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
import { useDocumentItems } from "@/hooks/useDocumentItems";
import { useAuth } from "@/hooks/use-auth";
import { getCsrfToken } from "@/lib/getCsrfToken";
import { inferLabelFromMime } from "@/lib/file-utils";

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
  const [calculatedexpiration_date, setCalculatedexpiration_date] =
    useState<Date | null>(null);
  const { csrfToken } = useAuth();

  const { data: validItems = [], isLoading: isLoadingValid } = useDocumentItems(
    document?.id,
    false,
    isOpen
  );

  const filteredValidItems = validItems.filter(
    (item, index, self) =>
      !item.isObsolete && // questo è un ulteriore filtro di sicurezza
      index ===
        self.findIndex(
          (i) =>
            i.title === item.title &&
            i.revision === item.revision &&
            i.emission_date === item.emission_date
        )
  );

  const { data: obsoleteItems = [], isLoading: isLoadingObsolete } =
    useDocumentItems(document?.id, true, isOpen);

  const filteredObsoleteItems = obsoleteItems.filter(
    (item, index, self) =>
      index ===
      self.findIndex(
        (i) =>
          i.title === item.title &&
          i.revision === item.revision &&
          i.emission_date === item.emission_date
      )
  );

  // Form setup for adding new items
  const form = useForm<any>({
    resolver: zodResolver(
      z.object({
        title: z.string().min(1, "Il titolo è obbligatorio"),
        revision: z.number().min(1, "La revisione è obbligatoria"),
        description: z.string().optional(),
        emission_date: z.date(),
        validity_value: z.number().min(1),
        validity_unit: z.enum(["months", "years"]),
        notification_value: z.number().min(0),
        notification_unit: z.enum(["days", "months"]),
        status: z.string().default("valid"),
        isObsolete: z.boolean().optional(),
        notification_email: z
          .string()
          .email("Email non valida")
          .optional()
          .nullable(),
      })
    ),
    defaultValues: {
      title: "",
      revision: 1,
      description: "",
      emission_date: new Date(),
      validity_value: 1,
      validity_unit: "months",
      notification_value: 30,
      notification_unit: "days",
      status: "valid",
    },
  });

  const handleEditSubmit = form.handleSubmit(async (data) => {
    console.log("🧾 DATI FORM SUBMIT:", data);
    console.log("📦 REVISIONE INVIATA:", data.revision, typeof data.revision);

    if (!selectedItem?.id) return;

    await editItemMutation.mutateAsync(data);
  });

  const editItemMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedItem?.id) throw new Error("Nessun elemento selezionato");

      const formattedData = {
        ...data,
        emission_date: data.emission_date,
        validity_value: data.validity_value,
        validity_unit: data.validity_unit,
        notification_value: data.notification_value,
        notification_unit: data.notification_unit,
      };
      console.log("🚀 DATI FORMATTATI PER API PUT:", formattedData);

      const response = await fetch(`/api/documents/items/${selectedItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        throw new Error("Errore durante la modifica dell'elemento");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Elemento aggiornato",
        description: "Modifica completata con successo",
      });
      if (document?.id) {
        queryClient.invalidateQueries(["documentItems", document.id, false]); // attivi
        queryClient.invalidateQueries(["documentItems", document.id, true]); // obsoleti
      }
      // obsoleti
      setSelectedItem(null);
      setActiveTab("items");
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Errore durante la modifica: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const emissionDate = form.watch("emission_date");
    const validityValue = form.watch("validity_value");
    const validityUnit = form.watch("validity_unit");

    if (!emissionDate || !validityValue || !validityUnit) return;

    const base = new Date(emissionDate);
    const date = new Date(base);

    if (validityUnit === "months") {
      date.setMonth(date.getMonth() + validityValue);
    } else {
      date.setFullYear(date.getFullYear() + validityValue);
    }

    setCalculatedexpiration_date(date);
  }, [
    form.watch("emission_date"),
    form.watch("validity_value"),
    form.watch("validity_unit"),
  ]);

  // Display items with status
  const renderItems = () => {
    if (isLoadingValid || isLoadingObsolete)
      return <div>Caricamento elementi...</div>;

    return (
      <div className="space-y-4">
        {/* Sezione per gli elementi attivi */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Elementi Attivi</h2>
          {activeItems.length === 0 ? (
            <div>Nessun elemento attivo</div>
          ) : (
            activeItems.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{item.title}</h3>
                  <StatusEmoji status={item.status} />
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
                <div className="mt-2 text-sm">
                  <div>
                    Scadenza:{" "}
                    {item.expiration_date
                      ? formatDate(item.expiration_date)
                      : "-"}
                  </div>
                  <div>Preavviso: {item.notification_value} giorni</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sezione per gli elementi obsoleti */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Elementi Obsoleti</h2>
          {obsoleteItems.length === 0 ? (
            <div>Nessun elemento obsoleto</div>
          ) : (
            obsoleteItems.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg bg-gray-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{item.title}</h3>
                  <StatusEmoji status={item.status} />
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
                <div className="mt-2 text-sm">
                  <div>
                    Scadenza:{" "}
                    {item.expiration_date
                      ? formatDate(item.expiration_date)
                      : "-"}
                  </div>
                  <div>Preavviso: {item.notification_value} giorni</div>
                </div>
              </div>
            ))
          )}
        </div>
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
      const { expiration_date, ...rest } = data;
      const formattedData = {
        ...rest,
        documentId: document.id,
        notification_email: data.notification_email || null,
        revision: isNaN(Number(data.revision)) ? 1 : Number(data.revision),
        status: "valid",
      };

      console.log("Dati formattati:", formattedData);

      const result = await apiRequest(
        "POST",
        `/api/documents/${document.id}/items`,
        formattedData,
        await getCsrfToken()
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
      if (document?.id) {
        queryClient.invalidateQueries(["documentItems", document.id, false]); // attivi
        queryClient.invalidateQueries(["documentItems", document.id, true]); // obsoleti
      }
      // obsoleti

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
    console.log("🧾 DATI FORM SUBMIT:", data);

    // 🔧 Fix per emission_date: converto in ISO stringa prima di inviare
    if (data.emission_date instanceof Date && !isNaN(data.emission_date)) {
      data.emission_date = data.emission_date.toISOString();
    } else {
      toast({
        title: "Errore",
        description: "La data di emissione non è valida o mancante.",
        variant: "destructive",
      });
      return;
    }

    try {
      const createdItem = await addItemMutation.mutateAsync(data);

      // ✅ Caricamento file se presente
      if (file && createdItem?.id) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(
          `/api/documents/items/${createdItem.id}/files`,
          {
            method: "POST",
            headers: {
              "X-CSRF-Token": csrfToken || "",
            },
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
      setFile(null);
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

  const handleDeleteItem = async (id: number) => {
    const confirmed = window.confirm(
      "Sei sicuro di voler eliminare questo elemento?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/documents/items/${id}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Errore nella cancellazione");
      }

      toast({
        title: "Elemento eliminato",
        description: "Elemento rimosso con successo",
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/documents", document?.id, "items"],
      });
    } catch (error) {
      toast({
        title: "Errore",
        description:
          error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive",
      });
    }
  };

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
              <TabsTrigger value="obsoleti">Obsoleti</TabsTrigger>
            </TabsList>

            <TabsContent value="edit-item">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <Button type="submit" disabled={editItemMutation.isPending}>
                  {editItemMutation.isPending
                    ? "Modifica in corso..."
                    : "Salva Modifiche"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="items">
              {isLoadingValid ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : filteredValidItems.length === 0 ? (
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
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Revisione
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
                      {filteredValidItems.map((item) => (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {item.title}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {item.revision || "-"}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {item.description || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {item.expiration_date
                              ? formatDate(item.expiration_date)
                              : "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                            {item.notification_value}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <StatusEmoji status={item.status} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 space-x-2">
                            <button
                              className="ml-2 text-blue-600 hover:text-blue-900"
                              onClick={() => {
                                setSelectedItem(item);
                                setActiveTab("edit-item");
                                form.setValue("title", item.title);
                                form.setValue("revision", item.revision || 1);

                                form.setValue(
                                  "description",
                                  item.description || ""
                                );
                                form.setValue(
                                  "notification_value",
                                  item.notification_value || 0
                                );
                                form.setValue(
                                  "expiration_date",
                                  item.expiration_date
                                    ? new Date(item.expiration_date)
                                    : null
                                );
                                form.setValue("status", item.status);
                                form.setValue(
                                  "emission_date",
                                  item.emission_date
                                    ? new Date(item.emission_date)
                                    : new Date()
                                );
                                form.setValue(
                                  "validity_value",
                                  item.validity_value || 1
                                );
                                form.setValue(
                                  "validity_unit",
                                  item.validity_unit || "months"
                                );
                                form.setValue(
                                  "notification_value",
                                  item.notification_value || 30
                                );
                                form.setValue(
                                  "notification_unit",
                                  item.notification_unit || "days"
                                );
                                form.setValue("file_url", item.file_url || "");
                              }}
                            >
                              Modifica
                            </button>

                            <button
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              Elimina
                            </button>
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {item.file_url ? (
                              <a
                                href={`${import.meta.env.VITE_API_URL}${
                                  item.file_url
                                }`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileIcon
                                  fileType={inferFileType(item.file_url)}
                                />
                                <span className="text-sm text-gray-900 ml-1">
                                  {inferLabelFromMime(item.file_url)}
                                </span>
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
                  </div>

                  <div>
                    <Label htmlFor="revision">Revisione</Label>
                    <Input
                      id="revision"
                      type="number"
                      min={1}
                      {...form.register("revision", { valueAsNumber: true })}
                      className="mt-1"
                      placeholder="Es. 1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrizione</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      className="mt-1"
                      placeholder="Descrizione dell'elemento"
                    />
                  </div>

                  <div>
                    <Label>Data di Emissione</Label>
                    <Controller
                      control={form.control}
                      name="emission_date"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
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
                              onSelect={(date) =>
                                field.onChange(date || new Date())
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Validità</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        {...form.register("validity_value", {
                          valueAsNumber: true,
                        })}
                      />
                      <Select
                        {...form.register("validity_unit")}
                        onValueChange={(val) =>
                          form.setValue(
                            "validity_unit",
                            val as "months" | "years"
                          )
                        }
                        defaultValue="months"
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Unità" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="months">Mesi</SelectItem>
                          <SelectItem value="years">Anni</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Preavviso</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        {...form.register("notification_value", {
                          valueAsNumber: true,
                        })}
                      />
                      <Select
                        {...form.register("notification_unit")}
                        onValueChange={(val) =>
                          form.setValue(
                            "notification_unit",
                            val as "days" | "months"
                          )
                        }
                        defaultValue="days"
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Unità" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Giorni</SelectItem>
                          <SelectItem value="months">Mesi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Data di Scadenza (calcolata)</Label>
                    <Input
                      disabled
                      value={
                        calculatedexpiration_date
                          ? format(calculatedexpiration_date, "PPP", {
                              locale: it,
                            })
                          : "-"
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="notification_email">
                      Email per Notifica
                    </Label>
                    <Input
                      id="notification_email"
                      type="email"
                      placeholder="esempio@email.com"
                      {...form.register("notification_email")}
                    />
                  </div>

                  <div>
                    {/* File già caricato */}
                    {form.watch("file_url") && !form.watch("file") && (
                      <div className="text-sm text-green-600 flex items-center gap-2">
                        <span className="material-icons-round text-green-600 text-base">
                          check_circle
                        </span>
                        <a
                          href={`${import.meta.env.VITE_API_URL}${form.watch(
                            "file_url"
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          File già caricato
                        </a>
                      </div>
                    )}

                    {/* Upload nuovo file */}
                    <div>
                      <Label htmlFor="edit-file">Sostituisci File</Label>
                      <Input
                        id="edit-file"
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => {
                          const selected = e.target.files?.[0] || null;
                          setFile(selected);
                          if (selected) {
                            form.setValue("file_url", ""); // reset se l'utente carica un nuovo file
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={addItemMutation.isPending}>
                  {addItemMutation.isPending
                    ? "Salvataggio..."
                    : "Aggiungi Elemento"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="obsoleti">
              {isLoadingObsolete ? (
                <div>Caricamento elementi obsoleti...</div>
              ) : filteredObsoleteItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nessun elemento obsoleto per questo documento.
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg mb-6">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-900">
                          Evento
                        </th>
                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Revisione
                        </th>
                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Scadenza
                        </th>
                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Stato
                        </th>
                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">
                          File
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredObsoleteItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {item.title}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {item.revision || "-"}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {item.expiration_date
                              ? formatDate(item.expiration_date)
                              : "-"}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            <StatusEmoji status="revoked" />
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {item.file_url ? (
                              <a
                                href={`${import.meta.env.VITE_API_URL}${
                                  item.file_url
                                }`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileIcon
                                  fileType={inferFileType(item.file_url)}
                                />
                                <span className="text-sm text-gray-900 ml-1">
                                  {inferLabelFromMime(item.file_url)}
                                </span>
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
