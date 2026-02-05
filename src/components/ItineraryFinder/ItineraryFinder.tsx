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
    border: "none",
    borderBottom: `1px solid ${state.isFocused ? "#0d6efd" : "#ddd"}`,
    borderRadius: 0,
    background: "transparent",
    boxShadow: "none",
    "&:hover": {
      borderBottomColor: "#0d6efd",
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
      <div
        className="hal-schedule-body"
        style={{ display: "flex", gap: "20px" }}
      >
        {/* Izquierda: Selección de tipo */}
        <div style={{ flex: 1 }}>
          <label
            className="hal-input-label"
            style={{ marginBottom: "12px", display: "block" }}
          >
            Selecciona el tipo de envío
          </label>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Radio Aéreo */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              <input
                type="radio"
                name="tipoEnvio"
                value="AEREO"
                onChange={() => setTipoEnvio("AEREO")}
                style={{
                  margin: 0,
                  width: "16px",
                  height: "16px",
                }}
              />
              Aéreo
            </label>

            {/* Radio FCL */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              <input
                type="radio"
                name="tipoEnvio"
                value="FCL"
                onChange={() => setTipoEnvio("FCL")}
                style={{
                  margin: 0,
                  width: "16px",
                  height: "16px",
                }}
              />
              FCL
            </label>

            {/* Radio LCL */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              <input
                type="radio"
                name="tipoEnvio"
                value="LCL"
                onChange={() => setTipoEnvio("LCL")}
                style={{
                  margin: 0,
                  width: "16px",
                  height: "16px",
                }}
              />
              LCL
            </label>
          </div>
        </div>

        {/* Derecha: Campos */}
        <div
          style={{
            flex: 2,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Arriba: De */}
          <div className="hal-input-wrapper">
            <label className="hal-input-label">De</label>
            <input
              type="text"
              className="hal-input"
              placeholder="Primero selecciona el tipo de envío"
              disabled
            />
          </div>

          {/* Abajo: Para y Fecha */}
          <div style={{ display: "flex", gap: "16px" }}>
            <div className="hal-input-wrapper" style={{ flex: 1 }}>
              <label className="hal-input-label">Para</label>
              <input
                type="text"
                className="hal-input"
                placeholder="Primero selecciona el tipo de envío"
                disabled
              />
            </div>
            <div className="hal-input-wrapper" style={{ flex: 1 }}>
              <label className="hal-input-label">Fecha</label>
              <input type="date" className="hal-input" disabled />
            </div>
          </div>

          <div className="hal-button-wrapper" style={{ textAlign: "right" }}>
            <button className="hal-button hal-button--primary" disabled>
              Buscar
            </button>
          </div>
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
    <div className="hal-schedule-body" style={{ display: "flex", gap: "20px" }}>
      {/* Izquierda: Selección de tipo */}
      <div style={{ flex: 1 }}>
        <label
          className="hal-input-label"
          style={{ marginBottom: "12px", display: "block" }}
        >
          Selecciona el tipo de envío
        </label>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Radio Aéreo */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            <input
              type="radio"
              name="tipoEnvio"
              value="AEREO"
              checked={tipoEnvio === "AEREO"}
              onChange={() => setTipoEnvio("AEREO")}
              style={{
                margin: 0,
                width: "16px",
                height: "16px",
              }}
            />
            Aéreo
          </label>

          {/* Radio FCL */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            <input
              type="radio"
              name="tipoEnvio"
              value="FCL"
              checked={tipoEnvio === "FCL"}
              onChange={() => setTipoEnvio("FCL")}
              style={{
                margin: 0,
                width: "16px",
                height: "16px",
              }}
            />
            FCL
          </label>

          {/* Radio LCL */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            <input
              type="radio"
              name="tipoEnvio"
              value="LCL"
              checked={tipoEnvio === "LCL"}
              onChange={() => setTipoEnvio("LCL")}
              style={{
                margin: 0,
                width: "16px",
                height: "16px",
              }}
            />
            LCL
          </label>
        </div>
      </div>

      {/* Derecha: Campos */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Arriba: Origen */}
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

        {/* Abajo: Destino y Fecha */}
        <div style={{ display: "flex", gap: "16px" }}>
          <div className="hal-input-wrapper" style={{ flex: 1 }}>
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
          <div className="hal-input-wrapper" style={{ flex: 1 }}>
            <label className="hal-input-label">Fecha (opcional)</label>
            <input
              type="date"
              className="hal-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
        </div>

        {/* Botón Buscar */}
        <div className="hal-button-wrapper" style={{ textAlign: "right" }}>
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
    </div>
  );
};

export default ItineraryFinder;
