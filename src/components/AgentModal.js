import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, TrendingUp, DollarSign, Award, Phone, Smartphone, Globe, Shield, X, Calendar, MapPin, Zap, Package, ChevronDown, BarChart3 } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/excelParser';
import { formatAgentName } from '../utils/formatter';

const EmptyState = ({ message }) => (
  <div className="empty-state-compact">
    <Package size={32} className="empty-icon" />
    <p className="empty-message">{message}</p>
  </div>
);

const StatItem = ({ label, value, isCurrency = false, icon: Icon }) => {
  const formattedValue = isCurrency ? formatCurrency(value || 0) : formatNumber(value || 0);
  if (value === 0 || value === undefined) return null;

  return (
    <div className="modern-stat-item group hover:scale-105 transition-all duration-300">
      <div className="stat-icon">
        {Icon && <Icon size={20} />}
      </div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{formattedValue}</span>
      </div>
    </div>
  );
};

const KpiTrend = ({ currentValue, historicalValues, dataKey }) => {
  if (!historicalValues || historicalValues.length < 1) {
    return <span className="kpi-trend neutral">N/A</span>;
  }

  const lastMonthData = historicalValues[historicalValues.length - 1];
  const previousValue = lastMonthData ? lastMonthData[dataKey] : 0;

  if (currentValue > 0 && previousValue === 0) {
    return <span className="kpi-trend positive">In crescita</span>;
  }

  if (previousValue === 0) {
    return <span className="kpi-trend neutral">N/A</span>;
  }

  const percentageChange = ((currentValue - previousValue) / previousValue) * 100;

  if (Math.abs(percentageChange) < 1) {
    return <span className="kpi-trend neutral">Stabile</span>;
  }

  if (percentageChange > 0) {
    return <span className="kpi-trend positive">+{percentageChange.toFixed(0)}%</span>;
  } else {
    return <span className="kpi-trend negative">{percentageChange.toFixed(0)}%</span>;
  }
};

