import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PermissionGuard } from "@/components/layout/PermissionGuard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Leads from "./pages/Leads";
import Campaigns from "./pages/marketing/Campaigns";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import OrderForm from "./pages/OrderForm";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";
import PurchaseOrderForm from "./pages/PurchaseOrderForm";
import Sourcing from "./pages/Sourcing";
import SourcingDetail from "./pages/SourcingDetail";
import Quotations from "./pages/Quotations";
import QuotationForm from "./pages/QuotationForm";
import QuotationDetail from "./pages/QuotationDetail";
import CustomerLedger from "./pages/CustomerLedger";
import QCInspections from "./pages/QCInspections";
import QCInspectionDetail from "./pages/QCInspectionDetail";
import Shipments from "./pages/Shipments";
import ShipmentForm from "./pages/ShipmentForm";
import ShipmentEditForm from "./pages/ShipmentEditForm";
import SalesDashboard from "./pages/SalesDashboard";
import ImportOrders from "./pages/ImportOrders";
import WorkloadDashboard from "./pages/WorkloadDashboard";
import Settings from "./pages/Settings";
import UserManagement from "./pages/admin/UserManagement";
import PermissionMatrix from "./pages/admin/PermissionMatrix";
import EmployeeList from "./pages/hr/EmployeeList";
import AttendanceDashboard from "./pages/hr/AttendanceDashboard";
import Recruitment from "./pages/hr/Recruitment";
import PerformanceDashboard from "./pages/hr/PerformanceDashboard";
import PerformanceReview from "./pages/hr/PerformanceReview";
import AdminRequests from "./pages/hr/AdminRequests";
import Salaries from "./pages/finance/Salaries";
import { CustomerLayout } from "./components/layout/CustomerLayout";
import CustomerLogin from "./pages/customer/CustomerLogin";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerOrders from "./pages/customer/CustomerOrders";
import CustomerOrderDetail from "./pages/customer/CustomerOrderDetail";
import CustomerShipments from "./pages/customer/CustomerShipments";
import CustomerSupport from "./pages/customer/CustomerSupport";
import FinanceOverview from "./pages/finance/FinanceOverview";
import CustomerPayments from "./pages/finance/CustomerPayments";
import SupplierPayments from "./pages/finance/SupplierPayments";
import ExpenseTracking from "./pages/finance/ExpenseTracking";
import SalaryManagement from "./pages/finance/SalaryManagement";
import CustomerLedgerDetail from "./pages/CustomerLedgerDetail";
import CashFlowDashboard from "./pages/finance/CashFlowDashboard";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loader" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loader" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={
          <PermissionGuard module="dashboard">
            <Dashboard />
          </PermissionGuard>
        } />

        {/* Sales */}
        <Route path="sales" element={
          <PermissionGuard module="sales">
            <SalesDashboard />
          </PermissionGuard>
        } />
        <Route path="leads" element={
          <PermissionGuard module="leads">
            <Leads />
          </PermissionGuard>
        } />

        {/* Marketing */}
        <Route path="marketing/campaigns" element={
          <PermissionGuard module="marketing">
            <Campaigns />
          </PermissionGuard>
        } />

        {/* Customers */}
        <Route path="customers" element={
          <PermissionGuard module="customers">
            <Customers />
          </PermissionGuard>
        } />

        {/* Sourcing */}
        <Route path="sourcing" element={
          <PermissionGuard module="sourcing">
            <Sourcing />
          </PermissionGuard>
        } />
        <Route path="sourcing/:id" element={
          <PermissionGuard module="sourcing">
            <SourcingDetail />
          </PermissionGuard>
        } />

        {/* Quotations */}
        <Route path="quotations" element={
          <PermissionGuard module="quotations">
            <Quotations />
          </PermissionGuard>
        } />
        <Route path="quotations/new" element={
          <PermissionGuard module="quotations">
            <QuotationForm />
          </PermissionGuard>
        } />
        <Route path="quotations/:id" element={
          <PermissionGuard module="quotations">
            <QuotationDetail />
          </PermissionGuard>
        } />
        <Route path="quotations/:id/edit" element={
          <PermissionGuard module="quotations">
            <QuotationForm />
          </PermissionGuard>
        } />

        {/* Finance - Customer Ledger */}
        <Route path="customer-ledger" element={
          <PermissionGuard module="finance">
            <CustomerLedger />
          </PermissionGuard>
        } />
        <Route path="customer-ledger/:customerId" element={
          <PermissionGuard module="finance">
            <CustomerLedgerDetail />
          </PermissionGuard>
        } />

        {/* Orders */}
        <Route path="orders" element={
          <PermissionGuard module="orders">
            <Orders />
          </PermissionGuard>
        } />
        <Route path="orders/new" element={
          <PermissionGuard module="orders">
            <OrderForm />
          </PermissionGuard>
        } />
        <Route path="orders/:id" element={
          <PermissionGuard module="orders">
            <OrderDetail />
          </PermissionGuard>
        } />
        <Route path="orders/:id/edit" element={
          <PermissionGuard module="orders">
            <OrderForm />
          </PermissionGuard>
        } />
        <Route path="orders/import" element={
          <PermissionGuard module="orders">
            <ImportOrders />
          </PermissionGuard>
        } />

        {/* Suppliers */}
        <Route path="suppliers" element={
          <PermissionGuard module="suppliers">
            <Suppliers />
          </PermissionGuard>
        } />

        {/* Purchase Orders */}
        <Route path="purchase-orders" element={
          <PermissionGuard module="purchase_orders">
            <PurchaseOrders />
          </PermissionGuard>
        } />
        <Route path="purchase-orders/new" element={
          <PermissionGuard module="purchase_orders">
            <PurchaseOrderForm />
          </PermissionGuard>
        } />
        <Route path="purchase-orders/:id" element={
          <PermissionGuard module="purchase_orders">
            <PurchaseOrderDetail />
          </PermissionGuard>
        } />
        <Route path="purchase-orders/:id/edit" element={
          <PermissionGuard module="purchase_orders">
            <PurchaseOrderForm />
          </PermissionGuard>
        } />

        {/* Projects - uses orders permission */}
        <Route path="projects" element={
          <PermissionGuard module="orders">
            <Dashboard />
          </PermissionGuard>
        } />

        {/* QC */}
        <Route path="qc" element={
          <PermissionGuard module="qc">
            <QCInspections />
          </PermissionGuard>
        } />
        <Route path="qc/inspections" element={
          <PermissionGuard module="qc">
            <QCInspections />
          </PermissionGuard>
        } />
        <Route path="qc/inspections/:id" element={
          <PermissionGuard module="qc">
            <QCInspectionDetail />
          </PermissionGuard>
        } />
        <Route path="qc/corrective-actions" element={
          <PermissionGuard module="qc">
            <Dashboard />
          </PermissionGuard>
        } />
        <Route path="qc/after-sales" element={
          <PermissionGuard module="after_sales">
            <Dashboard />
          </PermissionGuard>
        } />

        {/* Shipments */}
        <Route path="shipments" element={
          <PermissionGuard module="shipments">
            <Shipments />
          </PermissionGuard>
        } />
        <Route path="shipments/new" element={
          <PermissionGuard module="shipments">
            <ShipmentForm />
          </PermissionGuard>
        } />
        <Route path="shipments/:id/edit" element={
          <PermissionGuard module="shipments">
            <ShipmentEditForm />
          </PermissionGuard>
        } />

        {/* Finance */}
        <Route path="finance" element={
          <PermissionGuard module="finance">
            <FinanceOverview />
          </PermissionGuard>
        } />
        <Route path="finance/customer-payments" element={
          <PermissionGuard module="finance">
            <CustomerPayments />
          </PermissionGuard>
        } />
        <Route path="finance/supplier-payments" element={
          <PermissionGuard module="finance">
            <SupplierPayments />
          </PermissionGuard>
        } />
        <Route path="finance/expenses" element={
          <PermissionGuard module="finance">
            <ExpenseTracking />
          </PermissionGuard>
        } />
        <Route path="finance/salaries" element={
          <PermissionGuard module="salary">
            <SalaryManagement />
          </PermissionGuard>
        } />
        <Route path="finance/cash-flow" element={
          <PermissionGuard module="finance">
            <CashFlowDashboard />
          </PermissionGuard>
        } />

        {/* HR */}
        <Route path="hr/employees" element={
          <PermissionGuard module="hr">
            <EmployeeList />
          </PermissionGuard>
        } />
        <Route path="hr/attendance" element={
          <PermissionGuard module="hr">
            <AttendanceDashboard />
          </PermissionGuard>
        } />
        <Route path="hr/recruitment" element={
          <PermissionGuard module="hr">
            <Recruitment />
          </PermissionGuard>
        } />
        <Route path="hr/performance" element={
          <PermissionGuard module="hr">
            <PerformanceDashboard />
          </PermissionGuard>
        } />
        <Route path="hr/performance/:id" element={
          <PermissionGuard module="hr">
            <PerformanceReview />
          </PermissionGuard>
        } />
        <Route path="hr/admin" element={
          <PermissionGuard module="hr">
            <AdminRequests />
          </PermissionGuard>
        } />

        {/* Analytics */}
        <Route path="workload" element={
          <PermissionGuard module="analytics">
            <WorkloadDashboard />
          </PermissionGuard>
        } />

        {/* Admin - requires super_admin */}
        <Route path="admin/users" element={
          <PermissionGuard module="admin" requireAdmin>
            <UserManagement />
          </PermissionGuard>
        } />
        <Route path="admin/permissions" element={
          <PermissionGuard module="admin" requireAdmin>
            <PermissionMatrix />
          </PermissionGuard>
        } />

        {/* Settings */}
        <Route path="settings" element={
          <PermissionGuard module="settings">
            <Settings />
          </PermissionGuard>
        } />

        {/* Portals */}
        <Route path="customer-portal" element={
          <PermissionGuard module="customer_portal">
            <Dashboard />
          </PermissionGuard>
        } />
        <Route path="supplier-portal" element={
          <PermissionGuard module="supplier_portal">
            <Dashboard />
          </PermissionGuard>
        } />

        <Route path="tasks" element={<Dashboard />} />
      </Route>

      {/* Customer Portal */}
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/customer" element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
        <Route index element={<CustomerDashboard />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="finance/expenses" element={<Dashboard />} /> {/* Placeholder */}
        <Route path="finance/salaries" element={
          <PermissionGuard module="finance">
            <Salaries />
          </PermissionGuard>
        } />
        <Route path="orders/:id" element={<CustomerOrderDetail />} />
        <Route path="shipments" element={<CustomerShipments />} />
        <Route path="support" element={<CustomerSupport />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
