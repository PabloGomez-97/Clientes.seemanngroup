// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Login from "./auth/Login";
import LoginAdmin from "./auth/LoginAdmin";
import LoginProveedor from "./auth/LoginProveedor";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import ProveedorLayout from "./layouts/ProveedorLayout";

// Home Page
import Home from "./components/Home";

// Admin Views
import DashboardAdmin from "./components/administrador/dashboard-admin";
import UsersManagement from "./components/administrador/Administracion-Cuentas/users-management";
import SettingsAdmin from "./components/administrador/Administracion-Cuentas/clientes-ejecutivos";
import ReporteriaLayout from "./components/administrador/reporteria/ReporteriaLayout";
import EjecutivosManagement from "./components/administrador/Administracion-Cuentas/ejecutivos-management";
import ReportExecutive from "./components/administrador/Facturaciones-Ejecutivos/Reporteriaexecutivo";
import Cotizadoradministrador from "./components/administrador/Cotizador-administrador";
import Clientesejecutivos from "./components/administrador/Administracion-Cuentas/clientes-ejecutivos";
import ShipsGoTrackingAdmin from "./components/administrador/Shipsgo/gettrackingshipsgo-admin";
import Invoicesxejecutivo from "./components/administrador/Facturaciones-Ejecutivos/Facturaciones";
import Pricing from "./components/administrador/PricingTabs";
import PricingFCL from "./components/administrador/Pricing/PricingFCL";
import PricingLCL from "./components/administrador/Pricing/PricingLCL";
import HomeAdmin from "./components/administrador/HomeAdmin";
import ReporteriaClientes from "./components/administrador/ReporteriaClientes";
import Auditoria from "./components/administrador/Auditoria";
import AlumnosPractica from "./components/administrador/alumnospractica";

// Reportería Pages
import ReporteriaDashboard from "./components/administrador/reporteria/pages/ReporteriaDashboard";
import ReporteriaKPIs from "./components/administrador/reporteria/pages/ReporteriaKPIs";
import ReporteriaExecutives from "./components/administrador/reporteria/pages/ReporteriaExecutives";
import ReporteriaTrends from "./components/administrador/reporteria/pages/ReporteriaTrends";

// Quotes View
import QuoteLCL from "./components/quotes/QuoteLCL";
import QuoteFCL from "./components/quotes/QuoteFCL";
import QuoteAIR from "./components/quotes/QuoteAIR";

// User Views
import Cotizador from "./components/Sidebar/Cotizador";
import QuotesView from "./components/Sidebar/QuotesView";
import AirShipmentsView from "./components/shipments/AirShipmentsView";
import OceanShipmentsView from "./components/shipments/OceanShipmentsView";
import GroundShipmentsView from "./components/shipments/GroundShipmentsView";
import Financiera from "./components/Sidebar/ReporteriaFinanciera";
import Settings from "./components/settings/Settings";
import ReporteriaOperacional from "./components/Sidebar/ReporteriaOperacional";
import Changelog from "./components/Sidebar/Changelog";
import ShipsGoTracking from "./components/Sidebar/Shipsgotracking";
import CreateShipmentForm from "./components/Sidebar/CreateShipmentForm";
import Novedades from "./components/Sidebar/Novedades";

// OFF
import Operacionales from "./components/Sidebar/RO2";
import Envios from "./components/deprecated/EnviosAereos OFF";
import EnviosMaritimos from "./components/deprecated/EnviosMaritimos OFF";

// Proveedor Views
import HomeProveedores from "./components/Proveedores/Homeproveedores";

function App() {
  const { user } = useAuth();

  // Helper para determinar la ruta de inicio según el tipo de usuario
  const getHomeRoute = () => {
    if (!user) return "/login";
    if (user.username === "Ejecutivo") {
      if (user.roles?.proveedor) return "/proveedor/home";
      return "/admin/home";
    }
    return "/";
  };

  return (
    <Routes>
      {/* Ruta de Login */}
      <Route
        path="/login"
        element={user ? <Navigate to={getHomeRoute()} replace /> : <Login />}
      />

      {/* Ruta de Login Administrativo */}
      <Route
        path="/login-admin"
        element={
          user ? <Navigate to={getHomeRoute()} replace /> : <LoginAdmin />
        }
      />

      {/* Ruta de Login Proveedor */}
      <Route
        path="/login-proveedor"
        element={
          user ? <Navigate to={getHomeRoute()} replace /> : <LoginProveedor />
        }
      />

      {/* Rutas de Ejecutivo */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="cotizador-administrador"
          element={<Cotizadoradministrador />}
        />
        <Route path="tusclientes" element={<Clientesejecutivos />} />
        <Route index element={<Navigate to="/admin/home" replace />} />
        <Route path="home" element={<HomeAdmin />} />
        <Route path="reporteriaclientes" element={<ReporteriaClientes />} />
        <Route path="dashboard" element={<DashboardAdmin />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="ejecutivos" element={<EjecutivosManagement />} />
        <Route path="reportexecutive" element={<ReportExecutive />} />
        <Route path="reportoperational" element={<Invoicesxejecutivo />} />
        <Route path="trackeos" element={<ShipsGoTrackingAdmin />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="pricingFCL" element={<PricingFCL />} />
        <Route path="pricingLCL" element={<PricingLCL />} />

        {/* Rutas de Reportería con subrutas */}
        <Route path="reporteria" element={<ReporteriaLayout />}>
          <Route
            index
            element={<Navigate to="/admin/reporteria/dashboard" replace />}
          />
          <Route path="dashboard" element={<ReporteriaDashboard />} />
          <Route path="kpis" element={<ReporteriaKPIs />} />
          <Route path="ejecutivos" element={<ReporteriaExecutives />} />
          <Route path="tendencias" element={<ReporteriaTrends />} />
        </Route>
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="alumnos" element={<AlumnosPractica />} />
        <Route path="settings" element={<SettingsAdmin />} />
      </Route>

      {/* Rutas de Proveedor */}
      <Route
        path="/proveedor"
        element={
          <ProtectedRoute requireProveedor={true}>
            <ProveedorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/proveedor/home" replace />} />
        <Route path="home" element={<HomeProveedores />} />
      </Route>

      {/* Rutas de Usuario Regular */}
      <Route
        path="/"
        element={
          <ProtectedRoute requireAdmin={false}>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="quotes" element={<QuotesView />} />
        <Route path="newquotes" element={<Cotizador />} />
        <Route path="QuoteAIR" element={<QuoteAIR />} />
        <Route path="QuoteLCL" element={<QuoteLCL />} />
        <Route path="QuoteFCL" element={<QuoteFCL />} />
        <Route path="air-shipments" element={<AirShipmentsView />} />
        <Route path="trackings" element={<ShipsGoTracking />} />
        <Route path="ocean-shipments" element={<OceanShipmentsView />} />
        <Route path="ground-shipments" element={<GroundShipmentsView />} />
        <Route path="operacionales" element={<Operacionales />} />
        <Route path="envios" element={<Envios />} />
        <Route path="enviosmaritimos" element={<EnviosMaritimos />} />
        <Route path="financiera" element={<Financiera />} />
        <Route path="settings" element={<Settings />} />
        <Route path="changelog" element={<Changelog />} />
        <Route path="operacional" element={<ReporteriaOperacional />} />
        <Route path="new-tracking" element={<CreateShipmentForm />} />
        <Route path="novedades" element={<Novedades />} />
      </Route>

      {/* Ruta por defecto */}
      <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
    </Routes>
  );
}

export default App;
