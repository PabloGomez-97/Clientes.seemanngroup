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
import UsersManagement from './components/administrador/users-management';
import SettingsAdmin from './components/administrador/settings-admin';
import ReporteriaLayout from './components/administrador/reporteria/ReporteriaLayout';

// Reportería Pages
import ReporteriaDashboard from './components/administrador/reporteria/pages/ReporteriaDashboard';
import ReporteriaKPIs from './components/administrador/reporteria/pages/ReporteriaKPIs';
import ReporteriaExecutives from './components/administrador/reporteria/pages/ReporteriaExecutives';
import ReporteriaTrends from './components/administrador/reporteria/pages/ReporteriaTrends';

// Cotizador
import CotizadorGlobal from './components/cotizador/CotizadorGlobal';

// User Views
import QuotesView from './components/quotes/QuotesView';
import Newquotes from './components/quotes/Newquotes';
import AirShipmentsView from './components/shipments/AirShipmentsView';
import OceanShipmentsView from './components/shipments/OceanShipmentsView';
import ShipmentsView from './components/shipments/Shipments';
import Reports from './components/reports/Reports';
import Settings from './components/settings/Settings';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Ruta de Login */}
      <Route 
        path="/login" 
        element={user ? <Navigate to={user.username === 'Administrador' ? '/admin/dashboard' : '/quotes'} replace /> : <Login />} 
      />

      {/* Ruta de Login Administrativo */}
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
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardAdmin />} />
        <Route path="users" element={<UsersManagement />} />
        
        {/* Rutas de Reportería con subrutas */}
        <Route path="reporteria" element={<ReporteriaLayout />}>
          <Route index element={<Navigate to="/admin/reporteria/dashboard" replace />} />
          <Route path="dashboard" element={<ReporteriaDashboard />} />
          <Route path="kpis" element={<ReporteriaKPIs />} />
          <Route path="ejecutivos" element={<ReporteriaExecutives />} />
          <Route path="tendencias" element={<ReporteriaTrends />} />
        </Route>
        
        <Route path="soporte" element={
          <div className="text-center py-5">
            <h3 className="text-muted">Módulo de Soporte</h3>
            <p className="text-muted">En desarrollo...</p>
          </div>
        } />
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
        <Route path="newquotes" element={<CotizadorGlobal />} />
        <Route path="air-shipments" element={<AirShipmentsView />} />
        <Route path="ocean-shipments" element={<OceanShipmentsView />} />
        <Route path="all-shipments" element={<ShipmentsView />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Ruta por defecto */}
      <Route path="*" element={<Navigate to={user ? (user.username === 'Administrador' ? '/admin/dashboard' : '/quotes') : '/login'} replace />} />
    </Routes>
  );
}

export default App;