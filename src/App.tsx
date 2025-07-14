
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";
import { analytics } from "@/services/analytics.service";
import { productionService } from "@/services/production.service";
import { logger } from "@/utils/logger";

// Lazy load page components for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  // Initialize production services
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await productionService.initialize();
        logger.info('Application initialized successfully', {
          component: 'App'
        });
      } catch (error) {
        logger.error('Failed to initialize application', error as Error, {
          component: 'App'
        });
      }
    };

    initializeApp();
  }, []);

  // Set up global error handlers
  useEffect(() => {
    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      logger.error('Unhandled error', new Error(event.message), {
        component: 'App',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
      
      analytics.trackError({
        error_type: 'unhandled_error',
        error_message: event.message,
        error_source: `${event.filename}:${event.lineno}:${event.colno}`
      });
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', new Error(event.reason), {
        component: 'App',
        reason: event.reason
      });
      
      analytics.trackError({
        error_type: 'unhandled_promise_rejection',
        error_message: event.reason?.message || String(event.reason),
        error_source: 'promise'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSpinner />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
