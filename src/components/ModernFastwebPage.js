import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import './ModernFastwebPage.css';
import { formatAgentName } from '../utils/formatter';
import {
  Zap,
  Users,
  Award,
  TrendingUp,
  BarChart,
  Filter,
  Search,
  User,
  FileText,
  Star,
  Shield,
  Frown,
  RefreshCw,
  Eye,
  UserCheck,
  Building,
  Crown
} from 'lucide-react';

// Helper to format numbers
const formatNumber = (value) => {
  return new Intl.NumberFormat('it-IT').format(value || 0);
};

const ModernFastwebPage = () => {
  const { data, selectedFileDate, globalLoading, loadFiles } = useData();
  const [activeView, setActiveView] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFiles();
    // A little delay to give a feeling of loading
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const fastwebData = useMemo(() => {
    if (!data.uploadedFiles || data.uploadedFiles.length === 0) {
      return null;
    }

    const file = selectedFileDate
      ? data.uploadedFiles.find(f => f.date === selectedFileDate)
      : data.uploadedFiles[0];

    if (!file?.data?.agents) {
      return null;
    }

    const agents = file.data.agents;
    const agentsWithFastweb = agents.filter(a => (a.fastwebEnergia || 0) > 0);

    if (agentsWithFastweb.length === 0) {
      return {
        totalContracts: 0,
        totalAgents: 0,
        avgContracts: 0,
        topAgent: null,
        topSm: null,
        agents: [],
        smRanking: [],
        period: file.displayDate
      };
    }

    const totalContracts = agentsWithFastweb.reduce((sum, agent) => sum + agent.fastwebEnergia, 0);

    const topAgent = agentsWithFastweb.reduce((max, agent) =>
        agent.fastwebEnergia > max.fastwebEnergia ? agent : max, agentsWithFastweb[0]
    );

    // SM Ranking
    const smMap = new Map();
    agentsWithFastweb.forEach(agent => {
      if (!agent.sm) return;
      const smName = formatAgentName(agent.sm);
      const current = smMap.get(smName) || { contracts: 0, agents: 0, agentList: [] };
      current.contracts += agent.fastwebEnergia;
      current.agents += 1;
      current.agentList.push({ name: formatAgentName(agent.nome), contracts: agent.fastwebEnergia });
      smMap.set(smName, current);
    });

    const smRanking = Array.from(smMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.contracts - a.contracts);

    const topSm = smRanking.length > 0 ? smRanking[0] : null;

    return {
      totalContracts,
      totalAgents: agentsWithFastweb.length,
      avgContracts: totalContracts / agentsWithFastweb.length,
      topAgent,
      topSm,
      agents: agentsWithFastweb.sort((a,b) => b.fastwebEnergia - a.fastwebEnergia),
      smRanking,
      period: file.displayDate
    };
  }, [data, selectedFileDate]);

  if (globalLoading) {
    return (
      <div className="modern-fastweb-loading">
        <div className="loading-spinner"></div>
        <p>Caricamento dati Fastweb...</p>
      </div>
    );
  }

  if (!fastwebData) {
    return (
        <div className="modern-fastweb-container">
            <div className="no-results" style={{ gridColumn: '1 / -1' }}>
                <Frown size={64} />
                <h3>Nessun dato Fastweb disponibile</h3>
                <p>Carica un file per visualizzare le statistiche dei contratti Fastweb.</p>
            </div>
        </div>
    );
  }

  const { totalContracts, totalAgents, avgContracts, topAgent, topSm, agents, smRanking, period } = fastwebData;

  const renderOverview = () => (
    <div className="overview-section">
        <div className="section-card">
            <div className="section-header">
                <h3><Crown size={20} /> Top Performers</h3>
                <span className="badge-live">Live</span>
            </div>
            <div className="performers-list">
                {topAgent ? (
                    <div className="performer-item rank-1">
                        <div className="performer-rank">1</div>
                        <div className="performer-info">
                            <h4>{formatAgentName(topAgent.nome)}</h4>
                            <p>Miglior Agente</p>
                        </div>
                        <div className="performer-stats">
                            <div className="stat-item primary">
                                <Zap size={14} />
                                <strong>{formatNumber(topAgent.fastwebEnergia)}</strong> contratti
                            </div>
                        </div>
                    </div>
                ) : <p>Nessun agente con contratti Fastweb.</p>}

                {topSm ? (
                    <div className="performer-item rank-2">
                        <div className="performer-rank">1</div>
                        <div className="performer-info">
                            <h4>{topSm.name}</h4>
                            <p>Miglior SM</p>
                        </div>
                         <div className="performer-stats">
                            <div className="stat-item primary">
                                <Zap size={14} />
                                <strong>{formatNumber(topSm.contracts)}</strong> contratti
                            </div>
                        </div>
                    </div>
                ) : <p>Nessun SM con contratti Fastweb.</p>}
            </div>
        </div>
        <div className="section-card">
            <div className="section-header">
                <h3><Building size={20} /> Classifica Sales Manager</h3>
            </div>
            <div className="sm-rankings-grid">
                {smRanking.slice(0, 4).map((sm, index) => (
                    <div key={sm.name} className={`sm-card ${index === 0 ? 'rank-1' : ''}`}>
                        {index === 0 && <div className="sm-rank">🏆</div>}
                        <div className="sm-info">
                            <h4>{sm.name}</h4>
                        </div>
                        <div className="sm-metrics">
                            <div className="metric">
                                <span className="metric-value">{formatNumber(sm.contracts)}</span>
                                <span className="metric-label">Contratti</span>
                            </div>
                            <div className="metric">
                                <span className="metric-value">{formatNumber(sm.agents)}</span>
                                <span className="metric-label">Agenti</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderAgentsList = () => (
     <div className="agents-section">
        <div className="agents-grid">
            {agents.length > 0 ? agents.map(agent => (
                <div key={agent.id} className="fastweb-agent-card low">
                    <div className="card-header">
                        <div className="agent-avatar">{formatAgentName(agent.nome).charAt(0)}</div>
                        <div className="agent-info">
                            <h4>{formatAgentName(agent.nome)}</h4>
                            <p>{formatAgentName(agent.sm)}</p>
                        </div>
                        <div className="contracts-badge">
                            <Zap size={16} />
                            <span>{formatNumber(agent.fastwebEnergia)}</span>
                        </div>
                    </div>
                </div>
            )) : (
                 <div className="no-results">
                    <Frown size={48} />
                    <h3>Nessun agente trovato</h3>
                    <p>Nessun agente ha contratti Fastweb in questo periodo.</p>
                </div>
            )}
        </div>
     </div>
  );

  return (
    <div className="modern-fastweb-container">
      <header className="page-header fastweb-theme">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title"><Zap /> Analisi Fastweb</h1>
            <p className="page-subtitle">Dettaglio e performance dei contratti Fastweb Energia per il periodo: <strong>{period || 'N/A'}</strong></p>
          </div>
          <div className="header-actions">
            <button onClick={handleRefresh} disabled={isRefreshing} className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}>
              <RefreshCw size={18} />
              <span>{isRefreshing ? 'Aggiornando...' : 'Aggiorna Dati'}</span>
            </button>
          </div>
        </div>
        <div className="kpi-grid">
            <div className="kpi-card primary">
                <div className="kpi-icon"><Zap size={28}/></div>
                <div className="kpi-content">
                    <div className="kpi-value">{formatNumber(totalContracts)}</div>
                    <div className="kpi-label">Contratti Totali</div>
                </div>
            </div>
            <div className="kpi-card success">
                <div className="kpi-icon"><Users size={28}/></div>
                <div className="kpi-content">
                    <div className="kpi-value">{formatNumber(totalAgents)}</div>
                    <div className="kpi-label">Agenti con Contratti</div>
                </div>
            </div>
            <div className="kpi-card accent">
                <div className="kpi-icon"><BarChart size={28}/></div>
                <div className="kpi-content">
                    <div className="kpi-value">{formatNumber(avgContracts.toFixed(2))}</div>
                    <div className="kpi-label">Media Contratti/Agente</div>
                </div>
            </div>
            <div className="kpi-card info">
                <div className="kpi-icon"><Award size={28}/></div>
                <div className="kpi-content">
                    <div className="kpi-value">{topAgent ? formatAgentName(topAgent.nome) : 'N/A'}</div>
                    <div className="kpi-label">Top Performer</div>
                </div>
            </div>
        </div>
      </header>

      <div className="view-tabs">
        <button className={`tab-btn ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}>
          <Eye size={18} /> Overview
        </button>
        <button className={`tab-btn ${activeView === 'agents' ? 'active' : ''}`} onClick={() => setActiveView('agents')}>
          <UserCheck size={18} /> Lista Agenti
        </button>
      </div>

      {activeView === 'overview' ? renderOverview() : renderAgentsList()}
    </div>
  );
};

export default ModernFastwebPage;
