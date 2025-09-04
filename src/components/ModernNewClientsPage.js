import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import { formatAgentName } from '../utils/formatter';
import { formatCurrency, formatNumber } from '../utils/excelParser';
import './ModernNewClientsPage.css';
import { UserPlus, RefreshCw, Search, Filter, Users, ArrowUp, ArrowDown, Trophy, BarChart, DollarSign, Briefcase, Building, Handshake, TrendingUp } from 'lucide-react';

const getPerformanceLevel = (clientCount) => {
    if (clientCount >= 5) return 'high';
    if (clientCount >= 2) return 'medium';
    return 'low';
};

const NewClientAgentCard = ({ agent }) => {
    const performance = getPerformanceLevel(agent.nuovoCliente);
    const avatarName = agent.nome.split(' ').map(n => n[0]).join('').substring(0, 2);

    return (
        <div className={`new-client-card ${performance}`}>
            <div className={`card-header ${performance}`}>
                <div className="avatar">{avatarName}</div>
                <div className="agent-info">
                    <h3 className="agent-name">{agent.nome}</h3>
                    <p className="agent-sm">{agent.sm}</p>
                </div>
                <div className="performance-badge">
                    <span className="new-clients-count">{formatNumber(agent.nuovoCliente)}</span>
                    <UserPlus size={20} />
                </div>
            </div>
            <div className="card-body">
                <div className="stats-grid">
                    <div className="stat-item highlight">
                        <div className="stat-icon"><DollarSign size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Fatturato Nuovi Clienti</span>
                            <span className="stat-value primary">{formatCurrency(agent.fatturatoNuovoCliente)}</span>
                        </div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-icon"><TrendingUp size={20} /></div>
                        <div className="stat-content">
                            <span className="stat-label">Fatturato Rush</span>
                            <span className="stat-value">{formatCurrency(agent.fatturatoRush)}</span>
                        </div>
                    </div>
                </div>
                {/* Placeholder for acquisition channels as data is not available */}
                <div className="acquisition-channels">
                    <h5>Canali Acquisizione</h5>
                    <div className="channels-grid">
                        <div className="channel-item">
                            <span className="channel-name">Diretto</span>
                            <span className="channel-value">-</span>
                        </div>
                        <div className="channel-item">
                            <span className="channel-name">Referral</span>
                            <span className="channel-value">-</span>
                        </div>
                         <div className="channel-item">
                            <span className="channel-name">Altro</span>
                            <span className="channel-value">-</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-footer">
                <div className="performance-indicator">
                    <div className={`indicator-dot ${performance}`}></div>
                    <span className="performance-text">Performance: {performance.charAt(0).toUpperCase() + performance.slice(1)}</span>
                </div>
            </div>
        </div>
    );
};


const PerformerCard = ({ agent, rank }) => {
    const rankClass = `rank-${rank}`;
    return (
        <div className={`performer-card ${rankClass}`}>
            <div className="performer-rank">{rank}</div>
            <div className="performer-info">
                <h4>{agent.nome}</h4>
                <p className="performer-sm">{agent.sm}</p>
            </div>
            <div className="performer-stats">
                <div className="stat-item">
                    <UserPlus size={16} /> <strong>{formatNumber(agent.nuovoCliente)}</strong> Clienti
                </div>
                <div className="stat-item primary">
                    <DollarSign size={16} /> <strong>{formatCurrency(agent.fatturatoNuovoCliente)}</strong> Fatturato
                </div>
            </div>
        </div>
    );
};


