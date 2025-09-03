import React, { useMemo } from 'react';
import { useData } from '../App';
import {
  BarChart3, Users, Crown, Activity, TrendingUp,
  DollarSign, Target, Calendar, Zap
} from 'lucide-react';

// Utility functions
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

  const stats = useMemo(() => {
    if (!data.uploadedFiles || data.uploadedFiles.length === 0) {
      return {
        totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalRush: 0,
        totalNewClients: 0, totalFastweb: 0, avgRush: 0,
        topAgent: null, topSM: null, recentFiles: []
      };
    }

    const file = selectedFileDate ?
      data.uploadedFiles.find(f => f.date === selectedFileDate) :
      data.uploadedFiles[data.uploadedFiles.length - 1];

    if (!file?.data?.agents) {
      return {
        totalAgents: 0, totalSMs: 0, totalRevenue: 0, totalRush: 0,
        totalNewClients: 0, totalFastweb: 0, avgRush: 0,
        topAgent: null, topSM: null,
        recentFiles: data.uploadedFiles.slice(-3).reverse()
      };
    }

    const agents = file.data.agents;
    const totalRevenue = agents.reduce((sum, agent) => sum + (agent.fatturato?.complessivo || 0), 0);
    const totalRush = agents.reduce((sum, agent) => sum + (agent.fatturatoRush || 0), 0);
    const totalNewClients = agents.reduce((sum, agent) => sum + (agent.nuovoCliente || 0), 0);
    const totalFastweb = agents.reduce((sum, agent) => sum + (agent.fastwebEnergia || 0), 0);

    const topAgent = agents.reduce((max, agent) =>
      (agent.fatturatoRush || 0) > (max?.fatturatoRush || 0) ? agent : max, null);

    return {
      totalAgents: agents.length,
      totalSMs: [...new Set(agents.map(a => a.sm).filter(Boolean))].length,
      totalRevenue, totalRush, totalNewClients, totalFastweb,
      avgRush: agents.length > 0 ? totalRush / agents.length : 0,
      topAgent, recentFiles: data.uploadedFiles.slice(-3).reverse(),
      currentPeriod: file.displayDate
    };
  }, [data, selectedFileDate]);

  return (
    <div className="integrated-dashboard">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="welcome-section">
            <h1 className="hero-title">
              <BarChart3 size={40} />
              Dashboard RUSH
            </h1>
            <p className="hero-subtitle">Panoramica performance commerciali</p>
          </div>
        </div>

        <div className="performance-overview">
          <div className="perf-card agents">
            <div className="perf-icon"><Users size={32} /></div>
            <div className="perf-content">
              <span className="perf-value">{formatNumber(stats.totalAgents)}</span>
              <span className="perf-label">Agenti Attivi</span>
              <div className="perf-meta">{stats.totalSMs} Sales Manager</div>
            </div>
          </div>

          <div className="perf-card revenue">
            <div className="perf-icon"><DollarSign size={32} /></div>
            <div className="perf-content">
              <span className="perf-value">{formatCurrency(stats.totalRevenue)}</span>
              <span className="perf-label">Fatturato Totale</span>
            </div>
          </div>

          <div className="perf-card rush">
            <div className="perf-icon"><TrendingUp size={32} /></div>
            <div className="perf-content">
              <span className="perf-value">{formatCurrency(stats.totalRush)}</span>
              <span className="perf-label">Rush Totale</span>
            </div>
          </div>

          <div className="perf-card clients">
            <div className="perf-icon"><Target size={32} /></div>
            <div className="perf-content">
              <span className="perf-value">{formatNumber(stats.totalNewClients)}</span>
              <span className="perf-label">Nuovi Clienti</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="dashboard-grid">
        <div className="dashboard-card performers">
          <div className="card-header">
            <h3><Crown size={20} />Top Performers</h3>
            <span className="card-badge">Live</span>
          </div>
          <div className="performers-content">
            {stats.topAgent ? (
              <div className="top-performer">
                <div className="performer-rank">
                  <Crown size={24} className="text-yellow-500" />
                </div>
                <div className="performer-info">
                  <h4>{stats.topAgent.nome}</h4>
                  <p>{stats.topAgent.sm}</p>
                  <div className="performer-stats">
                    <span><TrendingUp size={14} />{formatCurrency(stats.topAgent.fatturatoRush || 0)}</span>
                    <span><DollarSign size={14} />{formatCurrency(stats.topAgent.fatturato?.complessivo || 0)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data-small">
                <Crown size={32} className="opacity-30" />
                <p>Carica i dati per visualizzare i top performer</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card metrics">
          <div className="card-header">
            <h3><Activity size={20} />Metriche Chiave</h3>
          </div>
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-icon avg"><Target size={20} /></div>
              <div className="metric-content">
                <span className="metric-value">{formatCurrency(stats.avgRush)}</span>
                <span className="metric-label">Rush Medio</span>
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-icon fastweb"><Zap size={20} /></div>
              <div className="metric-content">
                <span className="metric-value">{formatNumber(stats.totalFastweb)}</span>
                <span className="metric-label">Fastweb Energia</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .integrated-dashboard {
          background: transparent;
          padding: 0;
        }
        .dashboard-hero {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 24px;
          padding: 40px;
          margin-bottom: 32px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }
        .hero-title {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px 0;
        }
        .hero-subtitle {
          font-size: 1.1rem;
          color: #64748b;
        }
        .hero-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .performance-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-top: 32px;
        }
        .perf-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
        .perf-card.agents { --accent-gradient: linear-gradient(90deg, #3b82f6, #1d4ed8); }
        .perf-card.revenue { --accent-gradient: linear-gradient(90deg, #10b981, #047857); }
        .perf-card.rush { --accent-gradient: linear-gradient(90deg, #f59e0b, #d97706); }
        .perf-card.clients { --accent-gradient: linear-gradient(90deg, #8b5cf6, #7c3aed); }
        .perf-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        .perf-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: var(--accent-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .perf-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .perf-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }
        .perf-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }
        .perf-meta {
          font-size: 0.8rem;
          color: #94a3b8;
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
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .card-badge {
          background: #dbeafe;
          color: #1e40af;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }
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
        }
        .performer-info h4 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        }
        .performer-info p {
          color: #64748b;
          margin: 0 0 12px 0;
        }
        .performer-stats {
          display: flex;
          gap: 16px;
        }
        .performer-stats span {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
        }
        .no-data-small {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
        }
        .no-data-small p {
          margin: 12px 0 0 0;
          font-weight: 600;
          color: #1e293b;
        }
        .metrics-grid {
          padding: 28px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
        }
        .metric-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }

        .metric-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
        .metric-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .metric-value {
          font-size: 1.3rem;
          font-weight: 700;
          color: #1e293b;
        }
        .metric-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }
        .text-yellow-500 { color: #eab308; }
      `}</style>
    </div>
  );
};

export default ModernDashboard;
