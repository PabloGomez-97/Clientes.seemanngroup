import { Route } from "react-router-dom";
import ProtectedRoute from "@/auth/ProtectedRoute";
import UserLayout from "@/layouts/UserLayout";
import Home from "@/components/cliente/home/Home";
import Cotizador from "@/components/cliente/cotizaciones/Newquotes";
import QuotesView from "@/components/cliente/cotizaciones/QuotesView";
import QuoteLCL from "@/components/quotes/QuoteLCL";
import QuoteFCL from "@/components/quotes/QuoteFCL";
import QuoteAIR from "@/components/quotes/QuoteAIR";
import AirShipmentsView from "@/components/cliente/embarques/AirShipmentsView";
import OceanShipmentsView from "@/components/cliente/embarques/OceanShipmentsView";
import GroundShipmentsView from "@/components/cliente/embarques/GroundShipmentsView";
import Financiera from "@/components/cliente/reporteria/ReporteriaFinanciera";
import Settings from "@/components/cliente/configuracion/Settings";
import ReporteriaOperacional from "@/components/cliente/reporteria/ReporteriaOperacional";
import PriceHistoryExplorer from "@/components/cliente/tarifas/priceHistory/PriceHistoryExplorer";
import ConsultaTarifas from "@/components/cliente/tarifas/rateConsult/ConsultaTarifas";
import ShipsGoTracking from "@/components/cliente/tracking/Shipsgotracking";
import CreateShipmentForm from "@/components/cliente/tracking/New-tracking";
import CreateOceanShipmentForm from "@/components/cliente/tracking/New-ocean-tracking";
import Novedades from "@/components/cliente/novedades/Novedades";
import PromesasPage from "@/components/cliente/home/promesas/PromesasPage";
import Contenedores from "@/components/footer/info/Contenedores";
import Contactenos from "@/components/footer/info/Contactenos";
import ReportarError from "@/components/footer/info/ReportarError";
import ItinerarioPage from "@/components/footer/info/ItinerarioPage";
import ShippingOrderView from "@/components/cliente/tracking/ShippingOrder";
import CotizacionEspecial from "@/components/cliente/cotizaciones/Cotizacion-especial";
import MisDocumentosCliente from "@/components/cliente/documentos/MisDocumentosCliente";

export const clientRoutes = (
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
    <Route
      path="trackings-aereo"
      element={<ShipsGoTracking initialTab="air" />}
    />
    <Route
      path="trackings-aereo/:trackingIdentifier"
      element={<ShipsGoTracking initialTab="air" />}
    />
    <Route
      path="trackings-maritimo"
      element={<ShipsGoTracking initialTab="ocean" />}
    />
    <Route
      path="trackings-maritimo/:trackingIdentifier"
      element={<ShipsGoTracking initialTab="ocean" />}
    />
    <Route path="ocean-shipments" element={<OceanShipmentsView />} />
    <Route path="ground-shipments" element={<GroundShipmentsView />} />
    <Route path="shipping-orders" element={<ShippingOrderView />} />
    <Route path="cotizacion-especial" element={<CotizacionEspecial />} />
    <Route path="financiera" element={<Financiera />} />
    <Route path="settings" element={<Settings />} />
    <Route path="operacional" element={<ReporteriaOperacional />} />
    <Route path="historico-precios" element={<PriceHistoryExplorer />} />
    <Route path="consultar-tarifas" element={<ConsultaTarifas />} />
    <Route path="new-tracking" element={<CreateShipmentForm />} />
    <Route path="new-ocean-tracking" element={<CreateOceanShipmentForm />} />
    <Route path="novedades" element={<Novedades />} />
    <Route path="promesas" element={<PromesasPage />} />
    <Route path="contenedores" element={<Contenedores />} />
    <Route path="contactenos" element={<Contactenos />} />
    <Route path="reportar-error" element={<ReportarError />} />
    <Route path="itinerario" element={<ItinerarioPage />} />
    <Route path="mis-documentos" element={<MisDocumentosCliente />} />
  </Route>
);
