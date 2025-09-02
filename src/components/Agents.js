import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../App';
import AgentCard from './AgentCard';
import AgentModal from './AgentModal';
import { Slider, Button, ButtonGroup } from '@mui/material';
import { formatCurrency } from '../utils/excelParser';
import './Agents.css';

const Agents = () => {
  const { data, selectedFileDate, setSelectedFileDate } = useData();
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Gestione stato filtri
  const [filters, setFilters] = useState({
    searchTerm: '',
    selectedSm: '',
    inflowRange: [0, 10000],
    activePreset: null,
  });

  // Sincronizzazione con URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newFilters = {
      searchTerm: params.get('search') || '',
      selectedSm: params.get('sm') || '',
      inflowRange: [
        Number(params.get('minInflow')) || 0,
        Number(params.get('maxInflow')) || 10000,
      ],
      activePreset: params.get('preset') || null,
    };
    setFilters(newFilters);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.searchTerm) params.set('search', filters.searchTerm);
    if (filters.selectedSm) params.set('sm', filters.selectedSm);
    if (filters.inflowRange[0] > 0) params.set('minInflow', filters.inflowRange[0]);
    if (filters.inflowRange[1] < 10000) params.set('maxInflow', filters.inflowRange[1]);
    if (filters.activePreset) params.set('preset', filters.activePreset);

    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [filters]);

  const { agents, currentFile, smList, maxInflow } = useMemo(() => {
    if (!selectedFileDate || data.uploadedFiles.length === 0) {
      return { agents: [], currentFile: null, smList: [], maxInflow: 10000 };
    }
    const file = data.uploadedFiles.find(f => f.date === selectedFileDate);
    if (!file || !file.data || !file.data.agents) {
      return { agents: [], currentFile: null, smList: [], maxInflow: 10000 };
    }

    const agentsWithId = file.data.agents.map((agent, index) => ({
      id: `${file.date}-${agent.numero}-${index}`, ...agent,
    }));

    const uniqueSmList = [...new Set(agentsWithId.map(a => a.sm).filter(Boolean))].sort();
    const maxInflowValue = Math.max(...agentsWithId.map(a => a.inflowTotale || 0), 10000);

    let filteredAgents = agentsWithId.filter(agent =>
      agent.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
      (filters.selectedSm === '' || agent.sm === filters.selectedSm) &&
      (agent.inflowTotale || 0) >= filters.inflowRange[0] &&
      (agent.inflowTotale || 0) <= filters.inflowRange[1]
    );

    return { agents: filteredAgents, currentFile: file, smList: uniqueSmList, maxInflow: maxInflowValue };
  }, [data.uploadedFiles, selectedFileDate, filters]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value, activePreset: null }));
  };

  const handlePresetFilter = (preset) => {
    let newFilters = { ...filters, searchTerm: '', selectedSm: '', activePreset: preset };
    switch (preset) {
      case 'top':
        newFilters.inflowRange = [Math.floor(maxInflow * 0.5), maxInflow];
        break;
      case 'underperforming':
        newFilters.inflowRange = [0, Math.floor(maxInflow * 0.1)];
        break;
      case 'new':
        // Questo filtro potrebbe richiedere un campo "nuovo" nell'agent, per ora filtro per inflow basso
        newFilters.inflowRange = [0, 100];
        break;
      default:
        newFilters.inflowRange = [0, maxInflow];
        newFilters.activePreset = null;
    }
    setFilters(newFilters);
  };

  return (
    <div className="agents-container">
      <div className="agents-header">
        <h2>👥 Dettaglio Agenti</h2>
        {/* Period Selector */}
      </div>

      <div className="filters-container">
        <div className="filter-item search-filter">
          <input type="text" placeholder="Cerca per nome..." value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)} className="search-bar" />
        </div>
        <div className="filter-item sm-filter">
          <select value={filters.selectedSm} onChange={(e) => handleFilterChange('selectedSm', e.target.value)} className="sm-selector">
            <option value="">Tutti i Coordinatori</option>
            {smList.map(sm => <option key={sm} value={sm}>{sm}</option>)}
          </select>
        </div>
        <div className="filter-item range-filter">
          <label>Range Inflow</label>
          <Slider value={filters.inflowRange} onChange={(e, val) => handleFilterChange('inflowRange', val)}
            valueLabelDisplay="auto" min={0} max={maxInflow} step={100}
            valueLabelFormat={value => formatCurrency(value)}
          />
        </div>
        <div className="filter-item preset-filters">
           <ButtonGroup variant="outlined" aria-label="outlined button group">
            <Button onClick={() => handlePresetFilter('top')} color={filters.activePreset === 'top' ? 'primary' : 'inherit'}>Top</Button>
            <Button onClick={() => handlePresetFilter('underperforming')} color={filters.activePreset === 'underperforming' ? 'primary' : 'inherit'}>In Difficoltà</Button>
            <Button onClick={() => handlePresetFilter('new')} color={filters.activePreset === 'new' ? 'primary' : 'inherit'}>Nuovi</Button>
            <Button onClick={() => handlePresetFilter(null)}>Reset</Button>
          </ButtonGroup>
        </div>
      </div>

      <div className={`agents-grid ${loading ? 'loading' : ''}`}>
        {agents.length > 0 ? (
          agents.map(agent => <AgentCard key={agent.id} agent={agent} onClick={setSelectedAgent} />)
        ) : (
          <div className="no-data-message">
            <h3>Nessun agente trovato.</h3>
            <p>Prova a modificare i filtri.</p>
          </div>
        )}
      </div>

      {selectedAgent && <AgentModal agent={selectedAgent} allData={data} onClose={() => setSelectedAgent(null)} />}
    </div>
  );
};

export default Agents;
