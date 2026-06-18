import { Navigate, Route, useParams } from "react-router-dom";

/** Preserves optional :clientUsername when redirecting legacy admin URLs. */
export function LegacyClientRedirect({ base }: { base: string }) {
  const { clientUsername } = useParams();
  const to = clientUsername ? `${base}/${clientUsername}` : base;
  return <Navigate to={to} replace />;
}

export const legacyAdminRedirects = (
  <>
    <Route path="cotizador-administrador" element={<Navigate to="/admin/cotizador" replace />} />
    <Route path="tusclientes" element={<Navigate to="/admin/clientes" replace />} />
    <Route
      path="reporteriaclientes/:clientUsername?"
      element={<LegacyClientRedirect base="/admin/clientes/reporteria" />}
    />
    <Route
      path="op-reporteriaclientes/:clientUsername?"
      element={<LegacyClientRedirect base="/admin/operaciones/clientes/reporteria" />}
    />
    <Route
      path="documentacion/:clientUsername?"
      element={<LegacyClientRedirect base="/admin/clientes/documentacion" />}
    />
    <Route
      path="op-documentacion/:clientUsername?"
      element={<LegacyClientRedirect base="/admin/operaciones/clientes/documentacion" />}
    />
    <Route
      path="trackeos/:clientUsername?"
      element={<LegacyClientRedirect base="/admin/clientes/tracking" />}
    />
    <Route
      path="op-trackeos/:clientUsername?"
      element={<LegacyClientRedirect base="/admin/operaciones/tracking" />}
    />
    <Route
      path="comportamiento-clientes/:clientUsername?"
      element={<LegacyClientRedirect base="/admin/clientes/comportamiento" />}
    />
    <Route
      path="op-comportamiento-clientes/:clientUsername?"
      element={<LegacyClientRedirect base="/admin/operaciones/clientes/comportamiento" />}
    />
    <Route
      path="reportexecutive"
      element={<Navigate to="/admin/reporteria/financiera/ejecutivo" replace />}
    />
    <Route
      path="reportoperational"
      element={<Navigate to="/admin/reporteria/financiera/operacional" replace />}
    />
    <Route path="alertas-pricing" element={<Navigate to="/admin/pricing/alertas" replace />} />
  </>
);
