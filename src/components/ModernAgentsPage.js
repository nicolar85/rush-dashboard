import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../App'; // Importa il context
import AgentCard from './AgentCard'; // Importa la VERA AgentCard
import AgentModal from './AgentModal'; // Importa la VERA AgentModal
import { Search, Filter, Users, TrendingUp, Award, BarChart3, RefreshCw } from 'lucide-react';
import { Slider } from '@mui/material';

const ModernAgentsPage = () => {
  const { data, selectedFileDate, loadFiles, globalLoading } = useData(); // Usa i dati reali
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Gestione stato filtri
  const [filters, setFilters] = useState({
    searchTerm: '',
    selectedSm: '',
    fatturatoRushRange: [0, 10000],
    activePreset: null,
  });

  // Sincronizzazione filtri con URL (dal vecchio componente Agents.js)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newFilters = {
      searchTerm: params.get('search') || '',
      selectedSm: params.get('sm') || '',
      fatturatoRushRange: [
        Number(params.get('minFatturatoRush')) || 0,
        Number(params.get('maxFatturatoRush')) || 10000,
      ],
      activePreset: params.get('preset') || null,
    };
    setFilters(newFilters);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.searchTerm) params.set('search', filters.searchTerm);
    if (filters.selectedSm) params.set('sm', filters.selectedSm);
    if (filters.fatturatoRushRange[0] > 0) params.set('minFatturatoRush', filters.fatturatoRushRange[0]);
    if (filters.fatturatoRushRange[1] < 10000) params.set('maxFatturatoRush', filters.fatturatoRushRange[1]);
    if (filters.activePreset) params.set('preset', filters.activePreset);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [filters]);

  // Logica per processare i dati reali (dal vecchio componente Agents.js)
  const { agents, smList, maxFatturatoRush, allAgentsInPeriod } = useMemo(() => {
    if (!selectedFileDate || !data.uploadedFiles || data.uploadedFiles.length === 0) {
      return { agents: [], smList: [], maxFatturatoRush: 10000, allAgentsInPeriod: [] };
    }
    const file = data.uploadedFiles.find(f => f.date === selectedFileDate);
    if (!file || !file.data || !file.data.agents) {
      return { agents: [], smList: [], maxFatturatoRush: 10000, allAgentsInPeriod: [] };
    }

    const agentsWithId = file.data.agents.map((agent, index) => ({
      id: `${file.date}-${agent.nome}-${index}`, ...agent,
    }));

    const uniqueSmList = [...new Set(agentsWithId.map(a => a.sm).filter(Boolean))].sort();
    const maxRush = Math.max(...agentsWithId.map(a => a.fatturatoRush || 0), 10000);

    let filteredAgents = agentsWithId.filter(agent =>
      agent.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
      (filters.selectedSm === '' || agent.sm === filters.selectedSm) &&
      (agent.fatturatoRush || 0) >= filters.fatturatoRushRange[0] &&
      (agent.fatturatoRush || 0) <= filters.fatturatoRushRange[1]
    );

    return { agents: filteredAgents, smList: uniqueSmList, maxFatturatoRush: maxRush, allAgentsInPeriod: agentsWithId };
  }, [data.uploadedFiles, selectedFileDate, filters]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value, activePreset: null }));
  };

  const handlePresetFilter = (preset) => {
    let newFilters = { ...filters, searchTerm: '', selectedSm: '', activePreset: preset };
    switch (preset) {
      case 'top':
        newFilters.fatturatoRushRange = [1000, maxFatturatoRush];
        break;
      case 'underperforming':
        newFilters.fatturatoRushRange = [0, 500];
        break;
      case 'average':
        newFilters.fatturatoRushRange = [500, 1000];
        break;
      default:
        newFilters.fatturatoRushRange = [0, maxFatturatoRush];
        newFilters.activePreset = null;
    }
    setFilters(newFilters);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  // Statistiche calcolate sui dati filtrati reali
  const stats = useMemo(() => {
    const totalAgents = agents.length;
    const avgRush = totalAgents > 0 ? agents.reduce((sum, agent) => sum + (agent.fatturatoRush || 0), 0) / totalAgents : 0;
    const topPerformer = agents.reduce((max, agent) =>
      (agent.fatturatoRush || 0) > (max?.fatturatoRush || 0) ? agent : max, null);
    const totalRevenue = agents.reduce((sum, agent) => sum + (agent.fatturato?.complessivo || 0), 0);

    return { totalAgents, avgRush, topPerformer, totalRevenue };
  }, [agents]);

  const marks = [
    { value: 0, label: '0€' },
    { value: 500, label: '500€' },
    { value: 1000, label: '1k€' },
    { value: maxFatturatoRush, label: `${(maxFatturatoRush / 1000).toFixed(0)}k€` }
  ];

  return (
    <div className="modern-agents-container">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title"><Users size={32} /> Dashboard Agenti</h1>
            <p className="page-subtitle">Gestisci e monitora le performance del tuo team commerciale</p>
          </div>
          <button className={`refresh-btn ${refreshing || globalLoading ? 'refreshing' : ''}`} onClick={handleRefresh} disabled={refreshing || globalLoading}>
            <RefreshCw size={20} />
            {refreshing || globalLoading ? 'Aggiornamento...' : 'Aggiorna Dati'}
          </button>
        </div>
        <div className="header-stats">
           <div className="stat-card primary">
            <div className="stat-icon"><Users size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalAgents}</span>
              <span className="stat-label">Agenti Visualizzati</span>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon"><TrendingUp size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">€{stats.avgRush.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</span>
              <span className="stat-label">Rush Medio</span>
            </div>
          </div>
          <div className="stat-card accent">
            <div className="stat-icon"><Award size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.topPerformer?.nome?.split(' ')[0] || 'N/A'}</span>
              <span className="stat-label">Top Performer</span>
            </div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon"><BarChart3 size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">€{(stats.totalRevenue / 1000).toFixed(0)}K</span>
              <span className="stat-label">Fatturato Totale</span>
            </div>
          </div>
        </div>
      </div>

      <div className="filters-modern">
        <div className="filters-header">
          <div className="filters-title"><Filter size={20} /><span>Filtri Avanzati</span></div>
          <div className="results-count">{agents.length} di {allAgentsInPeriod.length} agenti</div>
        </div>
        <div className="filters-grid">
          <div className="filter-group search-group">
            <label className="filter-label"><Search size={16} /> Ricerca Agente</label>
            <div className="search-input-wrapper">
              <input type="text" placeholder="Cerca per nome..." value={filters.searchTerm} onChange={(e) => handleFilterChange('searchTerm', e.target.value)} className="modern-search-input" />
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label"><Users size={16} /> Coordinatore</label>
            <select value={filters.selectedSm} onChange={(e) => handleFilterChange('selectedSm', e.target.value)} className="modern-select">
              <option value="">Tutti i Coordinatori</option>
              {smList.map(sm => <option key={sm} value={sm}>{sm}</option>)}
            </select>
          </div>
          <div className="filter-group range-group">
            <label className="filter-label"><TrendingUp size={16} /> Range Fatturato Rush</label>
            <Slider
              value={filters.fatturatoRushRange}
              onChange={(e, newValue) => handleFilterChange('fatturatoRushRange', newValue)}
              valueLabelDisplay="auto"
              min={0}
              max={maxFatturatoRush}
              step={100}
              marks={marks}
              valueLabelFormat={value => `€${value.toLocaleString('it-IT')}`}
              sx={{ mt: 2 }}
            />
          </div>
          <div className="filter-group preset-group">
            <label className="filter-label">Filtri Rapidi</label>
            <div className="preset-buttons">
              <button onClick={() => handlePresetFilter('top')} className={`preset-btn ${filters.activePreset === 'top' ? 'active' : ''}`}>🏆 Top Performers</button>
              <button onClick={() => handlePresetFilter('average')} className={`preset-btn ${filters.activePreset === 'average' ? 'active' : ''}`}>📊 Performance Media</button>
              <button onClick={() => handlePresetFilter('underperforming')} className={`preset-btn ${filters.activePreset === 'underperforming' ? 'active' : ''}`}>🔄 In Crescita</button>
              <button onClick={() => handlePresetFilter(null)} className="preset-btn reset">✨ Reset Filtri</button>
            </div>
          </div>
        </div>
      </div>

      <div className={`agents-grid-modern ${globalLoading ? 'loading' : ''}`}>
        {agents.length > 0 ? (
          agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onClick={setSelectedAgent} />
          ))
        ) : (
          <div className="no-results-modern">
            <div className="no-results-icon"><Search size={48} /></div>
            <h3>Nessun agente trovato</h3>
            <p>Prova a modificare i filtri di ricerca per visualizzare più risultati.</p>
            <button className="reset-filters-btn" onClick={() => setFilters({ searchTerm: '', selectedSm: '', fatturatoRushRange: [0, maxFatturatoRush], activePreset: null })}>Ripristina Tutti i Filtri</button>
          </div>
        )}
      </div>

      {globalLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"><RefreshCw size={32} className="animate-spin" /><p>Caricamento agenti...</p></div>
        </div>
      )}

      {/* MODALE REALE */}
      {selectedAgent && <AgentModal agent={selectedAgent} allData={data} onClose={() => setSelectedAgent(null)} />}

      <style jsx>{`
        /* Stili identici a quelli forniti dall'utente, ma senza la demo-card */
        .modern-agents-container { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); min-height: 100vh; padding: 32px; }
        .page-header { background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-radius: 24px; padding: 40px; margin-bottom: 32px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); }
        .header-content { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .header-text { flex: 1; }
        .page-title { display: flex; align-items: center; gap: 16px; font-size: 2.5rem; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
        .page-subtitle { font-size: 1.1rem; color: #64748b; margin: 0; }
        .refresh-btn { display: flex; align-items: center; gap: 12px; padding: 16px 24px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; border-radius: 16px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .refresh-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); }
        .refresh-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .refresh-btn.refreshing { animation: pulse 2s infinite; }
        .header-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; }
        .stat-card { background: white; border-radius: 16px; padding: 24px; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.05); transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1); }
        .stat-card.primary .stat-icon { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
        .stat-card.success .stat-icon { background: linear-gradient(135deg, #10b981, #047857); }
        .stat-card.accent .stat-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .stat-card.info .stat-icon { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
        .stat-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .stat-content { display: flex; flex-direction: column; gap: 4px; }
        .stat-value { font-size: 1.8rem; font-weight: 700; color: #1e293b; line-height: 1; }
        .stat-label { font-size: 0.9rem; color: #64748b; font-weight: 500; }
        .filters-modern { background: white; border-radius: 20px; padding: 32px; margin-bottom: 32px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06); border: 1px solid rgba(0, 0, 0, 0.05); }
        .filters-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
        .filters-title { display: flex; align-items: center; gap: 12px; font-size: 1.3rem; font-weight: 600; color: #1e293b; }
        .results-count { background: linear-gradient(135deg, #e0f2fe, #b3e5fc); color: #0277bd; padding: 8px 16px; border-radius: 12px; font-size: 0.9rem; font-weight: 600; }
        .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; align-items: start; }
        .filter-group { display: flex; flex-direction: column; gap: 12px; }
        .filter-label { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        .search-input-wrapper { position: relative; }
        .modern-search-input, .modern-select { width: 100%; padding: 16px 20px; border-radius: 12px; border: 2px solid #e2e8f0; font-size: 1rem; background: white; transition: all 0.2s ease; }
        .modern-search-input:focus, .modern-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .range-group { grid-column: span 2; }
        .preset-group { grid-column: span 2; }
        .preset-buttons { display: flex; flex-wrap: wrap; gap: 12px; }
        .preset-btn { padding: 12px 20px; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: #64748b; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-size: 0.9rem; }
        .preset-btn:hover { border-color: #3b82f6; color: #3b82f6; transform: translateY(-1px); }
        .preset-btn.active { background: #3b82f6; border-color: #3b82f6; color: white; }
        .preset-btn.reset { background: linear-gradient(135deg, #f59e0b, #d97706); border-color: #f59e0b; color: white; }
        .preset-btn.reset:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
        .agents-grid-modern { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; transition: opacity 0.3s ease; }
        .agents-grid-modern.loading { opacity: 0.6; pointer-events: none; }
        .no-results-modern { grid-column: 1 / -1; text-align: center; padding: 80px 40px; background: white; border-radius: 20px; color: #64748b; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
        .no-results-icon { margin: 0 auto 24px; opacity: 0.5; }
        .no-results-modern h3 { margin: 0 0 12px 0; font-size: 1.5rem; color: #1e293b; }
        .no-results-modern p { margin: 0 0 24px 0; font-size: 1rem; }
        .reset-filters-btn { background: linear-gradient(135deg, #10b981, #047857); color: white; border: none; padding: 16px 32px; border-radius: 12px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; }
        .reset-filters-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3); }
        .loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .loading-spinner { background: white; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
        .loading-spinner p { margin: 16px 0 0 0; color: #64748b; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media (max-width: 1024px) { .modern-agents-container { padding: 24px; } .page-header { padding: 32px 24px; } .page-title { font-size: 2rem; } .header-stats { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; } .filters-grid { grid-template-columns: 1fr; } .range-group, .preset-group { grid-column: span 1; } .agents-grid-modern { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; } }
        @media (max-width: 768px) { .modern-agents-container { padding: 16px; } .header-content { flex-direction: column; gap: 20px; text-align: center; } .page-title { font-size: 1.8rem; } .header-stats { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); } .stat-card { padding: 20px 16px; flex-direction: column; text-align: center; } .filters-header { flex-direction: column; gap: 12px; text-align: center; } .preset-buttons { justify-content: center; } .agents-grid-modern { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default ModernAgentsPage;
