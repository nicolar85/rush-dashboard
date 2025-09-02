import React from 'react';
import './AgentCard.css';
import { formatCurrency, formatNumber } from '../utils/excelParser';

const AgentCard = ({ agent, onClick }) => {
  // Funzione per ottenere un colore in base alla performance (esempio basato sull'inflow)
  const getPerformanceColor = (inflow) => {
    if (inflow > 1000) return 'performance-green';
    if (inflow > 500) return 'performance-yellow';
    return 'performance-red';
  };

  // Funzione per ottenere le iniziali dell'agente
  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Trova i 2-3 prodotti con il maggior numero di pezzi
  const getTopProducts = (prodotti) => {
    if (!prodotti) return [];

    return Object.entries(prodotti)
      .filter(([key, value]) => key !== 'totalePezzi' && value.pezzi > 0)
      .sort(([, a], [, b]) => b.pezzi - a.pezzi)
      .slice(0, 3)
      .map(([key, value]) => ({
        name: key.replace(/([A-Z])/g, ' $1').trim(), // Aggiunge spazio prima delle maiuscole
        value: value.pezzi
      }));
  };

  const topProducts = getTopProducts(agent.prodotti);
  const performanceClass = getPerformanceColor(agent.inflowTotale);

  return (
    <div className={`agent-card ${performanceClass}`} onClick={() => onClick(agent)}>
      <div className="card-header">
        <div className="agent-avatar">
          <span>{getInitials(agent.nome)}</span>
        </div>
        <div className="agent-info">
          <h3 className="agent-name">{agent.nome}</h3>
          <p className="agent-sm">{agent.sm || 'N/A'}</p>
        </div>
        <div className={`status-indicator ${performanceClass}`}></div>
      </div>

      <div className="card-body">
        <div className="main-stats">
          <div className="stat">
            <span className="stat-label">Fatturato</span>
            <span className="stat-value">{formatCurrency(agent.fatturato?.complessivo || 0)}</span>
          </div>
          <div className="stat highlight">
            <span className="stat-label">Inflow</span>
            <span className="stat-value">{formatCurrency(agent.inflowTotale || 0)}</span>
          </div>
        </div>

        <div className="secondary-stats">
            <div className="stat-small">
                <span className="stat-label-small">Nuovi Clienti</span>
                <span className="stat-value-small">{formatNumber(agent.nuoviClienti) || '0'}</span>
            </div>
            <div className="stat-small">
                <span className="stat-label-small">Fastweb</span>
                <span className="stat-value-small">{formatNumber(agent.fastwebEnergia) || '0'}</span>
            </div>
        </div>
      </div>

      <div className="card-footer">
        <span className="footer-title">Top Prodotti:</span>
        <div className="top-products">
          {topProducts.length > 0 ? (
            topProducts.map(p => (
              <div key={p.name} className="product-badge">
                {p.name}: <strong>{p.value}</strong>
              </div>
            ))
          ) : (
            <p className="no-products">Nessun prodotto</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