const AgentModal = ({ agent, allData, onClose }) => {
  const [activeSection, setActiveSection] = useState(null);

  const toggleSection = (sectionId) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const historicalData = useMemo(() => {
    if (!agent || !allData || !allData.uploadedFiles) {
      return [];
    }
    return allData.uploadedFiles
      .map(file => {
        const agentData = file.data?.agents?.find(a => a.nome === agent.originalNome);
        return agentData ? {
          name: file.displayDate, // Mappato da 'period' a 'name' per il grafico
          rush: agentData.fatturatoRush || 0, // Mappato da 'fatturatoRush' a 'rush'
          fatturato: agentData.fatturato?.complessivo || 0, // Mappato da 'revenue' a 'fatturato'
        } : null;
      })
      .filter(Boolean)
      .reverse(); // Ordine cronologico per il grafico
  }, [agent, allData]);

  if (!agent) return null;

  const getAvatarColor = (name) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-orange-500 to-orange-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
    ];
    const index = (name || '').length % colors.length;
    return colors[index];
  };

  const getProductCount = (category) => {
    switch (category) {
      case 'fatturati':
        return [
          agent.fatturatoVoce, agent.fatturatoDati, agent.fatturatoEasyRent,
          agent.fatturatoOu, agent.fatturatoOa, agent.fatturatoEasyDeal,
          agent.fatturatoServiziDigitali, agent.fatturatoAltro, agent.fatturatoCustom,
          agent.fatturatoSdm, agent.fatturatoSsc, agent.fatturatoYourBackup,
          agent.fatturatoCloudNas, agent.fatturatoEasyGdpr, agent.fatturatoMiia,
          agent.fatturatoNuovoCliente
        ].filter(val => val && val > 0).length;

      case 'digitali':
        return [
          agent.sdm, agent.ssc, agent.yourBackup, agent.cloudNas,
          agent.miia, agent.easyGdpr
        ].filter(val => val && val > 0).length;

      case 'telefonia':
        return [
          agent.adsl, agent.linkOu, agent.linkOa, agent.simVoce,
          agent.simDati, agent.mnp, agent.easyRent, agent.linkOaStart,
          agent.interniOa
        ].filter(val => val && val > 0).length;

      case 'energia':
        return [agent.fastwebEnergia].filter(val => val && val > 0).length;

      default:
        return 0;
    }
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay-modern" onClick={onClose}>
      <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
        {/* Header modernizzato */}
        <div className="modal-header-modern">
          <div className="agent-profile">
            <div className={`avatar-modern ${getAvatarColor(agent.nome)}`}>
              <User size={32} className="text-white" />
            </div>
            <div className="agent-info">
              <h1 className="agent-name">{agent.nome}</h1>
              <div className="agent-details">
                <div className="detail-item">
                  <User size={16} />
                  <span>{agent.sm ? formatAgentName(agent.sm) : ''}</span>
                </div>
                <div className="detail-item">
                  <MapPin size={16} />
                  <span>{agent.distretto}</span>
                </div>
                <div className="detail-item">
                  <Calendar size={16} />
                  <span>Ultimo aggiornamento: oggi</span>
                </div>
              </div>
            </div>
          </div>
          <button className="close-button-modern" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="kpi-section">
          <div className="kpi-card accent">
            <div className="kpi-icon">
              <TrendingUp size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Fatturato Rush</span>
              <span className="kpi-value">{formatCurrency(agent.fatturatoRush || 0)}</span>
              <KpiTrend currentValue={agent.fatturatoRush || 0} historicalValues={historicalData} dataKey="rush" />
            </div>
          </div>

          <div className="kpi-card primary">
            <div className="kpi-icon">
              <DollarSign size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Fatturato Complessivo</span>
              <span className="kpi-value">{formatCurrency(agent.fatturato?.complessivo || 0)}</span>
              <KpiTrend currentValue={agent.fatturato?.complessivo || 0} historicalValues={historicalData} dataKey="fatturato" />
            </div>
          </div>

          <div className="kpi-card success">
            <div className="kpi-icon">
              <Award size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Bonus Risultati</span>
              <span className="kpi-value">{formatCurrency(agent.bonusRisultati || 0)}</span>
            </div>
          </div>

          <div className="kpi-card info">
            <div className="kpi-icon">
              <User size={28} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Nuovi Clienti</span>
              <span className="kpi-value">{formatNumber(agent.nuovoCliente || 0)}</span>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="chart-section">
          <h3 className="section-title">
            <TrendingUp size={20} />
            Trend Performance Storico
          </h3>
          <div className="chart-container-modern">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis yAxisId="left" stroke="#10b981" />
                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rush"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Fatturato Rush"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="fatturato"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Fatturato Totale"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accordion Section */}
        <div className="accordion-section">
          <h3 className="section-title">
            <BarChart3 size={20} />
            Dettaglio Performance Prodotti
          </h3>

          {/* Accordion Item 1 - Fatturati */}
          <div className="accordion-item">
            <button
              className={`accordion-header ${activeSection === 'fatturati' ? 'active' : ''}`}
              onClick={() => toggleSection('fatturati')}
            >
              <div className="accordion-title">
                <DollarSign size={18} />
                <span>Dettaglio Fatturati</span>
              </div>
              <div className="accordion-meta">
                <span className="count-badge">{getProductCount('fatturati')}</span>
                <ChevronDown size={16} className={`chevron ${activeSection === 'fatturati' ? 'rotated' : ''}`} />
              </div>
            </button>
            {activeSection === 'fatturati' && (
              <div className="accordion-content">
                {getProductCount('fatturati') > 0 ? (
                  <div className="stats-grid-compact">
                    <StatItem label="Fatturato Voce" value={agent.fatturatoVoce} isCurrency icon={Phone} />
                    <StatItem label="Fatturato Dati" value={agent.fatturatoDati} isCurrency icon={Globe} />
                    <StatItem label="Fatturato Easy Rent" value={agent.fatturatoEasyRent} isCurrency icon={Smartphone} />
                    <StatItem label="Fatturato OU" value={agent.fatturatoOu} isCurrency icon={DollarSign} />
                    <StatItem label="Fatturato OA" value={agent.fatturatoOa} isCurrency icon={DollarSign} />
                    <StatItem label="Fatturato Easy Deal" value={agent.fatturatoEasyDeal} isCurrency icon={Award} />
                    <StatItem label="Fatturato Servizi Digitali" value={agent.fatturatoServiziDigitali} isCurrency icon={Shield} />
                    <StatItem label="Fatturato Altro" value={agent.fatturatoAltro} isCurrency icon={DollarSign} />
                    <StatItem label="Fatturato Custom" value={agent.fatturatoCustom} isCurrency icon={DollarSign} />
                    <StatItem label="Fatturato SDM" value={agent.fatturatoSdm} isCurrency icon={Shield} />
                    <StatItem label="Fatturato SSC" value={agent.fatturatoSsc} isCurrency icon={Globe} />
                    <StatItem label="Fatturato Your Backup" value={agent.fatturatoYourBackup} isCurrency icon={Shield} />
                    <StatItem label="Fatturato Cloud NAS" value={agent.fatturatoCloudNas} isCurrency icon={Globe} />
                    <StatItem label="Fatturato Easy GDPR" value={agent.fatturatoEasyGdpr} isCurrency icon={Shield} />
                    <StatItem label="Fatturato MIIA" value={agent.fatturatoMiia} isCurrency icon={Shield} />
                    <StatItem label="Fatturato Nuovo Cliente" value={agent.fatturatoNuovoCliente} isCurrency icon={User} />
                  </div>
                ) : (
                  <EmptyState message="Nessun dato fatturato disponibile" />
                )}
              </div>
            )}
          </div>

          {/* Accordion Item 2 - Servizi Digitali */}
          <div className="accordion-item">
            <button
              className={`accordion-header ${activeSection === 'digitali' ? 'active' : ''}`}
              onClick={() => toggleSection('digitali')}
            >
              <div className="accordion-title">
                <Shield size={18} />
                <span>Servizi Digitali</span>
              </div>
              <div className="accordion-meta">
                <span className="count-badge">{getProductCount('digitali')}</span>
                <ChevronDown size={16} className={`chevron ${activeSection === 'digitali' ? 'rotated' : ''}`} />
              </div>
            </button>
            {activeSection === 'digitali' && (
              <div className="accordion-content">
                {getProductCount('digitali') > 0 ? (
                  <div className="stats-grid-compact">
                    <StatItem label="SDM" value={agent.sdm} icon={Shield} />
                    <StatItem label="SSC" value={agent.ssc} icon={Globe} />
                    <StatItem label="Your Backup" value={agent.yourBackup} icon={Shield} />
                    <StatItem label="Cloud NAS" value={agent.cloudNas} icon={Globe} />
                    <StatItem label="MIIA" value={agent.miia} icon={Shield} />
                    <StatItem label="Easy GDPR" value={agent.easyGdpr} icon={Shield} />
                  </div>
                ) : (
                  <EmptyState message="Nessun servizio digitale attivo" />
                )}
              </div>
            )}
          </div>

          {/* Accordion Item 3 - Telefonia */}
          <div className="accordion-item">
            <button
              className={`accordion-header ${activeSection === 'telefonia' ? 'active' : ''}`}
              onClick={() => toggleSection('telefonia')}
            >
              <div className="accordion-title">
                <Phone size={18} />
                <span>Telefonia</span>
              </div>
              <div className="accordion-meta">
                <span className="count-badge">{getProductCount('telefonia')}</span>
                <ChevronDown size={16} className={`chevron ${activeSection === 'telefonia' ? 'rotated' : ''}`} />
              </div>
            </button>
            {activeSection === 'telefonia' && (
              <div className="accordion-content">
                {getProductCount('telefonia') > 0 ? (
                  <div className="stats-grid-compact">
                    <StatItem label="ADSL" value={agent.adsl} icon={Globe} />
                    <StatItem label="Link OU" value={agent.linkOu} icon={Phone} />
                    <StatItem label="Link OA" value={agent.linkOa} icon={Phone} />
                    <StatItem label="SIM Voce" value={agent.simVoce} icon={Phone} />
                    <StatItem label="SIM Dati" value={agent.simDati} icon={Smartphone} />
                    <StatItem label="MNP" value={agent.mnp} icon={Smartphone} />
                    <StatItem label="Easy Rent" value={agent.easyRent} icon={Award} />
                    <StatItem label="Link OA Start" value={agent.linkOaStart} icon={Phone} />
                    <StatItem label="Interni OA" value={agent.interniOa} icon={Phone} />
                  </div>
                ) : (
                  <EmptyState message="Nessun contratto telefonico attivo" />
                )}
              </div>
            )}
          </div>

          {/* Accordion Item 4 - Energia */}
          <div className="accordion-item">
            <button
              className={`accordion-header ${activeSection === 'energia' ? 'active' : ''}`}
              onClick={() => toggleSection('energia')}
            >
              <div className="accordion-title">
                <Zap size={18} />
                <span>Energia</span>
              </div>
              <div className="accordion-meta">
                <span className="count-badge">{getProductCount('energia')}</span>
                <ChevronDown size={16} className={`chevron ${activeSection === 'energia' ? 'rotated' : ''}`} />
              </div>
            </button>
            {activeSection === 'energia' && (
              <div className="accordion-content">
                {getProductCount('energia') > 0 ? (
                  <div className="stats-grid-compact">
                    <StatItem label="Fastweb Energia" value={agent.fastwebEnergia} icon={Zap} />
                  </div>
                ) : (
                  <EmptyState message="Nessun contratto energia attivo" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer-modern">
          <div className="footer-info">
            <span>📊 Dati aggiornati al {new Date().toLocaleDateString('it-IT')}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay-modern {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .modal-content-modern {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 24px;
          width: 95%;
          max-width: 1200px;
          max-height: 95vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          animation: slideInUp 0.4s ease;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .modal-header-modern {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 32px;
          border-radius: 24px 24px 0 0;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .modal-header-modern::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: float 6s ease-in-out infinite;
        }

        .agent-profile {
          display: flex;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .avatar-modern {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 3px solid rgba(255, 255, 255, 0.3);
        }

        .agent-info {
          flex: 1;
        }

        .agent-name {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 0 0 16px 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .agent-details {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          opacity: 0.9;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
        }

        .close-button-modern {
          position: absolute;
          top: 24px;
          right: 24px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          z-index: 3;
        }

        .close-button-modern:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        .kpi-section {
          padding: 32px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .kpi-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--accent-color);
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .kpi-card.primary { --accent-color: linear-gradient(135deg, #3b82f6, #1d4ed8); }
        .kpi-card.accent { --accent-color: linear-gradient(135deg, #10b981, #047857); }
        .kpi-card.success { --accent-color: linear-gradient(135deg, #f59e0b, #d97706); }
        .kpi-card.info { --accent-color: linear-gradient(135deg, #8b5cf6, #7c3aed); }

        .kpi-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: var(--accent-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .kpi-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .kpi-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        .kpi-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1e293b;
        }

        .kpi-trend {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .kpi-trend.positive { color: #10b981; }
        .kpi-trend.negative { color: #ef4444; }
        .kpi-trend.neutral { color: #64748b; }

        .chart-section {
          padding: 0 32px 32px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #f1f5f9;
        }

        .chart-container-modern {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .accordion-section {
          padding: 24px;
          background: white;
          border-radius: 16px;
          margin: 16px 0;
          border: 1px solid #e2e8f0;
        }

        .accordion-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 8px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .accordion-item:hover {
          border-color: #cbd5e1;
        }

        .accordion-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 15px;
          font-weight: 500;
        }

        .accordion-header:hover {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        }

        .accordion-header.active {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1d4ed8;
        }

        .accordion-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .accordion-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .count-badge {
          background: rgba(59, 130, 246, 0.1);
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 8px;
          min-width: 24px;
          text-align: center;
        }

        .accordion-header.active .count-badge {
          background: rgba(255, 255, 255, 0.8);
          color: #1d4ed8;
        }

        .chevron {
          transition: transform 0.2s ease;
          color: #64748b;
        }

        .chevron.rotated {
          transform: rotate(180deg);
        }

        .accordion-content {
          padding: 20px;
          background: white;
          border-top: 1px solid #e2e8f0;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stats-grid-compact {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .empty-state-compact {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 16px;
          color: #64748b;
          text-align: center;
        }

        .empty-icon {
          opacity: 0.4;
          margin-bottom: 8px;
        }

        .empty-message {
          font-size: 14px;
          opacity: 0.8;
        }

        .modern-stat-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.2s ease;
        }

        .modern-stat-item:hover {
          background: #f1f5f9;
          border-color: #3b82f6;
          transform: translateY(-1px);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.3rem;
          font-weight: 700;
          color: #1e293b;
        }

        .modal-footer-modern {
          background: #f8fafc;
          padding: 24px 32px;
          border-radius: 0 0 24px 24px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }

        .footer-info {
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 500;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @media (max-width: 768px) {
          .modal-content-modern {
            width: 98%;
            margin: 1%;
            max-height: 98vh;
          }

          .agent-name {
            font-size: 2rem;
          }

          .kpi-section {
            grid-template-columns: 1fr;
            padding: 24px;
          }

          .accordion-header {
            padding: 14px 16px;
            font-size: 14px;
          }

          .accordion-content {
            padding: 16px;
          }

          .agent-profile {
            flex-direction: column;
            text-align: center;
          }

          .avatar-modern {
            margin-right: 0;
            margin-bottom: 16px;
          }

          .agent-details {
            justify-content: center;
          }

          .stats-grid-compact {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>,
    document.getElementById('modal-root') || document.body
  );
};

export default AgentModal;
