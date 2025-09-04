import React, { useMemo } from 'react';
import { useData } from '../App';
import './ModernDashboard.css';
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
      data.uploadedFiles[0];

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
    </div>
  );
};

export default ModernDashboard;
