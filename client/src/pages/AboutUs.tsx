import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AboutUs: React.FC = () => {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200 mb-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">
            Chi Siamo
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>La Nostra Missione</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                La nostra missione è quella di semplificare la gestione
                documentale per le aziende, con un'attenzione particolare alle
                scadenze e alle revisioni dei documenti. Offriamo una soluzione
                completa che aiuta a mantenere l'organizzazione e la conformità.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>I Nostri Valori</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Ci impegniamo a fornire un servizio di alta qualità basato su
                semplicità, efficienza e affidabilità. La sicurezza dei dati e
                la soddisfazione del cliente sono al centro del nostro lavoro
                quotidiano.
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>La Nostra Storia</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Siamo nati con una visione semplice ma potente: rendere la
                gestione documentale un alleato strategico per ogni azienda.
                Abbiamo trasformato anni di esperienza in soluzioni digitali
                intuitive, costruite ascoltando chi, ogni giorno, deve gestire
                scadenze, revisioni e responsabilità. Cresciamo insieme ai
                nostri clienti, evolvendo il prodotto attorno alle loro vere
                esigenze.
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Il Nostro Team</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Siamo un team dinamico, con background che spaziano dal software
                development alla consulenza aziendale. Ma soprattutto, siamo
                persone che credono nell’efficienza, nella semplicità e nel
                valore di un’assistenza concreta. Ogni giorno lavoriamo con
                passione per offrire una piattaforma solida, moderna e pensata
                per chi vuole davvero semplificarsi la vita.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
