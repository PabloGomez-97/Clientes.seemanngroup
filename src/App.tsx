// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Login from './auth/Login';
import LoginAdmin from './auth/LoginAdmin';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';

// Admin Views
import DashboardAdmin from './components/administrador/dashboard-admin';
import UsersManagement from './components/administrador/Administracion-Cuentas/users-management';
import SettingsAdmin from './components/administrador/Administracion-Cuentas/clientes-ejecutivos';
import ReporteriaLayout from './components/administrador/reporteria/ReporteriaLayout';
import EjecutivosManagement from './components/administrador/Administracion-Cuentas/ejecutivos-management';
import ReportExecutive from "./components/administrador/Facturaciones-Ejecutivos/Reporteriaexecutivo"
import Cotizadoradministrador from './components/administrador/Cotizador-administrador';
import Clientesejecutivos from './components/administrador/Administracion-Cuentas/clientes-ejecutivos';
import ShipsGoTrackingAdmin from './components/administrador/Shipsgo/gettrackingshipsgo-admin';
import Invoicesxejecutivo from './components/administrador/Facturaciones-Ejecutivos/Facturaciones';
import Pricing from './components/administrador/PricingTabs';
import PricingFCL from './components/administrador/Pricing/PricingFCL';
import PricingLCL from './components/administrador/Pricing/PricingLCL';

// Reportería Pages
import ReporteriaDashboard from './components/administrador/reporteria/pages/ReporteriaDashboard';
import ReporteriaKPIs from './components/administrador/reporteria/pages/ReporteriaKPIs';
import ReporteriaExecutives from './components/administrador/reporteria/pages/ReporteriaExecutives';
import ReporteriaTrends from './components/administrador/reporteria/pages/ReporteriaTrends';

// Quotes View
import QuoteLCL from './components/quotes/QuoteLCL';
import QuoteFCL from './components/quotes/QuoteFCL';
import QuoteAIR from './components/quotes/QuoteAIR';

// User Views
import Cotizador from './components/Sidebar/Cotizador';
import QuotesView from './components/Sidebar/QuotesView';
import AirShipmentsView from './components/shipments/AirShipmentsView';
import OceanShipmentsView from './components/shipments/OceanShipmentsView';
import Financiera from './components/Sidebar/ReporteriaFinanciera';
import Settings from './components/settings/Settings';
import ReporteriaOperacional from './components/Sidebar/ReporteriaOperacional';
import Changelog from './components/Sidebar/Changelog';
import ShipsGoTracking from './components/Sidebar/Shipsgotracking';
import CreateShipmentForm from './components/Sidebar/CreateShipmentForm';

// OFF
import Operacionales from './components/Sidebar/RO2';
import Envios from './components/deprecated/EnviosAereos OFF';
import EnviosMaritimos from './components/deprecated/EnviosMaritimos OFF';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Ruta de Login */}
      <Route 
        path="/login" 
        element={user ? <Navigate to={user.username === 'Administrador' ? '/admin/cotizador-administrador' : '/newquotes'} replace /> : <Login />} 
      />

      {/* Ruta de Login Administrativo */ }
      <Route 
        path="/login-admin" 
        element={user ? <Navigate to={user.username === 'Administrador' ? '/admin/dashboard' : '/login'} replace /> : <LoginAdmin />} 
      />





      {/* Rutas de Administrador */}
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route path="cotizador-administrador" element={<Cotizadoradministrador />} />
        <Route path="tusclientes" element={<Clientesejecutivos />} />
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
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
          <Route index element={<Navigate to="/admin/reporteria/dashboard" replace />} />
          <Route path="dashboard" element={<ReporteriaDashboard />} />
          <Route path="kpis" element={<ReporteriaKPIs />} />
          <Route path="ejecutivos" element={<ReporteriaExecutives />} />
          <Route path="tendencias" element={<ReporteriaTrends />} />

        </Route>
        <Route path="settings" element={<SettingsAdmin />} />
      </Route>







      {/* Rutas de Usuario Regular */}
      <Route path="/" element={
        <ProtectedRoute requireAdmin={false}>
          <UserLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/quotes" replace />} />
        <Route path="quotes" element={<QuotesView />} />
        <Route path="newquotes" element={<Cotizador />} />
        <Route path="QuoteAIR" element={<QuoteAIR />} />
        <Route path="QuoteLCL" element={<QuoteLCL />} />
        <Route path="QuoteFCL" element={<QuoteFCL />} />
        <Route path="air-shipments" element={<AirShipmentsView />} />
        <Route path="trackings" element={<ShipsGoTracking />} />
        <Route path="ocean-shipments" element={<OceanShipmentsView />} />
        <Route path="operacionales" element={<Operacionales />} />
        <Route path="envios" element={<Envios />} />
        <Route path="enviosmaritimos" element={<EnviosMaritimos />} />
        <Route path="financiera" element={<Financiera />} />
        <Route path="settings" element={<Settings />} />
        <Route path="changelog" element={<Changelog />} />
        <Route path="operacional" element={<ReporteriaOperacional />} />
        <Route path="new-tracking" element={<CreateShipmentForm />} />
      </Route>

      {/* Ruta por defecto */}
      <Route path="*" element={<Navigate to={user ? (user.username === 'Administrador' ? '/admin/dashboard' : '/quotes') : '/login'} replace />} />
    </Routes>
  );
}

export default App;