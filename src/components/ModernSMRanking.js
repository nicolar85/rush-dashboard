import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import {
  Trophy, Crown, Medal, Target, Users, TrendingUp,
  DollarSign, Award, Zap, Calendar, Filter,
  ChevronDown, ChevronUp, Star, BarChart3
} from 'lucide-react';
import './ModernSMRanking.css';

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

const ModernSMRanking = () => {
  const { data, selectedFileDate } = useData();
  const [sortBy, setSortBy] = useState('totalRush');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedMetric, setSelectedMetric] = useState('rush');
  const [expandedSM, setExpandedSM] = useState(null);

  // Processa i dati degli SM dai file caricati
  const smData = useMemo(() => {
    if (!selectedFileDate || !data.uploadedFiles?.length) {
      // Dati di esempio per la demo
      return [
        {
          name: "Marco Verdi",
          team: [
            { nome: "Paolo Rossi", fatturatoRush: 8500, fatturato: { complessivo: 25000 }, nuovoCliente: 12 },
            { nome: "Anna Bianchi", fatturatoRush: 6200, fatturato: { complessivo: 18000 }, nuovoCliente: 8 },
            { nome: "Luigi Ferrari", fatturatoRush: 7300, fatturato: { complessivo: 21000 }, nuovoCliente: 10 }
          ],
          totalAgents: 3,
          totalRush: 22000,
          totalRevenue: 64000,
          totalNewClients: 30,
          avgRush: 7333
        },
        {
          name: "Sara Blu",
          team: [
            { nome: "Roberto Silva", fatturatoRush: 9800, fatturato: { complessivo: 32000 }, nuovoCliente: 15 },
            { nome: "Elena Costa", fatturatoRush: 5400, fatturato: { complessivo: 16000 }, nuovoCliente: 7 }
          ],
          totalAgents: 2,
          totalRush: 15200,
          totalRevenue: 48000,
          totalNewClients: 22,
          avgRush: 7600
        },
        {
          name: "Andrea Rosa",
          team: [
            { nome: "Giulia Neri", fatturatoRush: 12000, fatturato: { complessivo: 35000 }, nuovoCliente: 18 },
            { nome: "Federico Blu", fatturatoRush: 8900, fatturato: { complessivo: 28000 }, nuovoCliente: 14 },
            { nome: "Chiara Verde", fatturatoRush: 7800, fatturato: { complessivo: 23000 }, nuovoCliente: 11 },
            { nome: "Matteo Giallo", fatturatoRush: 5600, fatturato: { complessivo: 17000 }, nuovoCliente: 9 }
          ],
          totalAgents: 4,
          totalRush: 34300,
          totalRevenue: 103000,
          totalNewClients: 52,
          avgRush: 8575
        }
      ];
    }

    const file = data.uploadedFiles.find(f => f.date === selectedFileDate);
    if (!file?.data?.agents) return [];

    // Processa i dati reali
    const agentsBySM = {};

    file.data.agents.forEach(agent => {
      const smName = agent.sm || 'Senza SM';
      if (!agentsBySM[smName]) {
        agentsBySM[smName] = {
          name: smName,
          team: [],
          totalAgents: 0,
          totalRush: 0,
          totalRevenue: 0,
          totalNewClients: 0,
          avgRush: 0
        };
      }

      agentsBySM[smName].team.push(agent);
      agentsBySM[smName].totalAgents++;
      agentsBySM[smName].totalRush += agent.fatturatoRush || 0;
      agentsBySM[smName].totalRevenue += agent.fatturato?.complessivo || 0;
      agentsBySM[smName].totalNewClients += agent.nuovoCliente || 0;
    });

    // Calcola medie e ordina team
    Object.values(agentsBySM).forEach(sm => {
      sm.avgRush = sm.totalAgents > 0 ? sm.totalRush / sm.totalAgents : 0;
      sm.team.sort((a, b) => (b.fatturatoRush || 0) - (a.fatturatoRush || 0));
    });

    return Object.values(agentsBySM);
  }, [data, selectedFileDate]);

  // Ordina gli SM
  const sortedSMData = useMemo(() => {
    return [...smData].sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;

      if (sortOrder === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });
  }, [smData, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return <Crown size={24} className="text-yellow-500" />;
      case 1: return <Trophy size={24} className="text-gray-400" />;
      case 2: return <Medal size={24} className="text-amber-600" />;
      default: return <span className="rank-number">{index + 1}</span>;
    }
  };

  const getPerformanceLevel = (avgRush) => {
    if (avgRush >= 8000) return 'excellent';
    if (avgRush >= 6000) return 'good';
    if (avgRush >= 4000) return 'average';
    return 'needs-improvement';
  };

  const getMetricColor = (value, type) => {
    switch (type) {
      case 'rush':
        if (value >= 8000) return 'text-green-600';
        if (value >= 6000) return 'text-blue-600';
        if (value >= 4000) return 'text-yellow-600';
        return 'text-red-600';
      case 'revenue':
        if (value >= 25000) return 'text-green-600';
        if (value >= 20000) return 'text-blue-600';
        if (value >= 15000) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Statistiche generali
  const totalStats = useMemo(() => {
    return {
      totalSMs: sortedSMData.length,
      totalAgents: sortedSMData.reduce((sum, sm) => sum + sm.totalAgents, 0),
      totalRush: sortedSMData.reduce((sum, sm) => sum + sm.totalRush, 0),
      totalRevenue: sortedSMData.reduce((sum, sm) => sum + sm.totalRevenue, 0),
      avgTeamSize: sortedSMData.length > 0 ?
        sortedSMData.reduce((sum, sm) => sum + sm.totalAgents, 0) / sortedSMData.length : 0
    };
  }, [sortedSMData]);

  return (
    <div className="modern-sm-ranking">
      {/* Header con statistiche */}
      <div className="ranking-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="page-title">
              <Trophy size={32} />
              Classifica Sales Manager
            </h1>
            <p className="page-subtitle">
              Performance e ranking dei coordinatori commerciali
            </p>
          </div>

          <div className="metrics-selector">
            <label className="metric-label">Vista:</label>
            <div className="metric-buttons">
              <button
                className={`metric-btn ${selectedMetric === 'rush' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('rush')}
              >
                <TrendingUp size={16} />
                Rush Focus
              </button>
              <button
                className={`metric-btn ${selectedMetric === 'revenue' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('revenue')}
              >
                <DollarSign size={16} />
                Fatturato
              </button>
              <button
                className={`metric-btn ${selectedMetric === 'team' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('team')}
              >
                <Users size={16} />
                Team
              </button>
            </div>
          </div>
        </div>

        {/* Statistiche globali */}
        <div className="global-stats">
          <div className="stat-card primary">
            <div className="stat-icon">
              <Users size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{totalStats.totalSMs}</span>
              <span className="stat-label">Sales Manager</span>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">
              <Target size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{totalStats.totalAgents}</span>
              <span className="stat-label">Agenti Totali</span>
            </div>
          </div>

          <div className="stat-card accent">
            <div className="stat-icon">
              <TrendingUp size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(totalStats.totalRush)}</span>
              <span className="stat-label">Rush Totale</span>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon">
              <BarChart3 size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{totalStats.avgTeamSize.toFixed(1)}</span>
              <span className="stat-label">Agenti/SM Medio</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controlli di ordinamento */}
      <div className="controls-section">
        <div className="sort-controls">
          <span className="sort-label">
            <Filter size={16} />
            Ordina per:
          </span>
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortBy === 'totalRush' ? 'active' : ''}`}
              onClick={() => handleSort('totalRush')}
            >
              Rush Totale
              {sortBy === 'totalRush' && (sortOrder === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />)}
            </button>
            <button
              className={`sort-btn ${sortBy === 'avgRush' ? 'active' : ''}`}
              onClick={() => handleSort('avgRush')}
            >
              Rush Medio
              {sortBy === 'avgRush' && (sortOrder === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />)}
            </button>
            <button
              className={`sort-btn ${sortBy === 'totalRevenue' ? 'active' : ''}`}
              onClick={() => handleSort('totalRevenue')}
            >
              Fatturato
              {sortBy === 'totalRevenue' && (sortOrder === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />)}
            </button>
            <button
              className={`sort-btn ${sortBy === 'totalAgents' ? 'active' : ''}`}
              onClick={() => handleSort('totalAgents')}
            >
              Team Size
              {sortBy === 'totalAgents' && (sortOrder === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />)}
            </button>
          </div>
        </div>
      </div>

      {/* Lista SM */}
      <div className="sm-list">
        {sortedSMData.length > 0 ? (
          sortedSMData.map((sm, index) => (
            <div
              key={sm.name}
              className={`sm-card ${getPerformanceLevel(sm.avgRush)}`}
            >
              <div className="sm-header" onClick={() => setExpandedSM(expandedSM === sm.name ? null : sm.name)}>
                <div className="rank-section">
                  {getRankIcon(index)}
                </div>

                <div className="sm-info">
                  <h3 className="sm-name">{sm.name}</h3>
                  <div className="sm-meta">
                    <span className="team-count">
                      <Users size={14} />
                      {sm.totalAgents} agenti
                    </span>
                    <span className="avg-indicator">
                      <Target size={14} />
                      Avg: {formatCurrency(sm.avgRush)}
                    </span>
                  </div>
                </div>

                <div className="sm-metrics">
                  <div className="metric-item primary">
                    <span className="metric-label">Rush Totale</span>
                    <span className={`metric-value ${getMetricColor(sm.totalRush, 'rush')}`}>
                      {formatCurrency(sm.totalRush)}
                    </span>
                  </div>

                  <div className="metric-item secondary">
                    <span className="metric-label">Fatturato</span>
                    <span className={`metric-value ${getMetricColor(sm.totalRevenue, 'revenue')}`}>
                      {formatCurrency(sm.totalRevenue)}
                    </span>
                  </div>

                  <div className="metric-item tertiary">
                    <span className="metric-label">Nuovi Clienti</span>
                    <span className="metric-value text-purple-600">
                      {formatNumber(sm.totalNewClients)}
                    </span>
                  </div>
                </div>

                <div className="expand-indicator">
                  {expandedSM === sm.name ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Team espanso */}
              {expandedSM === sm.name && (
                <div className="team-details">
                  <div className="team-header">
                    <h4>
                      <Star size={16} />
                      Team di {sm.name}
                    </h4>
                  </div>

                  <div className="agents-grid">
                    {sm.team.map((agent, agentIndex) => (
                      <div key={agent.nome} className="agent-mini-card">
                        <div className="agent-rank">
                          #{agentIndex + 1}
                        </div>
                        <div className="agent-info">
                          <h5 className="agent-name">{agent.nome}</h5>
                          <div className="agent-metrics">
                            <div className="agent-metric">
                              <span className="label">Rush:</span>
                              <span className="value rush">
                                {formatCurrency(agent.fatturatoRush || 0)}
                              </span>
                            </div>
                            <div className="agent-metric">
                              <span className="label">Fatturato:</span>
                              <span className="value revenue">
                                {formatCurrency(agent.fatturato?.complessivo || 0)}
                              </span>
                            </div>
                            <div className="agent-metric">
                              <span className="label">Clienti:</span>
                              <span className="value clients">
                                {formatNumber(agent.nuovoCliente || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-data">
            <Trophy size={48} className="opacity-30" />
            <h3>Nessun dato disponibile</h3>
            <p>Carica un file Excel per visualizzare la classifica SM</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernSMRanking;
