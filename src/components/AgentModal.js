import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AgentModal.css';
import { formatCurrency, formatNumber } from '../utils/excelParser';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`Periodo: ${label}`}</p>
        {payload.map(pld => (
          <p key={pld.dataKey} style={{ color: pld.color }}>
            {`${pld.name}: ${formatCurrency(pld.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AgentModal = ({ agent, allData, onClose }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const { historicalData, productBreakdown } = useMemo(() => {
    if (!agent || !allData || !allData.uploadedFiles) {
      return { historicalData: [], productBreakdown: [] };
    }

    // 1. Calcola dati storici
    const history = allData.uploadedFiles
      .map(file => {
        const agentData = file.data?.agents?.find(a => a.nome === agent.nome);
        return agentData ? {
          period: file.displayDate,
          inflow: agentData.inflowTotale || 0,
          revenue: agentData.fatturato?.complessivo || 0,
        } : null;
      })
      .filter(Boolean)
      .reverse(); // Ordina dal più vecchio al più recente

    // 2. Calcola breakdown prodotti per il periodo corrente
    const products = agent.prodotti || {};
    const breakdown = Object.entries(products)
      .filter(([key]) => key !== 'totalePezzi')
      .map(([name, values]) => ({
        name: name.replace(/([A-Z])/g, ' $1').trim(),
        pezzi: values.pezzi || 0,
        inflow: values.inflow || 0,
      }))
      .filter(p => p.pezzi > 0)
      .sort((a, b) => b.pezzi - a.pezzi);

    return { historicalData: history, productBreakdown: breakdown };
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
              <div className="modal-stat highlight"><h4>Inflow Totale</h4><p>{formatCurrency(agent.inflowTotale || 0)}</p></div>
              <div className="modal-stat"><h4>Nuovi Clienti</h4><p>{formatNumber(agent.nuoviClienti || 0)}</p></div>
              <div className="modal-stat"><h4>Contratti Fastweb</h4><p>{formatNumber(agent.fastwebEnergia || 0)}</p></div>
            </div>
          </div>

          {historicalData.length > 1 && (
            <div className="modal-section">
              <h3>Andamento Storico</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" stroke="#8884d8" label={{ value: 'Inflow', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Fatturato', angle: -90, position: 'insideRight' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="inflow" name="Inflow" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Fatturato" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {productBreakdown.length > 0 && (
            <div className="modal-section">
              <h3>Breakdown Prodotti (Pezzi)</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120}/>
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Legend />
                    <Bar dataKey="pezzi" name="Pezzi" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
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
