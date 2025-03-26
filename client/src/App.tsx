import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import DocumentDetail from "@/pages/document-detail";
import ObsoleteDocuments from "@/pages/obsolete-documents";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/document/:id" component={DocumentDetail} />
      <Route path="/obsolete" component={ObsoleteDocuments} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
