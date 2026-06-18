import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/auth/ProtectedRoute";
import ProveedorLayout from "@/layouts/ProveedorLayout";
import HomeProveedores from "@/components/proveedores/home/Homeproveedores";
import TarifarioAereo from "@/components/proveedores/tarifarios/TarifarioAereo";
import TarifarioFCL from "@/components/proveedores/tarifarios/TarifarioFCL";
import TarifarioLCL from "@/components/proveedores/tarifarios/TarifarioLCL";
import ArchivosProveedor from "@/components/proveedores/documentos/ArchivosProveedor";
import NecesitasAyuda from "@/components/proveedores/home/NecesitasAyuda";
import QuoteInternacionalizacion from "@/components/proveedores/tarifarios/QuoteInternacionalizacion";
import PriceHistoryExplorer from "@/components/cliente/tarifas/priceHistory/PriceHistoryExplorer";
import ConsultaTarifas from "@/components/cliente/tarifas/rateConsult/ConsultaTarifas";
import Novedades from "@/components/cliente/novedades/Novedades";
import PromesasPage from "@/components/cliente/home/promesas/PromesasPage";

export const providerRoutes = (
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
    <Route path="internacionalizacion" element={<QuoteInternacionalizacion />} />
    <Route path="archivos" element={<ArchivosProveedor />} />
    <Route path="ayuda" element={<NecesitasAyuda />} />
    <Route path="consultar-tarifas" element={<ConsultaTarifas />} />
    <Route path="historico-precios" element={<PriceHistoryExplorer />} />
    <Route path="novedades" element={<Novedades />} />
    <Route path="promesas" element={<PromesasPage />} />
  </Route>
);
