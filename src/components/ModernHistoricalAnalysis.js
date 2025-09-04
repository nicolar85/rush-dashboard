import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import { History, RefreshCw, BarChart2, TrendingUp, TrendingDown, FileText, Lightbulb, CheckCircle, AlertTriangle, Info, Users, UserPlus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ModernHistoricalAnalysis.css';

// Helper functions for formatting
const formatCurrency = (value) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
const formatNumber = (value) => new Intl.NumberFormat('it-IT').format(value || 0);
const formatPercentage = (value) => `${value.toFixed(1)}%`;

const TrendIndicator = ({ value, text = "vs. mese prec." }) => {
  if (value === null || isNaN(value)) return null;
  const isPositive = value > 0;
  const isNegative = value < 0;

  let trendClass = 'neutral';
  if (isPositive) trendClass = 'positive';
  if (isNegative) trendClass = 'negative';

  return (
    <span className={`kpi-trend ${trendClass}`}>
      {isPositive && <TrendingUp size={14} />}
      {isNegative && <TrendingDown size={14} />}
      {formatPercentage(value)} {text}
    </span>
  );
};

const InsightCard = ({ insight }) => {
  const { icon: Icon, type, title, text } = insight;
  return (
    <div className={`insight-card ${type}`}>
      <div className="insight-icon">
        <Icon size={24} />
      </div>
      <div className="insight-content">
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <p style={{ color: data.color }}>
          {`${data.name}: ${formatCurrency(data.value)}`}
        </p>
      </div>
    );
  }
  return null;
};

const TrendCard = ({ title, value, icon: Icon }) => {
  const isUp = value > 0;
  const isDown = value < 0;
  const cardClass = isUp ? 'up' : isDown ? 'down' : 'neutral';

  return (
    <div className={`trend-card ${cardClass}`}>
      <div className="trend-header">
        <h4>{title}</h4>
        <Icon size={20} />
      </div>
      <div className="trend-content">
        <div className="trend-percentage">{formatPercentage(value)}</div>
        <div className="trend-description">Rispetto al mese precedente</div>
      </div>
    </div>
  );
};

