import type { NavigateFunction } from "react-router-dom";
import { adminPaths } from "@/config/adminPaths";
import {
  IconCalculator,
  IconPlus,
  IconTracking,
  IconUsers,
} from "../ejecutivo/HomeEjecutivoIcons";

function IconFile({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

type OperacionesQuickActionsProps = {
  navigate: NavigateFunction;
  onNewTracking: () => void;
};

export function OperacionesQuickActions({
  navigate,
  onNewTracking,
}: OperacionesQuickActionsProps) {
  return (
    <div className="ops-command-bar__actions">
      <button
        type="button"
        className="ops-quick-action ops-quick-action--primary"
        onClick={onNewTracking}
      >
        <IconPlus size={15} />
        Nuevo seguimiento
      </button>
      <div className="ops-command-bar__links">
        <button
          type="button"
          className="ops-quick-action ops-quick-action--secondary"
          onClick={() => navigate(adminPaths.operacionesTracking)}
        >
          <IconTracking size={15} />
          Rastreo
        </button>
        <button
          type="button"
          className="ops-quick-action ops-quick-action--secondary"
          onClick={() => navigate(adminPaths.operacionesReporteria)}
        >
          <IconUsers size={15} />
          Clientes
        </button>
        <button
          type="button"
          className="ops-quick-action ops-quick-action--secondary"
          onClick={() => navigate(adminPaths.operacionesDocumentacion)}
        >
          <IconFile size={15} />
          Documentación
        </button>
        <button
          type="button"
          className="ops-quick-action ops-quick-action--secondary"
          onClick={() => navigate(adminPaths.cotizador)}
        >
          <IconCalculator size={15} />
          Cotizador
        </button>
      </div>
    </div>
  );
}
