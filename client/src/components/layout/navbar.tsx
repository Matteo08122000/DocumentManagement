import { useLocation, Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  toggleSidebar: () => void;
}

export default function Navbar({ toggleSidebar }: NavbarProps) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  
  // Logo testo cliccabile
  const AppLogo = () => (
    <div className="flex-shrink-0 flex items-center">
      <Link href="/">
        <span className="font-bold text-xl text-white cursor-pointer">DocGenius</span>
      </Link>
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
  
  // Gestione logout
  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };
  
  // Componente user menu autenticato
  const AuthenticatedMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700">
          <User className="h-5 w-5" />
          {user?.username && (
            <span className="hidden sm:inline ml-1">{user.username}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem className="cursor-default">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  
  // Per utenti non autenticati, nessun menu nella navbar
  const UnauthenticatedMenu = () => null;

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <AppLogo />
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            {isAuthenticated ? <AuthenticatedMenu /> : <UnauthenticatedMenu />}
            <MobileMenuButton />
          </div>
        </div>
      </div>
    </header>
  );
}