const ModernHistoricalAnalysis = ({ setActiveSection }) => {
  const { data } = useData();
  const [loading, setLoading] = useState(false);
  const hasData = data && data.uploadedFiles && data.uploadedFiles.length > 1;
  const [activeView, setActiveView] = useState('overview');
  const [chartMetric, setChartMetric] = useState('Fatturato Rush');

  const historicalStats = useMemo(() => {
    if (!hasData) return null;

    // Use the last 6 files, and ensure they are in chronological order
    const files = data.uploadedFiles.slice(0, 6).reverse();

    const monthlyData = files.map(file => ({
      name: file.displayDate,
      'Fatturato Totale': file.metadata.totalRevenue,
      'Fatturato Rush': file.metadata.totalRush,
      'Nuovi Clienti': file.metadata.totalNewClients,
      'Agenti Attivi': file.metadata.totalAgents,
    }));

    const latest = files[files.length - 1]?.metadata || {};
    const previous = files[files.length - 2]?.metadata || {};

    const calcTrend = (current, prev) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev) * 100;
    };

    const revenueTrend = calcTrend(latest.totalRevenue, previous.totalRevenue);

    const totalRevenue = files.reduce((sum, f) => sum + f.metadata.totalRevenue, 0);
    const averageRevenue = totalRevenue / files.length;

    const clientTrend = calcTrend(latest.totalNewClients, previous.totalNewClients);

    const bestMonth = files.reduce((best, current) =>
      current.metadata.totalRevenue > best.metadata.totalRevenue ? current : best
    );

    const comparisonData = {
      headers: files.map(f => f.displayDate),
      rows: [
        { metric: 'Fatturato Totale', values: files.map(f => formatCurrency(f.metadata.totalRevenue)) },
        { metric: 'Fatturato Rush', values: files.map(f => formatCurrency(f.metadata.totalRush)) },
        { metric: 'Nuovi Clienti', values: files.map(f => formatNumber(f.metadata.totalNewClients)) },
        { metric: 'Agenti Attivi', values: files.map(f => formatNumber(f.metadata.totalAgents)) },
      ]
    };

    const totalRevenuePeriod = files.reduce((sum, f) => sum + f.metadata.totalRevenue, 0);
    const totalRushPeriod = files.reduce((sum, f) => sum + f.metadata.totalRush, 0);
    const totalNewClientsPeriod = files.reduce((sum, f) => sum + f.metadata.totalNewClients, 0);
    const averageAgentsPeriod = files.reduce((sum, f) => sum + f.metadata.totalAgents, 0) / files.length;

    return {
      monthlyData,
      comparisonData,
      kpis: {
        revenueTrend,
        averageRevenue,
        clientTrend,
        bestMonth: {
          date: bestMonth.displayDate,
          revenue: bestMonth.metadata.totalRevenue,
        }
      },
      summary: {
        totalRevenue: totalRevenuePeriod,
        totalRush: totalRushPeriod,
        totalNewClients: totalNewClientsPeriod,
        averageAgents: averageAgentsPeriod,
      },
      trends: {
        revenue: revenueTrend,
        rush: calcTrend(latest.totalRush, previous.totalRush),
        clients: clientTrend,
        agents: calcTrend(latest.totalAgents, previous.totalAgents),
      },
      insights: [
        {
          type: 'success',
          icon: TrendingUp,
          title: 'Miglior Mese',
          text: `Il mese con il fatturato più alto è stato ${bestMonth.displayDate} con un totale di ${formatCurrency(bestMonth.metadata.totalRevenue)}.`
        },
        {
          type: 'info',
          icon: BarChart2,
          title: 'Performance Fatturato',
          text: `Il fatturato totale dell'ultimo mese è in ${revenueTrend > 0 ? 'crescita' : 'calo'} del ${formatPercentage(Math.abs(revenueTrend))} rispetto al precedente.`
        },
        {
          type: 'warning',
          icon: Users,
          title: 'Andamento Clienti',
          text: `Nell'ultimo mese, il numero di nuovi clienti è in ${clientTrend > 0 ? 'crescita' : 'calo'} del ${formatPercentage(Math.abs(clientTrend))}.`
        }
      ]
    };
  }, [data, hasData]);

  // Placeholder function for refreshing data
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  // Component for loading state
  const LoadingState = () => (
    <div className="historical-loading">
      <div className="loading-spinner"></div>
      <p>Caricamento dati storici...</p>
    </div>
  );

  // Component for no data state
  const NoDataState = ({ setActiveSection }) => (
    <div className="historical-no-data">
      <FileText size={64} />
      <h2>Nessun Dato Storico Disponibile</h2>
      <p>Non sono stati ancora caricati file sufficienti per un'analisi storica.</p>
      <p>Carica i file mensili per abilitare questa funzionalità.</p>
      <button className="upload-more-btn" onClick={() => setActiveSection('files')}>
        Vai a Gestione File
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="modern-historical-container">
        <LoadingState />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="modern-historical-container">
        <NoDataState setActiveSection={setActiveSection} />
      </div>
    );
  }

  return (
    <div className="modern-historical-container">
      {/* Header */}
      <header className="page-header historical-theme">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title">
              <History size={40} />
              Analisi Storica
            </h1>
            <p className="page-subtitle">
              Confronta le performance e scopri i trend nel tempo.
            </p>
          </div>
          <div className="header-actions">
            <div className="period-selector">
              <select className="period-select">
                <option>Ultimi 6 mesi</option>
                <option>Ultimi 12 mesi</option>
                <option>Anno Corrente</option>
                <option>Anno Precedente</option>
              </select>
            </div>
            <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Aggiorna
            </button>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section className="historical-kpis">
        <div className="kpi-card trend-positive">
          <div className="kpi-icon"><TrendingUp size={24} /></div>
          <div className="kpi-content">
            <div className="kpi-value">{formatPercentage(historicalStats.kpis.revenueTrend)}</div>
            <div className="kpi-label">Trend Fatturato</div>
            <TrendIndicator value={historicalStats.kpis.revenueTrend} />
          </div>
        </div>
        <div className="kpi-card trend-revenue">
          <div className="kpi-icon"><BarChart2 size={24} /></div>
          <div className="kpi-content">
            <div className="kpi-value">{formatCurrency(historicalStats.kpis.averageRevenue)}</div>
            <div className="kpi-label">Fatturato Medio Mensile</div>
          </div>
        </div>
        <div className="kpi-card trend-growth">
           <div className="kpi-icon"><Users size={24} /></div>
          <div className="kpi-content">
            <div className="kpi-value">{formatPercentage(historicalStats.kpis.clientTrend)}</div>
            <div className="kpi-label">Trend Clienti</div>
            <TrendIndicator value={historicalStats.kpis.clientTrend} />
          </div>
        </div>
        <div className="kpi-card trend-insights">
           <div className="kpi-icon"><Lightbulb size={24} /></div>
          <div className="kpi-content">
            <div className="kpi-value">{historicalStats.kpis.bestMonth.date}</div>
            <div className="kpi-label">Miglior Mese (Fatt.)</div>
            <span className="kpi-trend">{formatCurrency(historicalStats.kpis.bestMonth.revenue)}</span>
          </div>
        </div>
      </section>

      {/* View Tabs */}
      <div className="view-tabs">
        <button className={`tab-btn ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}>
          <BarChart2 size={18} />
          Panoramica
        </button>
        <button className={`tab-btn ${activeView === 'trends' ? 'active' : ''}`} onClick={() => setActiveView('trends')}>
          <TrendingUp size={18} />
          Trends
        </button>
        <button className={`tab-btn ${activeView === 'comparison' ? 'active' : ''}`} onClick={() => setActiveView('comparison')}>
          <FileText size={18} />
          Confronto
        </button>
        <button className={`tab-btn ${activeView === 'insights' ? 'active' : ''}`} onClick={() => setActiveView('insights')}>
          <Lightbulb size={18} />
          Insights
        </button>
      </div>

      {/* Content based on active tab */}
      <main>
        {activeView === 'overview' && (
          <section className="overview-section">
            <div className="main-chart-container">
              <div className="chart-header">
                <h3>Andamento Mensile</h3>
                <div className="metric-selector">
                  <select className="metric-select" value={chartMetric} onChange={(e) => setChartMetric(e.target.value)}>
                    <option value="Fatturato Rush">Fatturato Rush</option>
                    <option value="Fatturato Totale">Fatturato Totale</option>
                    <option value="Nuovi Clienti">Nuovi Clienti</option>
                    <option value="Agenti Attivi">Agenti Attivi</option>
                  </select>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalStats.monthlyData} margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                    <YAxis tickFormatter={(value) => chartMetric.includes('Fatturato') ? formatCurrency(value) : formatNumber(value)} tick={{ fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey={chartMetric} stroke="#8b5cf6" strokeWidth={2} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-header">
                  <h4>Riepilogo Periodo</h4>
                  <TrendingUp size={20} />
                </div>
                <div className="summary-content">
                  <div className="metric-row">
                    <span>Fatturato Totale</span>
                    <span className="metric-value">{formatCurrency(historicalStats.summary.totalRevenue)}</span>
                  </div>
                  <div className="metric-row">
                    <span>Fatturato Rush</span>
                    <span className="metric-value">{formatCurrency(historicalStats.summary.totalRush)}</span>
                  </div>
                  <div className="metric-row">
                    <span>Nuovi Clienti Totali</span>
                    <span className="metric-value">{formatNumber(historicalStats.summary.totalNewClients)}</span>
                  </div>
                  <div className="metric-row">
                    <span>Media Agenti Attivi</span>
                    <span className="metric-value">{formatNumber(historicalStats.summary.averageAgents)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        {activeView === 'trends' && (
          <section className="trends-section">
            <div className="multi-chart-container">
              <div className="chart-header">
                <h3>Analisi dei Trend Mensili</h3>
              </div>
              <div className="trend-cards-grid">
                <TrendCard title="Fatturato Totale" value={historicalStats.trends.revenue} icon={BarChart2} />
                <TrendCard title="Fatturato Rush" value={historicalStats.trends.rush} icon={TrendingUp} />
                <TrendCard title="Nuovi Clienti" value={historicalStats.trends.clients} icon={UserPlus} />
                <TrendCard title="Agenti Attivi" value={historicalStats.trends.agents} icon={Users} />
              </div>
            </div>
          </section>
        )}
        {activeView === 'comparison' && (
          <section className="comparison-section">
            <div className="comparison-controls">
              <h3>Confronto Periodi</h3>
            </div>
            <div className="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>Metrica</th>
                    {historicalStats.comparisonData.headers.map(header => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historicalStats.comparisonData.rows.map(row => (
                    <tr key={row.metric}>
                      <td className="period-cell">{row.metric}</td>
                      {row.values.map((value, index) => (
                        <td key={index}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeView === 'insights' && (
          <section className="insights-section">
            <div className="insights-header">
              <h3>Insights Automatici</h3>
              <p>Analisi e suggerimenti basati sui dati storici.</p>
            </div>
            <div className="insights-grid">
              {historicalStats.insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ModernHistoricalAnalysis;