const ModernNewClientsPage = () => {
    const { data, selectedFileDate, loadFiles, globalLoading } = useData();
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState({ searchTerm: '', selectedSm: '' });
    const [sort, setSort] = useState({ by: 'nuovoCliente', order: 'desc' });

    const { agents, smList, stats, topPerformers, allAgentsInPeriod } = useMemo(() => {
        const emptyState = { agents: [], smList: [], stats: { totalClients: 0, totalRevenue: 0, avgClientsPerAgent: 0, topSm: { name: 'N/A', clients: 0 } }, topPerformers: [], allAgentsInPeriod: [] };
        if (!selectedFileDate || !data.uploadedFiles || data.uploadedFiles.length === 0) return emptyState;

        const file = data.uploadedFiles.find(f => f.date === selectedFileDate);
        if (!file || !file.data || !file.data.agents) return emptyState;

        const allAgents = file.data.agents.map((agent, index) => ({ ...agent, id: `${file.date}-${agent.nome}-${index}`, nome: formatAgentName(agent.nome) }));
        const uniqueSmList = [...new Set(allAgents.map(a => a.sm).filter(Boolean))].sort();

        let filteredAgents = allAgents.filter(agent =>
            agent.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
            (filters.selectedSm === '' || agent.sm === filters.selectedSm)
        );

        filteredAgents.sort((a, b) => {
            const valA = a[sort.by] || 0;
            const valB = b[sort.by] || 0;
            return sort.order === 'asc' ? valA - valB : valB - valA;
        });

        const totalClients = filteredAgents.reduce((sum, agent) => sum + (agent.nuovoCliente || 0), 0);
        const totalRevenue = filteredAgents.reduce((sum, agent) => sum + (agent.fatturatoNuovoCliente || 0), 0);
        const avgClientsPerAgent = filteredAgents.length > 0 ? totalClients / filteredAgents.length : 0;

        const smPerformance = allAgents.reduce((acc, agent) => {
            acc[agent.sm] = (acc[agent.sm] || 0) + (agent.nuovoCliente || 0);
            return acc;
        }, {});
        const topSmEntry = Object.entries(smPerformance).sort((a, b) => b[1] - a[1])[0];
        const topSm = topSmEntry ? { name: topSmEntry[0], clients: topSmEntry[1] } : { name: 'N/A', clients: 0 };

        const topPerformers = [...allAgents].filter(a => a.nuovoCliente > 0).sort((a, b) => (b.nuovoCliente || 0) - (a.nuovoCliente || 0)).slice(0, 3);

        return { agents: filteredAgents, smList: uniqueSmList, stats: { totalClients, totalRevenue, avgClientsPerAgent, topSm }, topPerformers, allAgentsInPeriod: allAgents };
    }, [data.uploadedFiles, selectedFileDate, filters, sort]);

    const handleFilterChange = (name, value) => setFilters(prev => ({ ...prev, [name]: value }));
    const handleSortChange = (newSortBy) => setSort(prev => ({ ...prev, by: newSortBy, order: prev.by === newSortBy && prev.order === 'desc' ? 'asc' : 'desc' }));
    const handleRefresh = async () => { setRefreshing(true); await loadFiles(); setRefreshing(false); };
    const resetFilters = () => { setFilters({ searchTerm: '', selectedSm: '' }); setSort({ by: 'nuovoCliente', order: 'desc' }); };

    if (globalLoading && !stats.totalClients) {
        return <div className="modern-new-clients-loading"><div className="loading-spinner"></div><p>Analizzando i dati di acquisizione...</p></div>;
    }
    if (!selectedFileDate || !data.processedData[selectedFileDate]) {
        return <div className="modern-new-clients-loading"><h3>Nessun file selezionato</h3><p>Per favore, vai alla sezione "Gestione File" e seleziona un periodo da analizzare.</p></div>;
    }

    return (
        <div className="modern-new-clients-container">
            <div className="page-header">
                <div className="header-content">
                    <div className="header-text">
                        <h1 className="page-title"><UserPlus size={32} /> Acquisizione Nuovi Clienti</h1>
                        <p className="page-subtitle">Analisi delle performance di acquisizione della rete vendita.</p>
                    </div>
                    <button className={`refresh-btn ${refreshing || globalLoading ? 'refreshing' : ''}`} onClick={handleRefresh} disabled={refreshing || globalLoading}>
                        <RefreshCw size={20} /> {refreshing || globalLoading ? 'Aggiornamento...' : 'Aggiorna Dati'}
                    </button>
                </div>
                <div className="header-stats">
                    <div className="stat-card primary"><div className="stat-icon"><Handshake size={24} /></div><div className="stat-content"><span className="stat-value">{formatNumber(stats.totalClients)}</span><span className="stat-label">Clienti Acquisiti</span></div></div>
                    <div className="stat-card success"><div className="stat-icon"><DollarSign size={24} /></div><div className="stat-content"><span className="stat-value">{formatCurrency(stats.totalRevenue)}</span><span className="stat-label">Fatturato da Nuovi Clienti</span></div></div>
                    <div className="stat-card accent"><div className="stat-icon"><BarChart size={24} /></div><div className="stat-content"><span className="stat-value">{stats.avgClientsPerAgent.toFixed(1)}</span><span className="stat-label">Media Clienti / Agente</span></div></div>
                    <div className="stat-card info"><div className="stat-icon"><Building size={24} /></div><div className="stat-content"><span className="stat-value">{formatAgentName(stats.topSm.name)}</span><span className="stat-label">Top Coordinatore ({formatNumber(stats.topSm.clients)} clienti)</span></div></div>
                </div>
            </div>

            {topPerformers.length > 0 && (
                <div className="top-performers-section">
                    <h2 className="section-title"><Trophy size={24}/> Top Performers</h2>
                    <div className="performers-grid">
                        {topPerformers.map((agent, index) => <PerformerCard key={agent.id} agent={agent} rank={index + 1} />)}
                    </div>
                </div>
            )}

            <div className="filters-modern">
                <div className="filters-header">
                    <div className="filters-title"><Filter size={20} />Filtri Agenti</div>
                    <div className="results-count">{agents.length} di {allAgentsInPeriod.length} agenti</div>
                </div>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label className="filter-label"><Search size={16} /> Cerca Agente</label>
                        <input type="text" placeholder="Nome agente..." value={filters.searchTerm} onChange={(e) => handleFilterChange('searchTerm', e.target.value)} className="modern-search-input" />
                    </div>
                    <div className="filter-group">
                        <label className="filter-label"><Users size={16} /> Filtra per Coordinatore</label>
                        <select value={filters.selectedSm} onChange={(e) => handleFilterChange('selectedSm', e.target.value)} className="modern-select">
                            <option value="">Tutti i Coordinatori</option>
                            {smList.map(sm => <option key={sm} value={sm}>{sm}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Ordina Per</label>
                        <div className="sort-controls">
                            <select value={sort.by} onChange={(e) => handleSortChange(e.target.value)} className="modern-select">
                                <option value="nuovoCliente">Nuovi Clienti</option>
                                <option value="fatturatoNuovoCliente">Fatturato NC</option>
                                <option value="fatturatoRush">Fatturato Rush</option>
                            </select>
                            <button className="sort-order-btn" onClick={() => handleSortChange(sort.by)}>
                                {sort.order === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                            </button>
                        </div>
                    </div>
                     <div className="filter-group">
                        <label className="filter-label">&nbsp;</label>
                        <button className="reset-filters-btn" onClick={resetFilters}>Reset Filtri</button>
                    </div>
                </div>
            </div>

            <div className="agents-section">
                 <h2 className="section-title"><Briefcase size={24}/> Dettaglio Agenti</h2>
                <div className={`agents-grid-modern ${globalLoading ? 'loading' : ''}`}>
                    {agents.length > 0 ? (
                        agents.map(agent => <NewClientAgentCard key={agent.id} agent={agent} />)
                    ) : (
                        <div className="no-results-modern">
                            <div className="no-results-icon"><Search size={48} /></div>
                            <h3>Nessun agente trovato</h3>
                            <p>Prova a modificare i filtri per visualizzare più risultati.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModernNewClientsPage;
