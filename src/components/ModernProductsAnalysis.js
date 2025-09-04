import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import { formatAgentName } from '../utils/formatter';
import './ModernProductsAnalysis.css';
import {
  Package, Smartphone, Globe, Zap, Phone, Award,
  TrendingUp, BarChart3, PieChart, Users, Target,
  Filter, Search, Calendar, ArrowUpRight, ArrowDownRight,
  Wifi, Shield, Star, Activity
} from 'lucide-react';

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

const ModernProductsAnalysis = () => {
  const { data, selectedFileDate } = useData();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('volume');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // cards, table, chart

  // Definizione categorie prodotti con icone e colori
  const productCategories = {
    'mobile': {
      name: 'Telefonia Mobile',
      icon: Smartphone,
      color: 'from-blue-500 to-blue-600',
      products: ['simVoce', 'simDati', 'mnp', 'easyRent']
    },
    'fixed': {
      name: 'Telefonia Fissa',
      icon: Phone,
      color: 'from-green-500 to-green-600',
      products: ['adsl', 'linkOu', 'linkOa', 'linkOaStart', 'interniOa']
    },
    'digital': {
      name: 'Servizi Digitali',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      products: ['sdm', 'ssc', 'yourBackup', 'cloudNas', 'miia', 'easyGdpr']
    },
    'energy': {
      name: 'Energia',
      icon: Zap,
      color: 'from-orange-500 to-orange-600',
      products: ['fastwebEnergia']
    },
    'special': {
      name: 'Prodotti Speciali',
      icon: Award,
      color: 'from-pink-500 to-pink-600',
      products: ['station']
    }
  };

  // Processamento dati prodotti
  const productsData = useMemo(() => {
    if (!selectedFileDate || !data.uploadedFiles?.length) {
      return {};
    }

    const file = data.uploadedFiles.find(f => f.date === selectedFileDate);
    if (!file?.data?.agents) return {};

    const products = {};
    const productMapping = {
      simVoce: 'SIM Voce',
      simDati: 'SIM Dati',
      mnp: 'MNP',
      easyRent: 'Easy Rent',
      adsl: 'ADSL',
      linkOu: 'Link OU',
      linkOa: 'Link OA',
      linkOaStart: 'Link OA Start',
      interniOa: 'Interni OA',
      sdm: 'SDM',
      ssc: 'SSC',
      yourBackup: 'Your Backup',
      cloudNas: 'Cloud NAS',
      miia: 'MIIA',
      easyGdpr: 'Easy GDPR',
      fastwebEnergia: 'Fastweb Energia',
      station: 'Station'
    };

    const revenueKeyMapping = {
      simVoce: 'fatturatoVoce',
      simDati: 'fatturatoDati',
      easyRent: 'fatturatoEasyRent',
      linkOu: 'fatturatoOu',
      linkOa: 'fatturatoOa',
      easyDeal: 'fatturatoEasyDeal',
      altro: 'fatturatoAltro',
      serviziDigitali: 'fatturatoServiziDigitali',
      custom: 'fatturatoCustom',
      sdm: 'fatturatoSdm',
      ssc: 'fatturatoSsc',
      yourBackup: 'fatturatoYourBackup',
      cloudNas: 'fatturatoCloudNas',
      easyGdpr: 'fatturatoEasyGdpr',
      miia: 'fatturatoMiia',
      nuovoCliente: 'fatturatoNuovoCliente'
    };

    // Aggrega dati per prodotto
    Object.keys(productMapping).forEach(key => {
      const revenueKey = revenueKeyMapping[key] || `fatturato${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const agentsWithProduct = file.data.agents
        .map(agent => ({
          nome: agent.nome,
          volume: agent[key] || 0,
          fatturato: agent[revenueKey] || 0
        }))
        .filter(item => item.volume > 0)
        .sort((a, b) => b.volume - a.volume);

      if (agentsWithProduct.length > 0) {
        products[key] = {
          displayName: productMapping[key],
          volume: agentsWithProduct.reduce((sum, item) => sum + item.volume, 0),
          fatturato: agentsWithProduct.reduce((sum, item) => sum + item.fatturato, 0),
          agents: agentsWithProduct.length,
          topAgents: agentsWithProduct.slice(0, 3).map(item => formatAgentName(item.nome))
        };
      }
    });

    return products;
  }, [data, selectedFileDate]);

  // Filtra prodotti per categoria
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return productsData;

    const categoryProducts = productCategories[selectedCategory]?.products || [];
    return Object.fromEntries(
      Object.entries(productsData).filter(([key]) => categoryProducts.includes(key))
    );
  }, [productsData, selectedCategory]);

  // Ordina prodotti
  const sortedProducts = useMemo(() => {
    const entries = Object.entries(filteredProducts);
    return entries.sort(([, a], [, b]) => {
      switch (sortBy) {
        case 'volume': return b.volume - a.volume;
        case 'fatturato': return b.fatturato - a.fatturato;
        case 'agents': return b.agents - a.agents;
        default: return 0;
      }
    });
  }, [filteredProducts, sortBy]);

  // Calcola statistiche totali
  const totalStats = useMemo(() => {
    const products = Object.values(filteredProducts);
    return {
      totalVolume: products.reduce((sum, p) => sum + p.volume, 0),
      totalRevenue: products.reduce((sum, p) => sum + p.fatturato, 0),
      totalProducts: products.length
    };
  }, [filteredProducts]);

  const getProductIcon = (productKey) => {
    for (const [categoryKey, category] of Object.entries(productCategories)) {
      if (category.products.includes(productKey)) {
        return category.icon;
      }
    }
    return Package;
  };

  const getProductColor = (productKey) => {
    for (const [categoryKey, category] of Object.entries(productCategories)) {
      if (category.products.includes(productKey)) {
        return category.color;
      }
    }
    return 'from-gray-500 to-gray-600';
  };

  const getTrendColor = (trend) => {
    if (trend > 5) return 'text-green-600';
    if (trend > 0) return 'text-green-500';
    if (trend > -5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend) => {
    return trend >= 0 ? ArrowUpRight : ArrowDownRight;
  };

  return (
    <div className="modern-products-analysis">
      {/* Header */}
      <div className="products-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="page-title">
              <Package size={32} />
              Analisi Prodotti
            </h1>
            <p className="page-subtitle">
              Performance e trends dei prodotti commerciali
            </p>
          </div>

          <div className="view-controls">
            <div className="view-mode-selector">
              <button
                className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
              >
                <BarChart3 size={16} />
                Cards
              </button>
              <button
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <Activity size={16} />
                Tabella
              </button>
              <button
                className={`view-btn ${viewMode === 'chart' ? 'active' : ''}`}
                onClick={() => setViewMode('chart')}
              >
                <PieChart size={16} />
                Grafici
              </button>
            </div>
          </div>
        </div>

        {/* Statistiche globali */}
        <div className="global-stats">
          <div className="stat-card primary">
            <div className="stat-icon">
              <Package size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{totalStats.totalProducts}</span>
              <span className="stat-label">Prodotti Attivi</span>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">
              <Target size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatNumber(totalStats.totalVolume)}</span>
              <span className="stat-label">Volume Totale</span>
            </div>
          </div>

          <div className="stat-card accent">
            <div className="stat-icon">
              <TrendingUp size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(totalStats.totalRevenue)}</span>
              <span className="stat-label">Fatturato Prodotti</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtri e controlli */}
      <div className="controls-section">
        <div className="category-filters">
          <span className="filter-label">
            <Filter size={16} />
            Categorie:
          </span>
          <div className="category-buttons">
            <button
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <Package size={16} />
              Tutti
            </button>
            {Object.entries(productCategories).map(([key, category]) => {
              const Icon = category.icon;
              return (
                <button
                  key={key}
                  className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(key)}
                >
                  <Icon size={16} />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sort-controls">
          <span className="sort-label">Ordina per:</span>
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortBy === 'volume' ? 'active' : ''}`}
              onClick={() => setSortBy('volume')}
            >
              Volume
            </button>
            <button
              className={`sort-btn ${sortBy === 'fatturato' ? 'active' : ''}`}
              onClick={() => setSortBy('fatturato')}
            >
              Fatturato
            </button>
            <button
              className={`sort-btn ${sortBy === 'agents' ? 'active' : ''}`}
              onClick={() => setSortBy('agents')}
            >
              Agenti
            </button>
          </div>
        </div>
      </div>

      {/* Contenuto principale - Cards View */}
      {viewMode === 'cards' && (
        <div className="products-grid">
          {sortedProducts.length > 0 ? (
            sortedProducts.map(([productKey, product]) => {
              const Icon = getProductIcon(productKey);

              return (
                <div
                  key={productKey}
                  className="product-card"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="product-header">
                    <div className={`product-icon bg-gradient-to-br ${getProductColor(productKey)}`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">
                        {product.displayName || productKey}
                      </h3>
                      <div className="product-meta">
                        <span className="agents-count">
                          <Users size={14} />
                          {product.agents} agenti
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="product-metrics">
                    <div className="metric-row">
                      <div className="metric-item">
                        <span className="metric-label">Volume</span>
                        <span className="metric-value volume">
                          {formatNumber(product.volume)}
                        </span>
                      </div>
                      {product.fatturato > 0 && (
                        <div className="metric-item">
                          <span className="metric-label">Fatturato</span>
                          <span className="metric-value revenue">
                            {formatCurrency(product.fatturato)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="top-agents">
                    <span className="top-agents-label">🏆 Top Performer:</span>
                    <div className="agents-list">
                      {product.topAgents.slice(0, 2).map((agent, index) => (
                        <span key={agent} className={`agent-badge ${index === 0 ? 'gold' : 'silver'}`}>
                          {index === 0 && '🥇'} {agent.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-products">
              <Package size={48} className="opacity-30" />
              <h3>Nessun prodotto trovato</h3>
              <p>Modifica i filtri o carica nuovi dati per visualizzare i prodotti.</p>
            </div>
          )}
        </div>
      )}

      {/* Contenuto principale - Table View */}
      {viewMode === 'table' && (
        <div className="products-table-container">
          <div className="table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Prodotto</th>
                  <th>Volume</th>
                  <th>Fatturato</th>
                  <th>Agenti</th>
                  <th>Top Performer</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map(([productKey, product], index) => {
                  const Icon = getProductIcon(productKey);
                  return (
                    <tr key={productKey} className="product-row">
                      <td className="product-cell">
                        <div className="product-info-table">
                          <div className={`product-icon-small bg-gradient-to-br ${getProductColor(productKey)}`}>
                            <Icon size={16} className="text-white" />
                          </div>
                          <span className="product-name-table">
                            {product.displayName || productKey}
                          </span>
                        </div>
                      </td>
                      <td className="volume-cell">
                        {formatNumber(product.volume)}
                      </td>
                      <td className="revenue-cell">
                        {product.fatturato > 0 ? formatCurrency(product.fatturato) : '-'}
                      </td>
                      <td className="agents-cell">
                        {product.agents}
                      </td>
                      <td className="top-agent-cell">
                        {product.topAgents[0]?.split(' ')[0] || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contenuto principale - Chart View */}
      {viewMode === 'chart' && (
        <div className="charts-container">
          <div className="chart-placeholder">
            <PieChart size={64} className="opacity-30" />
            <h3>Grafici in Sviluppo</h3>
            <p>I grafici interattivi saranno disponibili nella prossima versione.</p>
            <p>Per ora utilizza la vista Cards o Tabella per analizzare i dati.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default ModernProductsAnalysis;
