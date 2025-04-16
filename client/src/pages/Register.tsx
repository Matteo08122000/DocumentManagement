import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const registerSchema = z.object({
  username: z.string().min(3, "Lo username deve contenere almeno 3 caratteri"),
  password: z
    .string()
    .min(6, "La password deve contenere almeno 6 caratteri")
    .max(100),
  email: z.string().email("Inserisci un indirizzo email valido"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const [, setLocation] = useLocation();
  const { register, isLoading } = useAuth();
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", email: "" },
  });

  const [showSpinner, setShowSpinner] = React.useState(false);

  const onSubmit = async (data: RegisterFormData) => {
    setShowSpinner(true);
    const startTime = Date.now();

    try {
      await register(data.username, data.password, data.email);

      const elapsed = Date.now() - startTime;
      const remaining = 3000 - elapsed;

      setTimeout(
        () => {
          setShowSpinner(false);
          setLocation("/");
        },
        remaining > 0 ? remaining : 0
      );
    } catch (error) {
      console.error("Errore nella registrazione:", error);
      setShowSpinner(false);
    }
  };

  if (showSpinner) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Registrati</CardTitle>
          <CardDescription>
            Crea un nuovo account per accedere al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Scegli uno username" {...field} />
                    </FormControl>
                    <FormDescription>
                      Lo username verrà utilizzato per accedere al sistema
                    </FormDescription>
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
                      <Input
                        type="email"
                        placeholder="La tua email"
                        {...field}
                      />
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
                      <Input
                        type="password"
                        placeholder="Crea una password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      La password deve contenere almeno 6 caratteri
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || showSpinner}
              >
                {isLoading ? "Registrazione in corso..." : "Registrati"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm">
            Hai già un account?{" "}
            <Link href="/login">
              <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                Accedi
              </span>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;
