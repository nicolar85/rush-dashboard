import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import { formatAgentName } from '../utils/formatter';
import './ModernProductsAnalysis.css';

// Import per i grafici Recharts
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

// Import icone esistenti + nuove
import {
  Package, Smartphone, Globe, Zap, Phone, Award,
  TrendingUp, BarChart3, PieChart, Users, Target,
  Filter, ArrowUpRight, ArrowDownRight,
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
  const [viewMode, setViewMode] = useState('cards'); // cards, table, chart

  // Aggiungi questi stati al componente
  const [chartType, setChartType] = useState('pie'); // pie, bar, line, area
  const [chartMetric, setChartMetric] = useState('fatturato'); // fatturato, volume, agents

  // Colori per i grafici
  const CHART_COLORS = [
    '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#6366f1', '#84cc16', '#f97316', '#ec4899', '#14b8a6'
  ];

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
    let agents = null;
    const file = data.uploadedFiles.find(f => f.date === selectedFileDate);
    if (file?.data?.agents) {
      agents = file.data.agents;
    }
    else if (data.processedData && data.processedData[selectedFileDate]?.agents) {
      agents = data.processedData[selectedFileDate].agents;
    }
    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      return {};
    }
    const products = {};
    const productMapping = {
      simVoce: 'SIM Voce', simDati: 'SIM Dati', mnp: 'MNP', easyRent: 'Easy Rent', adsl: 'ADSL', linkOu: 'Link OU', linkOa: 'Link OA', linkOaStart: 'Link OA Start', interniOa: 'Interni OA', sdm: 'SDM', ssc: 'SSC', yourBackup: 'Your Backup', cloudNas: 'Cloud NAS', miia: 'MIIA', easyGdpr: 'Easy GDPR', fastwebEnergia: 'Fastweb Energia', station: 'Station'
    };
    const revenueKeyMapping = {
      simVoce: 'fatturatoVoce', simDati: 'fatturatoDati', easyRent: 'fatturatoEasyRent', linkOu: 'fatturatoOu', linkOa: 'fatturatoOa', easyDeal: 'fatturatoEasyDeal', altro: 'fatturatoAltro', serviziDigitali: 'fatturatoServiziDigitali', custom: 'fatturatoCustom', sdm: 'fatturatoSdm', ssc: 'fatturatoSsc', yourBackup: 'fatturatoYourBackup', cloudNas: 'fatturatoCloudNas', easyGdpr: 'fatturatoEasyGdpr', miia: 'fatturatoMiia', nuovoCliente: 'fatturatoNuovoCliente'
    };
    Object.keys(productMapping).forEach(key => {
      const revenueKey = revenueKeyMapping[key] || `fatturato${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const agentsWithProduct = agents
        .filter(agent => agent && typeof agent === 'object')
        .map(agent => ({
          nome: agent.nome || 'N/A',
          volume: Number(agent[key]) || 0,
          fatturato: Number(agent[revenueKey]) || 0
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
  }, [productsData, selectedCategory, productCategories]);

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

  // Helper functions
  const getProductIcon = (productName) => {
    const iconMap = {
      simVoce: Smartphone, simDati: Globe, mnp: Zap, easyRent: Phone, adsl: Wifi, linkOu: Shield, linkOa: Star,
    };
    return iconMap[productName] || Package;
  };

  const getProductColor = (productName) => {
    const colorMap = {
      simVoce: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', simDati: 'linear-gradient(135deg, #06b6d4, #0891b2)', mnp: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', easyRent: 'linear-gradient(135deg, #10b981, #059669)', adsl: 'linear-gradient(135deg, #f59e0b, #d97706)', linkOu: 'linear-gradient(135deg, #ef4444, #dc2626)', linkOa: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    };
    return colorMap[productName] || 'linear-gradient(135deg, #64748b, #475569)';
  };

  const getProductDisplayName = (productName) => {
    const nameMap = {
      simVoce: 'SIM Voce', simDati: 'SIM Dati', mnp: 'Portabilità', easyRent: 'Easy Rent', adsl: 'ADSL', linkOu: 'Link OU', linkOa: 'Link OA', linkOaStart: 'Link OA Start', interniOa: 'Interni OA',
    };
    return nameMap[productName] || productName;
  };

  const filteredProductsArray = useMemo(() => {
    return Object.entries(filteredProducts).map(([name, productData]) => ({
      name,
      ...productData
    }));
  }, [filteredProducts]);

  const chartData = useMemo(() => {
    if (!filteredProductsArray || !Array.isArray(filteredProductsArray) || filteredProductsArray.length === 0) return [];
    try {
      return filteredProductsArray
        .filter(product => product && product.name && typeof product === 'object' && product.name !== null && product.name !== undefined && product.name !== '')
        .map(product => {
          try {
            let value = 0;
            if (chartMetric === 'fatturato') value = Number(product.fatturato) || 0;
            else if (chartMetric === 'volume') value = Number(product.volume) || 0;
            else if (chartMetric === 'agents') value = Number(product.agents) || 0;
            const displayName = getProductDisplayName(product.name);
            if (!displayName) return null;
            return {
              name: String(displayName),
              value: Math.max(0, Number(value) || 0),
              originalName: product.name
            };
          } catch (error) { return null; }
        })
        .filter(item => item && item.value > 0 && typeof item.name === 'string' && typeof item.value === 'number' && !isNaN(item.value))
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    } catch (error) { return []; }
  }, [filteredProductsArray, chartMetric]);

  return (
    <div className="modern-products-analysis">
      {/* Header, Stats, Filters, Cards, and Table views remain the same */}
      <div className="products-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="page-title"><Package size={32} />Analisi Prodotti</h1>
            <p className="page-subtitle">Performance e trends dei prodotti commerciali</p>
          </div>
          <div className="view-controls">
            <div className="view-mode-selector">
              <button className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}><BarChart3 size={16} />Cards</button>
              <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><Activity size={16} />Tabella</button>
              <button className={`view-btn ${viewMode === 'chart' ? 'active' : ''}`} onClick={() => setViewMode('chart')}><PieChart size={16} />Grafici</button>
            </div>
          </div>
        </div>
        <div className="global-stats">
          <div className="stat-card primary"><div className="stat-icon"><Package size={28} /></div><div className="stat-content"><span className="stat-value">{totalStats.totalProducts}</span><span className="stat-label">Prodotti Attivi</span></div></div>
          <div className="stat-card success"><div className="stat-icon"><Target size={28} /></div><div className="stat-content"><span className="stat-value">{formatNumber(totalStats.totalVolume)}</span><span className="stat-label">Volume Totale</span></div></div>
          <div className="stat-card accent"><div className="stat-icon"><TrendingUp size={28} /></div><div className="stat-content"><span className="stat-value">{formatCurrency(totalStats.totalRevenue)}</span><span className="stat-label">Fatturato Prodotti</span></div></div>
        </div>
      </div>
      <div className="controls-section">
        <div className="category-filters">
          <span className="filter-label"><Filter size={16} />Categorie:</span>
          <div className="category-buttons">
            <button className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}><Package size={16} />Tutti</button>
            {Object.entries(productCategories).map(([key, category]) => {
              const Icon = category.icon;
              return (<button key={key} className={`category-btn ${selectedCategory === key ? 'active' : ''}`} onClick={() => setSelectedCategory(key)}><Icon size={16} />{category.name}</button>);
            })}
          </div>
        </div>
        <div className="sort-controls">
          <span className="sort-label">Ordina per:</span>
          <div className="sort-buttons">
            <button className={`sort-btn ${sortBy === 'volume' ? 'active' : ''}`} onClick={() => setSortBy('volume')}>Volume</button>
            <button className={`sort-btn ${sortBy === 'fatturato' ? 'active' : ''}`} onClick={() => setSortBy('fatturato')}>Fatturato</button>
            <button className={`sort-btn ${sortBy === 'agents' ? 'active' : ''}`} onClick={() => setSortBy('agents')}>Agenti</button>
          </div>
        </div>
      </div>
      {viewMode === 'cards' && (
        <div className="products-grid">
          {sortedProducts.length > 0 ? (
            sortedProducts.map(([productKey, product]) => {
              const Icon = getProductIcon(productKey);
              return (
                <div key={productKey} className="product-card">
                  <div className="product-header"><div className="product-icon" style={{ background: getProductColor(productKey) }}><Icon size={24} className="text-white" /></div><div className="product-info"><h3 className="product-name">{product.displayName || productKey}</h3><div className="product-meta"><span className="agents-count"><Users size={14} />{product.agents} agenti</span></div></div></div>
                  <div className="product-metrics"><div className="metric-row"><div className="metric-item"><span className="metric-label">Volume</span><span className="metric-value volume">{formatNumber(product.volume)}</span></div>{product.fatturato > 0 && (<div className="metric-item"><span className="metric-label">Fatturato</span><span className="metric-value revenue">{formatCurrency(product.fatturato)}</span></div>)}</div></div>
                  <div className="top-agents"><span className="top-agents-label">Top Performer:</span><div className="agents-list">{product.topAgents.slice(0, 2).map((agent, index) => (<span key={agent} className={`agent-badge ${index === 0 ? 'gold' : 'silver'}`}>{index === 0 && '🥇'} {agent.split(' ')[0]}</span>))}</div></div>
                </div>);
            })
          ) : (<div className="no-products"><Package size={48} className="opacity-30" /><h3>Nessun prodotto trovato</h3><p>Modifica i filtri o carica nuovi dati per visualizzare i prodotti.</p></div>)}
        </div>
      )}
      {viewMode === 'table' && (
        <div className="products-table-container">
          <div className="table-wrapper">
            <table className="products-table">
              <thead><tr><th>Prodotto</th><th>Volume</th><th>Fatturato</th><th>Agenti</th><th>Top Performer</th></tr></thead>
              <tbody>
                {sortedProducts.map(([productKey, product], index) => {
                  const Icon = getProductIcon(productKey);
                  return (
                    <tr key={productKey} className="product-row">
                      <td className="product-cell"><div className="product-info-table"><div className="product-icon-small" style={{ background: getProductColor(productKey) }}><Icon size={16} className="text-white" /></div><span className="product-name-table">{product.displayName || productKey}</span></div></td>
                      <td className="volume-cell">{formatNumber(product.volume)}</td>
                      <td className="revenue-cell">{product.fatturato > 0 ? formatCurrency(product.fatturato) : '-'}</td>
                      <td className="agents-cell">{product.agents}</td>
                      <td className="top-agent-cell">{product.topAgents[0]?.split(' ')[0] || '-'}</td>
                    </tr>);
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production-ready Chart View */}
      {viewMode === 'chart' && (
      <div className="charts-container-real">
        <div className="chart-controls">
          <div className="chart-type-selector">
            <label>Tipo Grafico:</label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="pie">Grafico a Torta</option>
              <option value="bar">Grafico a Barre</option>
              <option value="line">Grafico Lineare</option>
              <option value="area">Grafico ad Area</option>
            </select>
          </div>
          <div className="chart-metric-selector">
            <label>Metrica:</label>
            <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value)}>
              <option value="fatturato">Fatturato</option>
              <option value="volume">Volume</option>
              <option value="agents">N° Agenti</option>
            </select>
          </div>
        </div>

        {!chartData || chartData.length === 0 ? (
          <div className="no-chart-data">
            <Package size={48} className="opacity-30" />
            <h3>⚠️ NESSUN DATO PER I GRAFICI</h3>
            <p>Prova a cambiare file, filtri, o controlla che i dati siano stati caricati correttamente.</p>
          </div>
        ) : (
          <div className="charts-grid">
            <div className="main-chart-card">
              <div className="chart-header">
                <h3>Distribuzione per {chartMetric}</h3>
              </div>
              <div className="chart-wrapper" style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  { chartType === 'pie' ? (
                    <RechartsPieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}>
                        {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </RechartsPieChart>
                  ) : chartType === 'bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" height={80} interval={0} fontSize={10} />
                      <YAxis tickFormatter={(value) => formatNumber(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="value">
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatNumber(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} />
                    </LineChart>
                  ) : ( // Area Chart
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatNumber(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.3} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
    </div>
  );
};

export default ModernProductsAnalysis;
