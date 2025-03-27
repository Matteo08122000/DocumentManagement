import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Schema di validazione per il login
const loginSchema = z.object({
  email: z.string().email('Inserisci un indirizzo email valido'),
  password: z.string().min(6, 'La password deve contenere almeno 6 caratteri'),
});

// Tipo per i dati del form
type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isLoading } = useAuth();

  // Configurazione del form con react-hook-form
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Gestione del submit del form
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      // Se arriviamo qui, il login è riuscito
      setLocation('/');
    } catch (error) {
      // L'errore è già gestito nella funzione login con un toast
      console.error('Errore durante il login:', error);
    }
  };

  return (
    <div className="flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Accedi</CardTitle>
          <CardDescription>
            Inserisci le tue credenziali per accedere al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="La tua email" type="email" {...field} />
                    </FormControl>
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
                      <Input type="password" placeholder="La tua password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Autenticazione in corso...' : 'Accedi'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm">
            Non hai un account?{' '}
            <Link href="/register">
              <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                Registrati ora
              </span>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;