// src/components/administrador/natalia/ChartAirShipments.tsx
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ShipmentData {
  number: string;
  customer?: string;
  salesRep: string;
  shipper: string;
  consignee: string;
  modeOfTransportation: string;
  status: string;
  date: string;
  origin: string;
  destination: string;
  totalIncome: number;
  totalExpense: number;
  profit: number;
}

interface AirShipmentStats {
  totalShipments: number;
  completedShipments: number;
  pendingShipments: number;
  airShipments: number;
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  profitMargin: number;
  averagePerShipment: number;
  completionRate: number;
  uniqueConsignees: number;
}

interface ExecutiveComparison {
  nombre: string;
  stats: AirShipmentStats;
}

interface ChartAirShipmentsProps {
  type: 'individual' | 'comparativa' | 'doble';
  shipments?: ShipmentData[];
  comparativeData?: ExecutiveComparison[];
  doubleData?: ExecutiveComparison[];
}

function ChartAirShipments({ type, shipments, comparativeData, doubleData }: ChartAirShipmentsProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Función para agrupar shipments por mes
  const groupByMonth = (shipmentsArray: ShipmentData[]) => {
    const monthMap: { [key: string]: ShipmentData[] } = {};
    
    shipmentsArray.forEach(shipment => {
      if (!shipment.date) return;
      
      // Fecha formato DD/MM/YYYY
      const parts = shipment.date.split('/');
      if (parts.length !== 3) return;
      
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!monthMap[key]) {
        monthMap[key] = [];
      }
      monthMap[key].push(shipment);
    });

    return monthMap;
  };

  // Renderizado para análisis individual
  if (type === 'individual' && shipments) {
    const monthlyData = groupByMonth(shipments);
    const sortedMonths = Object.keys(monthlyData).sort();

    const monthLabels = sortedMonths.map(key => {
      const [year, month] = key.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    });

    const monthlyIncome = sortedMonths.map(key => {
      return monthlyData[key].reduce((sum, s) => sum + (s.totalIncome || 0), 0);
    });

    const monthlyExpense = sortedMonths.map(key => {
      return monthlyData[key].reduce((sum, s) => sum + (s.totalExpense || 0), 0);
    });

    const monthlyProfit = sortedMonths.map(key => {
      return monthlyData[key].reduce((sum, s) => sum + (s.profit || 0), 0);
    });

    const monthlyShipments = sortedMonths.map(key => monthlyData[key].length);

    // Calcular estadísticas
    const totalShipments = shipments.length;
    const completedShipments = shipments.filter(s => s.status === 'PreLoaded').length;
    const pendingShipments = totalShipments - completedShipments;

    return (
      <div className="row g-4 mb-4">
        {/* Gráfico de Income/Expense/Profit por mes */}
        <div className="col-md-8">
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
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              💰 Evolución Financiera Mensual
            </h5>
            <Bar
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: 'Income',
                    data: monthlyIncome,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 2
                  },
                  {
                    label: 'Expense',
                    data: monthlyExpense,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 2
                  },
                  {
                    label: 'Profit',
                    data: monthlyProfit,
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgb(139, 92, 246)',
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      font: { size: 12, weight: '600' },
                      padding: 15,
                      usePointStyle: true
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatCurrency(value as number)
                    }
                  }
                }
              }}
              height={300}
            />
          </div>
        </div>

        {/* Gráfico de Status (Completadas vs Pendientes) */}
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
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📊 Estado de Operaciones
            </h5>
            <Doughnut
              data={{
                labels: ['Completadas', 'Pendientes'],
                datasets: [
                  {
                    data: [completedShipments, pendingShipments],
                    backgroundColor: [
                      'rgba(16, 185, 129, 0.8)',
                      'rgba(251, 191, 36, 0.8)'
                    ],
                    borderColor: [
                      'rgb(16, 185, 129)',
                      'rgb(251, 191, 36)'
                    ],
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    labels: {
                      font: { size: 12, weight: '600' },
                      padding: 15,
                      usePointStyle: true
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const total = completedShipments + pendingShipments;
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        return `${context.label}: ${context.parsed} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
              height={300}
            />
          </div>
        </div>

        {/* Gráfico de Operaciones por mes */}
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
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ✈️ Volumen de Operaciones Mensuales
            </h5>
            <Line
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: 'Operaciones',
                    data: monthlyShipments,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      font: { size: 12, weight: '600' },
                      padding: 15,
                      usePointStyle: true
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
              height={250}
            />
          </div>
        </div>
      </div>
    );
  }

  // Renderizado para análisis comparativa
  if (type === 'comparativa' && comparativeData) {
    const sortedData = [...comparativeData].sort((a, b) => b.stats.totalProfit - a.stats.totalProfit);
    const top10 = sortedData.slice(0, 10);

    return (
      <div className="row g-4 mb-4">
        {/* Gráfico comparativo de Profit */}
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
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              💎 Top 10 Ejecutivos por Profit
            </h5>
            <Bar
              data={{
                labels: top10.map(e => e.nombre),
                datasets: [
                  {
                    label: 'Profit Total',
                    data: top10.map(e => e.stats.totalProfit),
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgb(139, 92, 246)',
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                indexAxis: 'y' as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => formatCurrency(context.parsed.x)
                    }
                  }
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatCurrency(value as number)
                    }
                  }
                }
              }}
              height={400}
            />
          </div>
        </div>

        {/* Gráfico comparativo de Operaciones */}
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
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ✈️ Top 10 Ejecutivos por Volumen
            </h5>
            <Bar
              data={{
                labels: top10.map(e => e.nombre),
                datasets: [
                  {
                    label: 'Total Operaciones',
                    data: top10.map(e => e.stats.totalShipments),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                indexAxis: 'y' as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
              height={400}
            />
          </div>
        </div>

        {/* Gráfico de Income vs Expense */}
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
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              💰 Income vs Expense por Ejecutivo (Top 10)
            </h5>
            <Bar
              data={{
                labels: top10.map(e => e.nombre),
                datasets: [
                  {
                    label: 'Income',
                    data: top10.map(e => e.stats.totalIncome),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 2
                  },
                  {
                    label: 'Expense',
                    data: top10.map(e => e.stats.totalExpense),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      font: { size: 12, weight: '600' },
                      padding: 15,
                      usePointStyle: true
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatCurrency(value as number)
                    }
                  }
                }
              }}
              height={350}
            />
          </div>
        </div>
      </div>
    );
  }

  // Renderizado para análisis doble
  if (type === 'doble' && doubleData && doubleData.length === 2) {
    const exec1 = doubleData[0];
    const exec2 = doubleData[1];

    return (
      <div className="row g-4 mb-4">
        {/* Comparación de Métricas Principales */}
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
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📊 Comparación de Métricas Clave
            </h5>
            <Bar
              data={{
                labels: ['Operaciones', 'Completadas', 'Clientes'],
                datasets: [
                  {
                    label: exec1.nombre,
                    data: [
                      exec1.stats.totalShipments,
                      exec1.stats.completedShipments,
                      exec1.stats.uniqueConsignees
                    ],
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 2
                  },
                  {
                    label: exec2.nombre,
                    data: [
                      exec2.stats.totalShipments,
                      exec2.stats.completedShipments,
                      exec2.stats.uniqueConsignees
                    ],
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgb(139, 92, 246)',
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      font: { size: 12, weight: '600' },
                      padding: 15,
                      usePointStyle: true
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
              height={300}
            />
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
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              💰 Comparación Financiera
            </h5>
            <Bar
              data={{
                labels: ['Income', 'Expense', 'Profit'],
                datasets: [
                  {
                    label: exec1.nombre,
                    data: [
                      exec1.stats.totalIncome,
                      exec1.stats.totalExpense,
                      exec1.stats.totalProfit
                    ],
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 2
                  },
                  {
                    label: exec2.nombre,
                    data: [
                      exec2.stats.totalIncome,
                      exec2.stats.totalExpense,
                      exec2.stats.totalProfit
                    ],
                    backgroundColor: 'rgba(251, 191, 36, 0.8)',
                    borderColor: 'rgb(251, 191, 36)',
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      font: { size: 12, weight: '600' },
                      padding: 15,
                      usePointStyle: true
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => formatCurrency(value as number)
                    }
                  }
                }
              }}
              height={300}
            />
          </div>
        </div>

        {/* Comparación de Tasas */}
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
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📈 Tasas de Rendimiento y Eficiencia
            </h5>
            <Bar
              data={{
                labels: ['Tasa Completado (%)', 'Margen Profit (%)', 'Promedio por Op'],
                datasets: [
                  {
                    label: exec1.nombre,
                    data: [
                      exec1.stats.completionRate,
                      exec1.stats.profitMargin,
                      exec1.stats.averagePerShipment / 100000 // Escalar para visualización
                    ],
                    backgroundColor: 'rgba(236, 72, 153, 0.8)',
                    borderColor: 'rgb(236, 72, 153)',
                    borderWidth: 2
                  },
                  {
                    label: exec2.nombre,
                    data: [
                      exec2.stats.completionRate,
                      exec2.stats.profitMargin,
                      exec2.stats.averagePerShipment / 100000
                    ],
                    backgroundColor: 'rgba(14, 165, 233, 0.8)',
                    borderColor: 'rgb(14, 165, 233)',
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      font: { size: 12, weight: '600' },
                      padding: 15,
                      usePointStyle: true
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        if (context.dataIndex === 2) {
                          // Promedio por operación
                          return `${context.dataset.label}: ${formatCurrency(context.parsed.y * 100000)}`;
                        }
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
              height={300}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default ChartAirShipments;