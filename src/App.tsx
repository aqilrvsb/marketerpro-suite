import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { BundleProvider } from "@/context/BundleContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderForm from "./pages/OrderForm";
import Prospects from "./pages/Prospects";
import Spend from "./pages/Spend";
import ReportingSpend from "./pages/ReportingSpend";
import Logistics from "./pages/Logistics";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NinjavanSettings from "./pages/NinjavanSettings";
import Top10 from "./pages/Top10";
import ReportSales from "./pages/ReportSales";
import DashboardLogistic from "./pages/DashboardLogistic";
import ReportPembelian from "./pages/ReportPembelian";
import Profile from "./pages/Profile";
import PNL from "./pages/PNL";
import PNLConfig from "./pages/PNLConfig";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <BundleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="orders/new" element={<OrderForm />} />
                  <Route path="prospects" element={<Prospects />} />
                  <Route path="spend" element={<Spend />} />
                  <Route path="reporting-spend" element={<ReportingSpend />} />
                  <Route path="top10" element={<Top10 />} />
                  <Route path="pnl" element={<PNL />} />
                  <Route path="pnl-config" element={<PNLConfig />} />
                  <Route path="report-sales" element={<ReportSales />} />
                  <Route path="dashboard-logistic" element={<DashboardLogistic />} />
                  <Route path="report-pembelian" element={<ReportPembelian />} />
                  <Route path="logistics" element={<Logistics />} />
                  <Route path="logistics/order" element={<Logistics />} />
                  <Route path="logistics/shipment" element={<Logistics />} />
                  <Route path="logistics/return" element={<Logistics />} />
                  <Route path="logistics/pending-tracking" element={<Logistics />} />
                  <Route path="logistics/product" element={<Logistics />} />
                  <Route path="logistics/bundle" element={<Logistics />} />
                  <Route path="logistics/stock-in" element={<Logistics />} />
                  <Route path="logistics/stock-out" element={<Logistics />} />
                  <Route path="logistics/ninjavan-settings" element={<NinjavanSettings />} />
                  <Route path="finance" element={<Finance />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </BundleProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
