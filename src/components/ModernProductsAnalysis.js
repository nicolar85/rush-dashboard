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
  // 🔧 FIX: Controlla prima che ci siano dati
  if (!selectedFileDate || !data.uploadedFiles?.length) {
    console.log('ModernProductsAnalysis: Nessun file selezionato o caricato');
    return {};
  }

  // 🔧 FIX: Prova prima uploadedFiles (nuovo formato), poi processedData (vecchio formato)
  let agents = null;

  // Nuovo formato: cerca in uploadedFiles
  const file = data.uploadedFiles.find(f => f.date === selectedFileDate);
  if (file?.data?.agents) {
    agents = file.data.agents;
    console.log(`ModernProductsAnalysis: Trovati ${agents.length} agenti in uploadedFiles`);
  }
  // Fallback: cerca in processedData (compatibilità vecchi dati)
  else if (data.processedData[selectedFileDate]?.agents) {
    agents = data.processedData[selectedFileDate].agents;
    console.log(`ModernProductsAnalysis: Trovati ${agents.length} agenti in processedData`);
  }

  // 🔧 FIX: Se non ci sono agenti, ritorna oggetto vuoto
  if (!agents || !Array.isArray(agents) || agents.length === 0) {
    console.log('ModernProductsAnalysis: Nessun agente trovato');
    return {};
  }

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

    // 🔧 FIX: Filtra agenti validi prima di processarli
    const agentsWithProduct = agents
      .filter(agent => agent && typeof agent === 'object') // Filtra agenti validi
      .map(agent => ({
        nome: agent.nome || 'N/A',
        volume: Number(agent[key]) || 0, // Forza conversione a numero
        fatturato: Number(agent[revenueKey]) || 0 // Forza conversione a numero
      }))
      .filter(item => item.volume > 0) // Solo agenti con volume > 0
      .sort((a, b) => b.volume - a.volume);

    // 🔧 FIX: Aggiungi prodotto solo se ha agenti validi
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

  console.log(`ModernProductsAnalysis: Elaborati ${Object.keys(products).length} prodotti`, products);
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

  // Helper function per ottenere l'icona del prodotto
  const getProductIcon = (productName) => {
    const iconMap = {
      simVoce: Smartphone,
      simDati: Globe,
      mnp: Zap,
      easyRent: Phone,
      adsl: Wifi,
      linkOu: Shield,
      linkOa: Star,
      // Aggiungi altri prodotti secondo necessità
    };
    return iconMap[productName] || Package;
  };

  // Helper function per ottenere il colore del prodotto
  const getProductColor = (productName) => {
    const colorMap = {
      simVoce: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      simDati: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      mnp: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      easyRent: 'linear-gradient(135deg, #10b981, #059669)',
      adsl: 'linear-gradient(135deg, #f59e0b, #d97706)',
      linkOu: 'linear-gradient(135deg, #ef4444, #dc2626)',
      linkOa: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      // Aggiungi altri prodotti secondo necessità
    };
    return colorMap[productName] || 'linear-gradient(135deg, #64748b, #475569)';
  };

  // Helper function per nomi display dei prodotti
  const getProductDisplayName = (productName) => {
    const nameMap = {
      simVoce: 'SIM Voce',
      simDati: 'SIM Dati',
      mnp: 'Portabilità',
      easyRent: 'Easy Rent',
      adsl: 'ADSL',
      linkOu: 'Link OU',
      linkOa: 'Link OA',
      linkOaStart: 'Link OA Start',
      interniOa: 'Interni OA',
      // Aggiungi altri prodotti secondo necessità
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
  console.log('chartData useMemo - Inizio elaborazione...');

  // 🔧 FIX: Controllo sicurezza sui dati
  if (!filteredProductsArray || !Array.isArray(filteredProductsArray) || filteredProductsArray.length === 0) {
    console.log('ModernProductsAnalysis: chartData - Nessun prodotto filtrato disponibile');
    return [];
  }

  try {
    const data = filteredProductsArray
      .filter(product => {
        // 🔧 FIX: Controllo più rigoroso
        const isValid = product &&
                       product.name &&
                       typeof product === 'object' &&
                       product.name !== null &&
                       product.name !== undefined &&
                       product.name !== '';

        if (!isValid) {
          console.warn('Prodotto non valido filtrato:', product);
        }
        return isValid;
      })
      .map(product => {
        try {
          // 🔧 FIX: Gestione sicura dei valori con controlli aggiuntivi
          let value = 0;

          if (chartMetric === 'fatturato') {
            value = Number(product.fatturato) || 0;
          } else if (chartMetric === 'volume') {
            value = Number(product.volume) || 0;
          } else if (chartMetric === 'agents') {
            value = Number(product.agents) || 0;
          }

          // 🔧 FIX: Assicurati che name sia una stringa valida
          const displayName = getProductDisplayName(product.name);

          if (!displayName || displayName === null || displayName === undefined) {
            console.warn('Nome prodotto non valido:', product.name);
            return null; // Questo sarà filtrato dopo
          }

          return {
            name: String(displayName), // Forza stringa
            value: Math.max(0, Number(value) || 0), // Forza numero positivo
            originalName: product.name // Mantieni riferimento originale per debug
          };
        } catch (error) {
          console.error('Errore nella mappatura del prodotto:', product, error);
          return null; // Questo sarà filtrato dopo
        }
      })
      .filter(item => {
        // 🔧 FIX: Rimuovi elementi null e con valore 0
        const isValid = item !== null &&
                       item !== undefined &&
                       item.name &&
                       item.value > 0 &&
                       typeof item.name === 'string' &&
                       typeof item.value === 'number' &&
                       !isNaN(item.value);

        if (!isValid && item) {
          console.warn('Item non valido filtrato dal chartData:', item);
        }

        return isValid;
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    console.log(`ModernProductsAnalysis: chartData generato per ${chartMetric}:`, data);

    // 🔧 FIX: Controllo finale che tutti gli elementi siano validi
    const validatedData = data.every(item =>
      item &&
      item.name &&
      typeof item.name === 'string' &&
      typeof item.value === 'number' &&
      !isNaN(item.value)
    );

    if (!validatedData) {
      console.error('chartData contiene elementi non validi!', data);
      return []; // Ritorna array vuoto in caso di errore
    }

    return data;
  } catch (error) {
    console.error('Errore grave nella creazione di chartData:', error);
    return []; // Fallback sicuro
  }
}, [filteredProductsArray, chartMetric]);

// 🔧 FIX: Rimuovi la doppia definizione di topProducts e usa solo questa:
const topProducts = useMemo(() => {
  if (!filteredProductsArray || !Array.isArray(filteredProductsArray) || filteredProductsArray.length === 0) {
    console.log('ModernProductsAnalysis: topProducts - Nessun prodotto disponibile');
    return [];
  }

  return [...filteredProductsArray]
    .filter(product => product && product.name) // Filtra prodotti validi
    .sort((a, b) => {
      const aValue = chartMetric === 'fatturato' ? (a.fatturato || 0) :
                    chartMetric === 'volume' ? (a.volume || 0) :
                    (a.agents || 0);
      const bValue = chartMetric === 'fatturato' ? (b.fatturato || 0) :
                    chartMetric === 'volume' ? (b.volume || 0) :
                    (b.agents || 0);
      return bValue - aValue;
    });
}, [filteredProductsArray, chartMetric]);

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
                    <div className="product-icon" style={{ background: getProductColor(productKey) }}>
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
                        <div className="product-icon-small" style={{ background: getProductColor(productKey) }}>
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

{viewMode === 'chart' && (
  <div className="charts-container-real">
    {/* Chart Controls */}
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

    {/* 🔧 FIX: Controllo condizionale prima del rendering */}
    {!chartData || chartData.length === 0 ? (
      <div className="no-chart-data">
        <Package size={48} className="opacity-30" />
        <h3>Nessun dato disponibile per i grafici</h3>
        <p>Non ci sono dati sufficienti per generare il grafico richiesto.</p>
        <p>Controlla i filtri attivi o carica un file con dati prodotti.</p>
      </div>
    ) : (
      <div className="charts-grid">
        {/* Main Chart */}
        <div className="main-chart-card">
          <div className="chart-header">
            <h3>
              {chartType === 'pie' && 'Distribuzione per Prodotto'}
              {chartType === 'bar' && 'Confronto Prodotti'}
              {chartType === 'line' && 'Trend Prodotti'}
              {chartType === 'area' && 'Performance Cumulativa'}
            </h3>
            <div className="chart-info">
              <span className="chart-total">
                {chartMetric === 'fatturato' && `Totale: ${formatCurrency(totalStats.totalRevenue)}`}
                {chartMetric === 'volume' && `Totale: ${formatNumber(totalStats.totalVolume)}`}
                {chartMetric === 'agents' && `Totale: ${totalStats.totalProducts} prodotti`}
              </span>
            </div>
          </div>

          <div className="chart-wrapper">
  {/* 🔧 FIX: Triplo controllo prima di ResponsiveContainer */}
  {chartData &&
   Array.isArray(chartData) &&
   chartData.length > 0 &&
   chartData.every(item => item && item.name && typeof item.value === 'number') && (
    <ResponsiveContainer width="100%" height={400}>
      {chartType === 'pie' && (
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => {
              // 🔧 FIX: Controllo sicurezza anche nella label
              if (!name || typeof percent !== 'number' || isNaN(percent)) return '';
              return `${name} ${(percent * 100).toFixed(1)}%`;
            }}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData
              .filter(entry => entry && entry.name && typeof entry.value === 'number') // 🔧 FIX: Filtra ancora
              .map((entry, index) => (
                <Cell
                  key={`cell-${entry.originalName || entry.name}-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))
            }
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              // 🔧 FIX: Controllo sicurezza nel tooltip
              if (typeof value !== 'number' || isNaN(value)) return ['0', name || ''];
              return [
                chartMetric === 'fatturato' ? formatCurrency(value) : formatNumber(value),
                name || ''
              ];
            }}
          />
        </RechartsPieChart>
      )}

      {chartType === 'bar' && (
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis
            tickFormatter={(value) => {
              // 🔧 FIX: Controllo sicurezza nel formatter
              if (typeof value !== 'number' || isNaN(value)) return '0';
              return chartMetric === 'fatturato' ? formatCurrency(value) : formatNumber(value);
            }}
          />
          <Tooltip
            formatter={(value, name) => {
              // 🔧 FIX: Controllo sicurezza nel tooltip
              if (typeof value !== 'number' || isNaN(value)) return ['0', name || ''];
              return [
                chartMetric === 'fatturato' ? formatCurrency(value) : formatNumber(value),
                name || ''
              ];
            }}
          />
          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
            {chartData
              .filter(entry => entry && entry.name && typeof entry.value === 'number') // 🔧 FIX: Filtra ancora
              .map((entry, index) => (
                <Cell
                  key={`bar-cell-${entry.originalName || entry.name}-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))
            }
          </Bar>
        </BarChart>
      )}

      {chartType === 'line' && (
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" />
          <YAxis
            tickFormatter={(value) => {
              if (typeof value !== 'number' || isNaN(value)) return '0';
              return chartMetric === 'fatturato' ? formatCurrency(value) : formatNumber(value);
            }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (typeof value !== 'number' || isNaN(value)) return ['0', name || ''];
              return [
                chartMetric === 'fatturato' ? formatCurrency(value) : formatNumber(value),
                name || ''
              ];
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      )}

      {chartType === 'area' && (
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" />
          <YAxis
            tickFormatter={(value) => {
              if (typeof value !== 'number' || isNaN(value)) return '0';
              return chartMetric === 'fatturato' ? formatCurrency(value) : formatNumber(value);
            }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (typeof value !== 'number' || isNaN(value)) return ['0', name || ''];
              return [
                chartMetric === 'fatturato' ? formatCurrency(value) : formatNumber(value),
                name || ''
              ];
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#colorGradient)"
          />
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
        </AreaChart>
      )}
    </ResponsiveContainer>
  )}

  {/* 🔧 FIX: Messaggio di debug se i dati non sono validi */}
  {(!chartData || !Array.isArray(chartData) || chartData.length === 0) && (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      color: '#64748b',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px dashed #cbd5e1'
    }}>
      <p>📊 Nessun dato valido per il grafico</p>
      <small>chartData: {JSON.stringify(chartData)}</small>
    </div>
  )}
</div>
        </div>

        {/* Top Products Card */}
        {/* 🔧 FIX: Controllo sui topProducts prima del rendering */}
        {topProducts && topProducts.length > 0 && (
          <div className="top-products-card">
            <h4>Top 5 Prodotti</h4>
            <div className="top-products-list">
              {topProducts.slice(0, 5).map((product, index) => {
                const Icon = getProductIcon(product.name);
                const metricValue = chartMetric === 'fatturato' ? product.fatturato :
                                  chartMetric === 'volume' ? product.volume :
                                  product.agents;
                return (
                  <div key={`${product.name}-${index}`} className="top-product-item">
                    <div className="rank-badge">{index + 1}</div>
                    <div className="product-icon-mini" style={{ background: getProductColor(product.name) }}>
                      <Icon size={16} color="white" />
                    </div>
                    <div className="product-details">
                      <span className="product-name">{getProductDisplayName(product.name)}</span>
                      <span className="product-value">
                        {chartMetric === 'fatturato' && formatCurrency(metricValue)}
                        {chartMetric === 'volume' && formatNumber(metricValue)}
                        {chartMetric === 'agents' && `${metricValue} agenti`}
                      </span>
                    </div>
                    <div className="product-percentage">
                      {totalStats.totalRevenue > 0 && (
                        <>
                          {((metricValue / totalStats[
                            chartMetric === 'fatturato' ? 'totalRevenue' :
                            chartMetric === 'volume' ? 'totalVolume' :
                            'totalProducts'
                          ]) * 100).toFixed(1)}%
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}

    </div>
  );
};

export default ModernProductsAnalysis;
