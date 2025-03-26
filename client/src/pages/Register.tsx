import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

// Schema di validazione per la registrazione
const registerSchema = z.object({
  username: z.string().min(3, 'Username deve essere di almeno 3 caratteri'),
  email: z.string().email('Inserisci un indirizzo email valido'),
  password: z.string().min(6, 'Password deve essere di almeno 6 caratteri'),
  confirmPassword: z.string().min(6, 'Conferma password deve essere di almeno 6 caratteri'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

// Tipo per i dati del form
type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Configurazione del form con react-hook-form
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Mutation per la registrazione
  const registerMutation = useMutation({
    mutationFn: async (data: Omit<RegisterFormData, "confirmPassword">) => {
      return apiRequest('POST', '/api/auth/register', data);
    },
    onSuccess: () => {
      toast({
        title: 'Registrazione completata',
        description: 'Il tuo account è stato creato con successo. Ora puoi accedere.',
      });
      navigate('/login');
    },
    onError: (error) => {
      toast({
        title: 'Errore di registrazione',
        description: error instanceof Error ? error.message : 'Errore durante la registrazione',
        variant: 'destructive',
      });
    },
  });

  // Gestione del submit del form
  const onSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Registrati</CardTitle>
          <CardDescription className="text-center">
            Crea un nuovo account per gestire i tuoi documenti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Scegli un username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="La tua email" {...field} />
                    </FormControl>
                    <FormDescription>
                      Questa email verrà utilizzata per le notifiche di scadenza dei documenti.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Scegli una password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conferma Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Conferma la tua password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Registrandoti confermi che i dati inseriti sono reali e corretti. L'indirizzo email che hai fornito verrà utilizzato per ricevere notifiche sulle scadenze dei documenti.
                </p>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? 'Registrazione in corso...' : 'Registrati'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-center text-sm text-gray-600 mt-2">
            Hai già un account?{' '}
            <Link href="/login">
              <a className="text-primary-600 hover:text-primary-500 font-medium">
                Accedi
              </a>
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;