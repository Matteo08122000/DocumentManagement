import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Obsolete from "@/pages/Obsolete";
import Notifications from "@/pages/Notifications";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AboutUs from "@/pages/AboutUs";
import Support from "@/pages/Support";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

function App() {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/obsoleti" component={Obsolete} />
            <Route path="/notifiche" component={Notifications} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/chi-siamo" component={AboutUs} />
            <Route path="/assistenza" component={Support} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
      
      <Footer />
      <Toaster />
    </div>
  );
}

export default App;
