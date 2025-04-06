import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { formatDate } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const Notifications: React.FC = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    error,
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Notification>;
    }) => {
      return apiRequest("PUT", `/api/notifications/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Notifica aggiornata",
        description: "Le preferenze di notifica sono state aggiornate",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile aggiornare la notifica: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`,
        variant: "destructive",
      });
    },
  });

  const filterNotifications = () => {
    if (!email) {
      return notifications || [];
    }

    return (notifications || []).filter((notification) =>
      notification.email.toLowerCase().includes(email.toLowerCase())
    );
  };

  const toggleNotification = (notification: Notification) => {
    updateNotificationMutation.mutate({
      id: notification.id,
      data: { active: !notification.active },
    });
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-6">
            Gestione Notifiche
          </h2>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-6">
            Gestione Notifiche
          </h2>
          <div className="bg-red-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="material-icons-round text-red-400">error</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Errore nel caricamento delle notifiche
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error instanceof Error
                    ? error.message
                    : "Si è verificato un errore durante il caricamento."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredNotifications = filterNotifications();

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg leading-6 font-medium text-gray-900">
            Gestione Notifiche
          </h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                type="email"
                placeholder="Filtra per email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons-round text-gray-400 text-sm">
                  search
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <span className="material-icons-round text-gray-400 text-6xl mb-4">
                notifications_off
              </span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessuna notifica configurata
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {email
                  ? `Nessuna notifica trovata con l'email "${email}"`
                  : "Non sono state configurate notifiche per le scadenze dei documenti."}
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Torna indietro
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNotifications.map((notification) => (
                <Card key={notification.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-md font-medium flex items-center gap-2">
                        <span className="material-icons-round text-yellow-500">
                          notifications
                        </span>
                        Notifica #{notification.id}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={notification.active}
                          onCheckedChange={() =>
                            toggleNotification(notification)
                          }
                          aria-label="Toggle notification"
                        />
                        <Label>Attiva</Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      <p>
                        <strong>Email:</strong> {notification.email}
                      </p>
                      <p>
                        <strong>Documento ID:</strong>{" "}
                        {notification.documentId || "N/A"}
                      </p>
                      <p>
                        <strong>Elemento ID:</strong>{" "}
                        {notification.documentItemId || "N/A"}
                      </p>
                      <p>
                        <strong>Giorni di preavviso:</strong>{" "}
                        {notification.notification_value}
                      </p>
                      <p>
                        <strong>Creata il:</strong>{" "}
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
