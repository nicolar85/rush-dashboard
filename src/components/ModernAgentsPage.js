import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../App'; // Importa il context
import AgentCard from './AgentCard'; // Importa la VERA AgentCard
import AgentModal from './AgentModal'; // Importa la VERA AgentModal
import './ModernAgentsPage.css';
import { Search, Filter, Users, TrendingUp, Award, BarChart3, RefreshCw } from 'lucide-react';
import { Slider } from '@mui/material';

const SLIDER_DISPLAY_MAX = 3000; // Limite visuale per lo slider

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

  // Logica per processare i dati reali
  const { agents, smList, maxFatturatoRush, allAgentsInPeriod } = useMemo(() => {
    if (!selectedFileDate || !data.uploadedFiles || data.uploadedFiles.length === 0) {
      return { agents: [], smList: [], maxFatturatoRush: SLIDER_DISPLAY_MAX, allAgentsInPeriod: [] };
    }
    const file = data.uploadedFiles.find(f => f.date === selectedFileDate);
    if (!file || !file.data || !file.data.agents) {
      return { agents: [], smList: [], maxFatturatoRush: SLIDER_DISPLAY_MAX, allAgentsInPeriod: [] };
    }

    const agentsWithId = file.data.agents.map((agent, index) => ({
      id: `${file.date}-${agent.nome}-${index}`, ...agent,
    }));

    const uniqueSmList = [...new Set(agentsWithId.map(a => a.sm).filter(Boolean))].sort();
    const trueMaxRush = Math.max(...agentsWithId.map(a => a.fatturatoRush || 0));

    let filteredAgents = agentsWithId.filter(agent =>
      agent.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
      (filters.selectedSm === '' || agent.sm === filters.selectedSm) &&
      (agent.fatturatoRush || 0) >= filters.fatturatoRushRange[0] &&
      (agent.fatturatoRush || 0) <= filters.fatturatoRushRange[1]
    );

    return { agents: filteredAgents, smList: uniqueSmList, maxFatturatoRush: trueMaxRush, allAgentsInPeriod: agentsWithId };
  }, [data.uploadedFiles, selectedFileDate, filters]);

  const handleFilterChange = (name, value) => {
    if (name === 'fatturatoRushRange') {
      const [min, max] = value;
      setFilters(prev => ({ ...prev, fatturatoRushRange: [min, max], activePreset: null }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value, activePreset: null }));
    }
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
    { value: SLIDER_DISPLAY_MAX, label: `${SLIDER_DISPLAY_MAX / 1000}k€+` }
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
              value={filters.fatturatoRushRange.map(v => Math.min(v, SLIDER_DISPLAY_MAX))}
              onChange={(e, newValue) => handleFilterChange('fatturatoRushRange', newValue)}
              valueLabelDisplay="auto"
              min={0}
              max={SLIDER_DISPLAY_MAX}
              step={100}
              marks={marks}
              valueLabelFormat={(value) => value === SLIDER_DISPLAY_MAX ? `${value.toLocaleString('it-IT')}€+` : `${value.toLocaleString('it-IT')}€`}
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
    </div>
  );
};

export default ModernAgentsPage;
