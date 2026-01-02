// src/components/administrador/natalia/Chartexecutivo.tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface QuoteStats {
  totalQuotes: number;
  completedQuotes: number;
  pendingQuotes: number;
  airQuotes: number;
  seaQuotes: number;
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  profitMargin: number;
  averagePerQuote: number;
  completionRate: number;
  uniqueConsignees: number;
}

interface ExecutiveComparison {
  nombre: string;
  stats: QuoteStats;
}

interface ChartProps {
  data?: QuoteStats;
  comparativeData?: ExecutiveComparison[];
  doubleData?: ExecutiveComparison[];
  type: 'individual' | 'comparativa' | 'doble';
}

// Paleta de colores minimalista y profesional
const COLORS = {
  primary: '#1f2937',      // Gris oscuro profesional
  secondary: '#6b7280',    // Gris medio
  accent: '#3b82f6',       // Azul corporativo
  success: '#10b981',      // Verde sutil
  danger: '#ef4444',       // Rojo sutil
  neutral: '#9ca3af',      // Gris claro
  background: '#f9fafb'    // Fondo muy claro
};

function ChartExecutivo({ data, comparativeData, doubleData, type }: ChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(0)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px 16px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ 
            margin: 0, 
            fontWeight: '600', 
            color: COLORS.primary,
            fontSize: '13px',
            marginBottom: '4px'
          }}>
            {payload[0].payload.name || payload[0].payload.nombre}
          </p>
          {payload.map((entry: any, index: number) => {
            const isFinancial = entry.dataKey === 'Income' || 
                                entry.dataKey === 'Expense' || 
                                entry.dataKey === 'Profit' ||
                                entry.dataKey === 'value' ||
                                entry.name?.includes('Income') ||
                                entry.name?.includes('Expense') ||
                                entry.name?.includes('Profit');
            
            return (
              <p key={index} style={{ 
                margin: '2px 0 0 0', 
                color: COLORS.secondary, 
                fontWeight: '700',
                fontSize: '14px'
              }}>
                {entry.name && entry.name !== entry.payload.name ? `${entry.name}: ` : ''}
                {isFinancial ? formatCurrency(entry.value) : entry.value}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // ============================================================
  // GRÁFICOS PARA ANÁLISIS INDIVIDUAL
  // ============================================================
  if (type === 'individual' && data) {
    // Datos para Status
    const statusData = [
      { name: 'Completadas', value: data.completedQuotes },
      { name: 'Pendientes', value: data.pendingQuotes }
    ].filter(item => item.value > 0);

    // Datos para Tipo
    const typeData = [
      { name: 'Aéreas', value: data.airQuotes },
      { name: 'Marítimas', value: data.seaQuotes }
    ].filter(item => item.value > 0);

    // Datos financieros
    const financialData = [
      { name: 'Income', value: data.totalIncome },
      { name: 'Expense', value: data.totalExpense },
      { name: 'Profit', value: data.totalProfit }
    ];

    return (
      <div className="row g-4 mb-4">
        {/* Estado de Cotizaciones */}
        {statusData.length > 0 && (
          <div className="col-md-4">
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <h5 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: COLORS.primary,
                marginBottom: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Estado de Cotizaciones
              </h5>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: COLORS.secondary, fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: COLORS.secondary, fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 ? COLORS.primary : COLORS.neutral}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tipo de Transporte */}
        {typeData.length > 0 && (
          <div className="col-md-4">
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <h5 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: COLORS.primary,
                marginBottom: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Tipo de Transporte
              </h5>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: COLORS.secondary, fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: COLORS.secondary, fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="value" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Breakdown Financiero */}
        <div className="col-md-4">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.primary,
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Breakdown Financiero
            </h5>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  tickFormatter={formatCurrencyShort}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {financialData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? COLORS.success : index === 1 ? COLORS.danger : COLORS.primary}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // GRÁFICOS PARA ANÁLISIS COMPARATIVA
  // ============================================================
  if (type === 'comparativa' && comparativeData && comparativeData.length > 0) {
    // Top 5 por Profit
    const top5Profit = [...comparativeData]
      .sort((a, b) => b.stats.totalProfit - a.stats.totalProfit)
      .slice(0, 5)
      .map(exec => ({
        nombre: exec.nombre.length > 12 ? exec.nombre.substring(0, 12) + '...' : exec.nombre,
        nombreCompleto: exec.nombre,
        value: exec.stats.totalProfit
      }));

    // Top 5 por Cotizaciones
    const top5Quotes = [...comparativeData]
      .sort((a, b) => b.stats.totalQuotes - a.stats.totalQuotes)
      .slice(0, 5)
      .map(exec => ({
        nombre: exec.nombre.length > 12 ? exec.nombre.substring(0, 12) + '...' : exec.nombre,
        nombreCompleto: exec.nombre,
        value: exec.stats.totalQuotes
      }));

    // Top 5 por Margen
    const top5Margin = [...comparativeData]
      .sort((a, b) => b.stats.profitMargin - a.stats.profitMargin)
      .slice(0, 5)
      .map(exec => ({
        nombre: exec.nombre.length > 12 ? exec.nombre.substring(0, 12) + '...' : exec.nombre,
        nombreCompleto: exec.nombre,
        value: exec.stats.profitMargin
      }));

    // Income vs Expense (Top 6)
    const top6Financial = [...comparativeData]
      .sort((a, b) => b.stats.totalIncome - a.stats.totalIncome)
      .slice(0, 6)
      .map(exec => ({
        nombre: exec.nombre.length > 10 ? exec.nombre.substring(0, 10) + '...' : exec.nombre,
        nombreCompleto: exec.nombre,
        Income: exec.stats.totalIncome,
        Expense: exec.stats.totalExpense
      }));

    return (
      <div className="row g-4 mb-4">
        {/* Top 5 por Profit */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.primary,
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Top 5 Ejecutivos por Profit
            </h5>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top5Profit} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="nombre" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: COLORS.secondary, fontSize: 11 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  tickFormatter={formatCurrencyShort}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 por Cotizaciones */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.primary,
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Top 5 por Cantidad de Cotizaciones
            </h5>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top5Quotes} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="nombre" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: COLORS.secondary, fontSize: 11 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="value" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 por Margen */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.primary,
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Top 5 por Margen de Ganancia (%)
            </h5>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top5Margin} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="nombre" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: COLORS.secondary, fontSize: 11 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{
                          backgroundColor: 'white',
                          padding: '12px 16px',
                          borderRadius: '6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: '1px solid #e5e7eb'
                        }}>
                          <p style={{ margin: 0, fontWeight: '600', color: COLORS.primary, fontSize: '13px', marginBottom: '4px' }}>
                            {payload[0].payload.nombreCompleto}
                          </p>
                          <p style={{ margin: '2px 0 0 0', color: COLORS.secondary, fontWeight: '700', fontSize: '14px' }}>
                            {payload[0].value.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: '#f9fafb' }} 
                />
                <Bar dataKey="value" fill={COLORS.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income vs Expense */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.primary,
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Income vs Expense (Top 6)
            </h5>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top6Financial} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="nombre" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: COLORS.secondary, fontSize: 11 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  tickFormatter={formatCurrencyShort}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="Income" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // GRÁFICOS PARA ANÁLISIS DOBLE
  // ============================================================
  if (type === 'doble' && doubleData && doubleData.length === 2) {
    const [exec1, exec2] = doubleData;

    // Métricas principales
    const metricsData = [
      { 
        name: 'Total', 
        [exec1.nombre]: exec1.stats.totalQuotes,
        [exec2.nombre]: exec2.stats.totalQuotes
      },
      { 
        name: 'Completadas', 
        [exec1.nombre]: exec1.stats.completedQuotes,
        [exec2.nombre]: exec2.stats.completedQuotes
      },
      { 
        name: 'Aéreas', 
        [exec1.nombre]: exec1.stats.airQuotes,
        [exec2.nombre]: exec2.stats.airQuotes
      },
      { 
        name: 'Marítimas', 
        [exec1.nombre]: exec1.stats.seaQuotes,
        [exec2.nombre]: exec2.stats.seaQuotes
      },
      { 
        name: 'Clientes', 
        [exec1.nombre]: exec1.stats.uniqueConsignees,
        [exec2.nombre]: exec2.stats.uniqueConsignees
      }
    ];

    // Financiero
    const financialData = [
      { 
        name: 'Income', 
        [exec1.nombre]: exec1.stats.totalIncome,
        [exec2.nombre]: exec2.stats.totalIncome
      },
      { 
        name: 'Expense', 
        [exec1.nombre]: exec1.stats.totalExpense,
        [exec2.nombre]: exec2.stats.totalExpense
      },
      { 
        name: 'Profit', 
        [exec1.nombre]: exec1.stats.totalProfit,
        [exec2.nombre]: exec2.stats.totalProfit
      }
    ];

    // Eficiencia
    const efficiencyData = [
      { 
        name: 'Tasa Compl. %', 
        [exec1.nombre]: exec1.stats.completionRate,
        [exec2.nombre]: exec2.stats.completionRate
      },
      { 
        name: 'Margen %', 
        [exec1.nombre]: exec1.stats.profitMargin,
        [exec2.nombre]: exec2.stats.profitMargin
      }
    ];

    return (
      <div className="row g-4 mb-4">
        {/* Comparación de Métricas */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.primary,
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Comparación de Métricas
            </h5>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={metricsData} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey={exec1.nombre} fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey={exec2.nombre} fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparación Financiera */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.primary,
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Comparación Financiera
            </h5>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={financialData} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  tickFormatter={formatCurrencyShort}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey={exec1.nombre} fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey={exec2.nombre} fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparación de Eficiencia */}
        <div className="col-md-12">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.primary,
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Comparación de Eficiencia (%)
            </h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={efficiencyData} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: COLORS.secondary, fontSize: 12 }}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{
                          backgroundColor: 'white',
                          padding: '12px 16px',
                          borderRadius: '6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: '1px solid #e5e7eb'
                        }}>
                          <p style={{ margin: 0, fontWeight: '600', color: COLORS.primary, fontSize: '13px', marginBottom: '4px' }}>
                            {payload[0].payload.name}
                          </p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ margin: '2px 0 0 0', color: COLORS.secondary, fontWeight: '700', fontSize: '14px' }}>
                              {entry.name}: {entry.value.toFixed(1)}%
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: '#f9fafb' }} 
                />
                <Bar dataKey={exec1.nombre} fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey={exec2.nombre} fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay datos
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      padding: '60px 20px',
      textAlign: 'center'
    }}>
      <p style={{ fontSize: '14px', color: COLORS.secondary, margin: 0 }}>
        No hay datos disponibles para mostrar gráficos
      </p>
    </div>
  );
}

export default ChartExecutivo;