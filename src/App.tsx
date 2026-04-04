// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { useAuth } from "./auth/AuthContext";
import Login from "./auth/Login";
import LoginAdmin from "./auth/LoginAdmin";
import LoginProveedor from "./auth/LoginProveedor";
import ProtectedRoute from "./auth/ProtectedRoute";

// Layouts
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import ProveedorLayout from "./layouts/ProveedorLayout";

// Home Page
import Home from "./components/Sidebar/Home";

// Admin Views
import DashboardAdmin from "./components/administrador/dashboard-admin";
import UsersManagement from "./components/administrador/Administracion-Cuentas/users-management";
import SettingsAdmin from "./components/administrador/Administracion-Cuentas/clientes-ejecutivos";
import ReporteriaLayout from "./components/administrador/reporteria/ReporteriaLayout";
import ReportExecutive from "./components/administrador/Facturaciones-Ejecutivos/Reporteriaexecutivo";
import Cotizadoradministrador from "./components/administrador/Cotizador-administrador";
import Clientesejecutivos from "./components/administrador/Administracion-Cuentas/clientes-ejecutivos";
import ShipsGoTrackingAdmin from "./components/administrador/Shipsgo/gettrackingshipsgo-admin";
import ShipsGoTrackingAdminOP from "./components/administrador/Shipsgo/OP-trackeo";
import Invoicesxejecutivo from "./components/administrador/Facturaciones-Ejecutivos/Facturaciones";
import GestorTarifas from "./components/Pricing/GestorTarifas";
import TarifarioCompleto from "./components/Pricing/TarifarioCompleto";
import HomePricing from "./components/Pricing/HomePricing";
import DocumentosProveedores from "./components/Pricing/DocumentosProveedores";
import HomeEjecutivo from "./components/administrador/HomeEjecutivo";
import HomeOperaciones from "./components/administrador/HomeOperaciones";
import ReporteriaClientes from "./components/administrador/ReporteriaClientes";
import Documentacion from "./components/administrador/Documentacion";
import OPReporteriaClientes from "./components/administrador/OP-reporteriaclientes";
import Auditoria from "./components/administrador/Auditoria";

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
import Cotizador from "./components/Sidebar/Newquotes";
import QuotesView from "./components/Sidebar/QuotesView";
import AirShipmentsView from "./components/shipments/AirShipmentsView";
import OceanShipmentsView from "./components/shipments/OceanShipmentsView";
import GroundShipmentsView from "./components/shipments/GroundShipmentsView";
import Financiera from "./components/Sidebar/ReporteriaFinanciera";
import Settings from "./components/settings/Settings";
import ReporteriaOperacional from "./components/Sidebar/ReporteriaOperacional";
import ShipsGoTracking from "./components/Sidebar/Shipsgotracking";
import CreateShipmentForm from "./components/Sidebar/New-tracking";
import CreateOceanShipmentForm from "./components/Sidebar/New-ocean-tracking";
import Novedades from "./components/Sidebar/Novedades";
import ShippingOrderView from "./components/Sidebar/ShippingOrder";
import CotizacionEspecial from "./components/Sidebar/Cotizacion-especial";

// Proveedor Views
import HomeProveedores from "./components/Proveedores/Homeproveedores";
import TarifarioAereo from "./components/Proveedores/TarifarioAereo";
import TarifarioFCL from "./components/Proveedores/TarifarioFCL";
import TarifarioLCL from "./components/Proveedores/TarifarioLCL";
import ArchivosProveedor from "./components/Proveedores/ArchivosProveedor";
import NecesitasAyuda from "./components/Proveedores/NecesitasAyuda";

/** Renders different home page depending on the user's role */
function HomeSwitch() {
  const { user } = useAuth();
  if (user?.roles?.pricing && !user?.roles?.ejecutivo) return <HomePricing />;
  if (user?.roles?.ejecutivo) return <HomeEjecutivo />;
  if (user?.roles?.operaciones) return <HomeOperaciones />;
  if (user?.roles?.pricing) return <HomePricing />;
  return <HomeEjecutivo />;
}

function App() {
  const { user, loading } = useAuth();

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
    <>
      <Routes>
        {/* Ruta de Login */}
        <Route
          path="/login"
          element={
            loading ? null : user ? (
              <Navigate to={getHomeRoute()} replace />
            ) : (
              <Login />
            )
          }
        />

        {/* Ruta de Login Administrativo */}
        <Route
          path="/login-admin"
          element={
            loading ? null : user ? (
              <Navigate to={getHomeRoute()} replace />
            ) : (
              <LoginAdmin />
            )
          }
        />

        {/* Ruta de Login Proveedor */}
        <Route
          path="/login-proveedor"
          element={
            loading ? null : user ? (
              <Navigate to={getHomeRoute()} replace />
            ) : (
              <LoginProveedor />
            )
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
          <Route path="home" element={<HomeSwitch />} />
          <Route path="reporteriaclientes" element={<ReporteriaClientes />} />
          <Route path="documentacion" element={<Documentacion />} />
          <Route path="dashboard" element={<DashboardAdmin />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="reportexecutive" element={<ReportExecutive />} />
          <Route path="reportoperational" element={<Invoicesxejecutivo />} />
          <Route path="trackeos" element={<ShipsGoTrackingAdmin />} />
          <Route path="op-trackeos" element={<ShipsGoTrackingAdminOP />} />
          <Route
            path="op-reporteriaclientes"
            element={<OPReporteriaClientes />}
          />
          <Route path="pricing" element={<GestorTarifas />} />
          <Route path="tarifario-completo" element={<TarifarioCompleto />} />
          <Route
            path="documentos-proveedores"
            element={<DocumentosProveedores />}
          />

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
          <Route path="tarifario-aereo" element={<TarifarioAereo />} />
          <Route path="tarifario-fcl" element={<TarifarioFCL />} />
          <Route path="tarifario-lcl" element={<TarifarioLCL />} />
          <Route path="archivos" element={<ArchivosProveedor />} />
          <Route path="ayuda" element={<NecesitasAyuda />} />
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
          <Route path="shipping-orders" element={<ShippingOrderView />} />
          <Route path="cotizacion-especial" element={<CotizacionEspecial />} />
          <Route path="financiera" element={<Financiera />} />
          <Route path="settings" element={<Settings />} />
          <Route path="operacional" element={<ReporteriaOperacional />} />
          <Route path="new-tracking" element={<CreateShipmentForm />} />
          <Route
            path="new-ocean-tracking"
            element={<CreateOceanShipmentForm />}
          />
          <Route path="novedades" element={<Novedades />} />
        </Route>

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
      </Routes>
      <SpeedInsights />
      <Analytics />
    </>
  );
}

export default App;
