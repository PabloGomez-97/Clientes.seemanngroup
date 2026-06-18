import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/auth/ProtectedRoute";
import AdminLayout from "@/layouts/AdminLayout";
import UsersManagement from "@/components/administrador/cuentas/users-management";
import SettingsAdmin from "@/components/administrador/cuentas/clientes-ejecutivos";
import ReporteriaLayout from "@/components/administrador/reporteria/ReporteriaLayout";
import ReportExecutive from "@/components/administrador/reporteria/financiera/Reporteriaexecutivo";
import Cotizadoradministrador from "@/components/administrador/cotizador/administrador/Cotizador-administrador";
import SimuladorCotizaciones from "@/components/administrador/cotizador/simulador/SimuladorCotizaciones";
import Clientesejecutivos from "@/components/administrador/cuentas/clientes-ejecutivos";
import ShipsGoTrackingAdmin from "@/components/administrador/tracking/ejecutivo/TrackingAdminEjecutivo";
import ShipsGoTrackingAdminOP from "@/components/administrador/tracking/operaciones/TrackingAdminOperaciones";
import Invoicesxejecutivo from "@/components/administrador/reporteria/financiera/Facturaciones";
import GestorTarifas from "@/components/administrador/pricing/gestor/GestorTarifas";
import TarifarioCompleto from "@/components/administrador/pricing/tarifario/TarifarioCompleto";
import DocumentosProveedores from "@/components/administrador/pricing/proveedores/DocumentosProveedores";
import CorreosProveedores from "@/components/administrador/pricing/proveedores/CorreosProveedores";
import ReporteriaClientes from "@/components/administrador/clientes/reporteria/ReporteriaClientes";
import Documentacion from "@/components/administrador/clientes/documentacion/Documentacion";
import OPDocumentacion from "@/components/administrador/clientes/documentacion/DocumentacionOperaciones";
import OPReporteriaClientes from "@/components/administrador/clientes/reporteria/ReporteriaClientesOperaciones";
import Auditoria from "@/components/administrador/cumplimiento/Auditoria";
import AgenciaAduanas from "@/components/administrador/cumplimiento/AgenciaAduanas";
import GestionCotizador from "@/components/administrador/cotizador/gestion/GestionCotizador";
import ComportamientoDeClientes from "@/components/administrador/clientes/comportamiento/ComportamientoDeClientes";
import OPComportamientoDeClientes from "@/components/administrador/clientes/comportamiento/OP-ComportamientoDeClientes";
import PricingAlertsPanel from "@/components/administrador/pricing/alertas/PricingAlertsPanel";
import ReporteriaDashboard from "@/components/administrador/reporteria/pages/ReporteriaDashboard";
import ReporteriaKPIs from "@/components/administrador/reporteria/pages/ReporteriaKPIs";
import ReporteriaExecutives from "@/components/administrador/reporteria/pages/ReporteriaExecutives";
import ReporteriaTrends from "@/components/administrador/reporteria/pages/ReporteriaTrends";
import PriceHistoryExplorer from "@/components/cliente/tarifas/priceHistory/PriceHistoryExplorer";
import ConsultaTarifas from "@/components/cliente/tarifas/rateConsult/ConsultaTarifas";
import Novedades from "@/components/cliente/novedades/Novedades";
import PromesasPage from "@/components/cliente/home/promesas/PromesasPage";
import HomeSwitch from "./HomeSwitch";
import { legacyAdminRedirects } from "./legacy-redirects";

export const adminRoutes = (
  <Route
    path="/admin"
    element={
      <ProtectedRoute requireAdmin={true}>
        <AdminLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/admin/home" replace />} />
    <Route path="home" element={<HomeSwitch />} />

    <Route path="cotizador" element={<Cotizadoradministrador />} />
    <Route path="simulador-cotizaciones" element={<SimuladorCotizaciones />} />
    <Route path="gestion-cotizador" element={<GestionCotizador />} />

    <Route path="clientes" element={<Clientesejecutivos />} />
    <Route
      path="clientes/reporteria/:clientUsername?"
      element={<ReporteriaClientes />}
    />
    <Route
      path="clientes/documentacion/:clientUsername?"
      element={<Documentacion />}
    />
    <Route
      path="clientes/tracking/:clientUsername?"
      element={<ShipsGoTrackingAdmin />}
    />
    <Route
      path="clientes/comportamiento/:clientUsername?"
      element={<ComportamientoDeClientes />}
    />

    <Route
      path="operaciones/clientes/reporteria/:clientUsername?"
      element={<OPReporteriaClientes />}
    />
    <Route
      path="operaciones/clientes/documentacion/:clientUsername?"
      element={<OPDocumentacion />}
    />
    <Route
      path="operaciones/tracking/:clientUsername?"
      element={<ShipsGoTrackingAdminOP />}
    />
    <Route
      path="operaciones/clientes/comportamiento/:clientUsername?"
      element={<OPComportamientoDeClientes />}
    />

    <Route path="users" element={<UsersManagement />} />
    <Route path="settings" element={<SettingsAdmin />} />

    <Route path="pricing" element={<GestorTarifas />} />
    <Route path="pricing/alertas" element={<PricingAlertsPanel />} />
    <Route path="tarifario-completo" element={<TarifarioCompleto />} />
    <Route path="documentos-proveedores" element={<DocumentosProveedores />} />
    <Route path="correos-proveedores" element={<CorreosProveedores />} />

    <Route path="historico-precios" element={<PriceHistoryExplorer />} />
    <Route path="consultar-tarifas" element={<ConsultaTarifas />} />
    <Route path="novedades" element={<Novedades />} />
    <Route path="promesas" element={<PromesasPage />} />

    <Route path="reporteria" element={<ReporteriaLayout />}>
      <Route
        index
        element={<Navigate to="/admin/reporteria/dashboard" replace />}
      />
      <Route path="dashboard" element={<ReporteriaDashboard />} />
      <Route path="kpis" element={<ReporteriaKPIs />} />
      <Route path="ejecutivos" element={<ReporteriaExecutives />} />
      <Route path="tendencias" element={<ReporteriaTrends />} />
      <Route path="financiera/ejecutivo" element={<ReportExecutive />} />
      <Route path="financiera/operacional" element={<Invoicesxejecutivo />} />
    </Route>

    <Route path="auditoria" element={<Auditoria />} />
    <Route path="agencia-aduanas" element={<AgenciaAduanas />} />

    {legacyAdminRedirects}
  </Route>
);
