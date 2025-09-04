import React from 'react';
import { formatCurrency } from '../utils/excelParser';
import { DollarSign, TrendingUp, Award, User, Package } from 'lucide-react';
import './AgentCard.css';
import { formatAgentName } from '../utils/formatter';

const AgentCard = ({ agent, onClick }) => {
  // Determina la classe di performance basata sul fatturato rush
  const getPerformanceClass = (fatturatoRush) => {
    if (fatturatoRush > 1000) return 'performance-high';
    if (fatturatoRush > 500) return 'performance-medium';
    return 'performance-low';
  };

  // Trova i 2-3 prodotti con il maggior numero di pezzi
  const getTopProducts = (agentData) => {
    const productFields = ['simVoce', 'simDati', 'mnp', 'easyRent', 'adsl', 'linkOu', 'linkOa', 'sdm', 'ssc', 'yourBackup', 'cloudNas', 'miia', 'easyGdpr'];
    return productFields
      .map(key => ({ name: key, value: agentData[key] || 0 }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(p => ({
        name: p.name.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        value: p.value
      }));
  };

  const topProducts = getTopProducts(agent);
  const performanceClass = getPerformanceClass(agent.fatturatoRush);

  const Stat = ({ icon, label, value }) => (
    <div className="stat-item-modern">
      <div className="stat-icon-modern">{icon}</div>
      <div className="stat-content-modern">
        <span className="label">{label}</span>
        <span className="value">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="agent-card-modern" onClick={() => onClick(agent)}>
      {/* Header Moderno */}
      <div className={`card-header-modern ${performanceClass}`}>
        <div className="avatar-modern">
          <User size={24} />
        </div>
        <div className="info-modern">
          <h3 className="name-modern">{agent.nome}</h3>
          <p className="sm-modern">{agent.sm ? formatAgentName(agent.sm) : 'N/A'}</p>
        </div>
      </div>

      {/* Corpo Moderno */}
      <div className="card-body-modern">
        <div className="stats-grid-modern">
          <Stat 
            icon={<DollarSign size={20} />} 
            label="Fatturato" 
            value={formatCurrency(agent.fatturato?.complessivo || 0)} 
          />
          <Stat 
            icon={<TrendingUp size={20} />} 
            label="Rush" 
            value={formatCurrency(agent.fatturatoRush || 0)} 
          />
          <Stat 
            icon={<Award size={20} />} 
            label="Bonus" 
            value={formatCurrency(agent.bonusRisultati || 0)} 
          />
        </div>
      </div>

      {/* Footer Moderno */}
      <div className="card-footer-modern">
        <h4 className="footer-title-modern">
          <Package size={16} />
          Top Prodotti
        </h4>
        <div className="products-container-modern">
          {topProducts.length > 0 ? (
            topProducts.map(p => (
              <div key={p.name} className="product-badge-modern">
                {p.name}: <strong>{p.value}</strong>
              </div>
            ))
          ) : (
            <p className="no-products-modern">Nessun prodotto di punta</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
