import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import { Home } from "@/pages/Home";
import Monitoring from "@/pages/Monitoring";
import AnalyticsContent from "@/pages/AnalyticsContent";
import AnalyticsAudience from "@/pages/AnalyticsAudience";
import TemplateDesigner from "@/pages/TemplateDesigner";
import AIContentStudio from "@/pages/AIContentStudio";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/monitoring">
        <ProtectedRoute component={Monitoring} />
      </Route>
      <Route path="/analytics/content">
        <ProtectedRoute component={AnalyticsContent} />
      </Route>
      <Route path="/analytics/audience">
        <ProtectedRoute component={AnalyticsAudience} />
      </Route>
      <Route path="/template-designer">
        <ProtectedRoute component={TemplateDesigner} />
      </Route>
      <Route path="/ai-content-studio">
        <ProtectedRoute component={AIContentStudio} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
