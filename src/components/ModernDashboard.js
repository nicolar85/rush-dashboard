import React, { useMemo } from 'react';
import { useData } from '../App';
import {
  BarChart3, Users, TrendingUp, DollarSign, Award,
  Target, Calendar, FileText, Activity, Star,
  ArrowUpRight, ArrowDownRight, RefreshCw, Upload,
  Crown, Medal, Zap, Package, MapPin, Clock
} from 'lucide-react';

// Simulazione delle funzioni di utilità
const formatCurrency = (value) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value || 0);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('it-IT').format(value || 0);
};

const ModernDashboard = () => {
  const { data, selectedFileDate, setSelectedFileDate } = useData();

  const { stats, trendData } = useMemo(() => {
    const emptyStats = {
      totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalRush: 0,
      totalNewClients: 0, totalFastweb: 0, avgRush: 0, topAgent: null,
      topSM: null, recentFiles: [], currentPeriod: 'Nessun dato'
    };
    const emptyTrend = { revenue: null, rush: null, newClients: null, fastweb: null };

    if (!data.uploadedFiles || data.uploadedFiles.length === 0) {
      return { stats: emptyStats, trendData: emptyTrend };
    }

    let currentFileIndex = data.uploadedFiles.findIndex(f => f.date === selectedFileDate);
    if (currentFileIndex === -1) {
      // Se non c'è una data selezionata (o non è valida), usa il file più recente
      currentFileIndex = 0;
    }
    const file = data.uploadedFiles[currentFileIndex];

    if (!file?.data?.agents) {
      return { stats: { ...emptyStats, recentFiles: data.uploadedFiles.slice(-3).reverse() }, trendData: emptyTrend };
    }

    const agents = file.data.agents;
    const totalAgents = agents.length;
    const uniqueSMs = [...new Set(agents.map(a => a.sm).filter(Boolean))];
    const totalSMs = uniqueSMs.length;

    const totalRevenue = agents.reduce((sum, agent) => sum + (agent.fatturato?.complessivo || 0), 0);
    const totalRush = agents.reduce((sum, agent) => sum + (agent.fatturatoRush || 0), 0);
    const totalNewClients = agents.reduce((sum, agent) => sum + (agent.nuovoCliente || 0), 0);
    const totalFastweb = agents.reduce((sum, agent) => sum + (agent.fastwebEnergia || 0), 0);

    const avgRush = totalAgents > 0 ? totalRush / totalAgents : 0;

    const topAgent = agents.reduce((max, agent) =>
      (agent.fatturatoRush || 0) > (max?.fatturatoRush || 0) ? agent : max, null);

    const smStatsData = {};
    agents.forEach(agent => {
      const sm = agent.sm || 'Senza SM';
      if (!smStatsData[sm]) {
        smStatsData[sm] = { name: sm, totalRush: 0, agents: [] };
      }
      smStatsData[sm].totalRush += agent.fatturatoRush || 0;
      smStatsData[sm].agents.push(agent);
    });

    const topSM = Object.values(smStatsData).reduce((max, sm) =>
      sm.totalRush > (max?.totalRush || 0) ? sm : max, null);

    const currentStats = {
      totalAgents, totalSMs, totalRevenue, totalRush, totalNewClients,
      totalFastweb, avgRush, topAgent, topSM,
      recentFiles: data.uploadedFiles.slice(-3).reverse(),
      currentPeriod: file.displayDate
    };

    // Calcolo Trend
    const prevFileIndex = currentFileIndex + 1;
    const previousFile = (prevFileIndex < data.uploadedFiles.length)
      ? data.uploadedFiles[prevFileIndex]
      : null;

    let newTrendData = { ...emptyTrend };

    if (previousFile && previousFile.data?.agents) {
      const prevAgents = previousFile.data.agents;
      const prevTotalRevenue = prevAgents.reduce((sum, agent) => sum + (agent.fatturato?.complessivo || 0), 0);
      const prevTotalRush = prevAgents.reduce((sum, agent) => sum + (agent.fatturatoRush || 0), 0);
      const prevTotalNewClients = prevAgents.reduce((sum, agent) => sum + (agent.nuovoCliente || 0), 0);
      const prevTotalFastweb = prevAgents.reduce((sum, agent) => sum + (agent.fastwebEnergia || 0), 0);

      const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      newTrendData = {
        revenue: calculateTrend(totalRevenue, prevTotalRevenue),
        rush: calculateTrend(totalRush, prevTotalRush),
        newClients: calculateTrend(totalNewClients, prevTotalNewClients),
        fastweb: calculateTrend(totalFastweb, prevTotalFastweb)
      };
    }

    return { stats: currentStats, trendData: newTrendData };
  }, [data, selectedFileDate]);

  const getTrendColor = (value) => {
    if (value > 5) return 'text-green-600';
    if (value > 0) return 'text-green-500';
    if (value > -5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (value) => {
    return value >= 0 ? ArrowUpRight : ArrowDownRight;
  };

  return (
    <div className="modern-dashboard">
      {/* Hero Header */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="welcome-section">
            <h1 className="hero-title">
              <BarChart3 size={40} />
              Dashboard RUSH
            </h1>
            <p className="hero-subtitle">
              Panoramica completa della gara di produzione commerciale
            </p>
            <div className="period-info">
              <Calendar size={16} />
              <span>Periodo corrente: <strong>{stats.currentPeriod || 'Nessun dato'}</strong></span>
            </div>
          </div>

          <div className="quick-actions">
            <div className="action-card primary">
              <Upload size={24} />
              <span>Carica File</span>
            </div>
            <div className="action-card secondary">
              <RefreshCw size={24} />
              <span>Aggiorna</span>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="performance-overview">
          <div className="perf-card agents">
            <div className="perf-icon">
              <Users size={32} />
            </div>
            <div className="perf-content">
              <span className="perf-value">{formatNumber(stats.totalAgents)}</span>
              <span className="perf-label">Agenti Attivi</span>
              <div className="perf-meta">
                <span>{stats.totalSMs} Sales Manager</span>
              </div>
            </div>
          </div>

          <div className="perf-card revenue">
            <div className="perf-icon">
              <DollarSign size={32} />
            </div>
            <div className="perf-content">
              <span className="perf-value">{formatCurrency(stats.totalRevenue)}</span>
              <span className="perf-label">Fatturato Totale</span>
              {trendData.revenue !== null && (
                <div className={`perf-trend ${getTrendColor(trendData.revenue)}`}>
                  {React.createElement(getTrendIcon(trendData.revenue), { size: 16 })}
                  <span>{Math.abs(trendData.revenue).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="perf-card rush">
            <div className="perf-icon">
              <TrendingUp size={32} />
            </div>
            <div className="perf-content">
              <span className="perf-value">{formatCurrency(stats.totalRush)}</span>
              <span className="perf-label">Rush Totale</span>
              {trendData.rush !== null && (
                <div className={`perf-trend ${getTrendColor(trendData.rush)}`}>
                  {React.createElement(getTrendIcon(trendData.rush), { size: 16 })}
                  <span>{Math.abs(trendData.rush).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="perf-card clients">
            <div className="perf-icon">
              <Target size={32} />
            </div>
            <div className="perf-content">
              <span className="perf-value">{formatNumber(stats.totalNewClients)}</span>
              <span className="perf-label">Nuovi Clienti</span>
              {trendData.newClients !== null && (
                <div className={`perf-trend ${getTrendColor(trendData.newClients)}`}>
                  {React.createElement(getTrendIcon(trendData.newClients), { size: 16 })}
                  <span>{Math.abs(trendData.newClients).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="perf-card fastweb">
            <div className="perf-icon">
              <Zap size={32} />
            </div>
            <div className="perf-content">
              <span className="perf-value">{formatNumber(stats.totalFastweb)}</span>
              <span className="perf-label">Fastweb Energia</span>
              {trendData.fastweb !== null && (
                <div className={`perf-trend ${getTrendColor(trendData.fastweb)}`}>
                  {React.createElement(getTrendIcon(trendData.fastweb), { size: 16 })}
                  <span>{Math.abs(trendData.fastweb).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Top Performers Card */}
        <div className="dashboard-card performers">
          <div className="card-header">
            <h3>
              <Crown size={20} />
              Top Performers
            </h3>
            <span className="card-badge">Live</span>
          </div>

          <div className="performers-content">
            {stats.topAgent ? (
              <div className="top-performer">
                <div className="performer-rank">
                  <Crown size={24} className="text-yellow-500" />
                </div>
                <div className="performer-info">
                  <h4 className="performer-name">{stats.topAgent.nome}</h4>
                  <p className="performer-meta">{stats.topAgent.sm}</p>
                  <div className="performer-stats">
                    <span className="stat-item">
                      <TrendingUp size={14} />
                      {formatCurrency(stats.topAgent.fatturatoRush || 0)}
                    </span>
                    <span className="stat-item">
                      <DollarSign size={14} />
                      {formatCurrency(stats.topAgent.fatturato?.complessivo || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data-small">
                <Crown size={32} className="opacity-30" />
                <p>Carica i dati per visualizzare i top performer</p>
              </div>
            )}

            {stats.topSM && (
              <div className="top-sm">
                <div className="sm-header">
                  <Medal size={18} />
                  <span>Miglior Sales Manager</span>
                </div>
                <div className="sm-info">
                  <h5>{stats.topSM.name}</h5>
                  <div className="sm-stats">
                    <span>{stats.topSM.agents.length} agenti</span>
                    <span>{formatCurrency(stats.topSM.totalRush)} Rush</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics Card */}
        <div className="dashboard-card metrics">
          <div className="card-header">
            <h3>
              <Activity size={20} />
              Metriche Chiave
            </h3>
            <span className="card-badge success">Aggiornato</span>
          </div>

          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-icon avg">
                <Target size={20} />
              </div>
              <div className="metric-content">
                <span className="metric-value">{formatCurrency(stats.avgRush)}</span>
                <span className="metric-label">Rush Medio</span>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon fastweb">
                <Zap size={20} />
              </div>
              <div className="metric-content">
                <span className="metric-value">{formatNumber(stats.totalFastweb)}</span>
                <span className="metric-label">Fastweb Energia</span>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon ratio">
                <BarChart3 size={20} />
              </div>
              <div className="metric-content">
                <span className="metric-value">
                  {stats.totalRevenue > 0 ?
                    `${((stats.totalRush / stats.totalRevenue) * 100).toFixed(1)}%` :
                    '0%'
                  }
                </span>
                <span className="metric-label">Rapporto Rush/Fatturato</span>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon clients-avg">
                <Users size={20} />
              </div>
              <div className="metric-content">
                <span className="metric-value">
                  {stats.totalAgents > 0 ?
                    (stats.totalNewClients / stats.totalAgents).toFixed(1) :
                    '0'
                  }
                </span>
                <span className="metric-label">Clienti per Agente</span>
              </div>
            </div>
          </div>
        </div>


        {/* Recent Files */}
        <div className="dashboard-card files">
          <div className="card-header">
            <h3>
              <FileText size={20} />
              File Recenti
            </h3>
            <span className="files-count">{data.uploadedFiles?.length || 0} file</span>
          </div>

          <div className="files-content">
            {stats.recentFiles.length > 0 ? (
              stats.recentFiles.map(file => (
                <div
                  key={file.id}
                  className={`file-item ${selectedFileDate === file.date ? 'active' : ''}`}
                  onClick={() => setSelectedFileDate(file.date)}
                >
                  <div className="file-icon">
                    <FileText size={20} />
                  </div>
                  <div className="file-info">
                    <span className="file-name">{file.displayDate}</span>
                    <span className="file-meta">
                      <Clock size={12} />
                      {new Date(file.uploadDate).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <div className="file-stats">
                    <span className="agents-count">
                      {file.data?.agents?.length || 0} agenti
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-files">
                <Upload size={32} className="opacity-30" />
                <p>Nessun file caricato</p>
                <span>Inizia caricando il tuo primo file Excel</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modern-dashboard {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          min-height: 100vh;
          padding: 32px;
        }

        .dashboard-hero {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 24px;
          padding: 40px;
          margin-bottom: 32px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .hero-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }

        .hero-title {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 3rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px 0;
          background: linear-gradient(135deg, #1e293b, #475569);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.2rem;
          color: #64748b;
          margin: 0 0 16px 0;
        }

        .period-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
          font-size: 1rem;
          padding: 8px 16px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 12px;
          display: inline-flex;
        }

        .quick-actions {
          display: flex;
          gap: 16px;
        }

        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 24px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          min-width: 120px;
        }

        .action-card.primary {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .action-card.secondary {
          background: linear-gradient(135deg, #10b981, #047857);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .performance-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }

        .perf-card {
          background: white;
          border-radius: 20px;
          padding: 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .perf-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--accent-gradient);
        }

        .perf-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
        }

        .perf-card.agents { --accent-gradient: linear-gradient(90deg, #3b82f6, #1d4ed8); }
        .perf-card.revenue { --accent-gradient: linear-gradient(90deg, #10b981, #047857); }
        .perf-card.rush { --accent-gradient: linear-gradient(90deg, #f59e0b, #d97706); }
        .perf-card.clients { --accent-gradient: linear-gradient(90deg, #8b5cf6, #7c3aed); }
        .perf-card.fastweb { --accent-gradient: linear-gradient(90deg, #0d9488, #0f766e); }

        .perf-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: var(--accent-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .perf-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .perf-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
        }

        .perf-label {
          font-size: 1rem;
          color: #64748b;
          font-weight: 500;
        }

        .perf-meta {
          font-size: 0.9rem;
          color: #94a3b8;
          margin-top: 4px;
        }

        .perf-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.9rem;
          font-weight: 600;
          margin-top: 8px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }

        .dashboard-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .dashboard-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
        }

        .card-header {
          padding: 24px 28px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header h3 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.3rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .card-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-badge {
          background: #dbeafe;
          color: #1e40af;
        }

        .card-badge.success {
          background: #d1fae5;
          color: #065f46;
        }

        /* Performers Card */
        .performers-content {
          padding: 28px;
        }

        .top-performer {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: linear-gradient(135deg, #fef3c7, #fbbf24);
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .performer-rank {
          flex-shrink: 0;
        }

        .performer-info {
          flex: 1;
        }

        .performer-name {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .performer-meta {
          color: #64748b;
          margin: 0 0 12px 0;
        }

        .performer-stats {
          display: flex;
          gap: 16px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
        }

        .top-sm {
          padding: 16px 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .sm-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 8px;
        }

        .sm-info h5 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .sm-stats {
          display: flex;
          gap: 16px;
          font-size: 0.9rem;
          color: #64748b;
        }

        /* Metrics Card */
        .metrics-grid {
          padding: 28px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .metric-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .metric-icon.avg { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
        .metric-icon.fastweb { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .metric-icon.ratio { background: linear-gradient(135deg, #10b981, #047857); }
        .metric-icon.clients-avg { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }

        .metric-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
        }

        .metric-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }


        /* Files Card */
        .files-content {
          padding: 28px;
          max-height: 300px;
          overflow-y: auto;
        }

        .files-count {
          background: #e0f2fe;
          color: #0277bd;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
          margin-bottom: 8px;
        }

        .file-item:hover {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .file-item.active {
          background: #dbeafe;
          border-color: #3b82f6;
        }

        .file-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          flex-shrink: 0;
        }

        .file-item.active .file-icon {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .file-name {
          font-weight: 600;
          color: #1e293b;
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: #64748b;
        }

        .file-stats {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .agents-count {
          background: #f1f5f9;
          color: #475569;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .file-item.active .agents-count {
          background: rgba(59, 130, 246, 0.1);
          color: #1e40af;
        }

        .no-data-small,
        .no-files {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
        }

        .no-data-small p,
        .no-files p {
          margin: 12px 0 4px 0;
          font-weight: 600;
          color: #1e293b;
        }

        .no-files span {
          font-size: 0.9rem;
          color: #64748b;
        }

        /* Utility Classes */
        .text-green-600 { color: #16a34a; }
        .text-green-500 { color: #22c55e; }
        .text-yellow-600 { color: #ca8a04; }
        .text-red-600 { color: #dc2626; }
        .text-yellow-500 { color: #eab308; }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .modern-dashboard {
            padding: 24px;
          }

          .dashboard-hero {
            padding: 32px 24px;
          }

          .hero-title {
            font-size: 2.5rem;
          }

          .dashboard-grid {
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .modern-dashboard {
            padding: 16px;
          }

          .dashboard-hero {
            padding: 24px 20px;
          }

          .hero-content {
            flex-direction: column;
            gap: 20px;
            align-items: stretch;
          }

          .hero-title {
            font-size: 2rem;
            text-align: center;
          }

          .quick-actions {
            justify-content: center;
          }

          .performance-overview {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }

          .perf-card {
            padding: 20px;
            flex-direction: column;
            text-align: center;
          }

          .perf-icon {
            width: 56px;
            height: 56px;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
            padding: 20px;
          }

          .card-header {
            padding: 20px 24px 16px;
          }

          .performers-content,
          .insights-content,
          .files-content {
            padding: 20px;
          }

          .top-performer {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .performer-stats {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 1.8rem;
          }

          .performance-overview {
            grid-template-columns: 1fr;
          }

          .quick-actions {
            flex-direction: column;
          }

          .action-card {
            flex-direction: row;
            justify-content: center;
            min-width: auto;
          }
        }

        /* Animazioni */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .dashboard-card {
          animation: fadeInUp 0.6s ease forwards;
        }

        .perf-card {
          animation: slideIn 0.5s ease forwards;
        }

        .file-item {
          animation: slideIn 0.3s ease forwards;
        }

        .insight-item {
          animation: fadeInUp 0.4s ease forwards;
        }

        /* Hover Effects */
        .perf-card:hover .perf-icon {
          transform: scale(1.1);
        }

        .action-card:hover {
          animation: pulse 2s infinite;
        }

        .metric-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        /* Loading States */
        .perf-card.loading {
          opacity: 0.7;
          pointer-events: none;
        }

        .perf-card.loading::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Dark mode ready */
        @media (prefers-color-scheme: dark) {
          .modern-dashboard {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          }

          .dashboard-hero,
          .dashboard-card {
            background: #334155;
            color: #f8fafc;
          }

          .hero-title {
            color: #f8fafc;
          }

          .perf-value,
          .performer-name,
          .metric-value {
            color: #f8fafc;
          }
        }
      `}</style>
    </div>
  );
};

export default ModernDashboard;
