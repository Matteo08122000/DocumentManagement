import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Obsolete from "@/pages/Obsolete";
import Notifications from "@/pages/Notifications";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

function App() {
  return (
    <div className="bg-gray-50 h-screen flex flex-col">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto focus:outline-none">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/obsoleti" component={Obsolete} />
            <Route path="/notifiche" component={Notifications} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}

export default App;
