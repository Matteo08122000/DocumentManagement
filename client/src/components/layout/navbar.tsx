import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface NavbarProps {
  toggleSidebar: () => void;
}

export default function Navbar({ toggleSidebar }: NavbarProps) {
  const [location] = useLocation();
  
  // Verifica lo stato di autenticazione
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minuti
    refetchOnWindowFocus: false
  });
  
  const isLoggedIn = Boolean(user);
  
  // Logo testo
  const AppLogo = () => (
    <div className="flex-shrink-0 flex items-center">
      <span className="font-bold text-xl text-white">DocGenius</span>
    </div>
  );
  
  // Pulsante hamburger per mobile
  const MobileMenuButton = () => (
    <Button
      variant="ghost"
      size="sm"
      className="text-white hover:bg-blue-700 ml-auto flex md:hidden"
      onClick={toggleSidebar}
      aria-label="Menu principale"
    >
      <Menu className="h-6 w-6" />
    </Button>
  );
  
  // Componente user
  const UserStatus = () => (
    <div className="hidden md:flex items-center space-x-2">
      <div className="text-sm text-white">
        {isLoggedIn ? 'Benvenuto!' : 'Accedi per iniziare'}
      </div>
    </div>
  );

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <AppLogo />
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <UserStatus />
            <MobileMenuButton />
          </div>
        </div>
      </div>
    </header>
  );
}
