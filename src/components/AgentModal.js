import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AgentModal.css';
import { formatCurrency, formatNumber } from '../utils/excelParser';

const StatItem = ({ label, value, isCurrency = false }) => {
  const formattedValue = isCurrency ? formatCurrency(value || 0) : formatNumber(value || 0);
  if (value === 0 || value === undefined) return null; // Non mostrare se il valore è zero o non definito

  return (
    <div className="stat-item-small">
      <span className="stat-item-label">{label}</span>
      <span className="stat-item-value">{formattedValue}</span>
    </div>
  );
};

const AgentModal = ({ agent, allData, onClose }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Logica per dati storici (mantenuta per ora, sebbene il grafico sia stato rimosso)
  const historicalData = useMemo(() => {
    if (!agent || !allData || !allData.uploadedFiles) {
      return [];
    }
    return allData.uploadedFiles
      .map(file => {
        const agentData = file.data?.agents?.find(a => a.nome === agent.nome);
        return agentData ? {
          period: file.displayDate,
          fatturatoRush: agentData.fatturatoRush || 0,
          revenue: agentData.fatturato?.complessivo || 0,
        } : null;
      })
      .filter(Boolean)
      .reverse();
  }, [agent, allData]);

  if (!agent) return null;

  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>

        <div className="modal-header">
          <div className="modal-avatar"><span>{getInitials(agent.nome)}</span></div>
          <div className="modal-agent-info">
            <h2>{agent.nome}</h2>
            <p><strong>SM/Coordinatore:</strong> {agent.sm}</p>
            <p><strong>Distretto:</strong> {agent.distretto}</p>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h3>Riepilogo Performance</h3>
            <div className="modal-stats-grid">
              <div className="modal-stat"><h4>Fatturato Complessivo</h4><p>{formatCurrency(agent.fatturato?.complessivo || 0)}</p></div>
              <div className="modal-stat highlight"><h4>Fatturato Rush</h4><p>{formatCurrency(agent.fatturatoRush || 0)}</p></div>
              <div className="modal-stat highlight"><h4>Bonus Risultati</h4><p>{formatCurrency(agent.bonusRisultati || 0)}</p></div>
              <div className="modal-stat"><h4>Nuovo Cliente</h4><p>{formatNumber(agent.nuovoCliente || 0)}</p></div>
            </div>
          </div>

          <div className="modal-section">
            <h3>Dettaglio Fatturati</h3>
            <div className="modal-stats-grid-small">
              <StatItem label="Fatturato Voce" value={agent.fatturatoVoce} isCurrency />
              <StatItem label="Fatturato Dati" value={agent.fatturatoDati} isCurrency />
              <StatItem label="Fatturato Easy Rent" value={agent.fatturatoEasyRent} isCurrency />
              <StatItem label="Fatturato OU" value={agent.fatturatoOu} isCurrency />
              <StatItem label="Fatturato OA" value={agent.fatturatoOa} isCurrency />
              <StatItem label="Fatturato Easy Deal" value={agent.fatturatoEasyDeal} isCurrency />
              <StatItem label="Fatturato Altro" value={agent.fatturatoAltro} isCurrency />
              <StatItem label="Fatturato Servizi Digitali" value={agent.fatturatoServiziDigitali} isCurrency />
              <StatItem label="Fatturato Custom" value={agent.fatturatoCustom} isCurrency />
              <StatItem label="Fatturato SDM" value={agent.fatturatoSdm} isCurrency />
              <StatItem label="Fatturato SSC" value={agent.fatturatoSsc} isCurrency />
              <StatItem label="Fatturato Your Backup" value={agent.fatturatoYourBackup} isCurrency />
              <StatItem label="Fatturato Cloud NAS" value={agent.fatturatoCloudNas} isCurrency />
              <StatItem label="Fatturato Easy GDPR" value={agent.fatturatoEasyGdpr} isCurrency />
              <StatItem label="Fatturato MIIA" value={agent.fatturatoMiia} isCurrency />
              <StatItem label="Fatturato Nuovo Cliente" value={agent.fatturatoNuovoCliente} isCurrency />
            </div>
          </div>

          <div className="modal-section">
            <h3>Servizi Digitali</h3>
            <div className="modal-stats-grid-small">
              <StatItem label="SDM" value={agent.sdm} />
              <StatItem label="SSC" value={agent.ssc} />
              <StatItem label="Your Backup" value={agent.yourBackup} />
              <StatItem label="Cloud NAS" value={agent.cloudNas} />
              <StatItem label="MIIA" value={agent.miia} />
              <StatItem label="Easy GDPR" value={agent.easyGdpr} />
              <StatItem label="Fastweb Energia" value={agent.fastwebEnergia} />
            </div>
          </div>

          <div className="modal-section">
            <h3>Fonia Fissa</h3>
            <div className="modal-stats-grid-small">
              <StatItem label="ADSL" value={agent.adsl} />
              <StatItem label="Link OU" value={agent.linkOu} />
              <StatItem label="Link OA" value={agent.linkOa} />
              <StatItem label="Link OA Start" value={agent.linkOaStart} />
              <StatItem label="Interni OA" value={agent.interniOa} />
            </div>
          </div>

          <div className="modal-section">
            <h3>Fonia Mobile</h3>
            <div className="modal-stats-grid-small">
              <StatItem label="SIM Voce" value={agent.simVoce} />
              <StatItem label="SIM Dati" value={agent.simDati} />
              <StatItem label="MNP" value={agent.mnp} />
              <StatItem label="Easy Rent" value={agent.easyRent} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
            <p>Dati relativi al periodo di riferimento corrente e storico disponibile.</p>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')
  );
};

export default AgentModal;
