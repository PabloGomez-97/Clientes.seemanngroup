import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Select, { type StylesConfig } from "react-select";

// ============================================================================
// TIPOS
// ============================================================================

type TipoEnvio = "AEREO" | "FCL" | "LCL" | null;

interface SelectOption {
  value: string;
  label: string;
}

interface RutaBase {
  origin: string;
  originNormalized: string;
  destination: string;
  destinationNormalized: string;
}

// ============================================================================
// URLS DE GOOGLE SHEETS
// ============================================================================

const GOOGLE_SHEET_URLS = {
  AEREO:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWBXW_l3kB2V0A9D732Le0AjyGnXDjgV8nasTz1Z3gWUbCklXKICxTE4kEMjYMoaTG4v78XB2aVrHe/pub?output=csv",
  FCL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWzBbNU6lsWnVEhRgzTPNEjtq-eH59rGSQf3QS6UGiRHT98A-g3LumdtuFHKb5lcGmERT4nZjAbMhm/pub?output=csv",
  LCL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT5T29WmDAI_z4RxlPtY3GoB3pm7NyBBiWZGc06cYRR1hg5fdFx7VEr3-i2geKxgw/pub?output=csv",
};

// ============================================================================
// FUNCIONES HELPER
// ============================================================================

const normalize = (str: string | null): string => {
  if (!str) return "";
  return str.toString().toLowerCase().trim();
};

const capitalize = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/(\s|\(|\))/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
};

const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split("\n");
  const result: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row: string[] = [];
    let currentField = "";
    let insideQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          j++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        row.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }

    row.push(currentField.trim());
    result.push(row);
  }

  return result;
};

// ============================================================================
// PARSERS POR TIPO
// ============================================================================

const parseAEREO = (data: string[][]): RutaBase[] => {
  const rutas: RutaBase[] = [];
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const origin = row[1];
    const destination = row[2];
    if (origin && destination) {
      rutas.push({
        origin: origin.trim(),
        originNormalized: normalize(origin),
        destination: destination.trim(),
        destinationNormalized: normalize(destination),
      });
    }
  }
  return rutas;
};

const parseFCL = (data: string[][]): RutaBase[] => {
  const rutas: RutaBase[] = [];
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const pol = row[1]; // POL
    const pod = row[2]; // POD
    if (pol && pod) {
      rutas.push({
        origin: pol.trim(),
        originNormalized: normalize(pol),
        destination: pod.trim(),
        destinationNormalized: normalize(pod),
      });
    }
  }
  return rutas;
};

const parseLCL = (data: string[][]): RutaBase[] => {
  const rutas: RutaBase[] = [];
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const pol = row[1]; // POL
    const pod = row[3]; // POD (columna 3 para LCL)
    if (pol && pod) {
      rutas.push({
        origin: pol.trim(),
        originNormalized: normalize(pol),
        destination: pod.trim(),
        destinationNormalized: normalize(pod),
      });
    }
  }
  return rutas;
};

// ============================================================================
// ESTILOS PARA REACT-SELECT
// ============================================================================

const customSelectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "44px",
    borderRadius: "8px",
    borderColor: state.isFocused ? "#0d6efd" : "#dee2e6",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(13, 110, 253, 0.15)" : "none",
    "&:hover": {
      borderColor: "#0d6efd",
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: "#6c757d",
    fontSize: "14px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#0d6efd"
      : state.isFocused
        ? "#e7f1ff"
        : "white",
    color: state.isSelected ? "white" : "#212529",
    fontSize: "14px",
    padding: "10px 12px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 9999,
  }),
  singleValue: (base) => ({
    ...base,
    fontSize: "14px",
  }),
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ItineraryFinder: React.FC = () => {
  const navigate = useNavigate();

  // Estados
  const [tipoEnvio, setTipoEnvio] = useState<TipoEnvio>(null);
  const [loading, setLoading] = useState(false);
  const [rutas, setRutas] = useState<RutaBase[]>([]);
  const [originSeleccionado, setOriginSeleccionado] =
    useState<SelectOption | null>(null);
  const [destinationSeleccionado, setDestinationSeleccionado] =
    useState<SelectOption | null>(null);
  const [fecha, setFecha] = useState<string>("");

  // Opciones derivadas
  const opcionesOrigin = useMemo(() => {
    const originsUnicos = Array.from(new Set(rutas.map((r) => r.origin)))
      .sort()
      .map((origin) => ({
        value: normalize(origin),
        label: capitalize(origin),
      }));
    return originsUnicos;
  }, [rutas]);

  const opcionesDestination = useMemo(() => {
    if (!originSeleccionado) return [];

    const rutasFiltradas = rutas.filter(
      (r) => r.originNormalized === originSeleccionado.value,
    );

    const destinationsUnicos = Array.from(
      new Set(rutasFiltradas.map((r) => r.destination)),
    )
      .sort()
      .map((dest) => ({
        value: normalize(dest),
        label: capitalize(dest),
      }));

    return destinationsUnicos;
  }, [rutas, originSeleccionado]);

  // Cargar rutas cuando se selecciona un tipo
  useEffect(() => {
    if (!tipoEnvio) {
      setRutas([]);
      return;
    }

    const cargarRutas = async () => {
      setLoading(true);
      setOriginSeleccionado(null);
      setDestinationSeleccionado(null);

      try {
        const response = await fetch(GOOGLE_SHEET_URLS[tipoEnvio]);
        if (!response.ok) throw new Error("Error al cargar rutas");

        const csvText = await response.text();
        const data = parseCSV(csvText);

        let rutasParsed: RutaBase[] = [];
        switch (tipoEnvio) {
          case "AEREO":
            rutasParsed = parseAEREO(data);
            break;
          case "FCL":
            rutasParsed = parseFCL(data);
            break;
          case "LCL":
            rutasParsed = parseLCL(data);
            break;
        }

        setRutas(rutasParsed);
      } catch (err) {
        console.error("Error cargando rutas:", err);
        setRutas([]);
      } finally {
        setLoading(false);
      }
    };

    cargarRutas();
  }, [tipoEnvio]);

  // Reset destino cuando cambia origen
  useEffect(() => {
    setDestinationSeleccionado(null);
  }, [originSeleccionado]);

  // Manejar búsqueda
  const handleBuscar = () => {
    if (!tipoEnvio || !originSeleccionado || !destinationSeleccionado) return;

    // Navegar al cotizador con los datos pre-seleccionados
    navigate("/newquotes", {
      state: {
        tipoEnvio,
        origin: originSeleccionado,
        destination: destinationSeleccionado,
        fecha,
      },
    });
  };

  // Resetear selección de tipo
  const handleResetTipo = () => {
    setTipoEnvio(null);
    setOriginSeleccionado(null);
    setDestinationSeleccionado(null);
    setRutas([]);
  };

  // Verificar si se puede buscar
  const canSearch =
    tipoEnvio && originSeleccionado && destinationSeleccionado && !loading;

  // ============================================================================
  // RENDER - SELECCIÓN DE TIPO
  // ============================================================================

  if (!tipoEnvio) {
    return (
      <div className="hal-schedule-body">
        <div style={{ marginBottom: "16px" }}>
          <label
            className="hal-input-label"
            style={{ marginBottom: "12px", display: "block" }}
          >
            Selecciona el tipo de envío
          </label>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* Botón Aéreo */}
            <button
              type="button"
              onClick={() => setTipoEnvio("AEREO")}
              style={{
                flex: "1",
                minWidth: "90px",
                padding: "12px 16px",
                border: "2px solid #3b82f6",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                color: "#1e40af",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(59, 130, 246, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              Aéreo
            </button>

            {/* Botón FCL */}
            <button
              type="button"
              onClick={() => setTipoEnvio("FCL")}
              style={{
                flex: "1",
                minWidth: "90px",
                padding: "12px 16px",
                border: "2px solid #10b981",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                color: "#047857",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(16, 185, 129, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z" />
              </svg>
              FCL
            </button>

            {/* Botón LCL */}
            <button
              type="button"
              onClick={() => setTipoEnvio("LCL")}
              style={{
                flex: "1",
                minWidth: "90px",
                padding: "12px 16px",
                border: "2px solid #f59e0b",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                color: "#b45309",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(245, 158, 11, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
              LCL
            </button>
          </div>
        </div>

        {/* Campos deshabilitados cuando no hay tipo seleccionado */}
        <div className="hal-input-wrapper" style={{ opacity: 0.5 }}>
          <label className="hal-input-label">De</label>
          <input
            type="text"
            className="hal-input"
            placeholder="Primero selecciona el tipo de envío"
            disabled
          />
        </div>
        <div className="hal-input-wrapper" style={{ opacity: 0.5 }}>
          <label className="hal-input-label">Para</label>
          <input
            type="text"
            className="hal-input"
            placeholder="Primero selecciona el tipo de envío"
            disabled
          />
        </div>
        <div className="hal-input-wrapper" style={{ opacity: 0.5 }}>
          <label className="hal-input-label">Fecha</label>
          <input type="date" className="hal-input" disabled />
        </div>
        <div className="hal-button-wrapper">
          <button className="hal-button hal-button--primary" disabled>
            Buscar
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - FORMULARIO CON TIPO SELECCIONADO
  // ============================================================================

  const tipoLabels = {
    AEREO: { label: "Aéreo", color: "#3b82f6", bg: "#eff6ff" },
    FCL: { label: "FCL", color: "#10b981", bg: "#ecfdf5" },
    LCL: { label: "LCL", color: "#f59e0b", bg: "#fffbeb" },
  };

  const tipoInfo = tipoLabels[tipoEnvio];

  return (
    <div className="hal-schedule-body">
      {/* Badge del tipo seleccionado con botón de cambiar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          padding: "10px 14px",
          backgroundColor: tipoInfo.bg,
          borderRadius: "10px",
          border: `2px solid ${tipoInfo.color}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontWeight: "600",
              color: tipoInfo.color,
              fontSize: "14px",
            }}
          >
            Tipo: {tipoInfo.label}
          </span>
          {loading && (
            <span
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Cargando rutas...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleResetTipo}
          style={{
            padding: "4px 10px",
            fontSize: "12px",
            color: "#6b7280",
            background: "white",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
          }}
        >
          Cambiar
        </button>
      </div>

      {/* Campo Origen */}
      <div className="hal-input-wrapper">
        <label className="hal-input-label">
          {tipoEnvio === "AEREO" ? "Origen" : "POL (Puerto de Origen)"}
        </label>
        <Select
          value={originSeleccionado}
          onChange={(option) => setOriginSeleccionado(option)}
          options={opcionesOrigin}
          placeholder={
            loading
              ? "Cargando..."
              : tipoEnvio === "AEREO"
                ? "Selecciona origen"
                : "Selecciona POL"
          }
          isDisabled={loading}
          isClearable
          isSearchable
          styles={customSelectStyles}
          noOptionsMessage={() => "No hay opciones disponibles"}
        />
      </div>

      {/* Campo Destino */}
      <div className="hal-input-wrapper">
        <label className="hal-input-label">
          {tipoEnvio === "AEREO" ? "Destino" : "POD (Puerto de Destino)"}
        </label>
        <Select
          value={destinationSeleccionado}
          onChange={(option) => setDestinationSeleccionado(option)}
          options={opcionesDestination}
          placeholder={
            !originSeleccionado
              ? "Primero selecciona origen"
              : loading
                ? "Cargando..."
                : tipoEnvio === "AEREO"
                  ? "Selecciona destino"
                  : "Selecciona POD"
          }
          isDisabled={loading || !originSeleccionado}
          isClearable
          isSearchable
          styles={customSelectStyles}
          noOptionsMessage={() =>
            originSeleccionado
              ? "No hay rutas para este origen"
              : "Selecciona un origen primero"
          }
        />
      </div>

      {/* Campo Fecha */}
      <div className="hal-input-wrapper">
        <label className="hal-input-label">Fecha (opcional)</label>
        <input
          type="date"
          className="hal-input"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
      </div>

      {/* Botón Buscar */}
      <div className="hal-button-wrapper">
        <button
          className="hal-button hal-button--primary"
          onClick={handleBuscar}
          disabled={!canSearch}
          style={{
            opacity: canSearch ? 1 : 0.6,
            cursor: canSearch ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Cargando..." : "Buscar"}
        </button>
      </div>
    </div>
  );
};

export default ItineraryFinder;
