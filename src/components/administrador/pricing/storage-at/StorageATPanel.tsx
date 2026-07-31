import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  STORAGE_AT_IVA,
  STORAGE_AT_POLL_MS,
  STORAGE_AT_SHEET_HTML_URL,
  calculateStorageAt,
  fetchStorageAtSheet,
  formatClp,
  formatUsd,
  verifyStorageAtRates,
  type StorageAtSheetData,
} from "./storageAtSheet";
import "./StorageATPanel.css";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function StorageATPanel() {
  const [data, setData] = useState<StorageAtSheetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kgInput, setKgInput] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const kgTouchedRef = useRef(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const sheet = await fetchStorageAtSheet();
      setData(sheet);
      setError(null);
      setKgInput((prev) => {
        if (kgTouchedRef.current && prev.trim() !== "") return prev;
        return String(sheet.kgSheet || 500);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al sincronizar el sheet");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), STORAGE_AT_POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const kg = useMemo(() => {
    const n = Number(String(kgInput).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [kgInput]);

  const calculation = useMemo(
    () => (data ? calculateStorageAt(data, kg) : null),
    [data, kg],
  );

  const verifications = useMemo(
    () => (data ? verifyStorageAtRates(data) : []),
    [data],
  );

  const allRatesOk = verifications.length > 0 && verifications.every((v) => v.ok);

  return (
    <div className="sat-page">
      <header className="sat-page__header">
        <div>
          <h1 className="sat-page__title">Storage / AT</h1>
          <p className="sat-page__subtitle">
            Costos TEISA (Carga Seca) sincronizados desde el sheet. El cobro es{" "}
            <strong>MAX(cálculo USD, mínimo USD)</strong> con IVA {STORAGE_AT_IVA}.
          </p>
        </div>
        <div className="sat-page__actions">
          <a
            className="sat-btn sat-btn--ghost"
            href={STORAGE_AT_SHEET_HTML_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir sheet
          </a>
          <button
            type="button"
            className="sat-btn sat-btn--primary"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? "Sincronizando…" : "Sincronizar ahora"}
          </button>
        </div>
      </header>

      {loading && !data && (
        <div className="sat-banner sat-banner--info">Cargando sheet Storage / AT…</div>
      )}
      {error && (
        <div className="sat-banner sat-banner--danger">
          {error}
          <button type="button" className="sat-link-btn" onClick={() => void load(true)}>
            Reintentar
          </button>
        </div>
      )}

      {data && (
        <>
          <section className="sat-meta">
            <div className="sat-meta__item">
              <span className="sat-meta__label">Fuente</span>
              <span className="sat-meta__value">{data.title || "Sheet TEISA"}</span>
            </div>
            <div className="sat-meta__item">
              <span className="sat-meta__label">Última sync</span>
              <span className="sat-meta__value">{formatTime(data.fetchedAt)}</span>
            </div>
            <div className="sat-meta__item">
              <span className="sat-meta__label">Kg en sheet (G3)</span>
              <span className="sat-meta__value">{data.kgSheet}</span>
            </div>
            <div className="sat-meta__item">
              <span className="sat-meta__label">Tipo cambio</span>
              <span className="sat-meta__value">
                {data.usdRate.toLocaleString("es-CL", { maximumFractionDigits: 2 })} CLP/USD
              </span>
            </div>
            <div className="sat-meta__item">
              <span className="sat-meta__label">A9–A12</span>
              <span
                className={`sat-meta__value ${allRatesOk ? "sat-ok" : "sat-warn"}`}
              >
                {allRatesOk ? "Valores alineados" : "Hay desfases"}
              </span>
            </div>
          </section>

          <section className="sat-grid">
            <div className="sat-card">
              <div className="sat-card__head">
                <h2 className="sat-card__title">Vista del sheet</h2>
                <p className="sat-card__sub">
                  Misma estructura que el Google Sheet. Se actualiza sola cada{" "}
                  {STORAGE_AT_POLL_MS / 1000}s.
                </p>
              </div>

              <div className="sat-table-wrap">
                <table className="sat-table">
                  <thead>
                    <tr>
                      <th colSpan={3} className="sat-table__title-cell">
                        {data.title}
                      </th>
                      <th colSpan={2} className="sat-table__hint">
                        DEBES INGRESAR LOS KG ACA
                      </th>
                    </tr>
                    <tr>
                      <th />
                      <th>CONCEPTOS</th>
                      <th>MIN</th>
                      <th>KILOS</th>
                      <th>{data.kgSheet}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.concepts.map((c) => (
                      <tr key={c.key}>
                        <td />
                        <td>{c.label}</td>
                        <td>{c.conceptMinRaw || "—"}</td>
                        <td colSpan={2} />
                      </tr>
                    ))}
                    <tr className="sat-table__spacer">
                      <td colSpan={5} />
                    </tr>
                    <tr className="sat-table__section">
                      <th>VALOR</th>
                      <th>CÁLCULO</th>
                      <th>MIN</th>
                      <th colSpan={2} />
                    </tr>
                    {data.lines.map((line, i) => (
                      <tr key={line.key}>
                        <td>
                          <span className="sat-cell-ref">A{9 + i}</span>{" "}
                          {line.valor % 1 !== 0
                            ? `$${line.valor.toFixed(2)}`
                            : formatClp(line.valor)}
                        </td>
                        <td>{formatClp(line.calculoSheet)}</td>
                        <td>{formatClp(line.minClp)}</td>
                        <td colSpan={2} />
                      </tr>
                    ))}
                    <tr className="sat-table__total">
                      <td>TOTAL (CLP)</td>
                      <td>{formatClp(data.totalClpCalculo)}</td>
                      <td>{formatClp(data.totalClpMin)}</td>
                      <td colSpan={2}>IVA INCLUIDO</td>
                    </tr>
                    <tr className="sat-table__total sat-table__total--usd">
                      <td>TOTAL (USD)</td>
                      <td>
                        <span className="sat-cell-ref">B14</span>{" "}
                        {formatUsd(data.totalUsdCalculo)}
                      </td>
                      <td>
                        <span className="sat-cell-ref">C14</span>{" "}
                        {formatUsd(data.totalUsdMin)}
                      </td>
                      <td colSpan={2}>IVA INCLUIDO</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {data.notice && (
                <p className="sat-notice">{data.notice}</p>
              )}

              {(data.extras.length > 0 || data.contacts.length > 0) && (
                <div className="sat-extras">
                  {data.extras.map((e) => (
                    <div key={e.label} className="sat-extras__row">
                      <span>{e.label}</span>
                      <strong>{e.value}</strong>
                      <span>{e.note}</span>
                    </div>
                  ))}
                  {data.contacts.map((c) => (
                    <div key={c.name} className="sat-extras__row">
                      <span>{c.name}</span>
                      <strong>{c.phone}</strong>
                      <span>{c.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sat-side">
              <div className="sat-card">
                <div className="sat-card__head">
                  <h2 className="sat-card__title">Verificador de kg</h2>
                  <p className="sat-card__sub">
                    Ingresa kg (como G3) y replica B14 / C14 con los valores vivos A9–A12.
                  </p>
                </div>

                <label className="sat-kg">
                  <span>Kilogramos</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={kgInput}
                    onChange={(e) => {
                      kgTouchedRef.current = true;
                      setKgInput(e.target.value);
                    }}
                    placeholder="Ej: 500"
                  />
                </label>

                {calculation && (
                  <>
                    <div className="sat-table-wrap">
                      <table className="sat-table sat-table--compact">
                        <thead>
                          <tr>
                            <th>Concepto</th>
                            <th>Valor</th>
                            <th>Cálculo</th>
                            <th>Mín.</th>
                            <th>Aplicado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculation.lines.map((line) => (
                            <tr key={line.key}>
                              <td className="sat-truncate" title={line.label}>
                                {line.label.split(":")[0]}
                              </td>
                              <td>
                                {line.valor % 1 !== 0
                                  ? `$${line.valor.toFixed(2)}`
                                  : formatClp(line.valor)}
                              </td>
                              <td>{formatClp(line.calculo)}</td>
                              <td>{formatClp(line.minClp)}</td>
                              <td>{formatClp(line.aplicado)}</td>
                            </tr>
                          ))}
                          <tr className="sat-table__total">
                            <td>TOTAL CLP</td>
                            <td />
                            <td>{formatClp(calculation.totalClpCalculo)}</td>
                            <td />
                            <td>{formatClp(calculation.totalClpMin)}</td>
                          </tr>
                          <tr className="sat-table__total sat-table__total--usd">
                            <td>TOTAL USD</td>
                            <td />
                            <td>{formatUsd(calculation.totalUsdCalculo)}</td>
                            <td />
                            <td>{formatUsd(calculation.totalUsdMin)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div
                      className={`sat-result ${
                        calculation.appliesMinimum
                          ? "sat-result--min"
                          : "sat-result--calc"
                      }`}
                    >
                      <div className="sat-result__label">
                        Storage / AT a cobrar
                      </div>
                      <div className="sat-result__value">
                        {formatUsd(calculation.chargeUsd)} USD
                      </div>
                      <div className="sat-result__detail">
                        {calculation.appliesMinimum ? (
                          <>
                            Cálculo ({formatUsd(calculation.totalUsdCalculo)}) &lt;
                            mínimo ({formatUsd(calculation.totalUsdMin)}) → se
                            cobra el mínimo C14
                          </>
                        ) : (
                          <>
                            Cálculo ({formatUsd(calculation.totalUsdCalculo)}) ≥
                            mínimo ({formatUsd(calculation.totalUsdMin)}) → se
                            cobra B14
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="sat-card">
                <div className="sat-card__head">
                  <h2 className="sat-card__title">Control A9–A12</h2>
                  <p className="sat-card__sub">
                    Contrasta los valores del bloque de cálculo con las tarifas
                    declaradas en CONCEPTOS (cambian seguido).
                  </p>
                </div>
                <ul className="sat-checks">
                  {verifications.map((v, i) => (
                    <li
                      key={v.key}
                      className={v.ok ? "sat-checks__ok" : "sat-checks__bad"}
                    >
                      <span className="sat-checks__ref">A{9 + i}</span>
                      <span className="sat-checks__msg">{v.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
